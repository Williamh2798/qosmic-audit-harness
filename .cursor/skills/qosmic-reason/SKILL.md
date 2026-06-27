---
name: qosmic-reason
description: Identify revenue leaks and design 10 CRO experiments from crawl artifacts for Qosmic audits.
---

# Qosmic Reason Phase

## Input

`audits/{audit_id}/manifest.json` + screenshots

**Analytics-first:** Start from `funnel_analytics.leak_scores` (severity 1–5, session impact %). Every severity-4+ leak MUST map to at least one experiment. Also use `store_insights.scored_leaks`, `experiment_seeds`, and `benchmark_gaps`.

Use `strengths` to avoid proposing fixes for things that already work.

## Output

`audits/{audit_id}/experiments.json` — array of 10 experiment objects matching `schemas/experiment.schema.json`, sorted by `priority_score` descending.

## Experiment schema

Each experiment:

```json
{
  "exp_id": "exp-a1b2c3d4e5f6",
  "title": "Short action title",
  "pillar": "Conversion",
  "affected_surface": "Human-readable surface name",
  "url": "https://...",
  "evidence": "audits/{audit_id}/screenshots/{file}.png",
  "hypothesis": "CVR improves by... because...",
  "primary_change": "Specific UI/UX change",
  "primary_kpi": "Metric name",
  "secondary_kpi": "Guardrail metric (e.g. PDP bounce rate)",
  "decision_rule": "Ship if X improves without hurting Y",
  "expected_lift": "+8–14%",
  "confidence": 75,
  "implementation_effort": "S",
  "test_duration_weeks": 3,
  "minimum_detectable_effect": "+8% relative on primary KPI",
  "priority_score": 72,
  "analytics_events": ["retailer_click", "buy_box_impression"]
}
```

### Effort sizing

| Effort | Meaning | Examples |
|--------|---------|----------|
| S | 2–4 hours theme tweak | Copy change, badge, single module |
| M | 1–2 days | New PDP section, cart recovery page |
| L | 3–5 days | Full Where To Buy rebuild, need-first catalog |

### Priority score (RICE-style)

`(confidence × lift_midpoint) / effort_weight` → 1–100. Higher = run first.

- Lift midpoint from `expected_lift` range (e.g. +8–14% → 11)
- Effort weights: S=1, M=2.5, L=5
- Percentages only — no dollar amounts

## ID format

`exp-` + 12 lowercase hex chars (e.g. `exp-e06feea44fdb`)

## Reasoning rubric

For each leak in `funnel_analytics.leak_scores`:

1. **Severity × session impact** — prioritize severity 4–5 first
2. **What artifact proves it?** Screenshot path or URL from manifest — required
3. **Smallest testable change** — one primary change per experiment
4. **Measurable KPI + guardrail** — primary_kpi + secondary_kpi
5. **Test design** — test_duration_weeks + minimum_detectable_effect tied to traffic tier

## Funnel diagnosis (reasoning output)

Before writing experiments.json, mentally map:

| Stage | Health | Gap | Est. session impact |
|-------|--------|-----|---------------------|

Use `funnel_analytics.buy_path_completeness`, `proof_commerce_gap`, and leak_scores.

## Purchase model adaptation

| Model | Experiment focus |
|-------|------------------|
| `dtc` | Add-to-cart, checkout, AOV bundles, cart recovery |
| `retailer_routed` | Buy-online/find-near-me modules, Where To Buy, retailer clicks |
| `hybrid` | Mix both; clarify path on PDP |
| `unknown` | Infer from `buy_module`, `has_add_to_cart` / `has_price` on PDPs |

## Competitor discovery

Use `category_keywords` from manifest + web search. Find 3–4 brands in the same shopper consideration set. Do not hardcode competitor lists.

## Confidence calibration

| Range | When to use |
|-------|-------------|
| 80–85 | Broken link, 404, missing critical element — screenshot proves it |
| 70–79 | Strong UX hypothesis with clear artifact evidence |
| 60–69 | New page / net-new surface ideas |
| <60 | Avoid — insufficient evidence |

Expected lift: +4–20% only. L effort + >18% lift requires exceptional evidence.

## Pillar diversity

Must include all 5: Conversion, AOV, Retention, Acquisition, Performance — **≥2 each**. Performance = broken links, 404s, speed, mobile issues.
