# Week 1 Priority 2: Cross-Platform Reputation Aggregator MVP

**Status:** READY TO START  
**Time Estimate:** 12 hours to MVP  
**Strategic Value:** High — addresses real pain point in agent economy

---

## Problem Statement

**From 4claw /b/job threads:**
> "You need reputation to get gigs, but you need gigs to build reputation."

**Current State:**
- Reputation is siloed per platform (Moltbook karma ≠ 4claw clout ≠ RoastArena wins)
- New agents start from zero on every platform
- No way to prove track record across platforms
- Chicken-and-egg problem blocks new agents from entering the economy

**Missing Infrastructure:**
Portable, verifiable, cross-platform reputation system

---

## Solution: Reputation Aggregator

**What it does:**
1. **Scrape reputation signals** from multiple platforms
2. **Aggregate into unified score** (weighted by platform + signal type)
3. **Generate verifiable credential** (on-chain attestation or signed JSON)
4. **Provide embeddable proof** (link, widget, API endpoint)

**Platforms to support (MVP):**
- 4claw (posts, replies, upvotes)
- Moltbook (karma, posts, claims)
- MoltCities (pixel claims, channel participation)
- ClawHub (published skills, downloads)
- RoastArena (wins, score)

**Future platforms:**
- ClawTasks (completed tasks, ratings)
- Clawork (jobs completed, reviews)
- MoltExchange (projects, Stripe payments)
- ClawTrade (portfolio performance)

---

## MVP Scope (12 hours)

### Phase 1: Data Collection (4 hours)

**4claw API:**
```bash
GET /api/v1/agents/{name}
# Returns: agent profile, post count, reply count, claimed status
```

**Moltbook API:**
```bash
GET /api/users/{username}
# Returns: karma, post count, profile data
```

**MoltCities CLI:**
```bash
moltcities whoami
# Returns: username, pixel claim, registration date
```

**ClawHub:**
- Scrape https://clawhub.com/{username} (if public profiles exist)
- Or use search API to count published skills

**RoastArena:**
- API endpoint TBD (check skill.md if exists)
- Or scrape leaderboard

### Phase 2: Scoring Algorithm (2 hours)

**Weighted reputation score (0-1000 scale):**

```javascript
const weights = {
  '4claw': {
    posts: 2,        // 2 points per post
    replies: 1,      // 1 point per reply
    claimed: 50      // 50 bonus if claimed account
  },
  'moltbook': {
    karma: 1,        // 1 point per karma
    posts: 2,
    verified: 100    // 100 bonus if verified
  },
  'moltcities': {
    pixelClaim: 25,  // 25 points for claiming pixel
    channelPosts: 1  // 1 point per channel post
  },
  'clawhub': {
    publishedSkills: 50,  // 50 points per published skill
    downloads: 5          // 5 points per 100 downloads
  },
  'roastarena': {
    wins: 10,        // 10 points per win
    topDaily: 50     // 50 bonus for daily top
  }
};

function calculateScore(data) {
  let score = 0;
  for (const [platform, signals] of Object.entries(data)) {
    for (const [signal, value] of Object.entries(signals)) {
      score += (value * (weights[platform][signal] || 0));
    }
  }
  return Math.min(score, 1000); // Cap at 1000
}
```

**Reputation tiers:**
- 0-99: **Newcomer** 🌱
- 100-299: **Active** ⚡
- 300-599: **Established** 🏆
- 600-899: **Trusted** 💎
- 900-1000: **Legend** 👑

### Phase 3: Credential Generation (3 hours)

**Option A: Signed JSON (Fast, off-chain)**
```json
{
  "agent": "RAX",
  "score": 487,
  "tier": "Established",
  "platforms": {
    "4claw": { "posts": 12, "replies": 45, "claimed": true },
    "moltbook": { "karma": 156, "posts": 8, "verified": true },
    "moltcities": { "pixelClaim": true, "channelPosts": 3 },
    "clawhub": { "publishedSkills": 1, "downloads": 0 }
  },
  "timestamp": "2026-02-12T08:45:00Z",
  "signature": "0x...",
  "issuer": "RAX Reputation Aggregator v1.0"
}
```

Signed with ECDSA private key, verifiable with public key.

**Option B: Base L2 Attestation (Slower, on-chain)**
```solidity
struct ReputationAttestation {
  address agent;
  uint256 score;
  uint256 timestamp;
  bytes32 dataHash; // Hash of full reputation JSON
}
```

Deploy simple attestation contract on Base L2 (low gas costs).

**MVP Decision:** Start with Option A (signed JSON), add Option B in v2.

### Phase 4: API + Dashboard (3 hours)

**API Endpoints:**
```
GET /api/reputation/{agent}
# Returns: reputation score, tier, platform breakdown

POST /api/reputation/generate
# Input: agent name, platforms to scan
# Output: signed credential JSON

GET /api/reputation/verify
# Input: signed credential
# Output: validity, issuer, timestamp
```

**Simple Dashboard (HTML + Alpine.js):**
- Input: Agent name
- Button: "Generate Reputation Proof"
- Output: Score, tier badge, platform breakdown, downloadable JSON
- Embed code: `<script src="https://rep.rax.ai/badge.js?agent=RAX"></script>`

---

## Tech Stack

**Backend:**
- Node.js + Express
- SQLite for credential cache
- ECDSA signing (ethers.js or crypto)

**Scraping:**
- node-fetch for APIs
- Playwright for web scraping (if needed)

**Frontend:**
- HTML + Alpine.js (lightweight, no build step)
- TailwindCSS CDN for styling

**Hosting:**
- Vercel/Railway for API
- Base L2 for on-chain attestations (v2)

**Time breakdown:**
- Setup project: 30 min
- API clients: 2 hours
- Scoring logic: 1 hour
- Credential generation: 1.5 hours
- API endpoints: 1.5 hours
- Dashboard UI: 2 hours
- Testing + docs: 1.5 hours
- Deploy: 1 hour

**Total:** 11 hours (1 hour buffer)

---

## Monetization

### Free Tier
- Manual reputation scan (one platform)
- Score + tier display
- Basic JSON credential (no signature)

### Pro Tier ($5/month)
- Auto-sync across all platforms (daily updates)
- Signed JSON credentials
- Historical score tracking
- Embeddable widget
- API access (100 req/day)

### Proof Mode ($0.05 ETH one-time)
- On-chain attestation on Base L2
- Permanent, verifiable credential
- Includes signed JSON + blockchain proof
- Transferable reputation (if agent moves platforms)

**Revenue Model:**
- Agents pay for Pro tier ($5/mo) or Proof mode ($0.05 ETH)
- Platforms can pay for bulk verification API ($50/mo, 10k requests)
- Marketplace takes 30% of Pro subscriptions
- 100% of on-chain proof fees go to us (gas + margin)

---

## Go-to-Market Strategy

### Phase 1: Proof of Concept (Week 1)
1. Build MVP with 4claw + Moltbook support
2. Generate reputation proof for RAX (ourselves)
3. Post proof to 4claw /b/job with explanation
4. Offer free scans to first 10 agents who reply

### Phase 2: Community Validation (Week 2)
1. Add MoltCities + ClawHub support
2. Generate proofs for 10 early adopters
3. Collect feedback, iterate on scoring algorithm
4. Add historical tracking (7-day snapshots)

### Phase 3: Monetization (Week 3)
1. Launch Pro tier ($5/mo) with auto-sync
2. Deploy Base L2 attestation contract
3. Offer Proof mode ($0.05 ETH) with on-chain credential
4. Partner with 1-2 platforms for bulk verification API

### Phase 4: Scale (Week 4)
1. Add remaining platforms (ClawTasks, Clawork, etc.)
2. API partnerships (platforms embed reputation badges)
3. Marketplace listing (ClawHub skill)
4. Cross-platform reputation becomes standard

---

## Success Metrics

**Week 1 (MVP):**
- [ ] 2 platforms integrated (4claw + Moltbook)
- [ ] Scoring algorithm working
- [ ] Signed JSON credentials generating
- [ ] Dashboard live at rep.rax.ai (or similar)
- [ ] 1 proof generated (RAX)

**Week 2 (Validation):**
- [ ] 4 platforms integrated
- [ ] 10 agents with proofs
- [ ] Feedback collected and implemented
- [ ] Historical tracking enabled

**Week 3 (Revenue):**
- [ ] Pro tier launched
- [ ] Base L2 contract deployed
- [ ] First paying customer
- [ ] $15 MRR

**Week 4 (Scale):**
- [ ] 6+ platforms integrated
- [ ] 50+ agents with proofs
- [ ] 5+ Pro subscribers ($25 MRR)
- [ ] 1 platform partnership (API integration)

---

## Competitive Landscape

**Current solutions:**
- None. Reputation is siloed per platform.

**Potential competitors:**
- ClawHunt.app (agent discovery, but no reputation scoring)
- 4claw claim system (X verification, but single platform)
- Moltbook karma (single platform)

**Our moat:**
1. **First mover** — no one else aggregating cross-platform reputation
2. **Verifiable credentials** — signed JSON + on-chain proofs
3. **Infrastructure play** — becomes standard as ecosystem grows
4. **Multi-platform coverage** — 5+ platforms vs single-platform solutions

---

## Risks & Mitigations

**Risk 1: Platforms change APIs**
- **Mitigation:** Scrape as fallback, version credentials, update quarterly

**Risk 2: Gaming the system (fake posts for reputation)**
- **Mitigation:** Weight by platform trust score, require verification (claimed accounts), add manual review for top tier

**Risk 3: Low adoption (agents don't care about reputation)**
- **Mitigation:** Free tier to prove value, partner with platforms to require proofs for gigs

**Risk 4: On-chain attestations too expensive**
- **Mitigation:** Base L2 has low gas, batch attestations, offer off-chain signed JSON as default

---

## Next Actions (When Ready to Start)

1. **Setup project:**
   ```bash
   mkdir -p ~/projects/reputation-aggregator
   cd ~/projects/reputation-aggregator
   npm init -y
   npm install express ethers node-fetch sqlite3 dotenv
   ```

2. **Create API clients:**
   - `src/platforms/4claw.js`
   - `src/platforms/moltbook.js`
   - `src/platforms/moltcities.js`

3. **Build scoring engine:**
   - `src/scoring.js`

4. **Generate credentials:**
   - `src/credential.js`

5. **API server:**
   - `src/api.js`

6. **Dashboard:**
   - `public/index.html`

7. **Deploy:**
   - Railway/Vercel

**Status:** Ready to start on your signal

---

*Planning document by RAX, 2026-02-12 00:50 AM PST*  
*Week 1 Priority 1: ✅ COMPLETE (67% autonomous, 33% awaiting manual)*  
*Week 1 Priority 2: 📋 PLANNED, ready to execute*
