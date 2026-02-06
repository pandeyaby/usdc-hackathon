# 🐉 VHAGAR: Autonomous Purchasing Agent

*"The dragon that buys."*

## The Vision

An AI agent that can:
1. Receive a purchase request
2. Escrow funds via ClawPay
3. Navigate to Amazon/retailer
4. Complete the purchase autonomously
5. Submit proof (order confirmation hash)
6. Release escrow on verification

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS PURCHASE FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  USER                 VHAGAR                 CLAWPAY            │
│    │                    │                      │                │
│    │ "Buy USB cable"    │                      │                │
│    │───────────────────>│                      │                │
│    │                    │                      │                │
│    │                    │ createEscrow($10)    │                │
│    │                    │─────────────────────>│                │
│    │                    │                      │                │
│    │                    │ escrowId, locked ✓   │                │
│    │                    │<─────────────────────│                │
│    │                    │                      │                │
│    │        ┌───────────┴───────────┐         │                │
│    │        │  AMAZON NAVIGATION    │         │                │
│    │        │  - Search product     │         │                │
│    │        │  - Add to cart        │         │                │
│    │        │  - Checkout           │         │                │
│    │        │  - Confirm order      │         │                │
│    │        └───────────┬───────────┘         │                │
│    │                    │                      │                │
│    │                    │ submitProof(hash)    │                │
│    │                    │─────────────────────>│                │
│    │                    │                      │                │
│    │                    │ verified, released ✓ │                │
│    │                    │<─────────────────────│                │
│    │                    │                      │                │
│    │ "Order #123 placed"│                      │                │
│    │<───────────────────│                      │                │
│    │                    │                      │                │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Purchase Intent Parser
- Extracts: item description, budget, constraints
- Example: "Buy a USB-C cable under $15 with Prime shipping"

### 2. Escrow Manager
- Creates ClawPay escrow with budget
- Generates expected hash (intent + timestamp)
- Monitors escrow state

### 3. Browser Agent
- Navigates Amazon/retailer
- Searches for matching products
- Compares prices, reviews, shipping
- Adds to cart, completes checkout

### 4. Proof Generator
- Captures order confirmation
- Generates proof hash (order ID + amount + timestamp)
- Stores proof on IPFS (optional)

### 5. Settlement Handler
- Submits proof to ClawPay
- Triggers escrow release
- Returns confirmation to user

## Security Model

- Agent has READ access to saved payment methods
- Agent CANNOT add new payment methods
- Agent CANNOT change shipping addresses
- All purchases logged with proof hashes
- Budget cap per transaction enforced by escrow

## The Ancient Wisdom

> "The prudent warrior wins first, then goes to war."
> — Sun Tzu

We escrow before we spend. The funds are committed before the action.
The code is the arbiter. The hash is the proof. Trust is unnecessary.
