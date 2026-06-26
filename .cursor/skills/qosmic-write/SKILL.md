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

`sample_output/{store_slug}_audit.md`

## Report structure

### Title

`# {Store Name} audit — {one-line thesis}`

Thesis = highest-level revenue constraint in plain language.

### Executive summary

Exactly 3 paragraphs:

1. **Proof/moat** — what the store does well (reviews, brand, content, product proof)
2. **Leaks** — 2–3 structural problems costing sales (cite surfaces)
3. **First move** — recommended priority test and why

Bold the lead sentence of each paragraph.

### Proposed experiments

For each of 10 experiments:

```markdown
### exp-{id} — {title}

**Pillar:** {pillar}
**Affected surface:** {surface}
**URL:** {url}
**Evidence:** `{evidence path or URL}`
**Hypothesis:** {hypothesis}
**Primary change:** {change}
**Primary KPI:** {kpi}
**Decision rule:** {rule}
**Expected lift:** {range}
**Confidence:** {N}%
```

Order: group by pillar or by priority — either is fine.

### Competitor analysis

Intro sentence + markdown table:

| Competitor | Domain | Positioning | What they make easier | {Store} edge | Pattern to adapt |

3–4 rows. Competitors must be plausible for this store's category.

### Technical checks

Import rows from `manifest.technical_checks`. Ensure ~15 rows with Pass/Warn/Fail and one-line detail. Add agent observations if crawl missed checks.

## Citation rules

- Every experiment evidence field must appear verbatim in the report.
- Executive summary claims must map to at least one experiment or technical check.
- Use relative paths for screenshots: `audits/{audit_id}/screenshots/...`

## Quality bar

See `takehome/target_report.md` for tone: direct, specific, revenue-focused. No filler. No speculation without Warn/Fail qualification.
