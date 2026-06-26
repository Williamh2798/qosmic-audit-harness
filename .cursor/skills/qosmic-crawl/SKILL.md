---
name: qosmic-crawl
description: Run the Playwright crawl script and interpret manifest artifacts for Qosmic audits.
---

# Qosmic Crawl Phase

## Run

```bash
npm run crawl -- https://example-store.com
# Optional: visible browser if WAF blocks headless
npm run crawl -- https://example-store.com --headed
```

## Bot protection (Cloudflare / WAF)

The crawl uses stealth + click-only navigation automatically. If pages return 403:

1. Crawler auto-retries with real Chrome (headed)
2. Manifest marks `status_note: "cloudflare_or_waf"`
3. Agent should cite homepage evidence and document blocks in technical checks

No manual cookies required for clone-and-run usage.

## Outputs

```
audits/{audit_id}/
├── manifest.json
└── screenshots/
    └── {hash}-{slug}.png
```

## Manifest fields

- `purchase_model`: `dtc` | `retailer_routed` | `hybrid` | `unknown`
- `surfaces[]`: url, type, screenshot, status, title, text_excerpt, has_add_to_cart, has_price
- `technical_checks[]`: pre-populated Pass/Warn/Fail rows
- `category_keywords[]`: use for competitor discovery in Reason phase

## Surface types

| Type | What to look for |
|------|------------------|
| homepage | Hero, nav, first-screen CTAs |
| pdp | Price, add-to-cart, reviews, buying module |
| collection | Grid layout, filters, need-language |
| cart | 404 vs empty cart vs checkout path |
| where-to-buy | Store locator, retailer cards |
| content | Blog, FAQ, education pages |

## Agent responsibilities after crawl

1. Open `manifest.json` and list all surfaces with status codes.
2. Review screenshot paths — these are evidence citations for experiments.
3. Note `purchase_model` before proposing experiments.
4. Do not re-crawl unless manifest is missing or >24h stale.
