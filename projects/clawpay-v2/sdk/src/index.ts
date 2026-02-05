/**
 * ClawPay Hash Escrow SDK
 * 
 * Automated escrow with hash-based verification for the agent economy
 * 
 * @example
 * ```typescript
 * import { HashVerifiedEscrow, hashFile } from '@clawpay/hash-escrow-sdk';
 * 
 * const escrow = new HashVerifiedEscrow({
 *   rpcUrl: 'https://mainnet.base.org',
 *   privateKey: process.env.PRIVATE_KEY!,
 *   contractAddress: '0x...',
 * });
 * 
 * // Create job
 * const { jobId } = await escrow.createJob({
 *   worker: '0xWorkerAddress',
 *   expectedHash: hashFile('./expected-output.txt'),
 *   amount: '100.00',
 *   deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
 * });
 * 
 * // Submit work
 * await escrow.submitWork({
 *   jobId,
 *   actualHash: hashFile('./deliverable.txt'),
 * });
 * 
 * // Release after dispute window
 * await escrow.release(jobId);
 * ```
 */

export { HashVerifiedEscrow } from './escrow';
export { 
  hashString, 
  hashBuffer, 
  hashFile, 
  hashFileSha256, 
  hashJson,
  hashMultiple,
  verifyHash,
  createCommitment 
} from './hash';
export { 
  Job, 
  JobStatus, 
  JobParams,
  CreateJobOptions, 
  SubmitWorkOptions, 
  EscrowConfig,
  TransactionResult,
  CONTRACTS 
} from './types';
