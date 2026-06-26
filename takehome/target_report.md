# Ginger People audit — the store is back; the buy path is now the constraint

> Calibration anchor. This is what a Qosmic audit for `gingerpeople.com` looks
> like at production quality. Use it to understand the bar, not to copy.

## Executive summary

**Ginger People has the proof; the purchase handoff is leaking the demand.** The current site is no longer the expired-domain dead end from the prior audit — the live storefront at `gingerpeople.com` loads as a branded site with Products, Recipes, Blog, Bulk Ingredients, and Where To Buy navigation. The bigger leak now is structural: the hero GIN GINS product page carries 86 reviews, 10% fresh ginger, "America's #1 selling ginger candy," and award proof, but the captured buying area shows no price, add-to-cart, retailer button, or structured next step. For a retailer-routed brand, ambiguity at the product page is a conversion leak.

**The two adjacent purchase surfaces compound the problem.** The primary nav's Where To Buy page resolves to blog/footer content with no visible store locator, retailer list, or online buying cards. The `/cart` URL — a common destination for returning users, tracking links, and partner referrals — returns a branded 404. Together these mean every product page that says "find it locally" is weaker than it could be, and high-intent returning sessions silently die.

**The content moat is strong and under-commercialized.** Recipes, GLP-1 education, nausea/motion-sickness pages, and bulk ingredients can become acquisition surfaces with guided shopping, routines, and product modules. The first test should be structural: add a product-page buying box that lets shoppers choose "Buy online," "Find near me," or "Add to my ginger routine." Where To Buy and `/cart` follow as parallel structural fixes.

## Proposed experiments

### exp-e06feea44fdb — Add a buying box to every product

**Pillar:** Conversion
**Affected surface:** GIN GINS Original PDP (pattern applies to all PDPs)
**URL:** https://gingerpeople.com/products/gin-gins-original-ginger-chews/
**Evidence:** `/audits/aud_mpw6slwhni1qiq2q/browser/browser-8bf3eb488301/screenshots/396447f6-gin-gins-original-pdp.png`
**Hypothesis:** CVR improves by converting product-page intent into a clear purchase choice instead of making shoppers interpret "Buy online or find it…" with no visible buying module. The page already creates intent through proof (86 reviews, "America's #1 selling ginger candy," awards), but the next action is ambiguous.
**Primary change:** Add a persistent "Choose how to buy" box directly under the product title on PDPs. For the hero product, the box contains "Buy online," "Find near me," and "Add to my ginger routine," plus compact retailer logos.
**Primary KPI:** Outbound retailer click rate
**Decision rule:** Ship if outbound retailer click rate improves without hurting product-page bounce or time-on-page.
**Expected lift:** +12–20%
**Confidence:** 78%

### exp-cce28b3aa437 — Rebuild where to buy

**Pillar:** Conversion
**Affected surface:** Where To Buy (primary nav)
**URL:** https://gingerpeople.com/where-to-buy-the-ginger-people-products/
**Evidence:** `/audits/aud_mpw6slwhni1qiq2q/browser/browser-8bf3eb488301/screenshots/3639eb1d-scroll-down.png`
**Hypothesis:** CVR improves by recovering high-intent shoppers who click the primary "WHERE TO BUY" nav item and currently see no visible retailer handoff — just header, blog cards, and footer. Where To Buy is the most explicit purchase-intent link in the nav; if it doesn't resolve intent, every product page that says "find it locally" is weaker.
**Primary change:** Replace the current Where To Buy body with a purchase handoff: ZIP/store locator, "Shop online now" retailer cards, product-family filters, and a fallback "Can't find it? Tell us your ZIP" capture.
**Primary KPI:** Outbound retailer click rate
**Decision rule:** Ship if outbound retailer click rate improves without hurting Where To Buy session duration.
**Expected lift:** +15–25%
**Confidence:** 82%

### exp-d6cbe2fcb84f — Make the empty cart useful

**Pillar:** Performance
**Affected surface:** `/cart` URL
**URL:** https://gingerpeople.com/cart
**Evidence:** `/audits/aud_mpw6slwhni1qiq2q/browser/browser-8bf3eb488301/screenshots/163a543a-open-cart.png`
**Hypothesis:** Cart abandon drops by replacing a 404 at the cart URL with a purchase recovery page that routes shoppers back to products, retailers, or support. Even though the brand is retailer-routed, `/cart` is a common destination for returning users, browser memory, old Shopify links, tracking tools, and partner links — a 404 there silently loses high-intent sessions.
**Primary change:** Replace `/cart` 404 with either the real cart or a branded purchase recovery page if this site does not transact directly. Include "Continue shopping," "Find a store," "Shop online retailers," and support links.
**Primary KPI:** `/cart` exit rate
**Decision rule:** Ship if `/cart` exit rate drops without hurting site-wide conversion.
**Expected lift:** +10–20%
**Confidence:** 85%

### exp-49fca715d3b3 — Make the Products page need-first

**Pillar:** Conversion
**Affected surface:** Products grid
**URL:** https://gingerpeople.com/the-ginger-people-products/
**Evidence:** `/audits/aud_mpw6slwhni1qiq2q/browser/browser-8bf3eb488301/screenshots/edb216c1-products-after-click.png`
**Hypothesis:** CVR improves by reducing choice overload on a large catalog and presenting products by shopper mission before product family. The store carries broad SKUs with explicit use cases (digestive comfort, motion discomfort, travel, morning sickness), but currently asks shoppers to decode product names rather than shop their job-to-be-done.
**Primary change:** Restructure Products into need-first blocks: "For nausea + travel," "For cooking," "For candy lovers," "For drinks + shots," "For sauces," and "For bulk/business." Each block has 3-5 products, a use-case header, and a "find your match" CTA.
**Primary KPI:** Products-page click-through to PDP
**Decision rule:** Ship if Products-page click-through improves without hurting PDP-to-purchase conversion.
**Expected lift:** +8–14%
**Confidence:** 76%

### exp-885b101555c9 — Help shoppers choose by need

**Pillar:** Acquisition
**Affected surface:** New page at `/find-your-ginger/`
**URL:** https://gingerpeople.com/find-your-ginger/ (new)
**Evidence:** `/audits/aud_mpw6slwhni1qiq2q/browser/browser-8bf3eb488301/screenshots/519b7f51-open-gin-gins-category.png` (current need-language buried in category copy)
**Hypothesis:** Landing-page CVR improves by routing health-intent and snack-intent visitors to the right product family before they bounce from a dense product list. Category pages already use need language (digestive comfort, motion sickness, morning sickness) but immediately drop shoppers into product tiles.
**Primary change:** Create `/find-your-ginger/` with 5 prompts: nausea, travel, cooking, daily wellness, candy/snacking. Each result returns a recommendation, a proof quote, and "buy online / find near me" choices. Link from primary nav and key category pages.
**Primary KPI:** Landing-page conversion rate
**Decision rule:** Ship if Landing-page CVR improves without hurting site-wide conversion rate.
**Expected lift:** +12–18%
**Confidence:** 72%

### exp-12d94a5f670c — Turn the homepage into shopper missions

**Pillar:** Conversion
**Affected surface:** Homepage hero
**URL:** https://gingerpeople.com/
**Evidence:** `/audits/aud_mpw6slwhni1qiq2q/browser/browser-8bf3eb488301/screenshots/a35aa5cf-start.png`
**Hypothesis:** CVR improves by replacing one broad "SHOP NOW" entrance with mission cards that match how visitors describe their need. The buyer split (functional relief / candy snacking / cooking / wholesale) means a single shop entrance asks too much of a first-time shopper.
**Primary change:** Rebuild the homepage first screen after the hero into four mission cards: "Settle my stomach," "Find ginger candy," "Cook with ginger," and "Buy for my business." Each card links to the relevant category.
**Primary KPI:** Homepage click-through to category
**Decision rule:** Ship if homepage CTR improves without hurting downstream CVR.
**Expected lift:** +6–10%
**Confidence:** 70%

### exp-7963f09cb0f9 — Package a GLP-1 support routine

**Pillar:** Retention
**Affected surface:** GLP-1 article and routines hub
**URL:** https://gingerpeople.com/boost-your-glp-1-naturally-the-power-of-ginger-turmeric/
**Evidence:** `/audits/aud_mpw6slwhni1qiq2q/browser/browser-8bf3eb488301/screenshots/c758c6b6-blog-detail-glp1.png`
**Hypothesis:** Repeat purchase rate improves by converting a recurring medication side-effect moment into a named routine shoppers can reorder. The GLP-1 article states nausea affects up to 50% of patients on GLP-1 medications and recommends ginger/turmeric formats — but shoppers currently have to assemble the routine manually.
**Primary change:** Create a "GLP-1 Ginger + Turmeric Daily Support Routine" that bundles or merchandises ginger chews/lozenges, ginger juice, turmeric juice, and recipe instructions. Place the routine inside the GLP-1 article and on the homepage routine hub.
**Primary KPI:** 30-day repeat purchase rate (GLP-1 article visitors)
**Decision rule:** Ship if 30-day repeat purchase rate among GLP-1 article visitors improves without hurting first-order AOV.
**Expected lift:** +6–12%
**Confidence:** 68%

### exp-3a5b8e2c1d4f — Sell a travel nausea kit

**Pillar:** AOV
**Affected surface:** New kit PDP + cross-promotion on Ginger Rescue PDPs
**URL:** https://gingerpeople.com/products/travel-stomach-rescue-kit/ (new)
**Evidence:** `/audits/aud_mpw6slwhni1qiq2q/browser/browser-8bf3eb488301/screenshots/a884458e-tablets-lozenges-category.png` (current Ginger Rescue category)
**Hypothesis:** AOV rises by turning three separate nausea-relief formats (Ginger Rescue Extra Strength Lozenges, Regular Strength Lozenges, Chewable Ginger Tablets) into one higher-value travel-ready bundle. Travel/motion-sickness is one of the highest-intent use cases on the site.
**Primary change:** Launch a "Travel Stomach Rescue Kit" containing the three Ginger Rescue formats, positioned for motion sickness, morning sickness, and road trips. Promote on Ginger Rescue PDPs and the travel-nausea landing page.
**Primary KPI:** AOV among Ginger Rescue PDP visitors
**Decision rule:** Ship if AOV rises by ≥$3 without hurting Ginger Rescue PDP conversion.
**Expected lift:** +8–14%
**Confidence:** 70%

### exp-9c4d1e6f8a23 — Build a flavor sampler pack

**Pillar:** AOV
**Affected surface:** GIN GINS category + new sampler PDP
**URL:** https://gingerpeople.com/products/gin-gins-flavor-tour/ (new)
**Evidence:** `/audits/aud_mpw6slwhni1qiq2q/browser/browser-8bf3eb488301/screenshots/519b7f51-open-gin-gins-category.png`
**Hypothesis:** AOV rises when first-time candy shoppers can buy or find a multi-flavor trial instead of choosing one flavor from a long list. The candy category currently presents 9+ flavors with no trial entry point.
**Primary change:** Launch a "GIN GINS Flavor Tour" sampler with Original, Mandarin Orange, Lemon, Spicy Apple, Peanut, Spicy Turmeric, Double Strength, Super Strength, Ginger Spice Drops, and Sweet Ginger Gummies where available.
**Primary KPI:** AOV (first-time candy shoppers)
**Decision rule:** Ship if first-time AOV rises by ≥$4 without hurting overall candy CVR.
**Expected lift:** +7–12%
**Confidence:** 72%

### exp-b8d2f3e74a59 — Create a pregnancy nausea page

**Pillar:** Acquisition
**Affected surface:** New page at `/morning-sickness-ginger/`
**URL:** https://gingerpeople.com/morning-sickness-ginger/ (new)
**Evidence:** `/audits/aud_mpw6slwhni1qiq2q/browser/browser-8bf3eb488301/screenshots/c758c6b6-blog-detail-glp1.png` (existing health-content pattern to mirror)
**Hypothesis:** Landing-page CVR improves by matching high-anxiety morning-sickness visitors to testimonials, FAQs, and product choices in one compliant destination. Currently morning-sickness intent disperses across category, FAQ, and product pages.
**Primary change:** Create `/morning-sickness-ginger/` using existing testimonials, FAQ content, and Ginger Rescue / GIN GINS recommendations. Include "ask your clinician" language, ingredient transparency, and buy/find choices.
**Primary KPI:** Landing-page conversion rate
**Decision rule:** Ship if Landing-page CVR exceeds the average of existing health/condition pages without compliance flags.
**Expected lift:** +10–16%
**Confidence:** 70%

## Competitor analysis

Competitors make the shopping job easier through use-case clarity, symptom-led navigation, retailer handoffs, and flavor-led merchandising. Ginger People's edge is deeper ginger specialization, proof, reviews, recipes, health education, and broader formats.

| Competitor | Domain | Positioning | What they make easier | Ginger People edge | Pattern to adapt |
|---|---|---|---|---|---|
| Dramamine | dramamine.com | OTC motion sickness relief | Immediate use-case clarity | Natural ginger formats and candy/snack permission | Dedicated nausea/travel pages with product-choice modules |
| Tummydrops | tummydrops.com | Ginger/peppermint drops for nausea and digestive comfort | Symptom-specific shopping | Broader catalog, recipes, mainstream candy formats | Symptom-led navigation and format comparisons |
| Reed's | drinkreeds.com | Ginger beverages and ginger candy | Beverage-led discovery and retail familiarity | Deeper ginger specialization and health education | Stronger retailer handoff per product family |
| Chimes Gourmet | chimesgourmet.com | Ginger chews and candy variety | Simple flavor-led candy shopping | Stronger functional use cases, reviews, recipes, family story | Flavor sampler and heat/flavor comparison |

## Technical checks

| Check | Status | Detail |
|---|---|---|
| SSL Certificate | Pass | HTTPS storefront loaded successfully. |
| HTTPS Redirect | Pass | The inspected URL resolved over HTTPS. |
| Sitemap | Warn | Not inspected in this browser-first pass. |
| Robots.txt | Warn | Not inspected in this browser-first pass. |
| Critical Pages Loading | Warn | Homepage and main categories loaded; `/cart` returned 404 and Where To Buy appeared empty. |
| Meta Tags & Social Previews | Warn | Page titles were visible; social preview tags were not inspected. |
| Structured Data | Warn | Not inspected in this browser-first pass. |
| Favicon | Warn | Not evaluated from captured evidence. |
| Mobile-Friendly | Warn | Desktop browser-first audit only. |
| Page Speed Mobile | Warn | No Lighthouse/mobile speed run performed. |
| Page Speed Desktop | Warn | No Lighthouse speed run performed. |
| Broken Links | Fail | `/cart` returned a branded 404. One guessed old Ginger Rescue URL also returned 404. |
| Image Optimization | Warn | Not measured; product pages use large visual assets but no byte-level audit was run. |
| Cookie/Privacy | Warn | Privacy Policy link visible in footer; consent mechanics were not inspected. |
| Checkout Reachable | Fail | Safe cart edge at `/cart` was not reachable; no checkout was entered. |
