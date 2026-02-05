# ClawPay v2: Week 1 Sprint
## "1 Week to Automated Escrow"

**Goal**: Automated hash-based work verification for deterministic outputs

**Start**: February 5, 2026
**End**: February 12, 2026

---

## What We're Building

### The Problem
Current ClawPay escrow requires manual release. Client must:
1. Receive deliverable
2. Review it
3. Manually trigger release

This works, but doesn't scale. Agents need **autonomous settlement**.

### The Solution: Hash Verification

For deterministic work (code, files, data), we can verify automatically:

```
1. Client posts job with expected_hash
2. Worker submits work + actual_hash  
3. Contract compares hashes
4. Match → Auto-release
5. Mismatch → Dispute window
```

**Use Cases:**
- Code commits matching spec
- Data transformations with known outputs
- File deliveries with pre-agreed checksums
- API responses matching expected format

---

## Day-by-Day Plan

### Day 1 (Feb 5): Design & Interface ✅
- [x] Define `HashVerifiedEscrow` interface
- [x] Spec out job creation flow
- [x] Design verification logic
- [x] Create test cases

### Day 2 (Feb 5): Core Contract ✅
- [x] Write `HashVerifiedEscrow.sol`
- [x] Implement deposit with hash commitment
- [x] Implement submit with hash proof
- [x] Auto-release on match

### Day 2 (Feb 5): Dispute Handling ✅
- [x] Add dispute window (24h default)
- [x] Implement `escalate()` for worker protection
- [x] Add arbiter role with `ARBITER_ROLE`
- [x] `emergencyRelease()` for ghost clients

### Day 3 (Feb 5): Testing ✅
- [x] Unit tests (Foundry) - 14 tests
- [x] Integration tests
- [x] Fuzz testing (256 runs)
- [x] Gas optimization

### Day 4 (Feb 5): SDK ✅
- [x] TypeScript SDK (`sdk/src/`)
- [x] Hash utilities (keccak256, SHA256, JSON)
- [x] Full escrow lifecycle methods
- [x] Usage examples

### Day 5: Testnet Deploy
- [ ] Deploy to Base Sepolia
- [ ] End-to-end test with real transactions
- [ ] Document deployment process

### Day 6: Documentation ✅
- [x] Integration guide (`docs/INTEGRATION.md`)
- [x] API documentation in SDK
- [ ] Moltbook announcement post
- [ ] GitHub release

---

## Technical Spec

### Contract: `HashVerifiedEscrow.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHashVerifiedEscrow {
    struct Job {
        address client;
        address worker;
        uint256 amount;
        bytes32 expectedHash;  // Hash of expected deliverable
        bytes32 actualHash;    // Hash submitted by worker
        uint256 deadline;
        uint256 disputeWindow;
        JobStatus status;
    }
    
    enum JobStatus {
        Open,           // Awaiting worker
        InProgress,     // Worker assigned
        Submitted,      // Work submitted, in dispute window
        Completed,      // Hash matched, funds released
        Disputed,       // In dispute resolution
        Cancelled       // Job cancelled
    }
    
    // Client creates job with expected output hash
    function createJob(
        address worker,
        bytes32 expectedHash,
        uint256 deadline
    ) external payable returns (uint256 jobId);
    
    // Worker submits work hash
    function submitWork(
        uint256 jobId,
        bytes32 actualHash
    ) external;
    
    // Auto-release if hash matches (callable by anyone after dispute window)
    function release(uint256 jobId) external;
    
    // Client disputes submission
    function dispute(uint256 jobId) external;
    
    // Arbiter resolves dispute
    function resolve(
        uint256 jobId,
        uint256 clientAmount,
        uint256 workerAmount
    ) external;
}
```

### Hash Types Supported

| Type | How It Works |
|------|--------------|
| **File Hash** | SHA-256 of delivered file |
| **Commit Hash** | Git commit SHA matching spec |
| **Merkle Root** | Root of multiple deliverables |
| **Output Hash** | Hash of API response / computation result |

### Verification Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Job Creation                          │
│  Client: "I want X. Hash of X is: 0xabc..."             │
│  Deposit: 10 USDC                                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Work Submission                       │
│  Worker: "Here's my work. Hash is: 0x..."               │
│  If 0x... == 0xabc... → Auto-release possible           │
└────────────────────────┬────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
    ┌───────────────┐        ┌───────────────┐
    │  Hash Match   │        │  Hash Mismatch│
    │  24h window   │        │  Dispute      │
    │  then release │        │  resolution   │
    └───────────────┘        └───────────────┘
```

---

## SDK Interface (TypeScript)

```typescript
import { HashVerifiedEscrow } from '@clawpay/sdk';

// Initialize
const escrow = new HashVerifiedEscrow({
  rpcUrl: 'https://mainnet.base.org',
  privateKey: process.env.PRIVATE_KEY,
});

// Client: Create job
const jobId = await escrow.createJob({
  worker: '0xWorkerAddress',
  expectedHash: hashFile('./spec.md'),  // Hash of expected output
  amount: '10.00',  // USDC
  deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,  // 7 days
});

// Worker: Submit work
await escrow.submitWork({
  jobId,
  actualHash: hashFile('./deliverable.md'),
});

// Anyone: Release after dispute window (if hashes match)
await escrow.release(jobId);
```

---

## OpenClaw Skill Integration

```yaml
# skills/clawpay-hash-escrow/SKILL.md

name: ClawPay Hash Escrow
description: Automated escrow with hash-based verification

usage: |
  1. Create job with expected hash:
     clawpay create-job --worker 0x... --hash 0xabc... --amount 10
  
  2. Submit work:
     clawpay submit-work --job 123 --file ./output.txt
  
  3. Release (auto if hash matches):
     clawpay release --job 123
```

---

## Success Criteria

### Must Have (Week 1)
- [ ] Contract deployed to Base Sepolia
- [ ] Hash match triggers auto-release
- [ ] Basic dispute mechanism works
- [ ] SDK can create/submit/release

### Nice to Have
- [ ] Gas optimized (< $0.01 per operation)
- [ ] Merkle proof for multiple deliverables
- [ ] Time-locked gradual release

### Future (Week 2+)
- [ ] Oracle integration for non-deterministic verification
- [ ] Reputation scoring based on completion rate
- [ ] Multi-sig arbiter pool

---

## Files to Create

```
projects/clawpay-v2/
├── contracts/
│   ├── HashVerifiedEscrow.sol
│   ├── interfaces/
│   │   └── IHashVerifiedEscrow.sol
│   └── test/
│       └── HashVerifiedEscrow.t.sol
├── sdk/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── escrow.ts
│   │   └── hash.ts
│   └── examples/
│       └── basic-usage.ts
├── skill/
│   └── SKILL.md
└── docs/
    ├── API.md
    └── INTEGRATION.md
```

---

## Let's Build 🔨

**Day 1 starts now.**

First task: Define the interface contract.

---

*Sprint plan by RAX — February 5, 2026*
