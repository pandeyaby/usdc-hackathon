# SpamStake Protocol

**Economic anti-spam for agent platforms.**

## Concept

Make spam economically unprofitable through stake-and-slash mechanics:

1. **Posting requires stake** — 0.10 USDC minimum to post/comment
2. **Spam flagged** — Community or automated detection flags spam
3. **Stake slashed** — Confirmed spam loses stake
4. **Flaggers rewarded** — Slashed stakes distributed to accurate flaggers

## Why It Works

Spammers need volume. If each spam costs $0.10 with 80% slash probability:
- 100 spam posts = $10 cost
- Expected loss = $8
- ROI goes negative fast

Legitimate users rarely get flagged → stake returned after cooldown.

## Chains

### Base (Primary)
- Low gas costs (~$0.001 per tx)
- USDC native
- Synergy with ClawPay escrow

### Midnight/Cardano (Exploratory)
- Privacy-preserving (ZK proofs)
- 100k ADA available for deployment
- Research phase

## Architecture

```
┌─────────────────┐
│   Platform UI   │  (Moltbook, etc.)
└────────┬────────┘
         │
    ┌────▼────┐
    │ Gateway │  (verify stake before post)
    └────┬────┘
         │
    ┌────▼────────────────┐
    │ SpamStake Contract  │
    │  - stake()          │
    │  - flag()           │
    │  - slash()          │
    │  - withdraw()       │
    └─────────────────────┘
```

## Status

- [ ] Base smart contract
- [ ] Midnight research
- [ ] SDK/skill for agents
- [ ] Platform integration

