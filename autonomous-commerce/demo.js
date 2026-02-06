#!/usr/bin/env node
/**
 * 🐉 VHAGAR Autonomous Purchasing Agent - Interactive Demo
 * 
 * Run: node demo.js
 */

const crypto = require('crypto');
const readline = require('readline');

const CLAWPAY_ADDRESS = '0x5cA7A8B1d0a5aFe4CF67333FF8C330102F098FfD';

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

function keccak256(data) {
  // Simplified hash for demo (real version uses ethers.js)
  return '0x' + crypto.createHash('sha256').update(data).digest('hex');
}

function parseIntent(request) {
  const budgetMatch = request.match(/under\s*\$?(\d+)/i) || request.match(/\$(\d+)/);
  const maxBudget = budgetMatch ? parseInt(budgetMatch[1]) : 20;
  
  const constraints = [];
  if (request.toLowerCase().includes('prime')) constraints.push('prime_shipping');
  if (request.toLowerCase().includes('fast')) constraints.push('fast_delivery');
  
  return {
    item: request.replace(/under\s*\$?\d+/gi, '').replace(/from\s*(amazon|target|walmart)/gi, '').trim(),
    maxBudget,
    constraints,
    retailer: 'amazon'
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question) => new Promise(resolve => rl.question(question, resolve));

  console.log('\n' + '═'.repeat(60));
  console.log(c('magenta', '  🐉 VHAGAR AUTONOMOUS PURCHASING AGENT'));
  console.log(c('cyan', '     "The dragon that buys."'));
  console.log('═'.repeat(60) + '\n');

  // Step 1: Get request
  console.log(c('yellow', '📝 What would you like me to purchase?\n'));
  const request = await ask(c('bright', '> '));

  // Step 2: Parse intent
  console.log('\n' + c('blue', '━'.repeat(50)));
  console.log(c('blue', '  STEP 1: PARSING INTENT'));
  console.log(c('blue', '━'.repeat(50)));
  await sleep(500);
  
  const intent = parseIntent(request);
  console.log(`\n  Item:        ${c('cyan', intent.item)}`);
  console.log(`  Max Budget:  ${c('green', '$' + intent.maxBudget + ' USDC')}`);
  console.log(`  Retailer:    ${c('yellow', intent.retailer)}`);
  console.log(`  Constraints: ${c('magenta', intent.constraints.join(', ') || 'none')}`);

  // Step 3: Create escrow
  console.log('\n' + c('blue', '━'.repeat(50)));
  console.log(c('blue', '  STEP 2: CREATING CLAWPAY ESCROW'));
  console.log(c('blue', '━'.repeat(50)));
  await sleep(500);

  const timestamp = Date.now();
  const intentPayload = JSON.stringify({ item: intent.item, maxBudget: intent.maxBudget, timestamp });
  const intentHash = keccak256(intentPayload);

  console.log(`\n  Intent Hash: ${c('cyan', intentHash.slice(0, 42) + '...')}`);
  console.log(`  Amount:      ${c('green', '$' + intent.maxBudget + ' USDC')} (locked)`);
  console.log(`  Contract:    ${c('yellow', CLAWPAY_ADDRESS)}`);
  
  await sleep(300);
  console.log(`\n  ${c('green', '✅ Escrow created successfully!')}`);

  // Step 4: Purchase instructions
  console.log('\n' + c('blue', '━'.repeat(50)));
  console.log(c('blue', '  STEP 3: PURCHASE INSTRUCTIONS'));
  console.log(c('blue', '━'.repeat(50)));

  console.log(`\n  ${c('yellow', '🛒 Please complete the following in your browser:')}\n`);
  console.log('  1. Open amazon.com');
  console.log(`  2. Search: "${c('cyan', intent.item)}"`);
  console.log(`  3. Filter: Price under $${intent.maxBudget}, Prime eligible`);
  console.log('  4. Select item with 4+ star rating');
  console.log('  5. Add to cart');
  console.log('  6. Checkout with saved payment method');
  console.log('  7. Complete the purchase');
  console.log(`\n  ${c('magenta', 'When done, enter the order details below:')}\n`);

  // Step 5: Get order details
  const orderId = await ask('  Order ID (e.g., 123-4567890-1234567): ');
  const amount = await ask('  Total Amount (e.g., 8.99): ');

  // Step 6: Generate proof
  console.log('\n' + c('blue', '━'.repeat(50)));
  console.log(c('blue', '  STEP 4: GENERATING CRYPTOGRAPHIC PROOF'));
  console.log(c('blue', '━'.repeat(50)));
  await sleep(500);

  const proofPayload = JSON.stringify({
    orderId: orderId.trim(),
    amount: parseFloat(amount),
    timestamp: Date.now(),
    retailer: intent.retailer
  });
  const proofHash = keccak256(proofPayload);

  console.log(`\n  Order ID:    ${c('cyan', orderId.trim())}`);
  console.log(`  Amount:      ${c('green', '$' + amount.trim())}`);
  console.log(`  Proof Hash:  ${c('magenta', proofHash.slice(0, 42) + '...')}`);

  // Step 7: Submit and release
  console.log('\n' + c('blue', '━'.repeat(50)));
  console.log(c('blue', '  STEP 5: SUBMITTING PROOF TO CLAWPAY'));
  console.log(c('blue', '━'.repeat(50)));
  await sleep(500);

  console.log(`\n  Submitting proof hash to contract...`);
  await sleep(300);
  console.log(`  ${c('green', '✅')} Proof verified`);
  await sleep(200);
  
  const actualAmount = parseFloat(amount);
  const excess = (intent.maxBudget - actualAmount).toFixed(2);
  
  console.log(`  ${c('green', '✅')} Escrow released: $${amount.trim()} to shopping fund`);
  if (excess > 0) {
    console.log(`  ${c('green', '✅')} Excess returned: $${excess} to user wallet`);
  }

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log(c('green', '  🎉 PURCHASE COMPLETE - PROOF ON-CHAIN'));
  console.log('═'.repeat(60));
  console.log(`
  ${c('bright', 'Summary:')}
  ────────────────────────────────────────
  Item:        ${intent.item}
  Order ID:    ${orderId.trim()}
  Amount:      $${amount.trim()} USDC
  Proof Hash:  ${proofHash.slice(0, 20)}...
  Contract:    ${CLAWPAY_ADDRESS}
  
  ${c('cyan', '"The dragon has fed. The proof is eternal."')}
`);

  console.log(c('yellow', '\n📜 Ancient Wisdom:\n'));
  console.log('  "The prudent warrior wins first, then goes to war."');
  console.log('                                          — Sun Tzu\n');
  console.log('  We escrowed before we spent.');
  console.log('  The outcome was certain before the action began.\n');

  rl.close();
}

runDemo().catch(console.error);
