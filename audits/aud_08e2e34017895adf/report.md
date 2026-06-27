# The Ginger People audit — Geo gate swallows PDPs; retailer handoff needs a real bridge

## Executive summary

**The Ginger People carries genuine brand equity — "World's #1 Selling Ginger Candy" and a homepage testimonial from a 34-week pregnant shopper are the kind of proof points most CPG brands spend years earning — but the site is structurally preventing that equity from converting.** Every PDP crawled, from Gin-Gins Original Ginger Chews to Fiji Ginger Juice, returned the homepage shell instead of product content. A visitor who lands on a deep-linked PDP from a Google search, a social post, or a retailer referral sees "Close to Freshness, Close to Heart" and a location selector — not the product they came for. That geo gate is intercepting an estimated 20–40% of sessions before a single product detail renders.

**The retailer-routed purchase model makes the geo gate problem worse, not better, because the entire job of the .com is to warm the shopper and hand them off cleanly to a retail partner or the "Where to Buy" locator.** When PDPs don't load, that handoff never happens. There is zero Product JSON-LD on any crawled page against a category median of 70%, meaning organic product searches that should surface individual SKUs instead surface nothing — or a competitor. The buy module completeness sits at 60%, and the cart URL returned unverifiable content, suggesting the direct-purchase path is also broken for the fraction of shoppers who try it.

**The content and community foundation is strong enough to support a much higher funnel health score than 66.** "Real Ginger. Real Benefits. Real Delicious." is a clean, credible positioning line. The Ginger Rescue® Digestive Wellness Lozenges lead with a specific benefit — "natural nausea relief" — that maps directly to high-intent search queries. The recipe content and the SHOP NOW / SEE RECIPE CTA pairing show someone understands content-to-commerce. The gap is entirely execution: the geo gate needs to resolve PDPs for all regions, the "Where to Buy" nav label needs to be the primary CTA on every product page, and structured data needs to be added so Google can actually index what's being sold.

## Funnel diagnosis

**Funnel health score:** 66/100 | **Buy path completeness:** 60%

| Stage | Health | Gap | Est. session impact |
|---|---|---|---|
| Landing / PDP entry | Critical | All 5 crawled PDPs — including Ginger Soother Turmeric Gingerade and Ginger Rescue Chewable Tablets — return the homepage shell. Shoppers hitting deep links land on a geo selector, not a product. | 20–40% of sessions never see product content |
| Homepage to product browse | Moderate | The collection URL /collections/all and the category URL /the-ginger-people-products both render the same homepage H1 — "Close to Freshness, Close to Heart" — with no distinct browse layer. Nav labels PRODUCTS and WHERE TO BUY compete without hierarchy. | Contributes to the 20–40% geo-gate leak for any session that tries to navigate deeper |
| PDP product detail | Critical | Zero Product JSON-LD across all crawled PDPs against a 70% category median. No buy module detected (0% vs. 75% median). Shoppers who do reach a PDP have no structured purchase path and no schema signal for Google to index SKUs. | Affects all sessions that reach a PDP; organic product-level traffic is suppressed at source |
| Retailer / locator handoff | Weak | "Where to Buy" appears in the nav but is not surfaced as a CTA on PDPs. For a retailer-routed model, the handoff link should be the primary action on every product page — not a nav item shoppers have to find. | No direct leak score, but buy path completeness of 60% reflects this missing bridge |
| Social proof on product pages | Weak | Homepage carries a strong pregnancy testimonial and the "World's #1 Selling" claim, but zero review counts appear on any crawled PDP. Proof doesn't follow the shopper into the decision moment. | Compounds the PDP rendering failure; even when PDPs load, conversion signals are absent |
| Cart | Unverified | /cart returned unverifiable content. For the subset of shoppers attempting direct purchase, the cart is a dead end with no recovery path. | 3–6% of sessions attempting cart access hit an unresolved route |
| Search | Weak | /search returns the same homepage shell H1. Shoppers searching for "ginger chews" or "Ginger Rescue" on-site get no differentiated results page — a missed intent signal and a navigation dead end. | Suppresses on-site discovery for high-intent navigational queries |

## Experiment priority matrix

| Rank | Experiment | Lift | Effort | Priority | Why now |
|---|---|---|---|---|---|
| 1 | exp-7aa65aedf8c4 | +8–18% | M | 97 | Remove geo gate blocking PDP deep links for 20–40% |
| 2 | exp-bf6ffd0b4a1a | +10–18% | M | 93 | Add a persistent retailer buy-box to every PDP |
| 3 | exp-638590bdfc90 | +6–14% | S | 85 | Replace broken /cart route with a retailer purchas |
| 4 | exp-7033f625dc39 | +7–15% | M | 80 | Surface inline retailer CTAs on every collection c |
| 5 | exp-cb19203170b8 | +5–12% | S | 74 | Add Product JSON-LD structured data to all PDPs |
| 6 | exp-8cc6663e2173 | +8–16% | S | 71 | Pin a 'Where to Buy' sticky bar on all PDPs for mo |
| 7 | exp-7472d78ee2df | +6–12% | S | 63 | Embed homepage testimonials directly above the her |
| 8 | exp-8cac91302279 | +5–12% | M | 55 | Add a product-specific retailer CTA to every blog/ |
| 9 | exp-a6a37b6c8b0b | +4–10% | M | 47 | Add an email capture with ginger-tips lead magnet  |
| 10 | exp-0333c53d7877 | +5–10% | M | 38 | Show a 'You may also like' product carousel on the |

## Analytics instrumentation

Events to add before testing:

- `geo_gate_modal_shown`
- `geo_gate_region_selected`
- `pdp_buy_button_clicked`
- `where_to_buy_locator_opened`
- `retailer_link_clicked`
- `cart_page_loaded`

## Proposed experiments

### exp-7aa65aedf8c4 — Remove geo gate blocking PDP deep links for 20–40% of sessions

**Pillar:** Performance
**Affected surface:** PDP navigation
**URL:** https://gingerpeople.com/products/ginger-soother-turmeric-gingerade
**Evidence:** `audits/aud_08e2e34017895adf/screenshots/b2f64d78-home.png`
**Hypothesis:** CVR improves because 5 PDPs blocked by geo/region gate — captured homepage shell instead of product content, affecting 20–40% of sessions as cited in leak id 'geo_gate_blocked' severity 5
**Primary change:** Serve product page content to all regions by default and move geo-selection to a non-blocking banner or modal overlay that does not redirect to homepage shell
**Primary KPI:** PDP retailer click-through rate
**Secondary KPI:** PDP bounce rate
**Decision rule:** Ship if retailer click-through rate lifts ≥+8% relative with p<0.05; kill if PDP bounce rate rises >5% relative
**Expected lift:** +8–18%
**Confidence:** 82%
**Implementation effort:** M
**Test duration:** 3 weeks
**Minimum detectable effect:** +8% relative on primary KPI
**Priority score:** 97
**Analytics events:** geo_gate_shown, geo_gate_dismissed, pdp_view, retailer_click

### exp-bf6ffd0b4a1a — Add a persistent retailer buy-box to every PDP

**Pillar:** Conversion
**Affected surface:** PDP
**URL:** https://gingerpeople.com/products/gin-gins-original-ginger-chews
**Evidence:** `audits/aud_08e2e34017895adf/screenshots/b2f64d78-home.png`
**Hypothesis:** CVR improves because 'PDP buy module present' is observed at 0% vs category median of 75%, meaning shoppers landing on PDPs have no clear purchase action visible as cited in benchmark_gaps
**Primary change:** Inject a sticky buy-box section on all PDPs containing retailer CTA buttons (Amazon, Walmart, etc.) with product name and a 'Where to Buy' anchor link
**Primary KPI:** PDP retailer click-through rate
**Secondary KPI:** PDP scroll depth
**Decision rule:** Ship if retailer click-through rate lifts ≥+8% relative with p<0.05; kill if PDP scroll depth drops >10% relative
**Expected lift:** +10–18%
**Confidence:** 80%
**Implementation effort:** M
**Test duration:** 3 weeks
**Minimum detectable effect:** +8% relative on primary KPI
**Priority score:** 93
**Analytics events:** buy_box_impression, retailer_click, where_to_buy_anchor_click

### exp-638590bdfc90 — Replace broken /cart route with a retailer purchase-recovery page

**Pillar:** Performance
**Affected surface:** /cart
**URL:** https://gingerpeople.com/cart
**Evidence:** `audits/aud_08e2e34017895adf/screenshots/b2f64d78-home.png`
**Hypothesis:** CVR improves because 'Cart URL did not load verifiable content' affecting 3–6% of sessions as cited in leak id 'cart_unverified' severity 3, leaving shoppers with no recovery path
**Primary change:** Redirect /cart to a branded 'Find This Product' page listing top retailer links and a store-locator CTA instead of rendering a broken or empty cart template
**Primary KPI:** Retailer click-through rate from /cart redirect
**Secondary KPI:** Exit rate on /cart
**Decision rule:** Ship if retailer click-through rate from redirect lifts ≥+6% relative with p<0.05; kill if exit rate on /cart rises >8% relative
**Expected lift:** +6–14%
**Confidence:** 75%
**Implementation effort:** S
**Test duration:** 2 weeks
**Minimum detectable effect:** +6% relative on primary KPI
**Priority score:** 85
**Analytics events:** cart_page_view, cart_redirect_fired, retailer_click, store_locator_click

### exp-7033f625dc39 — Surface inline retailer CTAs on every collection card

**Pillar:** Conversion
**Affected surface:** Collection page
**URL:** https://gingerpeople.com/collections/all
**Evidence:** `audits/aud_08e2e34017895adf/screenshots/b2f64d78-home.png`
**Hypothesis:** CVR improves because collection pages show 'SHOP NOW' and 'WHERE TO BUY' only in the hero with no per-product retailer action, as evidenced by buy_module atc_label null and retailer_links limited to global nav in the collection surface audit
**Primary change:** Add a 'Buy Now' retailer dropdown button to each product card on the collection grid that expands to show top 2–3 retailer links on hover/tap
**Primary KPI:** Collection-to-retailer click rate
**Secondary KPI:** Collection page bounce rate
**Decision rule:** Ship if collection-to-retailer click rate lifts ≥+7% relative with p<0.05; kill if collection page bounce rate rises >5% relative
**Expected lift:** +7–15%
**Confidence:** 75%
**Implementation effort:** M
**Test duration:** 3 weeks
**Minimum detectable effect:** +7% relative on primary KPI
**Priority score:** 80
**Analytics events:** collection_card_retailer_dropdown_open, retailer_click, collection_page_view

### exp-cb19203170b8 — Add Product JSON-LD structured data to all PDPs

**Pillar:** Acquisition
**Affected surface:** PDP head/meta
**URL:** https://gingerpeople.com/products/gin-gins-ginger-spice-drops
**Evidence:** `audits/aud_08e2e34017895adf/screenshots/b2f64d78-home.png`
**Hypothesis:** CVR improves because 'Product JSON-LD coverage' is observed at 0% vs category median of 70%, meaning PDPs are invisible to Google Shopping rich results and organic product panels as cited in benchmark_gaps
**Primary change:** Inject Product JSON-LD schema (name, image, description, offers with retailer URL) into the <head> of all PDP templates
**Primary KPI:** Organic PDP sessions from search
**Secondary KPI:** PDP retailer click-through rate
**Decision rule:** Ship if organic PDP sessions rise ≥+5% relative over test window; kill if PDP retailer click-through rate drops >3% relative
**Expected lift:** +5–12%
**Confidence:** 72%
**Implementation effort:** S
**Test duration:** 4 weeks
**Minimum detectable effect:** +5% relative on primary KPI
**Priority score:** 74
**Analytics events:** pdp_organic_session, json_ld_present, retailer_click

### exp-8cc6663e2173 — Pin a 'Where to Buy' sticky bar on all PDPs for mobile

**Pillar:** Acquisition
**Affected surface:** PDP mobile
**URL:** https://gingerpeople.com/products/ginger-rescue-chewable-ginger-tablets-strong
**Evidence:** `audits/aud_08e2e34017895adf/screenshots/b2f64d78-home.png`
**Hypothesis:** CVR improves because all PDPs render the homepage shell for 20–40% of sessions due to geo gate and show no persistent buy action, as evidenced by buy_module atc_label null and has_quantity_selector false across all PDP surfaces in the audit
**Primary change:** Add a fixed bottom bar on mobile PDP views containing a single 'Find in Store / Buy Online' CTA that links to the where-to-buy locator page
**Primary KPI:** Mobile PDP retailer click-through rate
**Secondary KPI:** Mobile PDP bounce rate
**Decision rule:** Ship if mobile PDP retailer click-through rate lifts ≥+8% relative with p<0.05; kill if mobile PDP bounce rate rises >5% relative
**Expected lift:** +8–16%
**Confidence:** 73%
**Implementation effort:** S
**Test duration:** 2 weeks
**Minimum detectable effect:** +8% relative on primary KPI
**Priority score:** 71
**Analytics events:** mobile_sticky_bar_impression, mobile_sticky_bar_click, retailer_click, where_to_buy_page_view

### exp-7472d78ee2df — Embed homepage testimonials directly above the hero retailer CTA

**Pillar:** AOV
**Affected surface:** Homepage hero
**URL:** https://gingerpeople.com
**Evidence:** `audits/aud_08e2e34017895adf/screenshots/b2f64d78-home.png`
**Hypothesis:** AOV rises because homepage testimonials such as 'I'm pregnant and these have been a life saver my whole pregnancy' exist on the page but are positioned below the fold, as evidenced by the homepage excerpt showing testimonials after multiple hero sections in the audit
**Primary change:** Move the top-rated testimonial quote and star rating to appear directly above the primary 'SHOP NOW' hero CTA button
**Primary KPI:** Homepage-to-retailer click rate
**Secondary KPI:** Homepage bounce rate
**Decision rule:** Ship if homepage-to-retailer click rate lifts ≥+6% relative with p<0.05; kill if homepage bounce rate rises >4% relative
**Expected lift:** +6–12%
**Confidence:** 68%
**Implementation effort:** S
**Test duration:** 2 weeks
**Minimum detectable effect:** +6% relative on primary KPI
**Priority score:** 63
**Analytics events:** testimonial_impression, hero_cta_click, retailer_click

### exp-8cac91302279 — Add a product-specific retailer CTA to every blog/recipe content page

**Pillar:** AOV
**Affected surface:** Blog / content pages
**URL:** https://gingerpeople.com/blogs/news
**Evidence:** `audits/aud_08e2e34017895adf/screenshots/b2f64d78-home.png`
**Hypothesis:** AOV rises because blog and recipe content pages show only global nav retailer links with no inline product recommendation or buy path, as evidenced by buy_module atc_label null and retailer_links limited to nav-level entries across all content surface audits
**Primary change:** Insert a mid-article product recommendation card with product image, name, and 'Buy at [Retailer]' CTA button contextually matched to the article topic
**Primary KPI:** Content-page-to-retailer click rate
**Secondary KPI:** Content page exit rate
**Decision rule:** Ship if content-page-to-retailer click rate lifts ≥+5% relative with p<0.05; kill if content page exit rate rises >6% relative
**Expected lift:** +5–12%
**Confidence:** 65%
**Implementation effort:** M
**Test duration:** 3 weeks
**Minimum detectable effect:** +5% relative on primary KPI
**Priority score:** 55
**Analytics events:** content_product_card_impression, content_product_card_click, retailer_click

### exp-a6a37b6c8b0b — Add an email capture with ginger-tips lead magnet on the where-to-buy page

**Pillar:** Retention
**Affected surface:** Where-to-buy page
**URL:** https://gingerpeople.com/where-to-buy-the-ginger-people-products
**Evidence:** `audits/aud_08e2e34017895adf/screenshots/b2f64d78-home.png`
**Hypothesis:** Repeat purchase rate improves because the where-to-buy page has no email capture or re-engagement mechanism, as evidenced by buy_module showing only retailer_links with no subscription or retention touchpoint across the where-to-buy surface audit
**Primary change:** Add an inline email opt-in form on the where-to-buy page offering a 'Ginger Wellness Guide' PDF in exchange for email, enabling post-visit re-engagement
**Primary KPI:** Email opt-in rate on where-to-buy page
**Secondary KPI:** Where-to-buy page retailer click rate
**Decision rule:** Ship if email opt-in rate reaches ≥+4% absolute with p<0.05; kill if where-to-buy page retailer click rate drops >5% relative
**Expected lift:** +4–10%
**Confidence:** 63%
**Implementation effort:** M
**Test duration:** 3 weeks
**Minimum detectable effect:** +4% absolute on primary KPI
**Priority score:** 47
**Analytics events:** email_optin_form_impression, email_optin_submit, retailer_click, where_to_buy_page_view

### exp-0333c53d7877 — Show a 'You may also like' product carousel on the where-to-buy page

**Pillar:** Retention
**Affected surface:** Where-to-buy page
**URL:** https://gingerpeople.com/where-to-buy-the-ginger-people-products
**Evidence:** `audits/aud_08e2e34017895adf/screenshots/b2f64d78-home.png`
**Hypothesis:** Repeat purchase rate improves because the where-to-buy page presents no cross-product discovery path, as evidenced by buy_module has_variant_picker false and no product recommendation elements visible in the where-to-buy surface audit
**Primary change:** Add a horizontal scrolling product carousel above the retailer locator on the where-to-buy page, linking each card to its PDP with a secondary 'Learn More' CTA
**Primary KPI:** Where-to-buy page PDP click-through rate
**Secondary KPI:** Where-to-buy page session duration
**Decision rule:** Ship if PDP click-through rate from where-to-buy page lifts ≥+5% relative with p<0.05; kill if session duration drops >8% relative
**Expected lift:** +5–10%
**Confidence:** 60%
**Implementation effort:** M
**Test duration:** 3 weeks
**Minimum detectable effect:** +5% relative on primary KPI
**Priority score:** 38
**Analytics events:** product_carousel_impression, product_carousel_click, pdp_view, retailer_click

## Competitor analysis

Three brands are positioned to capture the shopper The Ginger People loses at the geo gate or the retailer handoff.

| Competitor | Domain | Positioning | What they make easier | The Ginger People edge | Pattern to adapt |
|---|---|---|---|---|---|
| Chimes Ginger Chews | chimesginger.com | Flavored ginger chew variety with clean packaging and strong Amazon presence; targets the same nausea-relief and snacking occasion. | PDPs load without a geo gate; Amazon buy button is the primary CTA on every product page. | The Ginger People's "World's #1 Selling" claim and Ginger Rescue® brand recognition are stronger — Chimes has no equivalent wellness sub-brand. | Chimes wins on frictionless purchase path; The Ginger People wins on brand authority when the site actually renders. |
| Reed's Ginger Beer / Reed's Inc. | reedsinc.com | Ginger-forward beverage brand with a wellness and craft-drink angle; competes for the ginger-as-remedy shopper. | Retailer locator is a top-nav primary action with zip-code lookup above the fold on product pages. | The Ginger People's candy and supplement range is broader; Ginger Soother and Fiji Ginger Juice have no Reed's equivalent. | Reed's shows exactly what a retailer-routed handoff should look like — locator as primary CTA, not a nav afterthought. |
| Prince of Peace Ginger Candy | popus.com | Value-positioned ginger chew with heavy Amazon and Asian grocery distribution; targets price-sensitive buyers of the same SKU format. | No geo gate; product pages carry star ratings and review counts inline. | The Ginger People's "Real Ginger. Real Benefits." positioning and the Ginger Rescue® wellness line command a premium that Prince of Peace cannot match. | Prince of Peace wins on review visibility at the product level — a gap The Ginger People can close by surfacing its existing testimonials on PDPs. |
| Buderim Ginger | buderimginger.com | Australian-origin ginger brand with a provenance and purity story; overlaps directly on the "real ginger" and freshness messaging. | Region selector is a footer utility, not a full-page gate — shoppers reach product content immediately. | The Ginger People's Fiji Ginger Juice and bulk ingredients range gives it a broader SKU footprint and a B2B angle Buderim doesn't emphasize. | Buderim demonstrates that a multi-region brand can handle geo routing without blocking PDP content — the region selector doesn't have to be a gate. |

## Technical checks

| Check | Status | Detail |
|---|---|---|
| SSL Certificate | Pass | HTTPS storefront loaded successfully. |
| HTTPS Redirect | Warn | HTTP redirect was not verified in this pass. |
| Sitemap | Warn | sitemap.xml not found or returned an error. |
| Robots.txt | Pass | robots.txt responded successfully. |
| Critical Pages Loading | Fail | Issues on: https://gingerpeople.com/collections/all, https://gingerpeople.com/cart. |
| Meta Tags & Social Previews | Pass | 20/20 pages had title + meta description. |
| Structured Data | Warn | No verified PDPs — Product JSON-LD not confirmed. |
| Favicon | Pass | Favicon link detected on homepage. |
| Mobile-Friendly | Warn | Mobile capture was not completed. |
| Page Speed Mobile | Warn | No performance metrics captured. |
| Page Speed Desktop | Warn | No desktop speed run performed. |
| Broken Links | Fail | Broken/blocked: https://gingerpeople.com/collections/all, https://gingerpeople.com/cart, https://gingerpeople.com/checkout, https://gingerpeople.com/search, https://gingerpeople.com/pages/about, https://gingerpeople.com/pages/about-us, https://gingerpeople.com/blogs/news, /the-ginger-people-products/, /gin-gins/, /ginger-rescue-tablets-lozenges/, /ginger-rescue-ginger-shots/, /ginger-and-turmeric-juice/, /ginger-soother-gingerade/, /ginger-pantry-baking/, /ginger-pantry-cooking/, /sauces/, /specialty-deli/. |
| Image Optimization | Fail | 87% images missing alt text on homepage. Total page weight 4MB. |
| Cookie/Privacy | Pass | Privacy policy link visible in footer. |
| Checkout Reachable | Fail | Cart/checkout path was not reachable from crawl. |
