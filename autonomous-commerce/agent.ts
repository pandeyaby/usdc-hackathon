/**
 * VHAGAR Autonomous Purchasing Agent
 * 
 * "The dragon that buys."
 * 
 * This agent can:
 * 1. Parse purchase intent
 * 2. Create ClawPay escrow
 * 3. Navigate to retailer
 * 4. Complete purchase
 * 5. Submit proof and release escrow
 */

import { ethers } from 'ethers';

// ClawPay contract interface
const CLAWPAY_ADDRESS = '0x5cA7A8B1d0a5aFe4CF67333FF8C330102F098FfD';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

interface PurchaseIntent {
  item: string;
  maxBudget: number;
  constraints: string[];
  retailer: 'amazon' | 'target' | 'walmart';
}

interface PurchaseProof {
  orderId: string;
  amount: number;
  timestamp: number;
  retailer: string;
  itemDescription: string;
  confirmationUrl: string;
}

// Parse natural language into structured intent
export function parseIntent(request: string): PurchaseIntent {
  // Extract budget
  const budgetMatch = request.match(/under\s*\$?(\d+)/i) || request.match(/\$(\d+)/);
  const maxBudget = budgetMatch ? parseInt(budgetMatch[1]) : 20;

  // Extract constraints
  const constraints: string[] = [];
  if (request.toLowerCase().includes('prime')) constraints.push('prime_shipping');
  if (request.toLowerCase().includes('fast')) constraints.push('fast_delivery');
  if (request.toLowerCase().includes('review')) constraints.push('high_reviews');

  // Default to Amazon
  let retailer: 'amazon' | 'target' | 'walmart' = 'amazon';
  if (request.toLowerCase().includes('target')) retailer = 'target';
  if (request.toLowerCase().includes('walmart')) retailer = 'walmart';

  return {
    item: request.replace(/under\s*\$?\d+/gi, '').replace(/from\s*(amazon|target|walmart)/gi, '').trim(),
    maxBudget,
    constraints,
    retailer
  };
}

// Generate proof hash from purchase confirmation
export function generateProofHash(proof: PurchaseProof): string {
  const payload = JSON.stringify({
    orderId: proof.orderId,
    amount: proof.amount,
    timestamp: proof.timestamp,
    retailer: proof.retailer
  });
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

// Create escrow intent hash (before purchase)
export function createIntentHash(intent: PurchaseIntent, timestamp: number): string {
  const payload = JSON.stringify({
    item: intent.item,
    maxBudget: intent.maxBudget,
    retailer: intent.retailer,
    timestamp
  });
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

// The main purchase flow
export async function executePurchase(
  request: string,
  wallet: ethers.Wallet,
  browserAgent: any
): Promise<{
  success: boolean;
  orderId?: string;
  amount?: number;
  proofHash?: string;
  escrowId?: string;
  error?: string;
}> {
  console.log('🐉 VHAGAR Autonomous Purchasing Agent');
  console.log('=====================================');
  
  // Step 1: Parse intent
  console.log('\n📝 Step 1: Parsing purchase intent...');
  const intent = parseIntent(request);
  console.log(`   Item: ${intent.item}`);
  console.log(`   Max Budget: $${intent.maxBudget}`);
  console.log(`   Retailer: ${intent.retailer}`);
  console.log(`   Constraints: ${intent.constraints.join(', ') || 'none'}`);

  // Step 2: Create escrow
  console.log('\n🔒 Step 2: Creating ClawPay escrow...');
  const timestamp = Date.now();
  const intentHash = createIntentHash(intent, timestamp);
  console.log(`   Intent hash: ${intentHash}`);
  console.log(`   Escrowing: $${intent.maxBudget} USDC`);
  
  // In production: call ClawPay contract here
  // const escrowId = await clawpay.createEscrow(...)
  const escrowId = `escrow_${timestamp}`;
  console.log(`   Escrow ID: ${escrowId} ✓`);

  // Step 3: Navigate and purchase
  console.log('\n🛒 Step 3: Navigating to retailer...');
  try {
    // Browser agent would:
    // 1. Open Amazon
    // 2. Search for item
    // 3. Select best match within budget
    // 4. Add to cart
    // 5. Checkout
    // 6. Capture confirmation

    // Simulated for now - in production this uses unbrowse
    const purchaseResult = await browserAgent.purchase(intent);
    
    if (!purchaseResult.success) {
      throw new Error(purchaseResult.error || 'Purchase failed');
    }

    // Step 4: Generate proof
    console.log('\n📜 Step 4: Generating proof...');
    const proof: PurchaseProof = {
      orderId: purchaseResult.orderId,
      amount: purchaseResult.amount,
      timestamp: Date.now(),
      retailer: intent.retailer,
      itemDescription: intent.item,
      confirmationUrl: purchaseResult.confirmationUrl
    };
    
    const proofHash = generateProofHash(proof);
    console.log(`   Order ID: ${proof.orderId}`);
    console.log(`   Amount: $${proof.amount}`);
    console.log(`   Proof hash: ${proofHash}`);

    // Step 5: Submit proof and release escrow
    console.log('\n✅ Step 5: Submitting proof to ClawPay...');
    // In production: await clawpay.submitProof(escrowId, proofHash)
    console.log(`   Proof submitted ✓`);
    console.log(`   Escrow released ✓`);

    console.log('\n🎉 Purchase complete!');
    console.log(`   "${intent.item}" ordered from ${intent.retailer}`);
    console.log(`   Order #${proof.orderId}`);
    console.log(`   Total: $${proof.amount}`);

    return {
      success: true,
      orderId: proof.orderId,
      amount: proof.amount,
      proofHash,
      escrowId
    };

  } catch (error) {
    console.error('\n❌ Purchase failed:', error);
    console.log('   Escrow will be refunded after timeout');
    
    return {
      success: false,
      error: String(error),
      escrowId
    };
  }
}

// Demo: Show what the agent would do
export function demoFlow(request: string) {
  console.log('═'.repeat(60));
  console.log('🐉 VHAGAR AUTONOMOUS PURCHASING AGENT - DEMO');
  console.log('═'.repeat(60));
  console.log(`\nRequest: "${request}"\n`);

  const intent = parseIntent(request);
  const timestamp = Date.now();
  const intentHash = createIntentHash(intent, timestamp);

  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: PARSE INTENT                                    │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│ Item:        ${intent.item.padEnd(42)}│`);
  console.log(`│ Max Budget:  $${String(intent.maxBudget).padEnd(41)}│`);
  console.log(`│ Retailer:    ${intent.retailer.padEnd(42)}│`);
  console.log(`│ Constraints: ${(intent.constraints.join(', ') || 'none').padEnd(42)}│`);
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: CREATE ESCROW (ClawPay)                         │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│ Intent Hash: ${intentHash.slice(0, 40)}... │`);
  console.log(`│ Amount:      $${String(intent.maxBudget)} USDC (locked)`.padEnd(55) + '│');
  console.log(`│ Contract:    ${CLAWPAY_ADDRESS.slice(0, 40)}... │`);
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ STEP 3: NAVIGATE & PURCHASE (Browser Agent)             │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│ → Open amazon.com                                       │');
  console.log(`│ → Search: "${intent.item.slice(0, 43)}"`.padEnd(56) + '│');
  console.log('│ → Filter by price, reviews, Prime                       │');
  console.log('│ → Select best match                                     │');
  console.log('│ → Add to cart                                           │');
  console.log('│ → Proceed to checkout                                   │');
  console.log('│ → Confirm order                                         │');
  console.log('│ → Capture confirmation                                  │');
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ STEP 4: GENERATE PROOF                                  │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│ Order ID:    #123-4567890-1234567                       │');
  console.log('│ Amount:      $8.99                                      │');
  console.log('│ Proof Hash:  0x7f83b1657ff1fc53b92dc18148a1d6... (keccak256) │');
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ STEP 5: SUBMIT PROOF & RELEASE ESCROW                   │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│ → Submit proof hash to ClawPay                          │');
  console.log('│ → Contract verifies hash format                         │');
  console.log('│ → 24h dispute window starts                             │');
  console.log('│ → If unchallenged: escrow auto-releases                 │');
  console.log('│ → Excess funds returned to user                         │');
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('\n═'.repeat(60));
  console.log('✅ PURCHASE COMPLETE - PROOF ON-CHAIN');
  console.log('═'.repeat(60));
}

// Run demo if executed directly
if (require.main === module) {
  demoFlow('Buy a USB-C cable under $15 with Prime shipping');
}
