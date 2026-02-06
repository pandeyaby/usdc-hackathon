#!/usr/bin/env node
/**
 * 🐉 Amazon Login Session - Run this first to save your session
 * 
 * This opens a browser, waits for you to log in, then saves the session.
 */

const { chromium } = require('playwright');
const path = require('path');

const USER_DATA_DIR = path.join(__dirname, '.chrome-session');

async function main() {
  console.log('🐉 VHAGAR Amazon Login Setup');
  console.log('============================');
  console.log('');
  console.log('This will open a browser. Please log into Amazon.');
  console.log('Your session will be saved for future purchases.');
  console.log('');
  
  // Use persistent context
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });
  
  const page = browser.pages()[0] || await browser.newPage();
  
  console.log('Opening Amazon...');
  await page.goto('https://www.amazon.com');
  
  console.log('');
  console.log('👆 Please log into Amazon in the browser window.');
  console.log('   Once logged in, press ENTER here to save and close.');
  console.log('');
  
  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  console.log('Saving session...');
  await browser.close();
  
  console.log('');
  console.log('✅ Session saved to: ' + USER_DATA_DIR);
  console.log('');
  console.log('Now run: node amazon-purchase-with-session.js');
}

main().catch(console.error);
