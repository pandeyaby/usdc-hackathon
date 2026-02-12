# Cost Optimization Summary

*Applied: 2026-02-10*

## What Changed

### Model Tiering (50% immediate savings)
| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| **Primary model** | Opus ($30/M) | Sonnet ($15/M) | 50% |
| **Heartbeat** | Opus ($30/M) | Sonnet ($15/M) | 50% |
| **Sub-agents** | Opus ($30/M) | Sonnet ($15/M) | 50% |

Use `/model opus` when you need the big brain.

### Cron Frequency (halved)
| Job | Before | After |
|-----|--------|-------|
| Clawork scanner | 6h | 12h |
| Dashboard update | 6h | 12h |
| Evolution loop | 8h | 12h |
| Weekly earnings | Sunday 6pm | unchanged |
| VHAGAR Moltbook | disabled | stays disabled |

## Next Level: OpenRouter (80%+ savings)

OpenRouter gives access to MUCH cheaper models:

| Model | Cost/M | Use For |
|-------|--------|---------|
| Gemini 2.5 Flash-Lite | $0.50 | Heartbeats, simple tasks |
| DeepSeek V3.2 | $0.53 | Simple reasoning |
| DeepSeek R1 | $2.74 | Sub-agents, reasoning |
| Sonnet | $15.00 | Main work |

### Setup OpenRouter

1. **Get API key**: https://openrouter.ai (free signup, $5 credit is weeks of usage)

2. **Add to environment**:
   ```bash
   export OPENROUTER_API_KEY="sk-or-..."
   ```

3. **Update config** (after gateway restart):
   ```json5
   {
     "agents": {
       "defaults": {
         "model": {
           "primary": "openrouter/anthropic/claude-sonnet-4-5",
           "fallbacks": ["openrouter/deepseek/deepseek-chat"]
         },
         "heartbeat": {
           "every": "30m",
           "model": "openrouter/google/gemini-2.5-flash-lite"
         },
         "subagents": {
           "model": "openrouter/deepseek/deepseek-reasoner"
         }
       }
     }
   }
   ```

## Alternative: ClawRouter (automatic routing)

ClawRouter auto-routes requests to the cheapest capable model.

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/BlockRunAI/ClawRouter/main/scripts/reinstall.sh | bash

# Fund wallet with $5 USDC on Base (address printed on install)
# Restart gateway
openclaw gateway restart
```

Saves ~78% automatically. Routes simple queries to cheap models, complex to capable ones.

## Memory/Token Optimization

### Already enabled:
- `compaction.mode: safeguard` - auto-compacts long sessions
- `memoryFlush.enabled: true` - flushes to files before compaction

### Tips:
- `/compact` - manually summarize long sessions
- Keep MEMORY.md under 5KB (currently ~7KB)
- Trim old memory/daily files after 7 days

### Skills for memory:
- `clawhub search memory-hygiene` - found memory management skills
- Consider: `memory-hygiene`, `memory-tiering`

---

**Estimated savings: $10-15/day with current changes**

**With OpenRouter: Could drop to $2-5/day**
