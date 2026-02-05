/**
 * ClawPay Hash Escrow - Basic Usage Example
 * 
 * This example demonstrates the full lifecycle of a hash-verified escrow:
 * 1. Client creates job with expected output hash
 * 2. Worker submits work with actual hash
 * 3. Automatic release if hashes match
 */

import { HashVerifiedEscrow, hashString, hashFile, JobStatus } from '../src';

// Configuration
const config = {
  rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  privateKey: process.env.PRIVATE_KEY || '',
  contractAddress: process.env.ESCROW_ADDRESS || '',
  usdcAddress: process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

async function main() {
  if (!config.privateKey) {
    console.error('Set PRIVATE_KEY environment variable');
    process.exit(1);
  }

  const escrow = new HashVerifiedEscrow(config);
  console.log(`Connected as: ${escrow.address}`);
  console.log(`USDC Balance: ${await escrow.getBalance()} USDC`);

  // === Example 1: Simple String Hash ===
  console.log('\n=== Example 1: String Hash Verification ===');
  
  const expectedOutput = 'Hello, World!';
  const expectedHash = hashString(expectedOutput);
  console.log(`Expected hash: ${expectedHash}`);

  // Client creates job
  console.log('\nCreating job...');
  const { jobId, tx } = await escrow.createJob({
    worker: escrow.address, // Self-assign for demo
    expectedHash,
    amount: '1.00', // 1 USDC
    deadline: Date.now() + 24 * 60 * 60 * 1000, // 24h from now
    disputeWindow: 60, // 1 minute for demo
  });
  console.log(`Job created! ID: ${jobId}`);
  console.log(`TX: ${tx.hash}`);

  // Worker submits work
  console.log('\nSubmitting work...');
  const actualHash = hashString(expectedOutput); // Same output
  const submitTx = await escrow.submitWork({
    jobId,
    actualHash,
  });
  await submitTx.wait();
  console.log(`Work submitted! TX: ${submitTx.hash}`);

  // Check if hashes match
  const matches = await escrow.hashMatches(jobId);
  console.log(`Hash matches: ${matches}`);

  // Get job status
  const job = await escrow.getJob(jobId);
  console.log(`\nJob status: ${JobStatus[job.status]}`);

  // Wait for dispute window (60 seconds in demo)
  console.log('\nWaiting for dispute window to expire (60s)...');
  await new Promise(resolve => setTimeout(resolve, 65000));

  // Check if can release
  const canRelease = await escrow.canRelease(jobId);
  console.log(`Can release: ${canRelease}`);

  if (canRelease) {
    console.log('\nReleasing funds...');
    const releaseTx = await escrow.release(jobId);
    await releaseTx.wait();
    console.log(`Released! TX: ${releaseTx.hash}`);
  }

  // Final status
  const finalJob = await escrow.getJob(jobId);
  console.log(`\nFinal status: ${JobStatus[finalJob.status]}`);
  console.log(`Final USDC Balance: ${await escrow.getBalance()} USDC`);
}

// === Example 2: File Hash (commented out) ===
async function fileHashExample() {
  const escrow = new HashVerifiedEscrow(config);

  // Hash of expected deliverable file
  const expectedHash = hashFile('./expected-spec.md');

  const { jobId } = await escrow.createJob({
    worker: '0xWorkerAddress',
    expectedHash,
    amount: '100.00',
    deadline: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    metadataUri: 'ipfs://Qm.../job-spec.json',
  });

  // Worker submits their deliverable
  const actualHash = hashFile('./deliverable.md');
  await escrow.submitWork({
    jobId,
    actualHash,
    deliverableUri: 'ipfs://Qm.../deliverable.json',
  });

  // If hashes match, funds auto-release after dispute window
}

main().catch(console.error);
