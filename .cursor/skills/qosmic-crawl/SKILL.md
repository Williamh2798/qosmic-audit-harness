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

1. Crawler auto-retries with real Chrome (headed) when >30% WAF blocks
2. Geo-gated stores: headed **region bootstrap** saves `storage-state.json`, then retries failed surfaces headless (skips full duplicate re-crawl)
3. Manifest marks `status_note: "cloudflare_or_waf"`
4. Geo-gated stores mark `navigation_failure: "geo_gate"` and `render_source: "geo_blocked" | "api_fallback" | "dom"`

No manual cookies required for clone-and-run usage.

## Outputs

```
audits/{audit_id}/
├── manifest.json
├── storage-state.json   (geo-gated stores — saved region session)
├── report.html / report.pdf
├── experiments.json   (after reason phase)
└── screenshots/
    ├── {hash}-{slug}.png
    ├── {hash}-{slug}-fold.png          (homepage, PDP, cart, WTB)
    ├── {hash}-{slug}-mobile-fold.png
    └── {hash}-{slug}-mobile.png   (homepage + PDP only)
```

Sample output after full audit:
- `reports/{slug}_audit.md` — agent artifact
- `reports/{slug}_audit.html` — browser preview
- `reports/{slug}_audit.pdf` — human deliverable

## Manifest fields

- `purchase_model`: `dtc` | `retailer_routed` | `hybrid` | `unknown`
- `funnel_analytics`: scored leaks, benchmark gaps, funnel_health_score, buy_path_completeness, proof_commerce_gap
- `funnel_steps`: DTC add-to-cart probe results (when applicable)
- `surfaces[]`: url, type, screenshot, fold_screenshot, mobile_fold_screenshot, status, page_url, content_verified, navigation_failure, render_source
- `technical_checks[]`: Pass/Warn/Fail rows (real LCP/image metrics on homepage)
- `category_keywords[]`: use for competitor discovery in Reason phase
- `store_insights`: `top_leaks`, `scored_leaks`, `strengths`, `experiment_seeds`, funnel scores

### Rich surface fields

| Field | Purpose |
|-------|---------|
| `buy_module` | price_text, atc_label, variant picker, subscription, retailer_links |
| `trust_signals` | free shipping threshold, return policy, payment icons |
| `social_proof` | star_rating, review_count, widget source (Judge.me/Yotpo) |
| `structured_data` | JSON-LD types (Product, Organization), offers, ratings |
| `above_fold_excerpt` | First-screen visible text |
| `images` | count, missing_alt_pct, largest image weight |
| `performance` | lcp_ms, ttfb_ms, total_page_weight_bytes (homepage + 1 PDP) |
| `filters_and_sort`, `breadcrumb`, `internal_links` | Collection/nav signals |
| `shopify_product` | API enrichment: variants, inventory, compare_at_price |

## Surface types

| Type | What to look for |
|------|------------------|
| homepage | Hero, nav, first-screen CTAs, performance metrics |
| collection | Shopify collection grids, filters |
| category | Product catalog / all-products / need-family landings |
| pdp | buy_module, social_proof, structured_data, reviews |
| cart | 404 vs empty cart vs checkout path |
| checkout | Shipping/payment funnel (DTC stores) |
| search | Search results, zero-result recovery |
| where-to-buy | Store locator, retailer cards |
| content | Blog, FAQ, recipes, education, bulk/wholesale |

Crawl budget: up to **28 surfaces** (5 PDPs, 4 collections, 3 category pages, 6 content pages, plus cart/checkout/search/where-to-buy).

## Agent responsibilities after crawl

1. Open `manifest.json` — review `funnel_analytics.leak_scores` first (severity-ranked).
2. Review screenshot paths — evidence citations for experiments.
3. Note `purchase_model` and `funnel_health_score` before proposing experiments.
4. Do not re-crawl unless manifest is missing or >24h stale.
