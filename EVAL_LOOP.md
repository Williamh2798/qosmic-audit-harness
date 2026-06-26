# Eval loop — autonomous self-improvement plan

## Flywheel

```
Nightly audit batch (new stores)
  → Harness runs (crawl + agent report)
  → Eval CLI scores (structural + rubric + regression)
  → Auto-triage by failure class
  → Generate skill patch candidates
  → Shadow run on golden set
  → Auto-promote if regression passes
  → (loop)
```

Human queue shrinks to: eval judge disagreements, sub-60 overall scores, compliance-flagged health claims.

## Week 1–2

- **CI gate:** `npm run eval` blocks merge if structural score &lt; 85% or any pillar missing.
- **Log every run:** `eval/results/*.json` → time-series DB (dimension scores, failure tags).
- **Golden set:** Start with gingerpeople + zenrojas + 3 merchant URLs; grow weekly.

## Week 3–4

- **Failure taxonomy → skill patches:** e.g. 12 reports missing Retention → auto-diff `qosmic-reason/SKILL.md` with "add routine/subscription experiment" rule. Human approves via PR bot.
- **Rubric upgrade:** Enable `OPENAI_API_KEY` LLM-as-judge when heuristic and LLM disagree &gt;1.5 points — flag for human label → fine-tune prompts.
- **Crawl reliability:** Auto-detect Cloudflare blocks; retry with click-nav profile; escalate to proxy tier.

## Month 2

- **Merchant feedback signal:** Thumbs on individual experiments in merchant UI → reward model for which rubric dimensions predict approval.
- **Bandit on eval weights:** Adjust structural vs rubric vs regression weights based on which composite score correlates with merchant ship rate.
- **Competitor quality:** LLM judge on competitor relevance only; bad rows feed back into `qosmic-reason` competitor discovery rules.

## Month 3

- **Synthetic Shopify fixtures:** Theme variants (DTC, retailer-routed, sold-out-heavy) for edge-case eval without live crawls.
- **Autonomous promotion:** Skill patches that improve golden-set overall by ≥5pp auto-merge; human reviews diff weekly, not per-patch.
- **Human surface:** New pillar definitions, compliance boundaries (health claims), monthly golden-set curation — everything else automated.

## How humans enter (and exit)

| Stage | Human role | Exit criterion |
|-------|------------|----------------|
| Now | Approve skill patches, label rubric disagreements | &lt;10% runs need label |
| Month 1 | Review sub-60 reports | &lt;5% sub-60 rate |
| Month 2 | Compliance review on health experiments | Auto-flag + block at 95% precision |
| Month 3 | Monthly golden-set add/remove | Synthetic fixtures cover 80% edge cases |

## Metrics that matter

- Structural pass rate (target: 95%+)
- Rubric overall (target: 75+)
- Merchant experiment approval rate (ultimate north star)
- Eval–human agreement rate (target: 90%+)
