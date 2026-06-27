import type { Page } from "playwright";

export type BuyModule = {
  price_text: string | null;
  atc_label: string | null;
  has_quantity_selector: boolean;
  has_variant_picker: boolean;
  has_subscription: boolean;
  retailer_links: string[];
};

export type TrustSignals = {
  free_shipping_threshold: string | null;
  return_policy_snippet: string | null;
  payment_icons: string[];
  security_badges: string[];
};

export type SocialProof = {
  star_rating: number | null;
  review_count: number | null;
  source: string | null;
};

export type StructuredDataItem = {
  type: string;
  price: string | null;
  rating: number | null;
  review_count: number | null;
};

export type ImagesSummary = {
  count: number;
  missing_alt_pct: number;
  largest_url: string | null;
  largest_bytes: number | null;
  total_bytes: number;
};

export type RichSurfaceData = {
  title: string;
  meta_description: string;
  text_excerpt: string;
  above_fold_excerpt: string;
  h1: string;
  h2_headings: string[];
  nav_items: string[];
  cta_buttons: string[];
  review_count: number | null;
  is_error_page: boolean;
  sold_out: boolean;
  has_add_to_cart: boolean;
  has_price: boolean;
  has_retailer_handoff: boolean;
  has_store_locator: boolean;
  has_newsletter: boolean;
  has_json_ld: boolean;
  has_favicon: boolean;
  product_tile_count: number;
  testimonial_snippets: string[];
  buy_module: BuyModule;
  trust_signals: TrustSignals;
  social_proof: SocialProof;
  structured_data: StructuredDataItem[];
  images: ImagesSummary;
  filters_and_sort: string[];
  breadcrumb: string | null;
  internal_links: string[];
};

export async function extractRichPageData(page: Page): Promise<RichSurfaceData> {
  return page.evaluate(() => {
    const title = document.title || "";
    const metaDesc =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ||
      document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
      "";
    const body = document.body?.innerText || "";
    const excerpt = body.replace(/\s+/g, " ").trim().slice(0, 2800);
    const html = document.documentElement.innerHTML.toLowerCase();

    const visibleTextParts: string[] = [];
    const vh = window.innerHeight;
    for (const el of Array.from(document.body?.querySelectorAll("p, h1, h2, h3, button, a, span, li") || [])) {
      const rect = el.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < vh && rect.height > 0) {
        const t = el.textContent?.trim();
        if (t && t.length > 2) visibleTextParts.push(t);
      }
    }
    const above_fold_excerpt = visibleTextParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 800);

    let h1 = "";
    for (const el of Array.from(document.querySelectorAll("h1"))) {
      if (el.closest("style, script, noscript")) continue;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const t = el.textContent?.trim();
      if (t && t.length > 0 && !t.includes("{") && !/height:\s*\d/.test(t)) {
        h1 = t.slice(0, 200);
        break;
      }
    }
    if (!h1) {
      const h2first = document.querySelector("h2")?.textContent?.trim();
      if (h2first && h2first.length > 2) h1 = h2first.slice(0, 200);
    }

    const h2_headings = Array.from(document.querySelectorAll("h2"))
      .map((el) => el.textContent?.trim() || "")
      .filter(Boolean)
      .slice(0, 12);

    const nav_items = Array.from(
      document.querySelectorAll("nav a, header a, [role='navigation'] a")
    )
      .map((a) => (a as HTMLAnchorElement).innerText?.trim().replace(/\s+/g, " ") || "")
      .filter((t) => t.length > 1 && t.length < 50)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 20);

    const cta_buttons = Array.from(
      document.querySelectorAll(
        "button, a.btn, a.button, [class*='btn'], [class*='cta'], input[type='submit']"
      )
    )
      .map((el) => el.textContent?.trim().replace(/\s+/g, " ") || "")
      .filter((t) => t.length > 1 && t.length < 60)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 15);

    const reviewMatch = body.match(/\((\d+)\s*reviews?\)/i);
    let review_count = reviewMatch ? parseInt(reviewMatch[1], 10) : null;

    const is_error_page =
      /page not found|404|not found|we'?re lost|does not exist/i.test(`${title} ${body.slice(0, 500)}`);

    const sold_out =
      /sold out|out of stock|unavailable/i.test(body) &&
      (document.querySelectorAll("[class*='sold'], [class*='unavailable']").length > 0 ||
        /sold out/i.test(html));

    const hasAddToCart =
      /add to cart|add-to-cart|addtocart|buy now/i.test(html) ||
      !!document.querySelector('[name="add"], button[class*="add"], form[action*="/cart/add"]');

    const hasPrice =
      /class="[^"]*price[^"]*"/i.test(html) ||
      !!document.querySelector("[data-product-price], .price, .product-price, [itemprop=price]") ||
      /\$\d+(\.\d{2})?/.test(body.slice(0, 3000));

    const has_retailer_handoff =
      /buy online|find near|find in store|where to buy|shop online|find a store|retailer/i.test(body);

    const has_store_locator =
      /zip|postal|store locator|find a store|near me|stockist/i.test(body) &&
      !!document.querySelector('input[type="search"], input[placeholder*="zip" i], input[name*="zip" i], form');

    const has_newsletter =
      /newsletter|email signup|join.*club|subscribe|get \d+% off/i.test(body) &&
      !!document.querySelector('input[type="email"], form[action*="contact"]');

    const product_tile_count = document.querySelectorAll(
      "[class*='product-card'], [class*='product-item'], .grid__item, [data-product-id]"
    ).length;

    const testimonial_snippets: string[] = [];
    for (const el of Array.from(document.querySelectorAll("blockquote, [class*='testimonial'], [class*='review']"))) {
      const t = el.textContent?.replace(/\s+/g, " ").trim().slice(0, 180);
      if (t && t.length > 30) testimonial_snippets.push(t);
      if (testimonial_snippets.length >= 4) break;
    }

    // Buy module
    const priceEl =
      document.querySelector("[data-product-price], .price, .product-price, [itemprop=price], .price__regular, .price-item") ||
      document.querySelector("[class*='price']");
    const price_text = priceEl?.textContent?.trim().replace(/\s+/g, " ").slice(0, 40) || null;

    const atcEl = document.querySelector(
      '[name="add"], button[class*="add-to-cart"], button[class*="addtocart"], form[action*="/cart/add"] button, [data-add-to-cart]'
    );
    const atc_label = atcEl?.textContent?.trim().replace(/\s+/g, " ").slice(0, 40) || null;

    const has_quantity_selector =
      !!document.querySelector('input[name="quantity"], [class*="quantity"], .qty-input, [data-quantity]');
    const has_variant_picker =
      !!document.querySelector('select[name*="option"], [class*="variant"], [data-variant], .product-form__input');
    const has_subscription =
      /subscribe|subscription|deliver every|recurring/i.test(body) &&
      !!document.querySelector('[class*="subscription"], [class*="selling-plan"], input[value*="subscription"]');

    const retailer_links = Array.from(document.querySelectorAll("a[href]"))
      .filter((a) => {
        const t = (a.textContent || "").toLowerCase();
        const h = (a as HTMLAnchorElement).href.toLowerCase();
        return (
          /buy online|find near|where to buy|shop at|amazon|target|walmart|instacart|retailer/i.test(t) ||
          /amazon|target|walmart|instacart|retailer|store-locator/i.test(h)
        );
      })
      .map((a) => (a as HTMLAnchorElement).innerText?.trim().slice(0, 40) || (a as HTMLAnchorElement).href)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 8);

    const buy_module = {
      price_text,
      atc_label,
      has_quantity_selector,
      has_variant_picker,
      has_subscription,
      retailer_links,
    };

    // Trust signals
    const shippingMatch = body.match(/free shipping(?: on orders)?(?: over| above| on all)?[\s$]*(\$?\d+)/i);
    const free_shipping_threshold = shippingMatch ? shippingMatch[0].slice(0, 60) : null;

    let return_policy_snippet: string | null = null;
    for (const el of Array.from(document.querySelectorAll("a, p, span, li"))) {
      const t = el.textContent?.trim() || "";
      if (/return|refund|money.?back|guarantee/i.test(t) && t.length < 120) {
        return_policy_snippet = t.replace(/\s+/g, " ").slice(0, 100);
        break;
      }
    }

    const payment_icons = Array.from(document.querySelectorAll("[class*='payment'], [class*='pay-icon'], .icon--payment"))
      .map((el) => el.getAttribute("aria-label") || el.className.split(" ").pop() || "")
      .filter(Boolean)
      .slice(0, 8);
    if (payment_icons.length === 0 && /visa|mastercard|paypal|apple pay|shop pay/i.test(body)) {
      const found = body.match(/(visa|mastercard|paypal|apple pay|shop pay|amex|discover)/gi);
      if (found) payment_icons.push(...[...new Set(found)].slice(0, 6));
    }

    const security_badges = Array.from(document.querySelectorAll("[class*='trust'], [class*='secure'], [class*='badge']"))
      .map((el) => el.textContent?.trim().replace(/\s+/g, " ").slice(0, 40) || "")
      .filter((t) => t.length > 3 && /secure|ssl|verified|trusted|guarantee/i.test(t))
      .slice(0, 4);

    const trust_signals = {
      free_shipping_threshold,
      return_policy_snippet,
      payment_icons,
      security_badges,
    };

    // Social proof (widgets)
    let star_rating: number | null = null;
    let socialReviewCount: number | null = review_count;
    let source: string | null = null;

    const judgeMe = document.querySelector("[class*='jdgm'], .jdgm-preview-badge");
    const yotpo = document.querySelector("[class*='yotpo']");
    const shopifyReviews = document.querySelector(".shopify-product-reviews, [data-product-reviews]");

    if (judgeMe) {
      source = "judge.me";
      const ratingEl = judgeMe.querySelector("[class*='star'], [aria-label*='star']");
      const ratingMatch = (ratingEl?.getAttribute("aria-label") || judgeMe.textContent || "").match(/([\d.]+)\s*(?:out of|\/|\s)\s*5/i);
      if (ratingMatch) star_rating = parseFloat(ratingMatch[1]);
      const rc = (judgeMe.textContent || "").match(/(\d+)\s*reviews?/i);
      if (rc) socialReviewCount = parseInt(rc[1], 10);
    } else if (yotpo) {
      source = "yotpo";
      const ratingMatch = (yotpo.textContent || "").match(/([\d.]+)\s*(?:star|\/)/i);
      if (ratingMatch) star_rating = parseFloat(ratingMatch[1]);
      const rc = (yotpo.textContent || "").match(/(\d+)\s*reviews?/i);
      if (rc) socialReviewCount = parseInt(rc[1], 10);
    } else if (shopifyReviews) {
      source = "shopify_reviews";
    }

    if (!socialReviewCount) {
      const altReview = body.match(/(\d+)\s*reviews?/i);
      if (altReview) socialReviewCount = parseInt(altReview[1], 10);
    }
    if (!star_rating) {
      const starMatch = body.match(/([\d.]+)\s*(?:out of 5|\/5|\s*stars)/i);
      if (starMatch) star_rating = parseFloat(starMatch[1]);
    }

    review_count = socialReviewCount;
    const social_proof = { star_rating, review_count: socialReviewCount, source };

    // Structured data
    const structured_data: StructuredDataItem[] = [];
    for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
      try {
        const raw = JSON.parse(script.textContent || "{}");
        const items = Array.isArray(raw) ? raw : raw["@graph"] ? raw["@graph"] : [raw];
        for (const item of items) {
          const type = (item["@type"] || "").toString();
          if (!type) continue;
          let price: string | null = null;
          let rating: number | null = null;
          let rc: number | null = null;
          const offers = item.offers || (Array.isArray(item.offers) ? item.offers[0] : null);
          if (offers?.price) price = String(offers.price);
          const agg = item.aggregateRating;
          if (agg?.ratingValue) rating = parseFloat(agg.ratingValue);
          if (agg?.reviewCount) rc = parseInt(agg.reviewCount, 10);
          structured_data.push({ type, price, rating, review_count: rc });
        }
      } catch {
        /* skip invalid JSON-LD */
      }
    }

    // Images summary
    const imgEls = Array.from(document.querySelectorAll("img"));
    const missingAlt = imgEls.filter((img) => !img.alt || img.alt.trim() === "").length;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    let largest_bytes = 0;
    let largest_url: string | null = null;
    let total_bytes = 0;
    for (const r of resources) {
      if (!/image/i.test(r.initiatorType) && !/\.(jpg|jpeg|png|webp|gif|svg|avif)/i.test(r.name)) continue;
      const size = r.transferSize || r.encodedBodySize || 0;
      total_bytes += size;
      if (size > largest_bytes) {
        largest_bytes = size;
        largest_url = r.name;
      }
    }
    const images = {
      count: imgEls.length,
      missing_alt_pct: imgEls.length ? Math.round((missingAlt / imgEls.length) * 100) : 0,
      largest_url,
      largest_bytes: largest_bytes || null,
      total_bytes,
    };

    // Filters and sort
    const filters_and_sort = Array.from(
      document.querySelectorAll(
        "[class*='filter'] label, [class*='sort'] option, select[name*='sort'], [class*='facets'] button, [class*='filter'] button"
      )
    )
      .map((el) => el.textContent?.trim().replace(/\s+/g, " ") || "")
      .filter((t) => t.length > 1 && t.length < 40)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 12);

    // Breadcrumb
    const bcEl = document.querySelector("[class*='breadcrumb'], nav[aria-label*='breadcrumb' i], .breadcrumbs");
    const breadcrumb = bcEl?.textContent?.replace(/\s+/g, " ").trim().slice(0, 120) || null;

    // Internal links
    const origin = location.origin;
    const internal_links = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => {
        try {
          const u = new URL((a as HTMLAnchorElement).href);
          if (u.origin !== origin) return null;
          return u.pathname + u.search;
        } catch {
          return null;
        }
      })
      .filter((p): p is string => !!p && p !== "/")
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .slice(0, 15);

    return {
      title,
      meta_description: metaDesc,
      text_excerpt: excerpt,
      above_fold_excerpt,
      h1,
      h2_headings,
      nav_items,
      cta_buttons,
      review_count,
      is_error_page,
      sold_out,
      has_add_to_cart: hasAddToCart,
      has_price: hasPrice,
      has_retailer_handoff: has_retailer_handoff,
      has_store_locator: has_store_locator,
      has_newsletter: has_newsletter,
      has_json_ld: structured_data.length > 0,
      has_favicon:
        !!document.querySelector('link[rel*="icon"]') ||
        !!document.querySelector('link[rel="shortcut icon"]'),
      product_tile_count,
      testimonial_snippets,
      buy_module,
      trust_signals,
      social_proof,
      structured_data,
      images,
      filters_and_sort,
      breadcrumb,
      internal_links,
    };
  });
}

export async function scrollForContent(page: Page, type: string): Promise<void> {
  if (!["where-to-buy", "cart", "collection", "category", "other", "content", "pdp", "search", "checkout"].includes(type)) return;
  await page.evaluate(async () => {
    const step = Math.min(800, window.innerHeight);
    for (let y = 0; y < Math.min(document.body.scrollHeight, 4000); y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 200));
    }
    window.scrollTo(0, 0);
  });
}

export type PerformanceMetrics = {
  lcp_ms: number | null;
  ttfb_ms: number | null;
  total_page_weight_bytes: number;
  request_count: number;
  dom_content_loaded_ms: number | null;
};

export async function capturePerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    let total_page_weight_bytes = 0;
    for (const r of resources) {
      total_page_weight_bytes += r.transferSize || r.encodedBodySize || 0;
    }
    if (nav) {
      total_page_weight_bytes += nav.transferSize || nav.encodedBodySize || 0;
    }

    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    const lcp_ms = lcpEntries.length
      ? Math.round(lcpEntries[lcpEntries.length - 1].startTime)
      : null;

    return {
      lcp_ms,
      ttfb_ms: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
      total_page_weight_bytes,
      request_count: resources.length + (nav ? 1 : 0),
      dom_content_loaded_ms: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
    };
  });
}
