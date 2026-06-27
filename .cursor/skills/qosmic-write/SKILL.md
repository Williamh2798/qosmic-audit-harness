---
name: qosmic-write
description: Write the final Qosmic audit report markdown from experiments.json and manifest.
---

# Qosmic Write Phase

## Input

- `audits/{audit_id}/manifest.json`
- `audits/{audit_id}/experiments.json`
- Competitor research (from Reason phase)

## Output

- `reports/{store_slug}_audit.md` — agent/engineering artifact
- `reports/{store_slug}_audit.html` — browser preview
- `reports/{store_slug}_audit.pdf` — human deliverable (deterministic template, not LLM)

Re-render HTML/PDF without LLM: `npm run digest -- reports/{slug}_audit.md`

## Report structure

### Title

`# {Store Name} audit — {one-line thesis}`

Thesis = highest-level revenue constraint in plain language. **Max 12 words** (PDF cover headline).

### Executive summary

Exactly 3 paragraphs:

1. **Proof/moat** — what the store does well (reviews, brand, content, product proof)
2. **Leaks** — 2–3 structural problems costing sales (cite surfaces, use session impact %)
3. **First move** — recommended priority test and why (reference highest priority_score)

Bold the lead sentence of each paragraph.

### Funnel diagnosis

Table after executive summary:

```markdown
## Funnel diagnosis

**Funnel health score:** {N}/100 | **Buy path completeness:** {N}%

| Stage | Health | Gap | Est. session impact |
|---|---|---|---|
```

Pull rows from `manifest.funnel_analytics.leak_scores` and `benchmark_gaps`. Use percentages only — no dollar amounts.

### Experiment priority matrix

Before proposed experiments:

```markdown
## Experiment priority matrix

| Rank | Experiment | Lift | Effort | Priority | Why now |
|---|---|---|---|---|---|
```

Sort by `priority_score` descending from experiments.json.

### Analytics instrumentation

```markdown
## Analytics instrumentation

Events to add before testing:

- `retailer_click`
- `buy_box_impression`
```

Aggregate unique events from all experiments' `analytics_events` fields.

### Proposed experiments

For each of 10 experiments (sorted by priority_score):

```markdown
### exp-{id} — {title}

**Pillar:** {pillar}
**Affected surface:** {surface}
**URL:** {url}
**Evidence:** `{evidence path or URL}`
**Hypothesis:** {hypothesis}
**Primary change:** {change}
**Primary KPI:** {kpi}
**Secondary KPI:** {guardrail}
**Decision rule:** {rule}
**Expected lift:** {range}
**Confidence:** {N}%
**Implementation effort:** {S|M|L}
**Test duration:** {N} weeks
**Minimum detectable effect:** {MDE}
**Priority score:** {1–100}
**Analytics events:** {comma-separated}
```

### Competitor analysis

Intro sentence + markdown table:

| Competitor | Domain | Positioning | What they make easier | {Store} edge | Pattern to adapt |

3–4 rows. Competitors must be plausible for this store's category.

### Technical checks

Import rows from `manifest.technical_checks`. Ensure ~15 rows with Pass/Warn/Fail and one-line detail.

## Citation rules

- Every experiment evidence field must appear verbatim in the report.
- Executive summary claims must map to funnel_analytics or experiments.
- Use relative paths for screenshots: `audits/{audit_id}/screenshots/...`

## Quality bar

See `takehome/target_report.md` for tone: direct, specific, revenue-focused. No filler. No speculation without Warn/Fail qualification. Metrics are percentages and scores only.
