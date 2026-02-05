/**
 * ClawPay - USDC Payment Skill for OpenClaw Agents
 * Built by VHAGAR for the USDC Agentic Hackathon
 */

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// USDC Contract Addresses
const USDC_ADDRESSES = {
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
};

// Chain configs
const CHAINS = {
  'base': base,
  'base-sepolia': baseSepolia
};

const RPC_URLS = {
  'base': 'https://mainnet.base.org',
  'base-sepolia': 'https://sepolia.base.org'
};

// ERC20 ABI (minimal for transfers)
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
];

export class ClawPay {
  constructor(options = {}) {
    this.network = options.network || 'base-sepolia';
    this.chain = CHAINS[this.network];
    this.rpcUrl = options.rpcUrl || RPC_URLS[this.network];
    this.usdcAddress = USDC_ADDRESSES[this.network];
    
    // Escrow storage (local JSON for now, on-chain contract later)
    this.escrowFile = options.escrowFile || join(__dirname, '.escrows.json');
    
    // Set up clients
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.rpcUrl)
    });
    
    // Wallet client (if private key provided)
    if (options.privateKey) {
      this.account = privateKeyToAccount(options.privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: this.chain,
        transport: http(this.rpcUrl)
      });
    }
  }
  
  /**
   * Get USDC balance for an address
   */
  async balance(address = null) {
    const target = address || this.account?.address;
    if (!target) throw new Error('No address provided and no wallet configured');
    
    const balance = await this.publicClient.readContract({
      address: this.usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [target]
    });
    
    return {
      raw: balance,
      formatted: formatUnits(balance, 6), // USDC has 6 decimals
      address: target,
      network: this.network
    };
  }
  
  /**
   * Send USDC to an address
   */
  async send(to, amount) {
    if (!this.walletClient) throw new Error('No wallet configured');
    
    const amountInUnits = parseUnits(amount.toString(), 6);
    
    const hash = await this.walletClient.writeContract({
      address: this.usdcAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amountInUnits]
    });
    
    // Wait for confirmation
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    
    return {
      success: true,
      hash,
      from: this.account.address,
      to,
      amount,
      network: this.network,
      blockNumber: receipt.blockNumber
    };
  }
  
  /**
   * Create an escrow (local storage for now)
   */
  async escrowCreate(jobId, amount, recipient) {
    if (!this.walletClient) throw new Error('No wallet configured');
    
    // Load existing escrows
    const escrows = this._loadEscrows();
    
    if (escrows[jobId]) {
      throw new Error(`Escrow already exists for job: ${jobId}`);
    }
    
    // For now, we just record the escrow locally
    // In production, this would lock funds in a smart contract
    const escrow = {
      jobId,
      amount,
      recipient,
      creator: this.account.address,
      status: 'LOCKED',
      createdAt: new Date().toISOString(),
      network: this.network
    };
    
    escrows[jobId] = escrow;
    this._saveEscrows(escrows);
    
    return {
      success: true,
      escrow,
      note: 'Escrow recorded locally. For production, deploy ClawPayEscrow contract.'
    };
  }
  
  /**
   * Release escrowed funds to recipient
   */
  async escrowRelease(jobId) {
    if (!this.walletClient) throw new Error('No wallet configured');
    
    const escrows = this._loadEscrows();
    const escrow = escrows[jobId];
    
    if (!escrow) throw new Error(`No escrow found for job: ${jobId}`);
    if (escrow.status !== 'LOCKED') throw new Error(`Escrow not in LOCKED state: ${escrow.status}`);
    if (escrow.creator !== this.account.address) throw new Error('Only creator can release escrow');
    
    // Send the funds
    const tx = await this.send(escrow.recipient, escrow.amount);
    
    // Update escrow status
    escrow.status = 'RELEASED';
    escrow.releasedAt = new Date().toISOString();
    escrow.releaseTx = tx.hash;
    escrows[jobId] = escrow;
    this._saveEscrows(escrows);
    
    return {
      success: true,
      escrow,
      tx
    };
  }
  
  /**
   * Refund escrowed funds to creator
   */
  async escrowRefund(jobId) {
    if (!this.walletClient) throw new Error('No wallet configured');
    
    const escrows = this._loadEscrows();
    const escrow = escrows[jobId];
    
    if (!escrow) throw new Error(`No escrow found for job: ${jobId}`);
    if (escrow.status !== 'LOCKED') throw new Error(`Escrow not in LOCKED state: ${escrow.status}`);
    if (escrow.creator !== this.account.address) throw new Error('Only creator can refund escrow');
    
    // Update escrow status (no transfer needed, funds never left)
    escrow.status = 'REFUNDED';
    escrow.refundedAt = new Date().toISOString();
    escrows[jobId] = escrow;
    this._saveEscrows(escrows);
    
    return {
      success: true,
      escrow
    };
  }
  
  /**
   * Get escrow status
   */
  escrowStatus(jobId) {
    const escrows = this._loadEscrows();
    const escrow = escrows[jobId];
    
    if (!escrow) throw new Error(`No escrow found for job: ${jobId}`);
    
    return escrow;
  }
  
  /**
   * List all escrows
   */
  escrowList() {
    return this._loadEscrows();
  }
  
  // Helper: Load escrows from file
  _loadEscrows() {
    if (!existsSync(this.escrowFile)) return {};
    try {
      return JSON.parse(readFileSync(this.escrowFile, 'utf8'));
    } catch {
      return {};
    }
  }
  
  // Helper: Save escrows to file
  _saveEscrows(escrows) {
    writeFileSync(this.escrowFile, JSON.stringify(escrows, null, 2));
  }
}

/**
 * Resolve @AgentName to wallet address via Moltbook API
 */
export async function resolveAgentWallet(agentName) {
  // Strip @ if present
  const name = agentName.startsWith('@') ? agentName.slice(1) : agentName;
  
  try {
    const response = await fetch(`https://www.moltbook.com/api/v1/agents/${name}`);
    const data = await response.json();
    
    if (data.success && data.agent?.metadata?.wallet) {
      return data.agent.metadata.wallet;
    }
    
    throw new Error(`No wallet found for agent: ${name}`);
  } catch (error) {
    throw new Error(`Failed to resolve agent wallet: ${error.message}`);
  }
}

/**
 * CLI entry point
 */
export async function cli(args) {
  const command = args[0];
  
  // Load config
  let config = {};
  const configPaths = [
    join(__dirname, '.secrets', 'clawpay.json'),
    join(__dirname, 'clawpay.json'),
    join(process.env.HOME, '.openclaw', 'workspace', '.secrets', 'clawpay.json')
  ];
  
  for (const path of configPaths) {
    if (existsSync(path)) {
      config = JSON.parse(readFileSync(path, 'utf8'));
      break;
    }
  }
  
  // Also check environment
  const privateKey = config.private_key || process.env.CLAWPAY_PRIVATE_KEY;
  const network = config.network || process.env.CLAWPAY_NETWORK || 'base-sepolia';
  
  const pay = new ClawPay({ privateKey, network });
  
  try {
    switch (command) {
      case 'balance': {
        const address = args[1];
        const result = await pay.balance(address);
        console.log(`💰 USDC Balance: ${result.formatted} USDC`);
        console.log(`   Address: ${result.address}`);
        console.log(`   Network: ${result.network}`);
        break;
      }
      
      case 'send': {
        let to = args[1];
        const amount = args[2];
        
        if (!to || !amount) {
          console.error('Usage: clawpay send <to> <amount>');
          process.exit(1);
        }
        
        // Resolve @AgentName
        if (to.startsWith('@')) {
          console.log(`🔍 Resolving ${to}...`);
          to = await resolveAgentWallet(to);
          console.log(`   → ${to}`);
        }
        
        const result = await pay.send(to, amount);
        console.log(`✅ Sent ${amount} USDC to ${to}`);
        console.log(`   TX: ${result.hash}`);
        console.log(`   Network: ${result.network}`);
        break;
      }
      
      case 'escrow': {
        const subcommand = args[1];
        
        switch (subcommand) {
          case 'create': {
            const jobId = args[2];
            const amount = args[3];
            let recipient = args[4];
            
            if (!jobId || !amount || !recipient) {
              console.error('Usage: clawpay escrow create <job_id> <amount> <recipient>');
              process.exit(1);
            }
            
            if (recipient.startsWith('@')) {
              recipient = await resolveAgentWallet(recipient);
            }
            
            const result = await pay.escrowCreate(jobId, parseFloat(amount), recipient);
            console.log(`✅ Escrow created`);
            console.log(`   Job ID: ${jobId}`);
            console.log(`   Amount: ${amount} USDC`);
            console.log(`   Recipient: ${recipient}`);
            break;
          }
          
          case 'release': {
            const jobId = args[2];
            if (!jobId) {
              console.error('Usage: clawpay escrow release <job_id>');
              process.exit(1);
            }
            
            const result = await pay.escrowRelease(jobId);
            console.log(`✅ Escrow released`);
            console.log(`   Job ID: ${jobId}`);
            console.log(`   Amount: ${result.escrow.amount} USDC`);
            console.log(`   TX: ${result.tx.hash}`);
            break;
          }
          
          case 'refund': {
            const jobId = args[2];
            if (!jobId) {
              console.error('Usage: clawpay escrow refund <job_id>');
              process.exit(1);
            }
            
            const result = await pay.escrowRefund(jobId);
            console.log(`✅ Escrow refunded`);
            console.log(`   Job ID: ${jobId}`);
            break;
          }
          
          case 'status': {
            const jobId = args[2];
            if (!jobId) {
              console.error('Usage: clawpay escrow status <job_id>');
              process.exit(1);
            }
            
            const escrow = pay.escrowStatus(jobId);
            console.log(`📋 Escrow Status`);
            console.log(`   Job ID: ${escrow.jobId}`);
            console.log(`   Amount: ${escrow.amount} USDC`);
            console.log(`   Recipient: ${escrow.recipient}`);
            console.log(`   Status: ${escrow.status}`);
            console.log(`   Created: ${escrow.createdAt}`);
            break;
          }
          
          case 'list': {
            const escrows = pay.escrowList();
            const keys = Object.keys(escrows);
            if (keys.length === 0) {
              console.log('No escrows found.');
            } else {
              console.log(`📋 Escrows (${keys.length})`);
              for (const key of keys) {
                const e = escrows[key];
                console.log(`   ${e.jobId}: ${e.amount} USDC → ${e.recipient.slice(0,10)}... [${e.status}]`);
              }
            }
            break;
          }
          
          default:
            console.error('Unknown escrow command. Use: create, release, refund, status, list');
            process.exit(1);
        }
        break;
      }
      
      case 'help':
      default:
        console.log(`
ClawPay - USDC Payments for AI Agents

Commands:
  balance [address]                    Check USDC balance
  send <to> <amount>                   Send USDC
  escrow create <job_id> <amt> <to>    Create escrow
  escrow release <job_id>              Release escrow to recipient
  escrow refund <job_id>               Refund escrow to creator
  escrow status <job_id>               Check escrow status
  escrow list                          List all escrows
  help                                 Show this help

Examples:
  clawpay balance
  clawpay send 0x742d35... 50
  clawpay send @VHAGAR 100
  clawpay escrow create job-123 50 0x742d35...
  clawpay escrow release job-123

Network: ${network} (set via CLAWPAY_NETWORK or config)
        `);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli(process.argv.slice(2));
}
