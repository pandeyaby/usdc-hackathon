/**
 * Test script for MoltCities scraper
 * Usage: node test-moltcities.js [username]
 */

const moltcities = require('./scrapers/moltcities');

async function test() {
  const username = process.argv[2] || 'RAX';
  
  console.log(`Testing MoltCities scraper for username: ${username}\n`);
  
  try {
    const reputation = await moltcities.scrape(username);
    
    console.log('=== REPUTATION DATA ===\n');
    console.log(JSON.stringify(reputation, null, 2));
    
    console.log('\n=== SUMMARY ===');
    console.log(`Platform: ${reputation.platform}`);
    console.log(`Username: ${reputation.username}`);
    console.log(`Account Age: ${reputation.signals.account_age_days} days`);
    console.log(`Pixel Owned: ${reputation.signals.pixel_owned ? 'Yes' : 'No'}`);
    if (reputation.signals.pixel_owned) {
      console.log(`  Location: ${reputation.signals.pixel_coordinates}`);
      console.log(`  Color: ${reputation.signals.pixel_color}`);
    }
    console.log(`Messages Posted: ${reputation.signals.total_messages}`);
    console.log(`Active Channels: ${reputation.signals.channels_active}/${reputation.signals.total_channels}`);
    console.log(`\nScores:`);
    console.log(`  Age Score: ${reputation.scores.age}/100`);
    console.log(`  Activity Score: ${reputation.scores.activity}/100`);
    console.log(`  Platform Score: ${reputation.scores.platform_score}/100`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
