# ⚡ Quick Demo: Hybrid Autonomous Commerce

## The Design Choice

This demo uses a **hybrid approach** where the agent handles escrow, intent parsing, and proof generation while a human operator completes the marketplace interaction.

**This is a deliberate security decision, not a technical limitation.**

### Why Hybrid?

The agent is fully capable of:
- Browser automation via Playwright
- Navigating Amazon, adding to cart, completing checkout
- Handling multi-step flows including authentication

**However, we deliberately withheld marketplace credentials from the agent:**

1. **Principle of Least Privilege** — Agents shouldn't have access to payment methods by default
2. **User Control** — Financial credentials remain under human control
3. **Explicit Authorization** — Sensitive access requires deliberate opt-in

If credentials were securely stored in the agent's vault (e.g., via 1Password integration or encrypted keychain), this would be **100% autonomous**.

**The trust architecture is ready. The constraint is security policy.**

---

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

---

## What This Demonstrates

The **core innovation** is the trust architecture:

1. ✅ Escrow created BEFORE purchase — funds locked on-chain
2. ✅ Cryptographic proof generated — verifiable purchase evidence
3. ✅ On-chain settlement — transparent, auditable
4. ✅ Real purchase made — actual goods delivered

Browser automation is an **implementation detail**. The breakthrough is **trustless agentic commerce**.

---

## The Path to Full Autonomy

| Current (Secure Default) | Full Autonomy (Opt-In) |
|--------------------------|------------------------|
| Agent handles escrow + proof | Same |
| Human operates marketplace | Agent operates marketplace |
| No stored credentials | Credentials in secure vault |
| Explicit human authorization | Pre-authorized spending limits |

**Both modes use identical trust architecture. The difference is access policy.**

---

## For Video

Shoot as:
1. Split screen: Terminal (agent) + Browser (Amazon)
2. Show agent creating escrow first
3. Show purchase happening
4. Show proof generation
5. Show on-chain verification

**Narrative:**
> "The agent creates the escrow. The human completes the purchase — for now. But the trust layer? That's ready for full autonomy today. We just chose security over convenience."
