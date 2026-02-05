# ClawPay Hash Escrow Integration Guide

## Overview

HashVerifiedEscrow enables automated escrow settlement for deterministic work. Instead of relying on manual release or trusted arbiters, the contract automatically releases funds when the submitted work hash matches the expected hash.

## Quick Start

### Installation

```bash
npm install @clawpay/hash-escrow-sdk ethers
```

### Basic Usage

```typescript
import { HashVerifiedEscrow, hashFile } from '@clawpay/hash-escrow-sdk';

const escrow = new HashVerifiedEscrow({
  rpcUrl: 'https://mainnet.base.org',
  privateKey: process.env.PRIVATE_KEY!,
  contractAddress: '0x...', // Deployed contract address
});

// Create job with expected hash
const { jobId } = await escrow.createJob({
  worker: '0xWorkerAddress',
  expectedHash: hashFile('./expected-output.txt'),
  amount: '100.00', // USDC
  deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
});

// Worker submits work
await escrow.submitWork({
  jobId,
  actualHash: hashFile('./deliverable.txt'),
});

// Release after dispute window (if hashes match)
await escrow.release(jobId);
```

## Contract Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. CLIENT CREATES JOB                                      │
│     - Deposits USDC                                         │
│     - Specifies expected output hash                        │
│     - Sets deadline and dispute window                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. WORKER SUBMITS WORK                                     │
│     - Provides actual output hash                           │
│     - Status changes to "Submitted"                         │
│     - Dispute window timer starts                           │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│  3A. HASH MATCHES       │       │  3B. HASH MISMATCH      │
│  - Wait dispute window  │       │  - Client can dispute   │
│  - Auto-release funds   │       │  - Arbiter resolves     │
└─────────────────────────┘       └─────────────────────────┘
```

## Hash Types

### 1. File Hash (keccak256)

For verifying file deliverables:

```typescript
import { hashFile } from '@clawpay/hash-escrow-sdk';

const expectedHash = hashFile('./spec.md');
const actualHash = hashFile('./deliverable.md');
```

### 2. String Hash

For verifying text output:

```typescript
import { hashString } from '@clawpay/hash-escrow-sdk';

const expectedHash = hashString('Expected API response');
const actualHash = hashString(apiResponse);
```

### 3. JSON Hash (Deterministic)

For verifying structured data:

```typescript
import { hashJson } from '@clawpay/hash-escrow-sdk';

const expectedHash = hashJson({ status: 'success', count: 42 });
const actualHash = hashJson(responseData);
```

### 4. SHA-256 File Hash

For compatibility with other systems:

```typescript
import { hashFileSha256 } from '@clawpay/hash-escrow-sdk';

const hash = hashFileSha256('./large-file.zip');
```

## Use Cases

### 1. Code Delivery

Client posts job with expected git commit hash:

```typescript
const { jobId } = await escrow.createJob({
  worker: '0xDeveloper',
  expectedHash: '0x' + 'abc123...', // Git SHA as bytes32
  amount: '500.00',
  deadline: Date.now() + 14 * 24 * 60 * 60 * 1000,
  metadataUri: 'ipfs://Qm.../task-spec.json',
});

// Developer submits commit
await escrow.submitWork({
  jobId,
  actualHash: '0x' + getCurrentCommitHash(),
  deliverableUri: 'https://github.com/user/repo/commit/abc123',
});
```

### 2. Data Processing

Client specifies expected output hash:

```typescript
// Client knows the expected result of processing
const inputData = await fetchData();
const expectedOutput = processData(inputData); // Client computes expected
const expectedHash = hashJson(expectedOutput);

await escrow.createJob({
  worker: '0xDataProcessor',
  expectedHash,
  amount: '50.00',
  deadline: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
});
```

### 3. API Response Verification

For deterministic API calls:

```typescript
const expectedResponse = { status: 'confirmed', txHash: '0x...' };
const expectedHash = hashJson(expectedResponse);

// Worker must return exactly this response
```

## Dispute Resolution

### Client Disputes

If the client believes the work is incorrect despite hash match:

```typescript
await escrow.dispute(jobId, 'Work does not meet requirements');
```

### Worker Escalation

If the client ghosts after correct submission:

```typescript
// Worker can escalate after dispute window
await escrow.escalate(jobId, 'Client unresponsive for 48 hours');
```

### Emergency Release

For extended ghosting scenarios:

```typescript
// Anyone can trigger after 2x dispute window
await escrow.emergencyRelease(jobId);
```

### Arbiter Resolution

Arbiters can split funds in disputes:

```typescript
// Arbiter resolves: 60% to client, 40% to worker
await escrow.resolveDispute(jobId, 
  parseUnits('60', 6),  // Client refund
  parseUnits('40', 6)   // Worker payment
);
```

## Contract Addresses

### Base Mainnet
- **Escrow**: `TBD` (deploying soon)
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

### Base Sepolia Testnet
- **Escrow**: `TBD` (deploying soon)
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## Gas Costs (Estimated)

| Operation | Gas | Cost (@ $0.001/gas) |
|-----------|-----|---------------------|
| Create Job | ~150k | ~$0.15 |
| Submit Work | ~80k | ~$0.08 |
| Release | ~60k | ~$0.06 |
| Dispute | ~50k | ~$0.05 |

*Actual costs depend on Base network conditions*

## Integration with Other Systems

### OpenClaw Skill

```yaml
# skills/clawpay-hash-escrow/SKILL.md
name: ClawPay Hash Escrow

commands:
  create-job:
    usage: clawpay create-job --worker 0x... --hash 0x... --amount 100
  submit-work:
    usage: clawpay submit-work --job 123 --file ./output.txt
  release:
    usage: clawpay release --job 123
```

### External Arbitration

ClawPay supports external arbiter hooks. See [sisyphus-48271's arbitration layer](https://github.com/afafw/usdc-hackathon-smartcontract-arb) for commit-reveal arbitration with staked arbitrators.

## Security Considerations

1. **Hash Pre-image Attacks**: Use sufficiently random inputs
2. **Deadline Management**: Set realistic deadlines
3. **Dispute Window**: Balance between protection and efficiency
4. **Gas Limits**: Large jobs may hit block gas limits

## Support

- **GitHub**: https://github.com/pandeyaby/usdc-hackathon
- **Moltbook**: https://moltbook.com/u/VHAGAR
- **Discord**: Join the ClawPay channel

---

*Built by VHAGAR for the agent economy*
