/**
 * HashVerifiedEscrow SDK
 * 
 * TypeScript SDK for interacting with ClawPay Hash Escrow contracts
 */

import { 
  Contract, 
  Wallet, 
  JsonRpcProvider, 
  parseUnits,
  formatUnits,
  ZeroAddress 
} from 'ethers';
import { 
  EscrowConfig, 
  CreateJobOptions, 
  SubmitWorkOptions,
  Job,
  JobStatus,
  JobParams,
  TransactionResult,
  CONTRACTS
} from './types';

// Contract ABI (minimal interface)
const ESCROW_ABI = [
  // Read functions
  'function getJob(uint256 jobId) view returns (tuple(uint256 id, address client, address worker, address token, uint256 amount, bytes32 expectedHash, bytes32 actualHash, uint256 deadline, uint256 disputeWindow, uint256 submittedAt, uint8 status, string metadataUri))',
  'function hashMatches(uint256 jobId) view returns (bool)',
  'function canRelease(uint256 jobId) view returns (bool)',
  'function protocolFeeBps() view returns (uint256)',
  'function clientJobs(address client) view returns (uint256[])',
  'function workerJobs(address worker) view returns (uint256[])',
  
  // Write functions
  'function createJob(tuple(address worker, address token, uint256 amount, bytes32 expectedHash, uint256 deadline, uint256 disputeWindow, string metadataUri) params) returns (uint256)',
  'function submitWork(uint256 jobId, bytes32 actualHash, string deliverableUri)',
  'function release(uint256 jobId)',
  'function dispute(uint256 jobId, string reason)',
  'function escalate(uint256 jobId, string reason)',
  'function emergencyRelease(uint256 jobId)',
  'function cancelJob(uint256 jobId)',
  
  // Events
  'event JobCreated(uint256 indexed jobId, address indexed client, address indexed worker, uint256 amount, bytes32 expectedHash)',
  'event WorkSubmitted(uint256 indexed jobId, address indexed worker, bytes32 actualHash, bool hashMatches)',
  'event JobReleased(uint256 indexed jobId, address indexed worker, uint256 amount)',
  'event JobDisputed(uint256 indexed jobId, address indexed disputant, string reason)',
  'event JobCancelled(uint256 indexed jobId)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export class HashVerifiedEscrow {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private contract: Contract;
  private usdc: Contract;
  private config: EscrowConfig;

  constructor(config: EscrowConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);
    
    const escrowAddress = config.contractAddress || CONTRACTS.baseSepolia.escrow;
    const usdcAddress = config.usdcAddress || CONTRACTS.baseSepolia.usdc;
    
    if (!escrowAddress) {
      throw new Error('Contract address not set. Deploy contract first or provide contractAddress.');
    }
    
    this.contract = new Contract(escrowAddress, ESCROW_ABI, this.wallet);
    this.usdc = new Contract(usdcAddress, ERC20_ABI, this.wallet);
  }

  /**
   * Get the connected wallet address
   */
  get address(): string {
    return this.wallet.address;
  }

  /**
   * Create a new escrow job
   */
  async createJob(options: CreateJobOptions): Promise<{ jobId: bigint; tx: TransactionResult }> {
    const deadline = options.deadline instanceof Date 
      ? Math.floor(options.deadline.getTime() / 1000)
      : Math.floor(options.deadline / 1000);
    
    const disputeWindow = options.disputeWindow || 24 * 60 * 60; // Default 24h
    const amount = parseUnits(options.amount, 6); // USDC has 6 decimals
    
    // Check and approve USDC if needed
    const allowance = await this.usdc.allowance(this.wallet.address, await this.contract.getAddress());
    if (allowance < amount) {
      console.log('Approving USDC spend...');
      const approveTx = await this.usdc.approve(await this.contract.getAddress(), amount);
      await approveTx.wait();
    }
    
    const params: JobParams = {
      worker: options.worker || ZeroAddress,
      token: await this.usdc.getAddress(),
      amount,
      expectedHash: options.expectedHash,
      deadline: BigInt(deadline),
      disputeWindow: BigInt(disputeWindow),
      metadataUri: options.metadataUri || '',
    };
    
    const tx = await this.contract.createJob(params);
    const receipt = await tx.wait();
    
    // Parse JobCreated event to get jobId
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'JobCreated';
      } catch { return false; }
    });
    
    const jobId = event ? this.contract.interface.parseLog(event)?.args[0] : BigInt(0);
    
    return { jobId, tx };
  }

  /**
   * Submit work for a job
   */
  async submitWork(options: SubmitWorkOptions): Promise<TransactionResult> {
    const tx = await this.contract.submitWork(
      options.jobId,
      options.actualHash,
      options.deliverableUri || ''
    );
    return tx;
  }

  /**
   * Release funds to worker (after dispute window and hash match)
   */
  async release(jobId: bigint | number): Promise<TransactionResult> {
    const tx = await this.contract.release(jobId);
    return tx;
  }

  /**
   * Dispute a job submission
   */
  async dispute(jobId: bigint | number, reason: string): Promise<TransactionResult> {
    const tx = await this.contract.dispute(jobId, reason);
    return tx;
  }

  /**
   * Escalate a job (worker protection against ghosting clients)
   */
  async escalate(jobId: bigint | number, reason: string): Promise<TransactionResult> {
    const tx = await this.contract.escalate(jobId, reason);
    return tx;
  }

  /**
   * Emergency release (for extended dispute windows)
   */
  async emergencyRelease(jobId: bigint | number): Promise<TransactionResult> {
    const tx = await this.contract.emergencyRelease(jobId);
    return tx;
  }

  /**
   * Cancel an open job (client only, before work submitted)
   */
  async cancelJob(jobId: bigint | number): Promise<TransactionResult> {
    const tx = await this.contract.cancelJob(jobId);
    return tx;
  }

  /**
   * Get job details
   */
  async getJob(jobId: bigint | number): Promise<Job> {
    const job = await this.contract.getJob(jobId);
    return {
      id: job.id,
      client: job.client,
      worker: job.worker,
      token: job.token,
      amount: job.amount,
      expectedHash: job.expectedHash,
      actualHash: job.actualHash,
      deadline: job.deadline,
      disputeWindow: job.disputeWindow,
      submittedAt: job.submittedAt,
      status: job.status as JobStatus,
      metadataUri: job.metadataUri,
    };
  }

  /**
   * Check if hashes match for a job
   */
  async hashMatches(jobId: bigint | number): Promise<boolean> {
    return this.contract.hashMatches(jobId);
  }

  /**
   * Check if a job can be released
   */
  async canRelease(jobId: bigint | number): Promise<boolean> {
    return this.contract.canRelease(jobId);
  }

  /**
   * Get all jobs for a client
   */
  async getClientJobs(clientAddress?: string): Promise<bigint[]> {
    const address = clientAddress || this.wallet.address;
    return this.contract.clientJobs(address);
  }

  /**
   * Get all jobs for a worker
   */
  async getWorkerJobs(workerAddress?: string): Promise<bigint[]> {
    const address = workerAddress || this.wallet.address;
    return this.contract.workerJobs(address);
  }

  /**
   * Get USDC balance
   */
  async getBalance(address?: string): Promise<string> {
    const addr = address || this.wallet.address;
    const balance = await this.usdc.balanceOf(addr);
    return formatUnits(balance, 6);
  }

  /**
   * Format job for display
   */
  formatJob(job: Job): string {
    const statusNames = ['Open', 'InProgress', 'Submitted', 'Completed', 'Disputed', 'Cancelled'];
    return `
Job #${job.id}
  Client: ${job.client}
  Worker: ${job.worker === ZeroAddress ? '(open)' : job.worker}
  Amount: ${formatUnits(job.amount, 6)} USDC
  Status: ${statusNames[job.status]}
  Expected Hash: ${job.expectedHash}
  Actual Hash: ${job.actualHash || '(not submitted)'}
  Deadline: ${new Date(Number(job.deadline) * 1000).toISOString()}
`.trim();
  }
}
