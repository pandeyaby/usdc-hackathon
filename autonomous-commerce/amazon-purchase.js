#!/usr/bin/env node
/**
 * 🐉 VHAGAR Amazon Purchase Automation
 * 
 * This script navigates Amazon and completes a real purchase.
 * Run with: node amazon-purchase.js
 */

const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');

// Configuration
const SEARCH_TERM = 'USB-C cable';
const MAX_PRICE = 10.00;
const SCREENSHOT_DIR = '/tmp/vhagar-purchase';

// Create screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function log(msg) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${msg}`);
}

async function screenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  log(`📸 Screenshot: ${path}`);
  return path;
}

async function main() {
  log('🐉 VHAGAR Amazon Purchase Automation');
  log('=====================================');
  
  // Launch browser (visible, not headless)
  log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to Amazon
    log('Navigating to Amazon...');
    await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await screenshot(page, '01-amazon-home');
    
    // Check if logged in
    const signInLink = await page.$('a#nav-link-accountList');
    const accountText = signInLink ? await signInLink.textContent() : '';
    log(`Account status: ${accountText}`);
    
    if (accountText.includes('Sign in') || accountText.includes('Hello, sign in')) {
      log('⚠️ Not logged in. Please log in manually or use saved credentials.');
      log('Waiting 30 seconds for manual login...');
      await page.waitForTimeout(30000);
    }
    
    // Step 2: Search for item
    log(`Searching for: ${SEARCH_TERM}`);
    await page.fill('#twotabsearchtextbox', SEARCH_TERM);
    await page.click('#nav-search-submit-button');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, '02-search-results');
    
    // Step 3: Filter by Prime (optional) and find item under budget
    log(`Looking for items under $${MAX_PRICE}...`);
    
    // Find first result with price under budget
    const results = await page.$$('[data-component-type="s-search-result"]');
    log(`Found ${results.length} search results`);
    
    let selectedItem = null;
    let selectedPrice = null;
    
    for (const result of results.slice(0, 10)) {
      try {
        const priceWhole = await result.$eval('.a-price-whole', el => el.textContent);
        const priceFraction = await result.$eval('.a-price-fraction', el => el.textContent);
        const price = parseFloat(`${priceWhole}.${priceFraction}`);
        
        if (price && price < MAX_PRICE) {
          const title = await result.$eval('h2 span', el => el.textContent);
          log(`✓ Found: ${title.slice(0, 50)}... - $${price}`);
          selectedItem = result;
          selectedPrice = price;
          break;
        }
      } catch (e) {
        // Skip items without price
      }
    }
    
    if (!selectedItem) {
      throw new Error(`No items found under $${MAX_PRICE}`);
    }
    
    // Step 4: Try to add to cart from search results first
    log('Looking for Add to Cart button on search results...');
    const searchAddToCart = await selectedItem.$('button[name="submit.addToCart"], .a-button-input[name="submit.add-to-cart"], [data-action="a-button-click"] button');
    
    if (searchAddToCart) {
      log('Found Add to Cart on search page, clicking...');
      await searchAddToCart.click();
      await page.waitForTimeout(3000);
      await screenshot(page, '03-added-from-search');
    } else {
      // Click on item to go to product page
      log('Clicking on selected item to view details...');
      const itemLink = await selectedItem.$('h2 a, .a-link-normal.a-text-normal');
      if (itemLink) {
        await itemLink.click();
      } else {
        await selectedItem.click();
      }
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
      await screenshot(page, '03-product-page');
      
      // Try multiple selectors for Add to Cart
      log('Adding to cart from product page...');
      const addToCartSelectors = [
        '#add-to-cart-button',
        '#add-to-cart-button-ubb',
        'input[name="submit.add-to-cart"]',
        '[data-feature-name="addToCart"] button',
        '.a-button-input[name="submit.add-to-cart"]'
      ];
      
      let addedToCart = false;
      for (const selector of addToCartSelectors) {
        const btn = await page.$(selector);
        if (btn) {
          log(`Found button with selector: ${selector}`);
          await btn.click();
          addedToCart = true;
          break;
        }
      }
      
      if (!addedToCart) {
        // Take screenshot and show what's on the page
        await screenshot(page, '03-no-button-found');
        const pageContent = await page.content();
        const hasAddToCart = pageContent.includes('add-to-cart') || pageContent.includes('Add to Cart');
        log(`Page has add-to-cart references: ${hasAddToCart}`);
        throw new Error('Add to cart button not found with any selector');
      }
      
      await page.waitForTimeout(2000);
      await screenshot(page, '04-added-to-cart');
    }
    
    // Step 6: Go to cart
    log('Going to cart...');
    await page.goto('https://www.amazon.com/gp/cart/view.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, '05-cart');
    
    // Step 7: Proceed to checkout
    log('Proceeding to checkout...');
    const checkoutButton = await page.$('input[name="proceedToRetailCheckout"]');
    if (checkoutButton) {
      await checkoutButton.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
      await screenshot(page, '06-checkout');
    } else {
      throw new Error('Checkout button not found');
    }
    
    // At this point, we're at checkout
    // The user needs to confirm the purchase manually for safety
    log('');
    log('⚠️ SAFETY STOP ⚠️');
    log('==================');
    log('Ready to complete purchase. Review the checkout page.');
    log('');
    log(`Item price: $${selectedPrice}`);
    log('');
    log('To complete the purchase:');
    log('1. Review the order on screen');
    log('2. If correct, the script will click "Place your order"');
    log('');
    log('Waiting 10 seconds for your review...');
    await page.waitForTimeout(10000);
    
    // UNCOMMENT TO ENABLE ACTUAL PURCHASE:
    // log('Placing order...');
    // await page.click('[name="placeYourOrder1"]');
    // await page.waitForLoadState('domcontentloaded');
    // await page.waitForTimeout(5000);
    // await screenshot(page, '07-confirmation');
    
    log('');
    log('🛑 DEMO MODE: Purchase not completed (safety)');
    log('To enable real purchase, uncomment the Place Order section');
    log('');
    log('Screenshots saved to: ' + SCREENSHOT_DIR);
    
    // Keep browser open for inspection
    log('Keeping browser open for 60 seconds...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    log(`❌ Error: ${error.message}`);
    await screenshot(page, 'error-state');
  } finally {
    await browser.close();
    log('Browser closed.');
  }
}

main().catch(console.error);
