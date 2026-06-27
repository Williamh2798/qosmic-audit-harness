---
name: qosmic-audit
description: Orchestrate a full Qosmic storefront CRO audit from a single Shopify URL. Crawl, reason, write report.
---

# Qosmic Audit Orchestrator

Run when the user provides a Shopify storefront URL and wants a CRO audit.

## Steps

1. **Crawl** — `npm run crawl -- <url>`. Note `audit_id` from output.
2. **Read manifest** — `audits/{audit_id}/manifest.json`
3. **Reason** — follow `qosmic-reason` skill; write `audits/{audit_id}/experiments.json`
4. **Write** — follow `qosmic-write` skill; output `reports/{slug}_audit.md`
5. **Eval** — `npm run eval -- reports/{slug}_audit.md --manifest audits/{audit_id}/manifest.json`

## Pillar allocation

Distribute 10 experiments across all 5 pillars:

| Pillar | Count | Focus |
|--------|-------|-------|
| Conversion | 2 | PDP CTAs, nav, cart, purchase path |
| AOV | 2 | Bundles, upsells, free-shipping thresholds |
| Retention | 2 | Routines, subscriptions, reorder flows |
| Acquisition | 2 | Landing pages, SEO content, need-based entry |
| Performance | 2 | 404s, speed, broken links, mobile |

Adjust counts if purchase model is `retailer_routed` — emphasize outbound retailer clicks over add-to-cart.

## Stop conditions

- Do not write the report until manifest exists and you have read every screenshot path.
- Do not invent URLs not in manifest or discovered during competitor search.
- If crawl failed on a critical surface, note it in technical checks and experiments.
