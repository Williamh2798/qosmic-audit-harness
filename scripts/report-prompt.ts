/**
 * Prompts for Claude to write Qosmic-quality audit prose (exec summary, funnel diagnosis, competitors).
 * Experiments come from experiments.json — not generated here.
 */

type FunnelAnalytics = {
  funnel_health_score: number;
  leak_scores: { id: string; surface: string; pillar: string; severity: number; affected_traffic_pct: string; description: string }[];
  benchmark_gaps: { metric: string; observed: string; category_median: string; gap_pct: number }[];
  buy_path_completeness: number;
  proof_commerce_gap: number;
};

type Manifest = {
  store_url: string;
  audit_id: string;
  purchase_model: string;
  category_keywords: string[];
  funnel_analytics?: FunnelAnalytics;
  store_insights?: {
    store_name: string;
    purchase_path_summary: string;
    top_leaks: string[];
    scored_leaks?: { severity: number; pillar: string; estimated_session_impact_pct: string; description: string }[];
    strengths: string[];
    funnel_health_score?: number;
    buy_path_completeness?: number;
  };
  surfaces: {
    url: string;
    type: string;
    screenshot?: string;
    h1?: string;
    review_count?: number | null;
    text_excerpt?: string;
  }[];
};

export type WriteProseOutput = {
  store_name: string;
  thesis: string;
  executive_summary: [string, string, string];
  funnel_diagnosis_rows: { stage: string; health: string; gap: string; session_impact: string }[];
  analytics_instrumentation: string[];
  competitor_intro: string;
  competitors: {
    competitor: string;
    domain: string;
    positioning: string;
    easier: string;
    edge: string;
    pattern: string;
  }[];
};

export const WRITE_PROSE_SYSTEM = `You write Qosmic CRO audit prose for ANY Shopify storefront.

OUTPUT: JSON only with keys:
- store_name, thesis (MAX 12 WORDS — short cover headline, not a sentence)
- executive_summary: array of EXACTLY 3 paragraphs (strings). Bold first sentence of each with ** markers.
- funnel_diagnosis_rows: array of { stage, health, gap, session_impact } — 4–8 rows covering key funnel stages
- analytics_instrumentation: array of 3–6 event names merchants should add before testing
- competitor_intro: one sentence
- competitors: array of 3–4 objects { competitor, domain, positioning, easier, edge, pattern }

STYLE:
- Write like a sharp operator. Quote specific page copy, review counts, nav labels from manifest.
- No filler: "brand brochure", "high-leverage", "materially lift", "cult-level".
- NEVER mention JSON field names in prose.
- Percentages only for impact — no dollar amounts.
- funnel_diagnosis_rows session_impact must use % ranges from funnel_analytics leak_scores.

Do NOT write experiments or technical checks — those are appended separately.`;

export function buildWriteProsePrompt(manifest: Manifest): string {
  const insights = manifest.store_insights;
  const fa = manifest.funnel_analytics;

  return `Store: ${manifest.store_url}
Audit ID: ${manifest.audit_id}
Purchase model: ${manifest.purchase_model}
Category keywords: ${manifest.category_keywords.join(", ")}

FUNNEL ANALYTICS:
${JSON.stringify(fa ?? {}, null, 2)}

STORE INSIGHTS:
${JSON.stringify(insights ?? {}, null, 2)}

KEY SURFACES:
${JSON.stringify(
  manifest.surfaces.slice(0, 12).map((s) => ({
    type: s.type,
    url: s.url,
    h1: s.h1,
    reviews: s.review_count,
    excerpt: s.text_excerpt?.slice(0, 400),
  })),
  null,
  2
)}

Write exec summary, funnel diagnosis rows, analytics instrumentation, and competitor table as JSON.`;
}

/** Legacy single-shot prompt — kept for fallback */
export const REPORT_SYSTEM = `You write Qosmic CRO audit reports for ANY Shopify storefront.

See WRITE_PROSE_SYSTEM for style. Output full markdown including ## Proposed experiments with all new fields:
Implementation effort, Secondary KPI, Test duration, MDE, Priority score, Analytics events.

10 experiments, 2 per pillar. ON-SITE only. Expected lift +4–20%. No dollar amounts.
Output markdown only. Do NOT write ## Technical checks.`;

export function buildReportPrompt(manifest: Manifest): string {
  return buildWriteProsePrompt(manifest);
}
