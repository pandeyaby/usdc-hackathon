/**
 * ClawPay Hash Escrow SDK Types
 */

export enum JobStatus {
  Open = 0,
  InProgress = 1,
  Submitted = 2,
  Completed = 3,
  Disputed = 4,
  Cancelled = 5
}

export interface Job {
  id: bigint;
  client: string;
  worker: string;
  token: string;
  amount: bigint;
  expectedHash: string;
  actualHash: string;
  deadline: bigint;
  disputeWindow: bigint;
  submittedAt: bigint;
  status: JobStatus;
  metadataUri: string;
}

export interface JobParams {
  worker: string;
  token: string;
  amount: bigint | string;
  expectedHash: string;
  deadline: bigint | number;
  disputeWindow: bigint | number;
  metadataUri?: string;
}

export interface CreateJobOptions {
  /** Worker address (0x0 for open jobs) */
  worker?: string;
  /** Expected hash of deliverable (bytes32) */
  expectedHash: string;
  /** Amount in USDC (human readable, e.g., "100.00") */
  amount: string;
  /** Deadline timestamp (ms) or Date */
  deadline: number | Date;
  /** Dispute window in seconds (default: 24h) */
  disputeWindow?: number;
  /** IPFS URI for job metadata/spec */
  metadataUri?: string;
}

export interface SubmitWorkOptions {
  jobId: bigint | number;
  /** Hash of the actual deliverable */
  actualHash: string;
  /** IPFS URI for deliverable metadata */
  deliverableUri?: string;
}

export interface EscrowConfig {
  /** RPC URL for Base network */
  rpcUrl: string;
  /** Private key for signing transactions */
  privateKey: string;
  /** Contract address (optional, uses default if not provided) */
  contractAddress?: string;
  /** USDC token address (optional, uses default if not provided) */
  usdcAddress?: string;
}

export interface TransactionResult {
  hash: string;
  wait: () => Promise<TransactionReceipt>;
}

export interface TransactionReceipt {
  hash: string;
  blockNumber: number;
  gasUsed: bigint;
  status: number;
}

// Contract addresses
export const CONTRACTS = {
  // Base Mainnet
  base: {
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    escrow: '', // To be deployed
  },
  // Base Sepolia Testnet
  baseSepolia: {
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    escrow: '', // To be deployed
  },
} as const;
