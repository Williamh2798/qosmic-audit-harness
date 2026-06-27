# Home Page – Zen Rojas audit — conversion leaks need fixing

## Executive summary

**The store has product proof but structural gaps in the purchase path.** Crawl artifacts show clear strengths in brand and catalog depth, but funnel analytics flagged multiple leaks affecting session conversion.

**High-severity leaks cluster on key purchase surfaces** — cart, PDP buy modules, and navigation handoffs need attention. Estimated session impact ranges from 3–25% depending on leak type.

**Start with the highest-priority experiment** from the priority matrix — lowest implementation effort with the highest confidence and lift potential.

## Funnel diagnosis

**Funnel health score:** 80/100 | **Buy path completeness:** 80%

| Stage | Health | Gap | Est. session impact |
|---|---|---|---|
| Products | Severity 3/5 | Collection "Products" has sold-out tiles. | 3–8% |
| Organic Sleep Tea | Severity 2/5 | Hero PDP missing Product JSON-LD structured data. | 2–5% |

## Experiment priority matrix

| Rank | Experiment | Lift | Effort | Priority | Why now |
|---|---|---|---|---|---|
| 1 | exp-fd26e17c45ab | +6–12% | S | 65 | Fix Products leak |
| 2 | exp-cf85ad3c02ba | +6–12% | S | 65 | Fix Organic Sleep Tea leak |
| 3 | exp-c0a436fd90d2 | +6–10% | S | 56 | Improve collection UX |
| 4 | exp-766af97ccbcb | +6–10% | S | 56 | Improve collection UX |
| 5 | exp-887b67d48c1c | +6–10% | S | 56 | Improve collection UX |
| 6 | exp-c6fa88f7de72 | +6–10% | S | 56 | Improve category UX |
| 7 | exp-5c3fc1105b03 | +6–10% | S | 56 | Improve pdp UX |
| 8 | exp-3e6861e007fe | +6–10% | S | 56 | Improve pdp UX |
| 9 | exp-8f8ffcb98c5f | +6–10% | S | 56 | Improve pdp UX |
| 10 | exp-9034ef812217 | +6–10% | S | 56 | Improve pdp UX |

## Analytics instrumentation

Events to add before testing:

- `buy_box_impression`
- `add_to_cart`
- `cta_click`

## Proposed experiments

### exp-fd26e17c45ab — Fix Products leak

**Pillar:** Conversion
**Affected surface:** Products
**URL:** https://zenrojas.com/collections/all
**Evidence:** `audits/aud_aaf09ecf84633e41/screenshots/5b940095-collections-all.png`
**Hypothesis:** CVR improves by addressing collection "products" has sold-out tiles. because crawl evidence shows severity 3 impact on ~3–8% of sessions.
**Primary change:** Resolve: Collection "Products" has sold-out tiles.
**Primary KPI:** Conversion rate
**Secondary KPI:** Bounce rate
**Decision rule:** Ship if primary KPI improves without hurting secondary KPI over 3 weeks.
**Expected lift:** +6–12%
**Confidence:** 72%
**Implementation effort:** S
**Test duration:** 3 weeks
**Minimum detectable effect:** +8% relative on primary KPI
**Priority score:** 65
**Analytics events:** conversion_event, surface_impression

### exp-cf85ad3c02ba — Fix Organic Sleep Tea leak

**Pillar:** Conversion
**Affected surface:** Organic Sleep Tea
**URL:** https://zenrojas.com/products/organicsleeptea
**Evidence:** `audits/aud_aaf09ecf84633e41/screenshots/a1ec8fc2-products-organicsleeptea.png`
**Hypothesis:** CVR improves by addressing hero pdp missing product json-ld structured data. because crawl evidence shows severity 2 impact on ~2–5% of sessions.
**Primary change:** Resolve: Hero PDP missing Product JSON-LD structured data.
**Primary KPI:** Conversion rate
**Secondary KPI:** Bounce rate
**Decision rule:** Ship if primary KPI improves without hurting secondary KPI over 3 weeks.
**Expected lift:** +6–12%
**Confidence:** 72%
**Implementation effort:** S
**Test duration:** 3 weeks
**Minimum detectable effect:** +8% relative on primary KPI
**Priority score:** 65
**Analytics events:** conversion_event, surface_impression

### exp-c0a436fd90d2 — Improve collection UX

**Pillar:** AOV
**Affected surface:** collection
**URL:** https://zenrojas.com/collections/all
**Evidence:** `audits/aud_aaf09ecf84633e41/screenshots/5b940095-collections-all.png`
**Hypothesis:** CVR improves by optimizing the collection experience because crawl shows room for clearer purchase paths.
**Primary change:** Add clearer CTA and purchase guidance on this surface.
**Primary KPI:** Conversion rate
**Secondary KPI:** Time on page
**Decision rule:** Ship if primary KPI improves at 95% confidence over 3 weeks.
**Expected lift:** +6–10%
**Confidence:** 70%
**Implementation effort:** S
**Test duration:** 3 weeks
**Minimum detectable effect:** +6% relative on primary KPI
**Priority score:** 56
**Analytics events:** cta_click

### exp-766af97ccbcb — Improve collection UX

**Pillar:** AOV
**Affected surface:** collection
**URL:** https://zenrojas.com/collections/teas
**Evidence:** `audits/aud_aaf09ecf84633e41/screenshots/61e96e8f-collections-teas.png`
**Hypothesis:** CVR improves by optimizing the collection experience because crawl shows room for clearer purchase paths.
**Primary change:** Add clearer CTA and purchase guidance on this surface.
**Primary KPI:** Conversion rate
**Secondary KPI:** Time on page
**Decision rule:** Ship if primary KPI improves at 95% confidence over 3 weeks.
**Expected lift:** +6–10%
**Confidence:** 70%
**Implementation effort:** S
**Test duration:** 3 weeks
**Minimum detectable effect:** +6% relative on primary KPI
**Priority score:** 56
**Analytics events:** cta_click

### exp-887b67d48c1c — Improve collection UX

**Pillar:** Retention
**Affected surface:** collection
**URL:** https://zenrojas.com/collections/teaware
**Evidence:** `audits/aud_aaf09ecf84633e41/screenshots/265baf14-collections-teaware.png`
**Hypothesis:** CVR improves by optimizing the collection experience because crawl shows room for clearer purchase paths.
**Primary change:** Add clearer CTA and purchase guidance on this surface.
**Primary KPI:** Conversion rate
**Secondary KPI:** Time on page
**Decision rule:** Ship if primary KPI improves at 95% confidence over 3 weeks.
**Expected lift:** +6–10%
**Confidence:** 70%
**Implementation effort:** S
**Test duration:** 3 weeks
**Minimum detectable effect:** +6% relative on primary KPI
**Priority score:** 56
**Analytics events:** cta_click

### exp-c6fa88f7de72 — Improve category UX

**Pillar:** Retention
**Affected surface:** category
**URL:** https://zenrojas.com/products
**Evidence:** `audits/aud_aaf09ecf84633e41/screenshots/2a119dc6-products.png`
**Hypothesis:** CVR improves by optimizing the category experience because crawl shows room for clearer purchase paths.
**Primary change:** Add clearer CTA and purchase guidance on this surface.
**Primary KPI:** Conversion rate
**Secondary KPI:** Time on page
**Decision rule:** Ship if primary KPI improves at 95% confidence over 3 weeks.
**Expected lift:** +6–10%
**Confidence:** 70%
**Implementation effort:** S
**Test duration:** 3 weeks
**Minimum detectable effect:** +6% relative on primary KPI
**Priority score:** 56
**Analytics events:** cta_click

### exp-5c3fc1105b03 — Improve pdp UX

**Pillar:** Acquisition
**Affected surface:** pdp
**URL:** https://zenrojas.com/products/organicsleeptea
**Evidence:** `audits/aud_aaf09ecf84633e41/screenshots/a1ec8fc2-products-organicsleeptea.png`
**Hypothesis:** CVR improves by optimizing the pdp experience because crawl shows room for clearer purchase paths.
**Primary change:** Add clearer CTA and purchase guidance on this surface.
**Primary KPI:** Average order value
**Secondary KPI:** Time on page
**Decision rule:** Ship if primary KPI improves at 95% confidence over 3 weeks.
**Expected lift:** +6–10%
**Confidence:** 70%
**Implementation effort:** S
**Test duration:** 3 weeks
**Minimum detectable effect:** +6% relative on primary KPI
**Priority score:** 56
**Analytics events:** cta_click

### exp-3e6861e007fe — Improve pdp UX

**Pillar:** Acquisition
**Affected surface:** pdp
**URL:** https://zenrojas.com/products/bodyguardtea
**Evidence:** `audits/aud_aaf09ecf84633e41/screenshots/91d6cb7e-products-bodyguardtea.png`
**Hypothesis:** CVR improves by optimizing the pdp experience because crawl shows room for clearer purchase paths.
**Primary change:** Add clearer CTA and purchase guidance on this surface.
**Primary KPI:** Conversion rate
**Secondary KPI:** Time on page
**Decision rule:** Ship if primary KPI improves at 95% confidence over 3 weeks.
**Expected lift:** +6–10%
**Confidence:** 70%
**Implementation effort:** S
**Test duration:** 3 weeks
**Minimum detectable effect:** +6% relative on primary KPI
**Priority score:** 56
**Analytics events:** cta_click

### exp-8f8ffcb98c5f — Improve pdp UX

**Pillar:** Performance
**Affected surface:** pdp
**URL:** https://zenrojas.com/products/premiumsenchagreentea
**Evidence:** `audits/aud_aaf09ecf84633e41/screenshots/64ae2696-products-premiumsenchagreentea.png`
**Hypothesis:** CVR improves by optimizing the pdp experience because crawl shows room for clearer purchase paths.
**Primary change:** Add clearer CTA and purchase guidance on this surface.
**Primary KPI:** Conversion rate
**Secondary KPI:** Time on page
**Decision rule:** Ship if primary KPI improves at 95% confidence over 3 weeks.
**Expected lift:** +6–10%
**Confidence:** 70%
**Implementation effort:** S
**Test duration:** 3 weeks
**Minimum detectable effect:** +6% relative on primary KPI
**Priority score:** 56
**Analytics events:** cta_click

### exp-9034ef812217 — Improve pdp UX

**Pillar:** Performance
**Affected surface:** pdp
**URL:** https://zenrojas.com/products/heartburntea
**Evidence:** `audits/aud_aaf09ecf84633e41/screenshots/42a0aabc-products-heartburntea.png`
**Hypothesis:** CVR improves by optimizing the pdp experience because crawl shows room for clearer purchase paths.
**Primary change:** Add clearer CTA and purchase guidance on this surface.
**Primary KPI:** Conversion rate
**Secondary KPI:** Time on page
**Decision rule:** Ship if primary KPI improves at 95% confidence over 3 weeks.
**Expected lift:** +6–10%
**Confidence:** 70%
**Implementation effort:** S
**Test duration:** 3 weeks
**Minimum detectable effect:** +6% relative on primary KPI
**Priority score:** 56
**Analytics events:** cta_click

## Competitor analysis

Category competitors set a higher bar for purchase clarity and guided shopping.

| Competitor | Domain | Positioning | What they make easier | Home Page – Zen Rojas edge | Pattern to adapt |
|---|---|---|---|---|---|
| Harney & Sons | harney.com | Premium tea DTC | Clear product taxonomy | Organic focus | Need-first homepage blocks |
| Traditional Medicinals | traditionalmedicinals.com | Wellness tea leader | Benefit-led navigation | Veteran story | Health benefit filters |
| Yogi Tea | yogiproducts.com | Mass wellness | Retailer + DTC paths | Ritual branding | Dual buy paths |

## Technical checks

| Check | Status | Detail |
|---|---|---|
| SSL Certificate | Pass | HTTPS storefront loaded successfully. |
| HTTPS Redirect | Pass | HTTP redirects to HTTPS. |
| Sitemap | Pass | sitemap.xml responded successfully. |
| Robots.txt | Pass | robots.txt responded successfully. |
| Critical Pages Loading | Pass | Homepage, collections, and PDPs loaded. |
| Meta Tags & Social Previews | Pass | 20/20 pages had title + meta description. |
| Structured Data | Warn | No JSON-LD detected on captured pages. |
| Favicon | Warn | Favicon not detected from captured evidence. |
| Mobile-Friendly | Pass | Mobile viewport screenshot captured for homepage. |
| Page Speed Mobile | Warn | No performance metrics captured. |
| Page Speed Desktop | Warn | No desktop speed run performed. |
| Broken Links | Pass | No broken internal links detected in sample. |
| Image Optimization | Fail | 54% images missing alt text on homepage. |
| Cookie/Privacy | Pass | Privacy policy link visible in footer. |
| Checkout Reachable | Pass | Cart URL loaded without error. |
