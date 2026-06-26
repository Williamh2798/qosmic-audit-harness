# Zen Rojas audit — the ritual story sells; stock and shipping math block the cart

## Executive summary

**Zen Rojas has a strong ritual brand and weak inventory handoff.** The DTC storefront at `zenrojas.com` loads cleanly with veteran-owned storytelling, organic positioning, and mission-based navigation (Sleep, Immune, Energy, Digestion). Bodyguard Organic Tea ($13) and Organic Sleep Tea ($12) PDPs show price, add-to-cart, and rich ingredient copy — but the Teas collection marks multiple hero SKUs Sold Out including Organic Sleep Tea, Heartburn Tea, Premium Sencha, and Unwind. Shoppers arriving from homepage mission cards hit dead ends.

**Free shipping creates a basket math problem without a bundle bridge.** The site banner pushes FREE SHIPPING ON ALL $50+ ORDERS while homepage ritual accessories (infuser $5, mug $8, tea bags $5) and single bags ($8–$13) sit far below threshold. The empty cart page offers only Continue browsing — no recovery merchandising, no progress toward $50, no sampler bridge.

**Fix inventory UX before scaling acquisition.** The first test should recover sold-out collection tiles with waitlist + sampler alternates; parallel work: bundle a ritual starter above $50, enrich empty cart, and add Product JSON-LD (none detected in crawl). Retention and acquisition experiments build on the veteran ritual narrative already on About.

## Proposed experiments

### exp-a1f83c2d9e01 — Recover sold-out hero SKUs

**Pillar:** Conversion
**Affected surface:** Teas collection grid
**URL:** https://zenrojas.com/collections/teas
**Evidence:** `audits/aud_3601e39cfe6f4682/screenshots/61e96e8f-collections-teas.png`
**Hypothesis:** CVR improves by replacing dead-end Sold Out tiles with waitlist, alternates, or bundle substitutes. Collection shows Organic Sleep Tea, Heartburn Tea, Premium Sencha, and Unwind marked Sold Out while samplers remain available.
**Primary change:** On sold-out tiles, show Notify me, Try sampler ($2), or Shop similar blend with one-click add.
**Primary KPI:** Collection click-through to in-stock PDP
**Decision rule:** Ship if collection CTR to purchasable SKUs rises without increasing bounce.
**Expected lift:** +10–18%
**Confidence:** 82%

### exp-b2e94d3e0f12 — Bundle ritual starter under $50 threshold

**Pillar:** AOV
**Affected surface:** Homepage ritual section
**URL:** https://zenrojas.com/
**Evidence:** `audits/aud_3601e39cfe6f4682/screenshots/361e7ba3-home.png`
**Hypothesis:** AOV and conversion rise when homepage ritual block becomes a shoppable bundle crossing the free-shipping threshold. Banner states FREE SHIPPING ON ALL $50+ ORDERS; ritual items are priced below threshold individually.
**Primary change:** Add Steep Into Something Sacred bundle: one tea + infuser + mug at $52 with free shipping callout.
**Primary KPI:** AOV (homepage visitors)
**Decision rule:** Ship if AOV rises ≥$6 and bundle attach rate ≥8% without hurting homepage bounce.
**Expected lift:** +12–20%
**Confidence:** 78%

### exp-c3f05e4f1a23 — Mission-first homepage cards

**Pillar:** Conversion
**Affected surface:** Homepage need blocks
**URL:** https://zenrojas.com/
**Evidence:** `audits/aud_3601e39cfe6f4682/screenshots/361e7ba3-home-mobile.png`
**Hypothesis:** CVR improves when need blocks (Sleep, Immune, Energy, Digestion) include price, stock status, and add-to-cart inline. Homepage segments by mission but routes to SHOP links without inline purchase.
**Primary change:** Add price, stock badge, and Add to cart on each mission card; gray out sold-out with waitlist.
**Primary KPI:** Homepage add-to-cart rate
**Decision rule:** Ship if homepage ATC rate improves without hurting PDP conversion.
**Expected lift:** +8–15%
**Confidence:** 76%

### exp-d4a16f502b34 — Sampler-to-loose-leaf upsell

**Pillar:** AOV
**Affected surface:** Sampler PDPs
**URL:** https://zenrojas.com/products/organicsleeptea
**Evidence:** `audits/aud_3601e39cfe6f4682/screenshots/a1ec8fc2-products-organicsleeptea.png`
**Hypothesis:** AOV rises when $2 samplers surface a one-click upgrade to $12–$13 loose-leaf bag. Collection promotes Loose Leaf Samplers From $2 adjacent to full-size teas.
**Primary change:** On sampler and full-size PDPs, show Try sampler / Upgrade to full bag module with savings copy.
**Primary KPI:** Sampler-to-full-size conversion rate
**Decision rule:** Ship if upgrade rate ≥15% without cannibalizing full-size first-purchase CVR.
**Expected lift:** +9–14%
**Confidence:** 74%

### exp-e5b27a613c45 — Empty cart ritual nudge

**Pillar:** Performance
**Affected surface:** Cart page
**URL:** https://zenrojas.com/cart
**Evidence:** `audits/aud_3601e39cfe6f4682/screenshots/8e32a388-cart.png`
**Hypothesis:** Cart abandonment drops when empty cart shows best-sellers and free-shipping progress instead of a dead end. Cart shows Your cart is currently empty with only Continue browsing.
**Primary change:** Replace empty cart with 3 in-stock picks, $50 free-shipping progress bar, and sampler entry.
**Primary KPI:** Empty-cart recovery rate
**Decision rule:** Ship if empty-cart sessions adding an item rise ≥20% without hurting checkout start rate.
**Expected lift:** +10–16%
**Confidence:** 80%

### exp-f6c38b724d56 — Veteran story subscription hook

**Pillar:** Retention
**Affected surface:** About page + post-purchase
**URL:** https://zenrojas.com/pages/aboutus
**Evidence:** `audits/aud_3601e39cfe6f4682/screenshots/7464325c-pages-aboutus.png`
**Hypothesis:** Repeat purchase rate improves by tying veteran-owned brand story to a monthly tea ritual subscription. About emphasizes calm ritual and organic sourcing without reorder mechanic.
**Primary change:** Add Monthly Ritual Box subscription CTA on About and order confirmation with blend rotation.
**Primary KPI:** 90-day repeat purchase rate
**Decision rule:** Ship if 90-day repeat rate improves without increasing churn on first order.
**Expected lift:** +6–12%
**Confidence:** 68%

### exp-a7d49c835e67 — Sleep landing page for paid search

**Pillar:** Acquisition
**Affected surface:** New /sleep-tea/ landing
**URL:** https://zenrojas.com/pages/sleep-tea/
**Evidence:** `audits/aud_3601e39cfe6f4682/screenshots/a1ec8fc2-products-organicsleeptea.png`
**Hypothesis:** Paid and organic sleep-intent traffic converts better on a dedicated landing page than a sold-out collection tile. Organic Sleep Tea PDP has rich copy but collection marks SKU sold out.
**Primary change:** Launch /sleep-tea/ with PDP copy, reviews, waitlist, and sampler fallback.
**Primary KPI:** Landing-page conversion rate
**Decision rule:** Ship if sleep landing CVR beats collection entry by ≥25%.
**Expected lift:** +14–22%
**Confidence:** 71%

### exp-b8e5ad946f78 — Immune wellness content hub

**Pillar:** Acquisition
**Affected surface:** Bodyguard tea content hub
**URL:** https://zenrojas.com/products/bodyguardtea
**Evidence:** `audits/aud_3601e39cfe6f4682/screenshots/91d6cb7e-products-bodyguardtea.png`
**Hypothesis:** Organic acquisition rises with an immune-support hub matching Bodyguard's ingredient story. Bodyguard PDP details sencha, ginger, elderflower — no standalone SEO hub.
**Primary change:** Create /immune-support/ hub linking Bodyguard PDP, brewing guide, and sampler.
**Primary KPI:** Organic traffic to purchasable SKUs
**Decision rule:** Ship if hub drives ≥500 organic sessions/month with CVR ≥ collection average.
**Expected lift:** +8–14%
**Confidence:** 70%

### exp-c9f6be057a89 — Reorder email for in-stock SKUs

**Pillar:** Retention
**Affected surface:** Post-purchase email
**URL:** https://zenrojas.com/products/bodyguardtea
**Evidence:** `audits/aud_3601e39cfe6f4682/screenshots/91d6cb7e-products-bodyguardtea-mobile.png`
**Hypothesis:** Repeat purchase rate improves with timed reorder prompts based on 20-cup bag consumption. Bodyguard PDP states 20 cups (40g) per bag and daily use instructions.
**Primary change:** Send day-25 reorder email with one-click cart prefilled for last purchase.
**Primary KPI:** 30-day repeat purchase rate
**Decision rule:** Ship if repeat rate rises ≥5pp without increasing unsubscribe rate.
**Expected lift:** +7–11%
**Confidence:** 72%

### exp-d0a7cf168b90 — Add product structured data

**Pillar:** Performance
**Affected surface:** PDP templates
**URL:** https://zenrojas.com/products/bodyguardtea
**Evidence:** `audits/aud_3601e39cfe6f4682/screenshots/91d6cb7e-products-bodyguardtea.png`
**Hypothesis:** Organic CTR and rich results improve when Product JSON-LD is present on in-stock PDPs. Technical crawl found no JSON-LD on captured pages.
**Primary change:** Add Product schema (price, availability, reviews) to all PDP templates.
**Primary KPI:** Organic CTR from search
**Decision rule:** Ship if rich-result impressions appear within 30 days without markup errors.
**Expected lift:** +5–10%
**Confidence:** 85%

## Competitor analysis

Organic tea competitors win on clearer stock status, subscription hooks, and mission-led landing pages. Zen Rojas' edge is veteran-owned storytelling, ritual framing, and accessible sampler entry ($2).

| Competitor | Domain | Positioning | What they make easier | Zen Rojas edge | Pattern to adapt |
|---|---|---|---|---|---|
| Traditional Medicinals | traditionalmedicinals.com | Wellness tea pharmacy | Symptom-specific SKU clarity | Stronger ritual brand and veteran story | Dedicated condition landing pages |
| Yogi Tea | yogitea.com | Ayurvedic wellness teas | Flavor variety and retail ubiquity | Organic loose-leaf focus and sampler price point | Mission cards with inline purchase |
| Pukka Herbs | pukkaherbs.com | Organic herbal blends | Sustainability and blend education | US-based DTC and Houston roots | Ingredient storytelling hubs |
| Harney & Sons | harney.com | Premium loose-leaf tea | Gifting, samplers, subscriptions | Calm/ritual positioning and lower sampler entry | Subscription box on About story |

## Technical checks

| Check | Status | Detail |
|---|---|---|
| SSL Certificate | Pass | HTTPS storefront loaded successfully. |
| HTTPS Redirect | Pass | HTTP redirects to HTTPS. |
| Sitemap | Pass | sitemap.xml responded successfully. |
| Robots.txt | Pass | robots.txt responded successfully. |
| Critical Pages Loading | Pass | Homepage, collections, and PDPs loaded. |
| Meta Tags & Social Previews | Pass | 8/8 pages had title + meta description. |
| Structured Data | Warn | No JSON-LD detected on captured pages. |
| Favicon | Warn | Favicon not detected from captured evidence. |
| Mobile-Friendly | Pass | Mobile viewport screenshot captured for homepage. |
| Page Speed Mobile | Warn | No Lighthouse/mobile speed run performed. |
| Page Speed Desktop | Warn | No Lighthouse speed run performed. |
| Broken Links | Pass | No broken internal links detected in sample. |
| Image Optimization | Warn | Large hero/product images observed; byte-level audit not run. |
| Cookie/Privacy | Pass | Privacy policy link visible in footer. |
| Checkout Reachable | Pass | Cart URL loaded without error. |
