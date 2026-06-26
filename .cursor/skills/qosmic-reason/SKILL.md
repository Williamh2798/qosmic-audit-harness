---
name: qosmic-reason
description: Identify revenue leaks and design 10 CRO experiments from crawl artifacts for Qosmic audits.
---

# Qosmic Reason Phase

## Input

`audits/{audit_id}/manifest.json` + screenshots

## Output

`audits/{audit_id}/experiments.json` — array of 10 experiment objects matching `schemas/experiment.schema.json`

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
  "decision_rule": "Ship if X improves without hurting Y",
  "expected_lift": "+8–14%",
  "confidence": 75
}
```

## ID format

`exp-` + 12 lowercase hex chars (e.g. `exp-e06feea44fdb`)

## Reasoning rubric

For each surface, ask:

1. **What revenue leak exists?** Missing CTA, 404, choice overload, weak handoff, no price?
2. **What artifact proves it?** Screenshot path or URL from manifest — required.
3. **What is the smallest testable change?** One primary change per experiment.
4. **How do we know it worked?** KPI + decision rule with guardrail metric.

## Purchase model adaptation

| Model | Experiment focus |
|-------|------------------|
| `dtc` | Add-to-cart, checkout, AOV bundles, cart recovery |
| `retailer_routed` | Buy-online/find-near-me modules, Where To Buy, retailer clicks |
| `hybrid` | Mix both; clarify path on PDP |
| `unknown` | Infer from `has_add_to_cart` / `has_price` on PDPs |

## Competitor discovery

Use `category_keywords` from manifest + web search. Find 3–4 brands in the same shopper consideration set. Do not hardcode competitor lists.

## Confidence calibration

| Range | When to use |
|-------|-------------|
| 85–90 | Broken link, 404, missing critical element — screenshot proves it |
| 70–84 | Strong UX hypothesis with clear artifact evidence |
| 60–69 | New page / net-new surface ideas |
| <60 | Avoid — insufficient evidence |

## Pillar diversity

Must include all 5: Conversion, AOV, Retention, Acquisition, Performance. Performance = broken links, 404s, speed, mobile issues — not just conversion tweaks on PDPs.
