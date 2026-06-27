/**
 * Synthesize revenue leaks from crawl artifacts — feeds the report LLM.
 */

import type { FunnelAnalytics, LeakScore } from "./funnel-analytics.js";

export type CrawlSurface = {
  url: string;
  type: string;
  title?: string;
  h1?: string;
  is_error_page?: boolean;
  has_add_to_cart?: boolean;
  has_price?: boolean;
  has_retailer_handoff?: boolean;
  has_store_locator?: boolean;
  has_newsletter?: boolean;
  sold_out?: boolean;
  review_count?: number | null;
  product_tile_count?: number;
  testimonial_snippets?: string[];
  cta_buttons?: string[];
  nav_items?: string[];
  text_excerpt?: string;
  page_url?: string;
  content_verified?: boolean;
  navigation_failure?: string;
  shopify_product?: {
    title: string;
    price: string | null;
    available: boolean;
    description_excerpt: string;
    tags: string[];
    variant_count?: number;
  };
};

export type ScoredLeak = {
  description: string;
  severity: number;
  pillar: string;
  estimated_session_impact_pct: string;
  id: string;
};

export type StoreInsights = {
  store_name: string;
  purchase_path_summary: string;
  top_leaks: string[];
  scored_leaks: ScoredLeak[];
  strengths: string[];
  experiment_seeds: string[];
  funnel_health_score?: number;
  buy_path_completeness?: number;
};

const STOP = new Set(
  "the a an and or for with from your our shop all buy now home page".split(" ")
);

export function extractCategoryKeywords(surfaces: CrawlSurface[], storeUrl: string): string[] {
  const host = new URL(storeUrl).hostname.replace(/^www\./, "").split(".")[0];
  const text = surfaces.map((s) => `${s.title || ""} ${s.h1 || ""} ${s.text_excerpt?.slice(0, 400) || ""}`).join(" ");
  const words = text.toLowerCase().match(/[a-z]{4,}/g) || [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (STOP.has(w) || w === host) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
  return [host, ...top].slice(0, 6);
}

function leakToSeed(id: string, description: string): string {
  const seeds: Record<string, string> = {
    cart_404: "Fix /cart 404 with purchase recovery or retailer redirect",
    cart_unverified: "Fix /cart route with purchase recovery page",
    wtb_broken: "Rebuild Where To Buy with ZIP locator + retailer cards",
    pdp_no_buy_module: "Add 'Choose how to buy' box on PDPs",
    pdp_high_reviews_no_buy: "Add buying box on high-review PDPs",
    geo_gate_blocked: "Fix geo gate so PDP deep links resolve",
    sold_out_collection: "Recover sold-out collection tiles with waitlist or alternates",
    no_newsletter: "Add newsletter / lead magnet on homepage",
    choice_overload: "Restructure catalog by shopper mission (need-first blocks)",
    search_zero_results: "Improve search results and zero-result recovery",
    checkout_error: "Fix checkout route and recovery path",
    missing_json_ld: "Add Product JSON-LD on hero PDP",
    slow_lcp: "Optimize LCP on homepage (hero image, font loading)",
  };
  return seeds[id] || description.slice(0, 80);
}

function leakScoresToInsights(leakScores: LeakScore[]): {
  top_leaks: string[];
  scored_leaks: ScoredLeak[];
  seeds: string[];
} {
  const scored_leaks: ScoredLeak[] = leakScores.map((l) => ({
    id: l.id,
    description: l.description,
    severity: l.severity,
    pillar: l.pillar,
    estimated_session_impact_pct: l.affected_traffic_pct,
  }));
  const top_leaks = scored_leaks.map(
    (l) => `[severity ${l.severity}, ~${l.estimated_session_impact_pct} sessions] ${l.description}`
  );
  const seeds = leakScores.map((l) => leakToSeed(l.id, l.description));
  return { top_leaks, scored_leaks, seeds };
}

export function buildStoreInsights(
  surfaces: CrawlSurface[],
  purchaseModel: string,
  storeUrl: string,
  funnelAnalytics?: FunnelAnalytics
): StoreInsights {
  const host = new URL(storeUrl).hostname.replace(/^www\./, "");
  const store_name = surfaces.find((s) => s.type === "homepage")?.title?.split("-")[0]?.trim() || host;

  const strengths: string[] = [];
  const extraSeeds: string[] = [];

  const pdps = surfaces.filter((s) => s.type === "pdp" && !s.is_error_page);
  const verifiedPdps = pdps.filter((s) => s.content_verified !== false);

  for (const p of verifiedPdps.filter((s) => s.review_count && s.review_count >= 5)) {
    strengths.push(`PDP "${p.h1 || p.title}" has ${p.review_count} reviews — social proof exists but may not drive next step.`);
  }

  for (const p of pdps.filter((s) => s.shopify_product)) {
    const sp = p.shopify_product!;
    if (sp.title && !p.h1 && !funnelAnalytics?.leak_scores.some((l) => l.id === "geo_gate_blocked")) {
      extraSeeds.push(`Add buying box on ${sp.title}`);
    }
  }

  const home = surfaces.find((s) => s.type === "homepage");
  if (home?.testimonial_snippets?.length) {
    strengths.push(`Homepage testimonials: "${home.testimonial_snippets[0].slice(0, 80)}..."`);
  }
  if (home?.cta_buttons?.length) {
    strengths.push(`Homepage CTAs: ${home.cta_buttons.slice(0, 5).join(", ")}`);
  }

  const purchase_path_summary =
    purchaseModel === "retailer_routed"
      ? "Retailer-routed: shoppers must find external buy path; optimize retailer/locator handoffs."
      : purchaseModel === "dtc"
        ? "DTC: optimize add-to-cart, checkout, bundles, cart recovery."
        : purchaseModel === "hybrid"
          ? "Hybrid: clarify when to buy on-site vs find in store."
          : "Purchase model unclear from crawl — infer from PDP signals.";

  let top_leaks: string[];
  let scored_leaks: ScoredLeak[];
  let seeds: string[];

  if (funnelAnalytics && funnelAnalytics.leak_scores.length > 0) {
    const converted = leakScoresToInsights(funnelAnalytics.leak_scores);
    top_leaks = converted.top_leaks;
    scored_leaks = converted.scored_leaks;
    seeds = [...new Set([...converted.seeds, ...extraSeeds])].slice(0, 12);
  } else {
    // Fallback to legacy text-only leaks
    const leaks: string[] = [];
    const legacySeeds: string[] = [];
    const cart = surfaces.find((s) => s.type === "cart");
    if (cart?.is_error_page) {
      leaks.push(`/cart shows an error page — high-intent sessions die.`);
      legacySeeds.push("Fix /cart 404 with purchase recovery");
    }
    top_leaks = leaks.slice(0, 10);
    scored_leaks = [];
    seeds = [...new Set([...legacySeeds, ...extraSeeds])].slice(0, 12);
  }

  return {
    store_name,
    purchase_path_summary,
    top_leaks: top_leaks.slice(0, 10),
    scored_leaks,
    strengths: strengths.slice(0, 6),
    experiment_seeds: seeds,
    funnel_health_score: funnelAnalytics?.funnel_health_score,
    buy_path_completeness: funnelAnalytics?.buy_path_completeness,
  };
}
