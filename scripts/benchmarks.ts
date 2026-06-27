/**
 * Industry benchmark tables by purchase model — percentages only, no dollar amounts.
 */

export type PurchaseModel = "dtc" | "retailer_routed" | "hybrid" | "unknown";

export type BenchmarkTable = {
  pdp_cvr_pct: number;
  cart_abandon_pct: number;
  mobile_lcp_ms: number;
  json_ld_coverage_pct: number;
  review_widget_pct: number;
  buy_module_present_pct: number;
};

export const BENCHMARKS: Record<PurchaseModel, BenchmarkTable> = {
  dtc: {
    pdp_cvr_pct: 2.8,
    cart_abandon_pct: 70,
    mobile_lcp_ms: 2500,
    json_ld_coverage_pct: 85,
    review_widget_pct: 60,
    buy_module_present_pct: 95,
  },
  retailer_routed: {
    pdp_cvr_pct: 1.2,
    cart_abandon_pct: 85,
    mobile_lcp_ms: 2800,
    json_ld_coverage_pct: 70,
    review_widget_pct: 45,
    buy_module_present_pct: 75,
  },
  hybrid: {
    pdp_cvr_pct: 2.0,
    cart_abandon_pct: 75,
    mobile_lcp_ms: 2600,
    json_ld_coverage_pct: 80,
    review_widget_pct: 55,
    buy_module_present_pct: 85,
  },
  unknown: {
    pdp_cvr_pct: 2.0,
    cart_abandon_pct: 75,
    mobile_lcp_ms: 2700,
    json_ld_coverage_pct: 75,
    review_widget_pct: 50,
    buy_module_present_pct: 80,
  },
};

/** Session impact ranges by leak type (percent of sessions affected). */
export const LEAK_SESSION_IMPACT: Record<string, { min: number; max: number }> = {
  cart_404: { min: 8, max: 12 },
  pdp_no_buy_module: { min: 15, max: 25 },
  pdp_high_reviews_no_buy: { min: 10, max: 18 },
  wtb_broken: { min: 5, max: 10 },
  sold_out_collection: { min: 3, max: 8 },
  missing_json_ld: { min: 2, max: 5 },
  no_newsletter: { min: 2, max: 4 },
  choice_overload: { min: 4, max: 8 },
  search_zero_results: { min: 3, max: 6 },
  checkout_error: { min: 10, max: 20 },
  slow_lcp: { min: 5, max: 12 },
  geo_gate_blocked: { min: 20, max: 40 },
};

export const EFFORT_WEIGHTS: Record<"S" | "M" | "L", number> = {
  S: 1,
  M: 2.5,
  L: 5,
};

export function computePriorityScore(
  confidence: number,
  liftMidpointPct: number,
  effort: "S" | "M" | "L"
): number {
  const weight = EFFORT_WEIGHTS[effort];
  return Math.min(100, Math.round((confidence * liftMidpointPct) / (weight * 10)));
}

export function parseLiftMidpoint(expected_lift: string): number {
  const nums = expected_lift.match(/(\d+(?:\.\d+)?)/g);
  if (!nums || nums.length === 0) return 10;
  if (nums.length === 1) return parseFloat(nums[0]);
  return (parseFloat(nums[0]) + parseFloat(nums[1])) / 2;
}
