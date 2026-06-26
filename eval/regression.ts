/**
 * Regression theme check for gingerpeople calibration (not text similarity).
 */

const GINGERPEOPLE_THEMES = [
  { id: "buy_path", patterns: [/buy(ing)?\s*(box|path|online|near)|purchase\s*handoff|retailer/i] },
  { id: "where_to_buy", patterns: [/where\s*to\s*buy|store\s*locator|find\s*near/i] },
  { id: "cart_404", patterns: [/\/cart|cart\s*404|empty\s*cart|cart\s*recover/i] },
  { id: "product_proof", patterns: [/review|#1|award|proof|testimonial/i] },
  { id: "need_first", patterns: [/need|mission|nausea|travel|cooking|job-to-be-done/i] },
];

export type RegressionResult = {
  store: string;
  themes_matched: string[];
  themes_total: number;
  score: number;
  detail: string;
};

export function runRegressionCheck(
  report: string,
  storeUrl?: string
): RegressionResult | null {
  const isGinger =
    /gingerpeople/i.test(report) ||
    /gingerpeople/i.test(storeUrl || "");
  if (!isGinger) return null;

  const matched = GINGERPEOPLE_THEMES.filter((t) =>
    t.patterns.some((p) => p.test(report))
  ).map((t) => t.id);

  return {
    store: "gingerpeople.com",
    themes_matched: matched,
    themes_total: GINGERPEOPLE_THEMES.length,
    score: Math.round((matched.length / GINGERPEOPLE_THEMES.length) * 100),
    detail: `Theme overlap: ${matched.join(", ") || "none"} (${matched.length}/${GINGERPEOPLE_THEMES.length})`,
  };
}
