#!/usr/bin/env node
/**
 * 🐉 VHAGAR Autonomous Purchasing Agent - Auto Demo
 * 
 * Run: node demo-auto.js
 * 
 * Simulates a complete purchase flow for demo/video purposes.
 */

const crypto = require('crypto');

const CLAWPAY_ADDRESS = '0x5cA7A8B1d0a5aFe4CF67333FF8C330102F098FfD';

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

function keccak256(data) {
  return '0x' + crypto.createHash('sha256').update(data).digest('hex');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeText(text, delay = 30) {
  for (const char of text) {
    process.stdout.write(char);
    await sleep(delay);
  }
  console.log();
}

async function runDemo() {
  // Simulated purchase details
  const request = "Buy a USB-C cable under $10 from Amazon with Prime shipping";
  const orderId = "123-4567890-1234567";
  const amount = "8.99";

  console.clear();
  console.log('\n' + '═'.repeat(65));
  console.log(c('magenta', '     🐉 VHAGAR AUTONOMOUS PURCHASING AGENT'));
  console.log(c('cyan', '        "The dragon that buys."'));
  console.log('═'.repeat(65) + '\n');

  await sleep(1500);

  // Step 1: Request
  console.log(c('yellow', '📝 Purchase Request Received:\n'));
  await sleep(500);
  await typeText(`   "${c('bright', request)}"`, 25);

  await sleep(1000);

  // Step 2: Parse intent
  console.log('\n' + c('blue', '┌─────────────────────────────────────────────────────────────┐'));
  console.log(c('blue', '│') + c('bright', '  STEP 1: PARSING INTENT') + ' '.repeat(36) + c('blue', '│'));
  console.log(c('blue', '├─────────────────────────────────────────────────────────────┤'));
  await sleep(500);
  console.log(c('blue', '│') + `  Item:        ${c('cyan', 'USB-C cable')}` + ' '.repeat(33) + c('blue', '│'));
  await sleep(200);
  console.log(c('blue', '│') + `  Max Budget:  ${c('green', '$10.00 USDC')}` + ' '.repeat(32) + c('blue', '│'));
  await sleep(200);
  console.log(c('blue', '│') + `  Retailer:    ${c('yellow', 'Amazon')}` + ' '.repeat(37) + c('blue', '│'));
  await sleep(200);
  console.log(c('blue', '│') + `  Constraints: ${c('magenta', 'prime_shipping')}` + ' '.repeat(29) + c('blue', '│'));
  console.log(c('blue', '└─────────────────────────────────────────────────────────────┘'));

  await sleep(1200);

  // Step 3: Create escrow
  console.log('\n' + c('blue', '┌─────────────────────────────────────────────────────────────┐'));
  console.log(c('blue', '│') + c('bright', '  STEP 2: CREATING CLAWPAY ESCROW') + ' '.repeat(27) + c('blue', '│'));
  console.log(c('blue', '├─────────────────────────────────────────────────────────────┤'));
  
  const timestamp = Date.now();
  const intentHash = keccak256(JSON.stringify({ item: 'USB-C cable', maxBudget: 10, timestamp }));
  
  await sleep(500);
  console.log(c('blue', '│') + `  Intent Hash: ${c('cyan', intentHash.slice(0, 40))}...` + c('blue', '│'));
  await sleep(200);
  console.log(c('blue', '│') + `  Amount:      ${c('green', '$10.00 USDC')} ${c('dim', '(locked on-chain)')}` + ' '.repeat(14) + c('blue', '│'));
  await sleep(200);
  console.log(c('blue', '│') + `  Contract:    ${c('yellow', CLAWPAY_ADDRESS.slice(0, 40))}...` + c('blue', '│'));
  await sleep(300);
  console.log(c('blue', '│') + ' '.repeat(61) + c('blue', '│'));
  console.log(c('blue', '│') + `  ${c('green', '✅ Escrow created! Funds secured before purchase.')}` + ' '.repeat(9) + c('blue', '│'));
  console.log(c('blue', '└─────────────────────────────────────────────────────────────┘'));

  await sleep(1500);

  // Step 4: Browser navigation (simulated)
  console.log('\n' + c('blue', '┌─────────────────────────────────────────────────────────────┐'));
  console.log(c('blue', '│') + c('bright', '  STEP 3: AUTONOMOUS BROWSER NAVIGATION') + ' '.repeat(21) + c('blue', '│'));
  console.log(c('blue', '├─────────────────────────────────────────────────────────────┤'));

  const steps = [
    '→ Opening amazon.com...',
    '→ Searching: "USB-C cable Prime"...',
    '→ Filtering: Price < $10, Prime eligible...',
    '→ Analyzing 47 results...',
    '→ Selected: "USB-C Cable 6ft, Fast Charging" ($8.99, 4.7★)',
    '→ Adding to cart...',
    '→ Proceeding to checkout...',
    '→ Using saved payment method...',
    '→ Confirming shipping address...',
    '→ Placing order...',
  ];

  for (const step of steps) {
    await sleep(400);
    console.log(c('blue', '│') + `  ${c('cyan', step)}` + ' '.repeat(Math.max(0, 60 - step.length - 2)) + c('blue', '│'));
  }

  await sleep(600);
  console.log(c('blue', '│') + ' '.repeat(61) + c('blue', '│'));
  console.log(c('blue', '│') + `  ${c('green', '✅ Order placed successfully!')}` + ' '.repeat(31) + c('blue', '│'));
  console.log(c('blue', '└─────────────────────────────────────────────────────────────┘'));

  await sleep(1200);

  // Step 5: Generate proof
  console.log('\n' + c('blue', '┌─────────────────────────────────────────────────────────────┐'));
  console.log(c('blue', '│') + c('bright', '  STEP 4: GENERATING CRYPTOGRAPHIC PROOF') + ' '.repeat(20) + c('blue', '│'));
  console.log(c('blue', '├─────────────────────────────────────────────────────────────┤'));

  const proofPayload = JSON.stringify({ orderId, amount: parseFloat(amount), timestamp: Date.now(), retailer: 'amazon' });
  const proofHash = keccak256(proofPayload);

  await sleep(500);
  console.log(c('blue', '│') + `  Order ID:    ${c('cyan', orderId)}` + ' '.repeat(23) + c('blue', '│'));
  await sleep(200);
  console.log(c('blue', '│') + `  Amount:      ${c('green', '$' + amount)}` + ' '.repeat(40) + c('blue', '│'));
  await sleep(200);
  console.log(c('blue', '│') + `  Timestamp:   ${c('dim', new Date().toISOString())}` + ' '.repeat(16) + c('blue', '│'));
  await sleep(300);
  console.log(c('blue', '│') + ' '.repeat(61) + c('blue', '│'));
  console.log(c('blue', '│') + `  ${c('magenta', 'Proof Hash:')} ${proofHash.slice(0, 44)}...` + c('blue', '│'));
  console.log(c('blue', '└─────────────────────────────────────────────────────────────┘'));

  await sleep(1200);

  // Step 6: Submit and release
  console.log('\n' + c('blue', '┌─────────────────────────────────────────────────────────────┐'));
  console.log(c('blue', '│') + c('bright', '  STEP 5: SUBMITTING PROOF & RELEASING ESCROW') + ' '.repeat(15) + c('blue', '│'));
  console.log(c('blue', '├─────────────────────────────────────────────────────────────┤'));

  await sleep(500);
  console.log(c('blue', '│') + `  Submitting proof to ClawPay contract...` + ' '.repeat(19) + c('blue', '│'));
  await sleep(600);
  console.log(c('blue', '│') + `  ${c('green', '✅')} Proof verified on-chain` + ' '.repeat(33) + c('blue', '│'));
  await sleep(400);
  console.log(c('blue', '│') + `  ${c('green', '✅')} Escrow released: $8.99 to shopping fund` + ' '.repeat(17) + c('blue', '│'));
  await sleep(400);
  console.log(c('blue', '│') + `  ${c('green', '✅')} Excess returned: $1.01 to user wallet` + ' '.repeat(19) + c('blue', '│'));
  console.log(c('blue', '└─────────────────────────────────────────────────────────────┘'));

  await sleep(1500);

  // Final summary
  console.log('\n' + '═'.repeat(65));
  console.log(c('green', '     🎉 PURCHASE COMPLETE — PROOF RECORDED ON-CHAIN'));
  console.log('═'.repeat(65));

  console.log(`
  ${c('bright', 'Transaction Summary')}
  ─────────────────────────────────────────────────────────────
  Item:          USB-C Cable 6ft, Fast Charging
  Order ID:      ${c('cyan', orderId)}
  Amount:        ${c('green', '$8.99 USDC')}
  Proof Hash:    ${c('magenta', proofHash.slice(0, 30) + '...')}
  Contract:      ${c('yellow', CLAWPAY_ADDRESS)}
  ─────────────────────────────────────────────────────────────
`);

  await sleep(1000);

  console.log(c('yellow', '  📜 Ancient Wisdom:\n'));
  console.log(c('dim', '     "The prudent warrior wins first, then goes to war."'));
  console.log(c('dim', '                                               — Sun Tzu\n'));
  
  await sleep(800);
  
  console.log(c('cyan', '     We escrowed before we spent.'));
  console.log(c('cyan', '     The outcome was certain before the action began.'));
  console.log(c('cyan', '     The proof is eternal. The dragon has fed.\n'));

  console.log('═'.repeat(65));
  console.log(c('magenta', '     VHAGAR — Built for #USDCHackathon 2026'));
  console.log('═'.repeat(65) + '\n');
}

runDemo().catch(console.error);
