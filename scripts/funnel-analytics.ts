/**
 * Deterministic funnel analytics from crawl artifacts — pre-LLM scoring layer.
 */

import { BENCHMARKS, LEAK_SESSION_IMPACT, type PurchaseModel } from "./benchmarks.js";

export type CrawlSurface = {
  url: string;
  type: string;
  status?: number;
  content_verified?: boolean;
  navigation_failure?: string;
  is_error_page?: boolean;
  has_add_to_cart?: boolean;
  has_price?: boolean;
  has_retailer_handoff?: boolean;
  has_store_locator?: boolean;
  has_newsletter?: boolean;
  sold_out?: boolean;
  review_count?: number | null;
  product_tile_count?: number;
  h1?: string;
  title?: string;
  text_excerpt?: string;
  screenshot?: string;
  structured_data?: { type: string; price: string | null; rating: number | null; review_count: number | null }[];
  buy_module?: { price_text: string | null; atc_label: string | null; retailer_links: string[] };
  social_proof?: { star_rating: number | null; review_count: number | null };
  performance?: {
    lcp_ms: number | null;
    ttfb_ms: number | null;
    total_page_weight_bytes: number;
    request_count: number;
  };
  shopify_product?: { title: string; price: string | null; available: boolean };
};

export type LeakScore = {
  id: string;
  surface: string;
  pillar: string;
  severity: number;
  affected_traffic_pct: string;
  evidence: string;
  description: string;
};

export type BenchmarkGap = {
  metric: string;
  observed: string;
  category_median: string;
  gap_pct: number;
};

export type FunnelAnalytics = {
  funnel_health_score: number;
  leak_scores: LeakScore[];
  benchmark_gaps: BenchmarkGap[];
  buy_path_completeness: number;
  proof_commerce_gap: number;
};

function impactRange(id: keyof typeof LEAK_SESSION_IMPACT): string {
  const r = LEAK_SESSION_IMPACT[id];
  return `${r.min}–${r.max}%`;
}

export function buildFunnelAnalytics(
  surfaces: CrawlSurface[],
  purchaseModel: PurchaseModel,
  auditId: string
): FunnelAnalytics {
  const leaks: LeakScore[] = [];
  const benchmarks = BENCHMARKS[purchaseModel];

  const cart = surfaces.find((s) => s.type === "cart");
  if (cart?.is_error_page) {
    leaks.push({
      id: "cart_404",
      surface: "/cart",
      pillar: "Conversion",
      severity: 5,
      affected_traffic_pct: impactRange("cart_404"),
      evidence: cart.screenshot || cart.url,
      description: `Cart URL shows error page (${cart.title || "404"}).`,
    });
  } else if (cart && cart.content_verified === false) {
    leaks.push({
      id: "cart_unverified",
      surface: "/cart",
      pillar: "Performance",
      severity: 3,
      affected_traffic_pct: "3–6%",
      evidence: cart.screenshot || cart.url,
      description: "Cart URL did not load verifiable content.",
    });
  }

  const wtb = surfaces.find((s) => s.type === "where-to-buy");
  if (wtb && !wtb.has_store_locator && !wtb.has_retailer_handoff) {
    leaks.push({
      id: "wtb_broken",
      surface: "Where To Buy",
      pillar: "Conversion",
      severity: 4,
      affected_traffic_pct: impactRange("wtb_broken"),
      evidence: wtb.screenshot || wtb.url,
      description: "Where To Buy lacks store locator or retailer handoff.",
    });
  }

  const pdps = surfaces.filter((s) => s.type === "pdp" && !s.is_error_page);
  const verifiedPdps = pdps.filter((s) => s.content_verified !== false);
  const geoBlocked = pdps.filter((s) => s.navigation_failure === "geo_gate");
  if (geoBlocked.length > 0) {
    leaks.push({
      id: "geo_gate_blocked",
      surface: "PDP navigation",
      pillar: "Performance",
      severity: 5,
      affected_traffic_pct: impactRange("geo_gate_blocked"),
      evidence: geoBlocked[0]?.screenshot || geoBlocked[0]?.url || "",
      description: `${geoBlocked.length} PDP(s) blocked by geo/region gate — captured homepage shell instead.`,
    });
  }

  for (const p of verifiedPdps) {
    const hasBuy =
      p.has_add_to_cart ||
      p.has_price ||
      p.has_retailer_handoff ||
      (p.buy_module?.retailer_links?.length ?? 0) > 0;
    const reviews = p.social_proof?.review_count ?? p.review_count ?? 0;

    if (!hasBuy) {
      leaks.push({
        id: "pdp_no_buy_module",
        surface: p.h1 || p.title || p.url,
        pillar: "Conversion",
        severity: 4,
        affected_traffic_pct: impactRange("pdp_no_buy_module"),
        evidence: p.screenshot || p.url,
        description: `PDP "${p.h1 || p.title}" has no price, ATC, or retailer handoff.`,
      });
    } else if (reviews >= 50 && !p.has_add_to_cart && !p.has_retailer_handoff) {
      leaks.push({
        id: "pdp_high_reviews_no_buy",
        surface: p.h1 || p.title || p.url,
        pillar: "Conversion",
        severity: 4,
        affected_traffic_pct: impactRange("pdp_high_reviews_no_buy"),
        evidence: p.screenshot || p.url,
        description: `PDP has ${reviews} reviews but no clear buy module.`,
      });
    }

    const hasProductJsonLd = p.structured_data?.some((d) => /product/i.test(d.type));
    if (!hasProductJsonLd && verifiedPdps.indexOf(p) === 0) {
      leaks.push({
        id: "missing_json_ld",
        surface: p.h1 || p.url,
        pillar: "Acquisition",
        severity: 2,
        affected_traffic_pct: impactRange("missing_json_ld"),
        evidence: p.screenshot || p.url,
        description: "Hero PDP missing Product JSON-LD structured data.",
      });
    }
  }

  for (const c of surfaces.filter((s) => s.type === "collection" && s.sold_out)) {
    leaks.push({
      id: "sold_out_collection",
      surface: c.h1 || c.url,
      pillar: "Conversion",
      severity: 3,
      affected_traffic_pct: impactRange("sold_out_collection"),
      evidence: c.screenshot || c.url,
      description: `Collection "${c.h1 || c.url}" has sold-out tiles.`,
    });
  }

  const home = surfaces.find((s) => s.type === "homepage");
  if (home && !home.has_newsletter) {
    leaks.push({
      id: "no_newsletter",
      surface: "Homepage",
      pillar: "Retention",
      severity: 2,
      affected_traffic_pct: impactRange("no_newsletter"),
      evidence: home.screenshot || home.url,
      description: "No visible email capture on homepage.",
    });
  }

  const catalog = surfaces.find(
    (s) => (s.type === "category" || s.type === "other") && /product/i.test(s.url)
  );
  if (catalog && (catalog.product_tile_count || 0) > 12) {
    leaks.push({
      id: "choice_overload",
      surface: catalog.h1 || catalog.url,
      pillar: "Conversion",
      severity: 3,
      affected_traffic_pct: impactRange("choice_overload"),
      evidence: catalog.screenshot || catalog.url,
      description: "Large product catalog without need-first navigation.",
    });
  }

  const search = surfaces.find((s) => s.type === "search");
  if (search?.text_excerpt && /no results|0 results|nothing found/i.test(search.text_excerpt)) {
    leaks.push({
      id: "search_zero_results",
      surface: "Search",
      pillar: "Acquisition",
      severity: 3,
      affected_traffic_pct: impactRange("search_zero_results"),
      evidence: search.screenshot || search.url,
      description: "Site search returns empty or weak results.",
    });
  }

  const checkout = surfaces.find((s) => s.type === "checkout");
  if (checkout?.is_error_page) {
    leaks.push({
      id: "checkout_error",
      surface: "Checkout",
      pillar: "Conversion",
      severity: 5,
      affected_traffic_pct: impactRange("checkout_error"),
      evidence: checkout.screenshot || checkout.url,
      description: "Checkout URL errors — DTC funnel broken.",
    });
  }

  const homePerf = home?.performance;
  if (homePerf?.lcp_ms && homePerf.lcp_ms > benchmarks.mobile_lcp_ms) {
    leaks.push({
      id: "slow_lcp",
      surface: "Homepage",
      pillar: "Performance",
      severity: 3,
      affected_traffic_pct: impactRange("slow_lcp"),
      evidence: home?.screenshot || home?.url || "",
      description: `Homepage LCP ${homePerf.lcp_ms}ms exceeds benchmark ${benchmarks.mobile_lcp_ms}ms.`,
    });
  }

  // Buy path completeness
  let buyPathScore = 0;
  const pdpWithBuy = verifiedPdps.filter(
    (p) => p.has_add_to_cart || p.has_price || p.has_retailer_handoff
  ).length;
  if (verifiedPdps.length > 0) buyPathScore += Math.round((pdpWithBuy / verifiedPdps.length) * 40);
  if (cart && !cart.is_error_page && cart.status !== 0) buyPathScore += 20;
  if (wtb && (wtb.has_store_locator || wtb.has_retailer_handoff)) buyPathScore += 20;
  if (checkout && !checkout.is_error_page) buyPathScore += 20;
  const buy_path_completeness = Math.min(100, buyPathScore);

  // Proof-commerce gap
  const maxReviews = Math.max(0, ...verifiedPdps.map((p) => p.review_count ?? p.social_proof?.review_count ?? 0));
  const pdpWithClearBuy = verifiedPdps.filter(
    (p) => p.has_add_to_cart || (p.buy_module?.retailer_links?.length ?? 0) > 0
  ).length;
  let proof_commerce_gap = 0;
  if (maxReviews >= 20 && verifiedPdps.length > 0) {
    proof_commerce_gap = Math.round(100 - (pdpWithClearBuy / verifiedPdps.length) * 100);
  }

  // Benchmark gaps
  const benchmark_gaps: BenchmarkGap[] = [];
  const jsonLdPdps = verifiedPdps.filter((p) =>
    p.structured_data?.some((d) => /product/i.test(d.type))
  ).length;
  const jsonLdPct = verifiedPdps.length ? Math.round((jsonLdPdps / verifiedPdps.length) * 100) : 0;
  if (jsonLdPct < benchmarks.json_ld_coverage_pct) {
    benchmark_gaps.push({
      metric: "Product JSON-LD coverage",
      observed: `${jsonLdPct}%`,
      category_median: `${benchmarks.json_ld_coverage_pct}%`,
      gap_pct: benchmarks.json_ld_coverage_pct - jsonLdPct,
    });
  }

  const buyModulePct = verifiedPdps.length
    ? Math.round((pdpWithBuy / verifiedPdps.length) * 100)
    : 0;
  if (buyModulePct < benchmarks.buy_module_present_pct) {
    benchmark_gaps.push({
      metric: "PDP buy module present",
      observed: `${buyModulePct}%`,
      category_median: `${benchmarks.buy_module_present_pct}%`,
      gap_pct: benchmarks.buy_module_present_pct - buyModulePct,
    });
  }

  if (homePerf?.lcp_ms) {
    const gap = homePerf.lcp_ms - benchmarks.mobile_lcp_ms;
    if (gap > 0) {
      benchmark_gaps.push({
        metric: "Mobile LCP (homepage)",
        observed: `${homePerf.lcp_ms}ms`,
        category_median: `${benchmarks.mobile_lcp_ms}ms`,
        gap_pct: Math.round((gap / benchmarks.mobile_lcp_ms) * 100),
      });
    }
  }

  // Funnel health score
  const avgSeverity =
    leaks.length > 0 ? leaks.reduce((s, l) => s + l.severity, 0) / leaks.length : 0;
  const funnel_health_score = Math.max(
    0,
    Math.min(100, Math.round(buy_path_completeness * 0.4 + (100 - avgSeverity * 15) * 0.3 + (100 - proof_commerce_gap) * 0.3))
  );

  // Dedupe by id, keep highest severity
  const byId = new Map<string, LeakScore>();
  for (const l of leaks) {
    const existing = byId.get(l.id);
    if (!existing || l.severity > existing.severity) byId.set(l.id, l);
  }

  return {
    funnel_health_score,
    leak_scores: [...byId.values()].sort((a, b) => b.severity - a.severity),
    benchmark_gaps,
    buy_path_completeness,
    proof_commerce_gap,
  };
}
