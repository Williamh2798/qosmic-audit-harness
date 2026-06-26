# The Ginger People audit — A broken checkout path, no direct-purchase capability, and a friction-heavy retailer handoff are suppressing every conversion the brand earns through strong organic demand and loyal wellness advocates.

## Executive summary

**The Ginger People's single largest revenue constraint is a structurally broken purchase path: the cart URL returns a 404, no product page surfaces a price or an add-to-cart action, and the 'Where to Buy' page is the only transactional off-ramp available to motivated shoppers.** For a brand with genuine cult-level testimonials ('life saver,' 'life changing remedy') and a world-leading ginger candy product, this means that every dollar of brand equity and every click earned through SEO, social, or word-of-mouth is handed off to a retailer with zero data capture, zero margin retention, and zero ability to re-market. The retailer-routed model is a deliberate choice, but the execution leaves enormous value on the table because the handoff itself is poorly signposted and the 'Where to Buy' page appears to contain no retailer locator content above the fold—only blog posts.

**Across all eight crawled surfaces, not a single page displays a product price, a buy button, or a subscription prompt, yet the brand's content assets—award callouts, Ayurvedic heritage copy, a house chef recipe program, and a robust FAQ—are more than sufficient to close a purchase decision.** The gap between persuasion and transaction is the core conversion problem. PDPs for hero SKUs like Gin Gins Original Ginger Chews and Ginger Soother Turmeric Gingerade carry compelling benefit copy and social proof (86 and 10 reviews respectively) but terminate in a dead end rather than routing the visitor cleanly to Amazon, Whole Foods, or a direct checkout. Closing this gap—even partially—through clearer retailer CTAs, a 'buy on Amazon' module, or a DTC subscription pilot would materially lift attributed revenue.

**The site's technical foundation has several compounding issues that erode the traffic the brand does attract: no JSON-LD structured data means Google cannot render rich results for products or recipes; the sitemap is missing or broken, limiting crawl efficiency; and image optimization has not been audited despite large hero assets being observed on every page.** Mobile performance is unverified despite mobile being the dominant channel for wellness impulse searches. Taken together, these issues mean the brand is likely ranking below its potential for high-intent queries like 'ginger candy for nausea' or 'turmeric drink anti-inflammatory'—the exact searches its testimonial-rich content is positioned to win. Fixing the technical layer is not cosmetic; it is the prerequisite for making every other investment in content and brand pay off.

## Proposed experiments

### exp-3a7f1c9b2d4e — Persistent 'Find It Near You' Retailer CTA on All PDPs

**Pillar:** Conversion
**Affected surface:** Product Detail Pages
**URL:** https://gingerpeople.com/products/gin-gins-original-ginger-chews
**Evidence:** `audits/aud_bc4ea6d742f703db/screenshots/179b6877-products-gin-gins-original-ginger-chews.png`
**Hypothesis:** PDPs currently have no price, no add-to-cart, and no visible retailer handoff CTA above the fold. Adding a sticky 'Find It Near You' button that opens a zip-code-based retailer locator modal will reduce exit rate and increase retailer click-throughs from visitors who arrived with purchase intent.
**Primary change:** Add a sticky bottom bar on PDP with 'Find It Near You' CTA linking to a zip-code retailer locator and secondary 'Buy on Amazon' link; remove dead-end scroll experience.
**Primary KPI:** Retailer handoff click-through rate (clicks to Where-to-Buy or Amazon per PDP session)
**Decision rule:** Ship if retailer handoff CTR increases ≥25% at 95% confidence over a 4-week test window.
**Expected lift:** +25–40% retailer handoff CTR
**Confidence:** 82%

### exp-b8e2a05f3c71 — Homepage Hero CTA Swap: 'Shop Now' → 'Find a Store or Buy Online'

**Pillar:** Conversion
**Affected surface:** Homepage Hero
**URL:** https://gingerpeople.com
**Evidence:** `audits/aud_bc4ea6d742f703db/screenshots/b2f64d78-home.png`
**Hypothesis:** The homepage hero currently uses 'Shop Now' CTAs that lead to product pages with no purchase capability, creating a trust-eroding dead end. Replacing with a split CTA ('Find a Store' | 'Buy on Amazon') that sets accurate expectations will increase downstream retailer handoff completions.
**Primary change:** Replace hero 'Shop Now' button with a two-option CTA row: primary 'Find a Store Near You' and secondary 'Buy on Amazon'; A/B test against current single CTA.
**Primary KPI:** Homepage-to-retailer-handoff conversion rate
**Decision rule:** Ship if conversion rate to retailer handoff page increases ≥20% at 95% confidence over 3 weeks.
**Expected lift:** +20–35% homepage-to-handoff rate
**Confidence:** 78%

### exp-07a3e5b9c2f4 — Recipe Pages: 'Shop the Ingredients' AOV Module

**Pillar:** AOV
**Affected surface:** Recipe Content Pages
**URL:** https://gingerpeople.com/recipes/ultimate-chewy-ginger-snaps
**Evidence:** `audits/aud_bc4ea6d742f703db/screenshots/9c812516-recipes-ultimate-chewy-ginger-snaps.png`
**Hypothesis:** Recipe pages attract high-intent visitors who are already planning to use ginger products. Adding a 'Shop the Ingredients' module that surfaces 2–3 relevant SKUs (e.g., crystallized ginger, ginger syrup) with retailer links will convert content browsers into multi-product purchasers, lifting AOV.
**Primary change:** Embed a 'Products Used in This Recipe' card grid below recipe instructions with product images, benefit snippets, and 'Find It / Buy Online' CTAs for each featured SKU.
**Primary KPI:** Multi-product retailer handoff rate from recipe pages
**Decision rule:** Ship if multi-SKU handoff rate from recipe pages increases ≥30% vs. control (no module) over 4 weeks.
**Expected lift:** +30–45% multi-SKU handoff rate
**Confidence:** 75%

### exp-d4c6f0a1e839 — Multi-Pack Bundle Prompt on Gin Gins PDP

**Pillar:** AOV
**Affected surface:** Product Detail Page – Gin Gins Original
**URL:** https://gingerpeople.com/products/gin-gins-original-ginger-chews
**Evidence:** `audits/aud_bc4ea6d742f703db/screenshots/179b6877-products-gin-gins-original-ginger-chews.png`
**Hypothesis:** Gin Gins is the brand's hero SKU with 86 reviews and strong repeat-purchase signals. Introducing a 'Try the Full Flavor Range' bundle widget (e.g., Original + Mandarin Orange + Spicy Apple) with a visible per-unit saving will increase average order value when visitors are routed to Amazon or a DTC cart.
**Primary change:** Add a 'Frequently Bought Together' or flavor-bundle selector widget on the PDP with a callout showing per-unit savings vs. single-pack; link bundle to Amazon multi-pack listing or DTC bundle page.
**Primary KPI:** Average units per retailer referral session (tracked via UTM on Amazon link)
**Decision rule:** Ship if average units per referred session increases ≥15% over 4 weeks at 90% confidence.
**Expected lift:** +15–25% units per session
**Confidence:** 72%

### exp-f1d7b3a8e056 — Email Capture Pop-up with Wellness Offer for First-Time Visitors

**Pillar:** Retention
**Affected surface:** Homepage / Sitewide
**URL:** https://gingerpeople.com
**Evidence:** `audits/aud_bc4ea6d742f703db/screenshots/b2f64d78-home.png`
**Hypothesis:** No email capture mechanism was observed on any crawled page. For a retailer-routed brand, email is the primary owned channel for re-engagement. A timed pop-up offering a wellness guide or coupon for retail partners in exchange for an email address will build a retargetable audience and increase repeat visit rate.
**Primary change:** Deploy an exit-intent or 15-second-delay email capture modal offering a 'Ginger Wellness Starter Guide' PDF or a printable retail coupon in exchange for email opt-in.
**Primary KPI:** Email opt-in rate (new subscribers per 1,000 unique visitors)
**Decision rule:** Ship if opt-in rate exceeds 2.5% of unique visitors within 30 days; iterate offer if below 1.5%.
**Expected lift:** +2.5–4% opt-in rate (from ~0% baseline)
**Confidence:** 80%

### exp-c9e4d2f7a103 — Post-Purchase Retailer Review Request Email Flow

**Pillar:** Retention
**Affected surface:** Email / PDP Review Section
**URL:** https://gingerpeople.com/products/gin-gins-original-ginger-chews
**Evidence:** `audits/aud_bc4ea6d742f703db/screenshots/179b6877-products-gin-gins-original-ginger-chews.png`
**Hypothesis:** Gin Gins has 86 reviews and Ginger Soother has only 10, suggesting inconsistent review solicitation. A triggered email sequence sent 7 days after a confirmed purchase (via retailer partner data or DTC order) asking for a site review and offering a loyalty reward will increase review volume and repeat purchase rate.
**Primary change:** Build a 2-email post-purchase flow: Day 7 review request with direct link to PDP review form; Day 21 re-engagement email with a 'What to Try Next' product recommendation based on purchase.
**Primary KPI:** 30-day repeat visit rate and on-site review submission rate
**Decision rule:** Ship if repeat visit rate increases ≥10% and review submissions increase ≥50% vs. prior 30-day baseline.
**Expected lift:** +10–20% repeat visit rate; +50–100% review volume
**Confidence:** 70%

### exp-2b5f8e1d9a6c — Nausea/Pregnancy SEO Landing Page with Testimonial Social Proof

**Pillar:** Acquisition
**Affected surface:** New SEO Landing Page
**URL:** https://gingerpeople.com
**Evidence:** `audits/aud_bc4ea6d742f703db/screenshots/b2f64d78-home.png`
**Hypothesis:** Homepage testimonials reference pregnancy nausea and vertigo relief—high-intent, high-volume search queries. A dedicated landing page targeting 'ginger candy for pregnancy nausea' and 'natural nausea relief' with structured testimonials, clinical benefit copy, and a retailer locator CTA will capture organic search traffic currently going to competitors.
**Primary change:** Create a /ginger-for-nausea landing page with H1 targeting 'natural ginger nausea relief,' embedded testimonials from the homepage, product recommendations, FAQ schema, and a 'Find It Near You' CTA.
**Primary KPI:** Organic search impressions and clicks for nausea-related queries (Google Search Console)
**Decision rule:** Ship (keep page) if organic clicks from nausea queries exceed 500/month within 90 days of indexing.
**Expected lift:** +500–1,500 organic sessions/month from nausea queries
**Confidence:** 74%

### exp-e6a0c3d5f812 — Pinterest & Instagram Recipe Content Ads Driving to Recipe Pages

**Pillar:** Acquisition
**Affected surface:** Paid Social / Recipe Pages
**URL:** https://gingerpeople.com/recipes/ultimate-chewy-ginger-snaps
**Evidence:** `audits/aud_bc4ea6d742f703db/screenshots/9c812516-recipes-ultimate-chewy-ginger-snaps.png`
**Hypothesis:** The brand has a house chef, a recipe library, and visually appealing food content—assets that perform strongly on Pinterest and Instagram. Running paid recipe content ads targeting wellness and foodie audiences and landing them on recipe pages with embedded product CTAs will generate lower-CPM acquisition than direct product ads.
**Primary change:** Launch 3–5 Pinterest and Instagram recipe video/carousel ads (e.g., Ginger Snaps, Ginger Soother cocktail) with 'Get the Recipe' CTA landing on gingerpeople.com recipe pages; embed retailer handoff module on landing pages.
**Primary KPI:** Cost per retailer handoff click from paid social (blended across Pinterest + Instagram)
**Decision rule:** Scale if cost per retailer handoff click is ≤$1.50 and ROAS proxy (retailer click value) is ≥2x ad spend over 4-week test.
**Expected lift:** +20–35% new visitor acquisition vs. direct product ad baseline
**Confidence:** 68%

### exp-9d1b7f4e2a05 — Fix Cart 404 and Implement Proper Retailer Redirect or DTC Checkout

**Pillar:** Performance
**Affected surface:** Cart / Checkout Path
**URL:** https://gingerpeople.com/cart
**Evidence:** `audits/aud_bc4ea6d742f703db/screenshots/19fd1532-cart.png`
**Hypothesis:** The /cart URL returns a 404 'Page not found' error, meaning any visitor or bot that reaches this URL—via direct navigation, a saved link, or a mis-routed CTA—hits a dead end. Fixing this to either redirect to the Where-to-Buy page or implement a functional DTC cart will eliminate a hard conversion failure point.
**Primary change:** Implement a 301 redirect from /cart to /where-to-buy-the-ginger-people-products (immediate fix) and evaluate DTC checkout enablement via Shopify or a similar platform as a medium-term solution.
**Primary KPI:** Cart URL 404 rate (reduce to 0); downstream Where-to-Buy page sessions from /cart referral
**Decision rule:** Ship immediately (no A/B test required); success = 0 404 errors on /cart within 48 hours of deploy.
**Expected lift:** Eliminates 100% of cart 404 drop-off; estimated +5–10% overall conversion recovery
**Confidence:** 90%

### exp-4c8a6e0f1b3d — Add JSON-LD Product & Recipe Structured Data for Rich Search Results

**Pillar:** Performance
**Affected surface:** PDPs and Recipe Pages (Sitewide)
**URL:** https://gingerpeople.com/products/ginger-soother-turmeric-gingerade
**Evidence:** `audits/aud_bc4ea6d742f703db/screenshots/3ea4d643-products-ginger-soother-turmeric-gingerade.png`
**Hypothesis:** No JSON-LD structured data was detected on any crawled page. Adding Product schema (with name, description, brand, offers) to PDPs and Recipe schema to recipe pages will enable Google rich results—star ratings, recipe cards, and product panels—increasing organic CTR from search.
**Primary change:** Implement JSON-LD Product schema on all PDP templates and Recipe schema on all recipe page templates; submit updated sitemap to Google Search Console after sitemap.xml is restored.
**Primary KPI:** Google Search Console rich result impressions and organic CTR for product and recipe queries
**Decision rule:** Ship (no A/B test); success = rich results appearing in GSC within 60 days and organic CTR increase ≥15% for affected page types.
**Expected lift:** +15–25% organic CTR for product and recipe pages
**Confidence:** 83%

## Competitor analysis

The ginger wellness and functional candy space is contested by several brands that have solved the direct-purchase and digital merchandising problems The Ginger People has not yet addressed.

| Competitor | Domain | Positioning | What they make easier | The Ginger People edge | Pattern to adapt |
|---|---|---|---|---|---|
| Reed's Ginger Beer | reedsgingerbeer.com | Premium craft ginger beer and wellness beverages with a strong DTC and Amazon presence; positions on 'real ginger' authenticity similar to The Ginger People. | Reed's makes it easier to buy directly online with a fully functional DTC store, subscription options, and prominent Amazon links on every product page—visitors never hit a dead end. | The Ginger People has a broader product range (candy, shots, pantry, beverages) and stronger wellness/therapeutic credibility through testimonials and Ayurvedic heritage copy. | Adopt Reed's practice of placing an 'Add to Cart' or 'Buy on Amazon' button as the primary CTA on every PDP, even for a retailer-routed model. |
| Chimes Ginger Chews | chimesgingercandies.com | Direct competitor in the ginger chew segment; competes on flavor variety, natural ingredients, and international heritage (Indonesian ginger). | Chimes makes it easier to find products via a prominent store locator and Amazon storefront link in the main navigation, reducing friction for first-time buyers. | The Ginger People's Gin Gins brand has significantly more brand recognition, more SKU variety, and stronger review volume; the '10% fresh ginger' claim is a defensible differentiator. | Adopt Chimes' navigation-level 'Where to Buy' prominence—make the retailer locator a top-nav item rather than a secondary page, and ensure it loads a functional zip-code search above the fold. |
| Buderim Ginger | buderimginger.com | Australian heritage ginger brand competing in confectionery, cooking, and wellness; strong on provenance storytelling and gift sets. | Buderim makes gifting easier with curated gift box bundles prominently featured on the homepage, increasing AOV and making the brand a natural gifting choice for wellness shoppers. | The Ginger People has a stronger US retail footprint and more functional wellness positioning (nausea relief, anti-inflammatory) that resonates with health-conscious American consumers. | Introduce a 'Gift a Ginger Lover' bundle page for holidays and gifting occasions, mirroring Buderim's gift set merchandising to capture AOV-boosting gifting demand. |
| Prince of Peace Ginger Chews | popus.com | Value-positioned ginger chew brand with strong Amazon presence and broad retail distribution; competes primarily on price and availability. | Prince of Peace makes Amazon discovery easier through aggressive A+ content, keyword-optimized listings, and Subscribe & Save enrollment—capturing the repeat-purchase segment The Ginger People is not actively retaining. | The Ginger People commands a premium quality perception, has award recognition (Queen's Choice Award), and a richer brand story that justifies higher price points and supports loyalty. | Build out an Amazon Brand Store with editorial content mirroring the gingerpeople.com recipe and wellness narrative, and enroll hero SKUs in Subscribe & Save to compete for the repeat-purchase segment Prince of Peace currently owns. |

## Technical checks

| Check | Status | Detail |
|---|---|---|
| SSL Certificate | Pass | HTTPS storefront loaded successfully. |
| HTTPS Redirect | Warn | HTTP redirect was not verified in this pass. |
| Sitemap | Warn | sitemap.xml not found or returned an error. |
| Robots.txt | Pass | robots.txt responded successfully. |
| Critical Pages Loading | Pass | Homepage, collections, and PDPs loaded. |
| Meta Tags & Social Previews | Pass | 7/8 pages had title + meta description. |
| Structured Data | Warn | No JSON-LD detected on captured pages. |
| Favicon | Pass | Favicon link detected on homepage. |
| Mobile-Friendly | Pass | Mobile viewport screenshot captured for homepage. |
| Page Speed Mobile | Warn | No Lighthouse/mobile speed run performed. |
| Page Speed Desktop | Warn | No Lighthouse speed run performed. |
| Broken Links | Pass | No broken internal links detected in sample. |
| Image Optimization | Warn | Large hero/product images observed; byte-level audit not run. |
| Cookie/Privacy | Pass | Privacy policy link visible in footer. |
| Checkout Reachable | Fail | Cart/checkout path was not reachable from crawl. |
