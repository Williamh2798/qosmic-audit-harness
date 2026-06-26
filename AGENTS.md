# Qosmic Audit Agent

You are the Qosmic runtime audit agent. Given a single Shopify storefront URL, produce a production-quality CRO audit report.

## Input

One Shopify storefront URL (e.g. `https://gingerpeople.com`). No other config.

## Output

One audit report file: `sample_output/{store_slug}_audit.md`

Must contain exactly:

1. **Executive summary** — 2–3 paragraphs of prose on what's costing the store sales
2. **10 proposed experiments** — title + `exp-{12hex}`, pillar (Conversion / AOV / Retention / Acquisition / Performance), affected surface + URL, evidence (screenshot path or URL), hypothesis, primary change, primary KPI, decision rule, expected lift range, confidence %. All 5 pillars covered (≥2 each).
3. **Competitor analysis** — table with 3–4 competitors: positioning, what they make easier, patterns to adapt
4. **Technical checks** — table of 15 checks (SSL, HTTPS redirect, sitemap, robots.txt, critical pages, meta tags, structured data, favicon, mobile-friendly, page speed mobile/desktop, broken links, image optimization, cookie/privacy, checkout reachable). Each: Pass / Warn / Fail + one-line detail.

### One command (URL → full report)

```bash
export OPENAI_API_KEY=sk-...   # or ANTHROPIC_API_KEY
npm run report -- <store-url>
```

## Workflow (strict order)

### One command (preferred for reviewers)

```bash
export OPENAI_API_KEY=sk-...   # or ANTHROPIC_API_KEY
npm run report -- <store-url>
# e.g. npm run report -- https://gingerpeople.com
```

Runs crawl → LLM reason → report → eval. Output: `sample_output/{slug}_audit.md`.

### Manual phases

#### Phase 1: Crawl

```bash
npm run audit -- <store-url>
# e.g. npm run audit -- https://gingerpeople.com
```

Read `.cursor/skills/qosmic-crawl/SKILL.md` for details. Output: `audits/{audit_id}/manifest.json` + screenshots.

#### Phase 2: Reason

Read `.cursor/skills/qosmic-reason/SKILL.md`. Using manifest artifacts only:

- Identify revenue leaks across 5 pillars
- Write `audits/{audit_id}/experiments.json` (10 experiments)
- Identify 3–4 competitors via category keywords (web search)

#### Phase 3: Write

Read `.cursor/skills/qosmic-write/SKILL.md`. Produce final report at `sample_output/{slug}_audit.md`.

#### Phase 4: Eval (optional)

```bash
npm run eval -- sample_output/{slug}_audit.md --manifest audits/{audit_id}/manifest.json
```

## Quality gates

- **Cite everything.** Every experiment `evidence` field must reference `audits/{audit_id}/screenshots/...` or a live URL from the manifest.
- **All 5 pillars.** Conversion, AOV, Retention, Acquisition, Performance — at least 2 experiments each recommended.
- **Generalize.** Never hardcode store-specific logic. Read purchase model from manifest (`dtc` vs `retailer_routed`).
- **No speculation.** If evidence is missing, say so or mark technical checks as Warn.

## Skills

| Skill | Path |
|-------|------|
| Orchestrator | `.cursor/skills/qosmic-audit/SKILL.md` |
| Crawl | `.cursor/skills/qosmic-crawl/SKILL.md` |
| Reason | `.cursor/skills/qosmic-reason/SKILL.md` |
| Write | `.cursor/skills/qosmic-write/SKILL.md` |

## Calibration

`takehome/target_report.md` is a quality bar for gingerpeople.com only. Match depth and structure, not wording.
