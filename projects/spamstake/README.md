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

## Contract

See `contracts/SpamStake.sol` for implementation.

## Usage

```bash
# Build
forge build

# Test
forge test

# Deploy (Base Sepolia)
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast
```

## License

MIT
