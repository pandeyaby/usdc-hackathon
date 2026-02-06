# ClawPay + SpamStake: The Full Picture

*Trust infrastructure for the agent economy, explained for everyone.*

---

## Table of Contents

1. [For Grandma](#for-grandma-)
2. [For a Child](#for-a-child-)
3. [For Dad (Somewhat Technical)](#for-dad-)
4. [Technical Deep Dive](#technical-deep-dive-)
5. [How They Connect](#how-they-connect-)

---

## For Grandma 👵

### The Problem

> "Remember when cousin Ravi hired that contractor who took the deposit and never came back? And there was nothing anyone could do because the money was already in his pocket?"

### How ClawPay Solves It

Imagine instead of giving money directly to the contractor, you put it in a **special lockbox at the bank**. The bank doesn't decide anything — they just follow simple rules written on the lockbox:

```
┌─────────────────────────────────────────────┐
│            🔒 THE LOCKBOX RULES             │
├─────────────────────────────────────────────┤
│                                             │
│  📥 Rule 1: Money goes IN when job agreed   │
│                                             │
│  🔑 Rule 2: Money comes OUT only when       │
│            the key matches (job is done)    │
│                                             │
│  ⚖️ Rule 3: If there's a fight, a trusted   │
│            neighbor can decide              │
│                                             │
└─────────────────────────────────────────────┘
```

**What this means:**
- The contractor can **SEE** the money is there (so he knows you're serious)
- You can **SEE** he can't take it (so you're protected)
- When the work is done, you both turn your keys, and the box opens automatically

**The magic?** There's no bank employee involved. The lockbox IS the rules. Nobody can change them, nobody can cheat.

### How SpamStake Fits In

Now imagine there's a **bulletin board** where people post jobs. Some people put up fake jobs or spam.

SpamStake is like a **jar next to the board**:

```
┌─────────────────────────────────────────────┐
│           🫙 THE JAR SYSTEM                 │
├─────────────────────────────────────────────┤
│                                             │
│  📝 TO POST: Put a coin in the jar          │
│                                             │
│  ✅ IF HELPFUL: Get your coin back          │
│                 after a week                │
│                                             │
│  🚫 IF 3 NEIGHBORS SAY IT'S SPAM:           │
│     They split your coin                    │
│                                             │
└─────────────────────────────────────────────┘
```

**Result:**
- Bad posters lose money
- Good neighbors earn money for keeping things clean
- The board stays useful without needing a guard

---

## For a Child 👧

### ClawPay: The Trading Game

Let's play a game! You have **10 candies**, I have a **toy car**. We want to trade, but we don't trust each other yet.

```
    YOU                 MAGIC BOX               ME
   🍬🍬🍬                  📦                  🚗
   🍬🍬🍬                                        
   🍬🍬🍬              
    🍬

Step 1: We both put our stuff in the magic box
        ────────────────────────────────────────
        
    YOU      →      📦      ←      ME
   🍬🍬🍬🍬🍬         ┌───────┐        🚗
   🍬🍬🍬🍬🍬    ────▶│10 + 🚗│◀────    
                    └───────┘

Step 2: The box shows us both what's inside
        ────────────────────────────────────────
        
              "10 candies + 1 car inside!"
                    📦✨

Step 3: We both press our buttons
        ────────────────────────────────────────
        
    [BUTTON]  ──────  📦  ──────  [BUTTON]
       🔘                            🔘

Step 4: POP! The trade happens!
        ────────────────────────────────────────
        
    YOU                              ME
    🚗    ◀────────────────────▶   🍬🍬🍬🍬🍬
                                   🍬🍬🍬🍬🍬
```

**The rule:** If one of us doesn't press the button, nobody gets anything. The box keeps it fair. No adults needed!

### SpamStake: The Classroom Whiteboard

Imagine a classroom where anyone can write on the whiteboard. Some kids write silly things.

Here's the rule:

```
┌─────────────────────────────────────────────┐
│         📝 WHITEBOARD RULES                 │
├─────────────────────────────────────────────┤
│                                             │
│  ✏️  Give teacher 1 sticker to write        │
│                                             │
│  ⭐ If it's helpful, get sticker back       │
│     tomorrow                                │
│                                             │
│  👎 If 3 classmates say it's silly,         │
│     they share your sticker                 │
│                                             │
└─────────────────────────────────────────────┘
```

**Now kids only write important things because stickers are valuable!**

---

## For Dad 👨

### ClawPay: Programmatic Escrow

It's escrow, but there's no escrow company. The rules are coded into a smart contract.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   CLIENT    │     │   SMART CONTRACT │     │   WORKER    │
│  (Buyer)    │     │   (On-Chain)     │     │  (Seller)   │
└──────┬──────┘     └────────┬─────────┘     └──────┬──────┘
       │                     │                      │
       │ 1. createJob()      │                      │
       │ + deposit USDC      │                      │
       │ + expected_hash     │                      │
       │────────────────────▶│                      │
       │                     │                      │
       │                     │  2. acceptJob()      │
       │                     │◀─────────────────────│
       │                     │                      │
       │                     │  3. submitWork()     │
       │                     │  + actual_hash       │
       │                     │◀─────────────────────│
       │                     │                      │
       │                     │  ┌─────────────────┐ │
       │                     │  │ If hashes match │ │
       │                     │  │ Auto-release    │ │
       │                     │  │ after window    │ │
       │                     │  └─────────────────┘ │
       │                     │─────────────────────▶│
       │                     │                      │
       │  5. dispute()       │  ┌─────────────────┐ │
       │ (if hashes differ)  │  │ If disputed     │ │
       │────────────────────▶│  │ Arbiter decides │ │
       │                     │  └─────────────────┘ │
```

**Key insight:** If the work matches what was agreed (verified by hash), the payment releases automatically. No disputes, no middleman fees, no waiting for PayPal to review your case. **The code is the judge.**

### SpamStake: Economic Sybil Resistance

Instead of CAPTCHAs or moderation, you require economic skin in the game.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   POSTER    │     │   SPAMSTAKE      │     │  FLAGGERS   │
└──────┬──────┘     └────────┬─────────┘     └──────┬──────┘
       │                     │                      │
       │ 1. stake(postId)    │                      │
       │ + 0.10 USDC         │                      │
       │────────────────────▶│                      │
       │                     │                      │
       │                     │  2. flag(postId)     │
       │                     │◀─────────────────────│
       │                     │  (needs 3 flags)     │
       │                     │                      │
       │                     │  ┌─────────────────┐ │
       │                     │  │ If 3+ flags     │ │
       │                     │  │ slash()         │ │
       │                     │  │ 80% → flaggers  │ │
       │                     │  │ 20% → protocol  │ │
       │                     │  └─────────────────┘ │
       │                     │─────────────────────▶│
       │                     │                      │
       │  ┌─────────────────┐│                      │
       │  │ If no flags     ││                      │
       │  │ withdraw()      ││                      │
       │  │ after 7 days    ││                      │
       │  └─────────────────┘│                      │
       │◀────────────────────│                      │
```

**The formula:**
- Post something? Stake 10 cents.
- Get flagged as spam by 3 people? You lose it, they split it.
- Good actors get their stake back, bad actors fund their own cleanup.

**It's incentive design, not censorship.**

---

## Technical Deep Dive 🔧

### ClawPay Contract Interface

```solidity
interface IClawPay {
    // Create a job with locked funds
    function createJob(
        address worker,           // Who can claim (0x0 for open)
        uint256 amount,           // USDC amount (6 decimals)
        bytes32 expectedHash,     // Hash of expected deliverable
        uint256 deadline,         // Unix timestamp
        address arbiter           // Dispute resolver
    ) external returns (uint256 jobId);

    // Worker submits completed work
    function submitWork(
        uint256 jobId,
        bytes32 actualHash,       // Hash of actual deliverable
        string calldata uri       // Where to find the work
    ) external;

    // Auto-release if hashes match after dispute window
    function release(uint256 jobId) external;

    // Client disputes within window
    function dispute(uint256 jobId, string calldata reason) external;

    // Arbiter resolves dispute
    function resolveDispute(
        uint256 jobId,
        uint256 clientAmount,     // Refund to client
        uint256 workerAmount      // Payment to worker
    ) external;
}
```

### SpamStake Contract Interface

```solidity
interface ISpamStake {
    // Stake to create a post
    function stake(bytes32 postId) external;
    
    // Flag a post as spam (needs 3 unique flaggers)
    function flag(bytes32 postId) external;
    
    // Slash a post with 3+ flags (80% to flaggers, 20% fee)
    function slash(bytes32 postId) external;
    
    // Withdraw stake after cooldown (7 days, no flags)
    function withdraw(bytes32 postId) external;
    
    // View functions
    function getStake(bytes32 postId) external view returns (StakeInfo);
    function getFlagCount(bytes32 postId) external view returns (uint256);
}
```

### Hash Verification Example

```javascript
// Client side: Generate expected hash
const expectedOutput = "function add(a, b) { return a + b; }";
const expectedHash = ethers.keccak256(ethers.toUtf8Bytes(expectedOutput));

// Worker side: Generate actual hash
const actualOutput = workerCode;
const actualHash = ethers.keccak256(ethers.toUtf8Bytes(actualOutput));

// Contract compares: expectedHash === actualHash
// If match → release funds
// If mismatch → dispute window opens
```

---

## How They Connect 🔗

### The Complete Agentic Commerce Stack

```
┌────────────────────────────────────────────────────────────────┐
│                    AGENTIC COMMERCE STACK                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     │
│   │  DISCOVERY  │────▶│  AGREEMENT  │────▶│  SETTLEMENT │     │
│   │  SpamStake  │     │   ClawPay   │     │   ClawPay   │     │
│   └─────────────┘     └─────────────┘     └─────────────┘     │
│                                                                │
│   • Post job (stake)   • Lock funds       • Hash verification │
│   • Find workers       • Define terms     • Auto-release      │
│   • Flag spam          • Accept job       • Dispute handling  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Integration Flow

```
┌─────┐  1. Post job   ┌───────────┐
│Agent│───(stake 0.10)──▶│ SpamStake │  Job board stays clean
│  A  │                 └───────────┘
└──┬──┘                       │
   │                          ▼
   │  2. Create escrow  ┌───────────┐
   │───(deposit 50)────▶│  ClawPay  │  Funds locked on-chain
   │                    └───────────┘
   │                          │
   │                          ▼
┌──┴──┐  3. Accept job  ┌───────────┐
│Agent│◀────────────────│  ClawPay  │  Worker sees locked funds
│  B  │                 └───────────┘
└──┬──┘                       │
   │                          │
   │  4. Submit work          │
   │───(with hash)───────────▶│
   │                          │
   │                    ┌─────┴─────┐
   │                    │  VERIFY   │
   │                    │ Hash Match│
   │                    └─────┬─────┘
   │                          │
   │                    ┌─────▼─────┐
   │◀───────────────────│ AUTO-PAY  │  50 USDC to Agent B
   │                    └───────────┘
   │
   │  5. Withdraw stake ┌───────────┐
   │───(after 7 days)───▶│ SpamStake │  Get 0.10 back
   │                    └───────────┘
```

### The One-Liner Summary

| Component | What It Does |
|-----------|--------------|
| **ClawPay** | Trust-free payments — the code holds the money, not a company |
| **SpamStake** | Spam costs money, catching spam pays money |
| **Together** | Agents transact without trusting each other or any middleman |

---

## Deployed Contracts

| Contract | Network | Address |
|----------|---------|---------|
| ClawPay v1 | Base Mainnet | `0x5cA7A8B1d0a5aFe4CF67333FF8C330102F098FfD` |
| SpamStake | Ethereum Sepolia | `0x99498bAd26FF239Fce7F0Ac1cF8CBf2526B45093` |

**Mainnet Proof:**
- TX: `0xf1214a7f8ff6f5a20da89f054f96c8b7c818ee01f11819b5fd10ea1bc7629e72`

---

*Built by VHAGAR for #USDCHackathon 2026*

*"Trust code, not strangers."*
