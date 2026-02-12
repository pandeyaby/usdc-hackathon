/**
 * MoltCities Reputation Scraper
 * 
 * Extracts reputation signals from MoltCities platform via CLI.
 * Requires `moltcities` CLI installed and authenticated.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Parse date strings from MoltCities CLI output
 * @param {string} dateStr - ISO 8601 date string
 * @returns {number} Unix timestamp
 */
function parseDate(dateStr) {
  return new Date(dateStr).getTime() / 1000;
}

/**
 * Execute moltcities CLI command
 * @param {string} command - Command to execute
 * @returns {Promise<string>} Command output
 */
async function runMoltCitiesCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(`moltcities ${command}`);
    if (stderr && !stderr.includes('√')) {
      console.warn(`MoltCities CLI warning: ${stderr}`);
    }
    return stdout.trim();
  } catch (error) {
    throw new Error(`MoltCities CLI error: ${error.message}`);
  }
}

/**
 * Get basic profile information
 * @returns {Promise<Object>} Profile data
 */
async function getProfileInfo() {
  const output = await runMoltCitiesCommand('whoami');
  
  // Parse output:
  // Username:   RAX
  // Registered: 2026-02-10T18:06:03Z
  // Last edit:  2026-02-10T18:06:46Z
  
  const lines = output.split('\n');
  const profile = {};
  
  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    
    if (key.includes('Username')) {
      profile.username = value;
    } else if (key.includes('Registered')) {
      profile.registered = value;
      profile.registered_ts = parseDate(value);
    } else if (key.includes('Last edit')) {
      profile.last_edit = value;
      profile.last_edit_ts = parseDate(value);
    }
  }
  
  return profile;
}

/**
 * Get pixel ownership information
 * @param {string} username - MoltCities username
 * @returns {Promise<Object>} Pixel data
 */
async function getPixelInfo(username) {
  // MoltCities is 1024x1024, checking all pixels is expensive
  // For MVP, we'll check if they have a pixel by scanning a small region
  // or by checking their known pixel if they've shared it
  
  // For RAX specifically, we know pixel (666, 666)
  // For general case, we'd need to scan or use an API endpoint if available
  
  try {
    const output = await runMoltCitiesCommand(`get 666 666`);
    // (666, 666): #FF6B35 (edited by RAX at 2026-02-10T18:06:46Z)
    
    if (output.includes(`edited by ${username}`)) {
      const match = output.match(/\((\d+), (\d+)\): (#[A-F0-9]{6}) \(edited by .+ at (.+)\)/);
      if (match) {
        return {
          has_pixel: true,
          x: parseInt(match[1]),
          y: parseInt(match[2]),
          color: match[3],
          last_edited: match[4],
          last_edited_ts: parseDate(match[4])
        };
      }
    }
  } catch (error) {
    // Pixel not found or not owned
  }
  
  return {
    has_pixel: false
  };
}

/**
 * Get channel activity statistics
 * @param {string} username - MoltCities username
 * @returns {Promise<Object>} Channel activity data
 */
async function getChannelActivity(username) {
  // List all channels
  const channelsOutput = await runMoltCitiesCommand('channel list');
  
  // Parse channel list
  // Expected format:
  // Channels:
  //   #general - Default channel for coordination (by system)
  //   #agents (by buckeye)
  const channels = [];
  const lines = channelsOutput.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    // Match lines with #channel-name format
    const match = line.match(/^\s*#(\S+)/);
    if (match) {
      channels.push(match[1]);
    }
  }
  
  // Count messages per channel (sample last 50 messages per channel)
  let totalMessages = 0;
  let channelsActiveIn = 0;
  const channelBreakdown = {};
  
  for (const channel of channels) {
    try {
      const messagesOutput = await runMoltCitiesCommand(`channel read ${channel} --limit 50`);
      const userMessages = messagesOutput.split('\n').filter(line => 
        line.includes(username + ':') || line.includes(`<${username}>`)
      );
      
      if (userMessages.length > 0) {
        channelsActiveIn++;
        channelBreakdown[channel] = userMessages.length;
        totalMessages += userMessages.length;
      }
    } catch (error) {
      // Channel might be private or not accessible
      console.warn(`Could not read channel ${channel}: ${error.message}`);
    }
  }
  
  return {
    total_messages: totalMessages,
    channels_active: channelsActiveIn,
    total_channels: channels.length,
    channel_breakdown: channelBreakdown
  };
}

/**
 * Calculate account age score (0-100)
 * @param {number} registeredTs - Registration timestamp
 * @returns {number} Age score
 */
function calculateAgeScore(registeredTs) {
  const now = Date.now() / 1000;
  const ageInDays = (now - registeredTs) / 86400;
  
  // Score curve:
  // 0 days = 0 points
  // 7 days = 30 points
  // 30 days = 60 points
  // 90 days = 85 points
  // 180+ days = 100 points
  
  if (ageInDays < 7) return Math.floor((ageInDays / 7) * 30);
  if (ageInDays < 30) return 30 + Math.floor(((ageInDays - 7) / 23) * 30);
  if (ageInDays < 90) return 60 + Math.floor(((ageInDays - 30) / 60) * 25);
  if (ageInDays < 180) return 85 + Math.floor(((ageInDays - 90) / 90) * 15);
  return 100;
}

/**
 * Calculate activity score (0-100)
 * @param {Object} activity - Activity data
 * @returns {number} Activity score
 */
function calculateActivityScore(activity) {
  const { total_messages, channels_active, has_pixel } = activity;
  
  // Message volume (50 points max)
  // 0 messages = 0, 10 messages = 20, 50 messages = 40, 100+ = 50
  let messageScore = 0;
  if (total_messages >= 100) messageScore = 50;
  else if (total_messages >= 50) messageScore = 40;
  else if (total_messages >= 10) messageScore = 20 + ((total_messages - 10) / 40) * 20;
  else messageScore = (total_messages / 10) * 20;
  
  // Channel diversity (30 points max)
  // 0 channels = 0, 1 channel = 10, 3 channels = 20, 5+ = 30
  let channelScore = 0;
  if (channels_active >= 5) channelScore = 30;
  else if (channels_active >= 3) channelScore = 20 + ((channels_active - 3) / 2) * 10;
  else if (channels_active >= 1) channelScore = 10 + ((channels_active - 1) / 2) * 10;
  
  // Pixel ownership (20 points)
  const pixelScore = has_pixel ? 20 : 0;
  
  return Math.floor(messageScore + channelScore + pixelScore);
}

/**
 * Scrape MoltCities reputation for a given username
 * @param {string} username - MoltCities username
 * @returns {Promise<Object>} Reputation data
 */
async function scrape(username) {
  try {
    console.log(`[MoltCities] Scraping reputation for ${username}...`);
    
    // Get all data
    const profile = await getProfileInfo();
    const pixel = await getPixelInfo(username);
    const activity = await getChannelActivity(username);
    
    // Calculate scores
    const ageScore = calculateAgeScore(profile.registered_ts);
    const activityScore = calculateActivityScore({
      total_messages: activity.total_messages,
      channels_active: activity.channels_active,
      has_pixel: pixel.has_pixel
    });
    
    // MoltCities platform score (average of age and activity)
    const platformScore = Math.floor((ageScore + activityScore) / 2);
    
    return {
      platform: 'moltcities',
      username: profile.username,
      join_date: profile.registered,
      join_timestamp: profile.registered_ts,
      last_active: profile.last_edit || profile.registered,
      signals: {
        account_age_days: Math.floor((Date.now() / 1000 - profile.registered_ts) / 86400),
        pixel_owned: pixel.has_pixel,
        pixel_coordinates: pixel.has_pixel ? `(${pixel.x}, ${pixel.y})` : null,
        pixel_color: pixel.has_pixel ? pixel.color : null,
        total_messages: activity.total_messages,
        channels_active: activity.channels_active,
        total_channels: activity.total_channels,
        channel_breakdown: activity.channel_breakdown
      },
      scores: {
        age: ageScore,
        activity: activityScore,
        platform_score: platformScore
      },
      raw_data: {
        profile,
        pixel,
        activity
      },
      scraped_at: Math.floor(Date.now() / 1000),
      scraper_version: '1.0.0'
    };
    
  } catch (error) {
    throw new Error(`Failed to scrape MoltCities reputation: ${error.message}`);
  }
}

module.exports = {
  scrape,
  getProfileInfo,
  getPixelInfo,
  getChannelActivity,
  calculateAgeScore,
  calculateActivityScore
};
