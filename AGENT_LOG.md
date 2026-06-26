# Agent log

## Time

| Part | Time | Notes |
|------|------|-------|
| Part 1: Runtime harness | ~2.0h | Scaffold, crawl script, skills, AGENTS.md, sample reports |
| Part 2: Eval system | ~1.5h | Structural + heuristic rubric + regression + CLI |
| Docs + polish | ~0.5h | README, EVAL_LOOP, WORKFLOWS |
| **Total** | **~4.0h** | |

## Prompts used

1. **Scaffold:** "Implement the Qosmic Runtime Harness + Eval System Plan" (Cursor Agent mode, plan attached)
2. **Crawl:** `npm run crawl -- https://gingerpeople.com` and `npm run crawl -- https://zenrojas.com`
3. **Report generation:** Agent authored reports from `manifest.json` + `experiments.json` following `qosmic-write` skill template
4. **Eval:** `npm run eval -- sample_output/gingerpeople_audit.md --manifest audits/aud_2b892664772f4416/manifest.json`

## Agent drove

- Full repo scaffold (`package.json`, TypeScript, Playwright)
- `scripts/crawl.ts` — surface discovery, screenshots, 15 technical checks, manifest
- All four skills + `AGENTS.md`
- Eval CLI (`eval/structural.ts`, `rubric.ts`, `regression.ts`, `run.ts`)
- Both `experiments.json` files and `sample_output/*.md` reports
- Documentation (`EVAL_LOOP.md`, `WORKFLOWS.md`, this file)

## Human drove

- Architecture choices from plan (hybrid crawl, portable AGENTS.md, eval-weighted scope)
- Gingerpeople Cloudflare workaround decision: use first successful homepage crawl + honest technical checks on bot-blocked subpages
- Pillar rebalancing on gingerpeople report after eval (`pillar_diversity_ideal` fix)
- Loom recording (pending — see submission checklist below)

## Friction / reversals

- **Cloudflare on gingerpeople:** Subpage crawls returned 403 after homepage. Mitigation: click-navigation + stealth headers; documented in technical checks. Production harness would use residential proxy or merchant-whitelisted crawl IP.
- **Would reverse:** Running gingerpeople crawl first before zenrojas — zenrojas validated the script faster.
- **Unmeasured dimension:** Merchant implementability (Shopify theme constraints, app conflicts).

## Submission checklist

- [x] Runtime harness + eval + `sample_output/`
- [x] `AGENT_LOG.md`
- [x] `EVAL_LOOP.md`
- [x] `WORKFLOWS.md`
- [ ] 5-min Loom (record locally)
- [ ] Public GitHub repo + email trustin@qosmic.ai
