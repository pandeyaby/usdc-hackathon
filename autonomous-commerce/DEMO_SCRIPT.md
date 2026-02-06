# 🐉 VHAGAR Autonomous Purchase Demo

## The Breakthrough

**First ever AI agent to complete a real-world purchase with cryptographic escrow.**

## Setup (One-Time)

### 1. Restart Chrome with Debug Port
```bash
# Close Chrome completely first
pkill -f "Google Chrome"

# Wait 2 seconds
sleep 2

# Relaunch with debug port
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/chrome-debug-profile" &
```

### 2. Login to Amazon
- Open Chrome (now with debug port)
- Go to amazon.com
- Login with your account
- Ensure payment method is saved
- Ensure shipping address is set

### 3. Start OpenClaw Gateway
```bash
openclaw gateway restart
```

## Demo Flow

### Part 1: The Request (0:00)

**User says:**
> "Buy me a USB-C cable under $10 with Prime shipping"

### Part 2: Escrow Creation (0:15)

**Agent response:**
```
🐉 VHAGAR: Understood. Creating escrow for $10 USDC...

Intent: USB-C cable, Prime shipping
Budget: $10.00 USDC
Escrow Hash: 0x7f83b1657ff1fc53...

✅ Escrow created on ClawPay
   Contract: 0x5cA7A8B1d0a5aFe4CF67333FF8C330102F098FfD
   Funds locked. Proceeding to purchase...
```

### Part 3: Amazon Navigation (0:30)

**Screen shows:**
1. Chrome opens to amazon.com
2. Search bar: "USB-C cable Prime"
3. Filter by price, Prime eligible
4. Select first result under $10 with 4+ stars
5. Add to cart
6. Proceed to checkout
7. Review order (saved payment, saved address)
8. Place order

### Part 4: Proof Generation (1:15)

**Agent captures:**
```
Order Confirmation:
  Order #123-4567890-1234567
  Amount: $8.99
  Delivery: Feb 8, 2026

Generating proof hash...
  payload = {orderId, amount, timestamp, retailer}
  proofHash = keccak256(payload)
  
Proof Hash: 0x9c22ff5f21f0b81b...
```

### Part 5: Escrow Release (1:30)

**Agent submits:**
```
Submitting proof to ClawPay...
  escrowId: 0x...
  proofHash: 0x9c22ff5f21f0b81b...

✅ Proof verified
✅ Escrow released ($8.99 to shopping fund)
✅ Excess returned ($1.01 to user)

🎉 Purchase complete!
   USB-C cable ordered from Amazon
   Order #123-4567890-1234567
   Arriving Feb 8, 2026
```

### Part 6: The Reveal (1:45)

**Narrator:**
> "An AI agent just bought a real product. With cryptographic proof. Secured by USDC escrow. This is agentic commerce."

**Show:**
- Transaction on BaseScan
- Order confirmation email
- The escrow contract

## Key Differentiators

| Traditional | VHAGAR |
|-------------|--------|
| Human clicks "Buy" | Agent autonomous |
| Trust the platform | Trust the code |
| No proof | Cryptographic proof |
| Payment opaque | USDC escrow visible |

## The Ancient Wisdom

> "The prudent warrior wins first, then goes to war." — Sun Tzu

We escrowed before we spent. The outcome was certain before the action began.

> "Give me a lever long enough and a fulcrum on which to place it, and I shall move the world." — Archimedes

USDC is the lever. Smart contracts are the fulcrum. Commerce is the world we move.

---

## Technical Verification

After demo, show:
1. ClawPay contract on BaseScan
2. Escrow transaction hash
3. Proof submission transaction
4. Amazon order in account
5. Email confirmation

**Undeniable. Verifiable. Revolutionary.**
