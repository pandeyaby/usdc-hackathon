# ⚡ Quick Demo (Works Right Now)

## The Hybrid Approach

If browser automation isn't ready, we can still demonstrate the breakthrough with a **hybrid demo**:

- Agent: Handles escrow, intent parsing, proof generation
- Human: Does the actual clicking (but follows agent instructions)
- Result: Same proof, same escrow, same revolutionary outcome

## Flow

### Terminal 1: Agent

```bash
cd projects/usdc-hackathon/autonomous-commerce
npx ts-node agent.ts
```

**Input:**
```
🐉 VHAGAR: What would you like me to purchase?
> Buy a USB-C cable under $10 from Amazon
```

**Agent outputs:**
```
📝 Intent parsed:
   Item: USB-C cable
   Budget: $10 USDC
   Retailer: Amazon

🔒 Creating escrow...
   Intent Hash: 0x7f83b165...
   Amount: $10 USDC
   
🛒 INSTRUCTIONS FOR HUMAN OPERATOR:
   1. Open amazon.com
   2. Search: "USB-C cable"
   3. Filter: Price under $10, Prime eligible
   4. Select item with 4+ stars
   5. Add to cart
   6. Checkout with saved payment
   7. STOP at confirmation page
   
   When done, enter order details:
   Order ID: _
   Amount: _
```

**Human completes purchase, enters details:**
```
Order ID: 123-4567890-1234567
Amount: 8.99
```

**Agent generates proof:**
```
📜 Generating proof...
   Payload: {orderId, amount, timestamp, retailer}
   Proof Hash: 0x9c22ff5f21f0b81b...

✅ Submitting to ClawPay...
✅ Escrow released!

🎉 PURCHASE COMPLETE
   Order #123-4567890-1234567
   Proof on-chain: 0x9c22ff5f...
```

## Why This Still Wins

The **value proposition** is the same:
1. ✅ Escrow created BEFORE purchase
2. ✅ Cryptographic proof generated
3. ✅ On-chain settlement
4. ✅ Real purchase made

The browser automation is an **implementation detail**. The innovation is the **trust architecture**.

## For Video

Shoot it as:
1. Split screen: Terminal (agent) + Browser (Amazon)
2. Show agent creating escrow first
3. Show purchase happening
4. Show proof generation
5. Show on-chain verification

**Narrative:**
> "Today, the human does the clicking. Tomorrow, the agent does it autonomously. But the trust layer? That's ready NOW."
