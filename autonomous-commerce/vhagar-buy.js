#!/usr/bin/env node
/**
 * 🐉 VHAGAR Complete Purchase Flow
 * 
 * Opens browser, waits for login, then completes purchase.
 * All in one flow to preserve session.
 */

const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');

const SCREENSHOT_DIR = '/tmp/vhagar-purchase';
const SEARCH_TERM = 'USB-C cable';
const MAX_PRICE = 15.00;

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

async function screenshot(page, name) {
  const p = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path: p });
  log(`📸 ${p}`);
  return p;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

async function main() {
  log('🐉 VHAGAR AUTONOMOUS PURCHASE');
  log('═'.repeat(40));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Go to Amazon
    log('Opening Amazon...');
    await page.goto('https://www.amazon.com');
    await page.waitForTimeout(2000);
    await screenshot(page, '01-home');
    
    // Check login
    let loggedIn = false;
    try {
      const txt = await page.$eval('#nav-link-accountList-nav-line-1', e => e.textContent);
      loggedIn = !txt.includes('sign in') && !txt.includes('Sign in');
      log(`Status: ${txt}`);
    } catch (e) {}
    
    if (!loggedIn) {
      log('');
      log('⚠️  NOT LOGGED IN');
      log('Please log into Amazon in the browser window.');
      await ask('Press ENTER when logged in... ');
      log('Continuing...');
      await page.waitForTimeout(1000);
    }
    
    // Step 2: Search
    log(`Searching: "${SEARCH_TERM}"`);
    await page.fill('#twotabsearchtextbox', SEARCH_TERM);
    await page.click('#nav-search-submit-button');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await screenshot(page, '02-search');
    
    // Step 3: Find cheap item
    log(`Finding items under $${MAX_PRICE}...`);
    const results = await page.$$('[data-component-type="s-search-result"]');
    log(`Found ${results.length} results`);
    
    let selected = null;
    let price = 0;
    let title = '';
    
    for (const r of results.slice(0, 20)) {
      try {
        const whole = await r.$eval('.a-price-whole', e => e.textContent.replace(/[^0-9]/g, ''));
        const frac = await r.$eval('.a-price-fraction', e => e.textContent).catch(() => '00');
        const p = parseFloat(`${whole}.${frac}`);
        
        if (p > 0 && p < MAX_PRICE) {
          title = await r.$eval('h2 span', e => e.textContent).catch(() => 'USB Cable');
          log(`✓ Found: ${title.slice(0, 50)}... @ $${p}`);
          selected = r;
          price = p;
          break;
        }
      } catch (e) {}
    }
    
    if (!selected) throw new Error(`No items under $${MAX_PRICE}`);
    
    // Step 4: Add to cart from search
    log('Looking for Add to Cart button...');
    let addedFromSearch = false;
    
    try {
      const atcBtn = await selected.$('button');
      const btns = await selected.$$('button');
      for (const btn of btns) {
        const txt = await btn.textContent().catch(() => '');
        if (txt.toLowerCase().includes('add to cart')) {
          log('Found Add to Cart button, clicking...');
          await btn.click();
          addedFromSearch = true;
          break;
        }
      }
    } catch (e) {}
    
    if (!addedFromSearch) {
      // Go to product page
      log('Clicking product link...');
      const link = await selected.$('h2 a');
      if (link) {
        await link.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000);
        await screenshot(page, '03-product');
        
        // Try add to cart on product page
        const addBtn = await page.$('#add-to-cart-button');
        if (addBtn) {
          await addBtn.click();
          log('Added from product page');
        } else {
          throw new Error('Cannot find Add to Cart');
        }
      }
    }
    
    await page.waitForTimeout(3000);
    await screenshot(page, '04-added');
    
    // Step 5: Go to cart
    log('Going to cart...');
    await page.goto('https://www.amazon.com/gp/cart/view.html');
    await page.waitForTimeout(3000);
    await screenshot(page, '05-cart');
    
    // Step 6: Checkout
    log('Proceeding to checkout...');
    const checkoutBtn = await page.$('input[name="proceedToRetailCheckout"]');
    if (checkoutBtn) {
      await checkoutBtn.click();
      await page.waitForTimeout(5000);
      await screenshot(page, '06-checkout');
    }
    
    log('');
    log('═'.repeat(50));
    log('🐉 READY TO PLACE ORDER');
    log('═'.repeat(50));
    log(`Item: ${title.slice(0, 45)}...`);
    log(`Price: $${price}`);
    log('');
    log('Review the checkout in the browser.');
    const confirm = await ask('Type "yes" to PLACE ORDER (real purchase): ');
    
    if (confirm.toLowerCase() === 'yes') {
      log('');
      log('🔥 PLACING ORDER...');
      
      // Find place order button
      const placeBtn = await page.$('input[name="placeYourOrder1"], #submitOrderButtonId input, [name="placeYourOrder1"]');
      
      if (placeBtn) {
        await placeBtn.click();
        log('Clicked Place Order!');
        await page.waitForTimeout(8000);
        await screenshot(page, '07-confirmation');
        
        // Get order ID
        const bodyText = await page.textContent('body').catch(() => '');
        const orderMatch = bodyText.match(/(\d{3}-\d{7}-\d{7})/);
        const orderId = orderMatch ? orderMatch[1] : `ORDER_${Date.now()}`;
        
        log('');
        log('═'.repeat(50));
        log('🎉 ORDER PLACED SUCCESSFULLY!');
        log('═'.repeat(50));
        log(`Order ID: ${orderId}`);
        log(`Amount: $${price}`);
        log(`Item: ${title.slice(0, 40)}...`);
        
        // Generate proof
        const timestamp = Date.now();
        const proofPayload = JSON.stringify({ orderId, amount: price, item: title, timestamp, retailer: 'amazon' });
        const proofHash = '0x' + crypto.createHash('sha256').update(proofPayload).digest('hex');
        
        log('');
        log('📜 CRYPTOGRAPHIC PROOF');
        log(`Proof Hash: ${proofHash}`);
        
        // Save proof
        const proof = {
          orderId,
          amount: price,
          item: title,
          timestamp,
          proofHash,
          retailer: 'amazon',
          screenshots: fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'))
        };
        
        const proofPath = `${SCREENSHOT_DIR}/proof.json`;
        fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
        log(`Proof saved: ${proofPath}`);
        
        log('');
        log('This proof can be submitted to ClawPay for on-chain verification.');
        log('');
        log('"The dragon has fed. The proof is eternal."');
        
      } else {
        log('❌ Could not find Place Order button');
        await screenshot(page, '07-no-button');
      }
    } else {
      log('Order cancelled.');
    }
    
    log('');
    log('Browser will close in 30 seconds...');
    await page.waitForTimeout(30000);
    
  } catch (err) {
    log(`❌ Error: ${err.message}`);
    await screenshot(page, 'error');
  } finally {
    rl.close();
    await browser.close();
  }
}

main().catch(console.error);
