/**
 * Prompts for structured Reason phase — experiments.json from manifest.
 */

import { createHash } from "node:crypto";
import { computePriorityScore, parseLiftMidpoint } from "./benchmarks.js";

export type Experiment = {
  exp_id: string;
  title: string;
  pillar: string;
  affected_surface: string;
  url: string;
  evidence: string;
  hypothesis: string;
  primary_change: string;
  primary_kpi: string;
  secondary_kpi: string;
  decision_rule: string;
  expected_lift: string;
  confidence: number;
  implementation_effort: "S" | "M" | "L";
  test_duration_weeks: number;
  minimum_detectable_effect: string;
  priority_score: number;
  analytics_events: string[];
};

export type ReasonOutput = {
  experiments: Experiment[];
};

type FunnelAnalytics = {
  funnel_health_score: number;
  leak_scores: { id: string; surface: string; pillar: string; severity: number; affected_traffic_pct: string; description: string; evidence: string }[];
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
    scored_leaks?: { id: string; severity: number; pillar: string; estimated_session_impact_pct: string; description: string }[];
    experiment_seeds: string[];
    funnel_health_score?: number;
    buy_path_completeness?: number;
  };
  surfaces: {
    url: string;
    type: string;
    screenshot?: string;
    h1?: string;
    review_count?: number | null;
    social_proof?: { review_count: number | null; star_rating: number | null };
    buy_module?: { price_text: string | null; atc_label: string | null; retailer_links: string[] };
    is_error_page?: boolean;
    text_excerpt?: string;
    shopify_product?: { title: string; price: string | null };
  }[];
};

export const REASON_SYSTEM = `You design CRO experiments for ANY Shopify storefront from crawl artifacts.

OUTPUT: JSON object with key "experiments" — array of exactly 10 experiment objects.

Each experiment MUST include ALL fields:
- exp_id: "exp-" + 12 lowercase hex chars
- title: short action ("Add a buying box to every product")
- pillar: Conversion | AOV | Retention | Acquisition | Performance (exactly 2 per pillar)
- affected_surface, url, evidence (must cite audits/{audit_id}/screenshots/... path from manifest)
- hypothesis: MUST start with "CVR improves", "AOV rises", "Repeat purchase rate improves", or "Cart abandon drops" + because + quoted evidence
- primary_change: ONE concrete UI change
- primary_kpi: measurable metric name
- secondary_kpi: guardrail metric (e.g. "PDP bounce rate")
- decision_rule: ship/kill criteria with guardrail
- expected_lift: "+4–20%" range only (percentages, no dollar amounts)
- confidence: 60–85 integer
- implementation_effort: "S" (2–4h theme tweak), "M" (1–2 days), or "L" (3–5 days)
- test_duration_weeks: 2–4
- minimum_detectable_effect: e.g. "+8% relative on primary KPI"
- priority_score: 1–100 (higher = do first; weight severity × confidence × lift / effort)
- analytics_events: array of event names to instrument before test (e.g. ["retailer_click", "buy_box_impression"])

RULES:
- ON-SITE storefront/UI changes only. BANNED: paid ads, off-site CRM flows.
- Start from funnel_analytics.leak_scores — every severity-4+ leak needs an experiment.
- Cover each experiment_seed from store_insights.
- Sort experiments by priority_score descending in the array.
- Retailer-routed stores: optimize outbound retailer clicks, not add-to-cart.
- No speculation — cite manifest evidence only.`;

export function buildReasonPrompt(manifest: Manifest): string {
  const fa = manifest.funnel_analytics;
  const insights = manifest.store_insights;
  const surfaces = manifest.surfaces.map((s) => ({
    type: s.type,
    url: s.url,
    screenshot: s.screenshot,
    h1: s.h1,
    reviews: s.social_proof?.review_count ?? s.review_count,
    rating: s.social_proof?.star_rating,
    buy_module: s.buy_module,
    is_error_page: s.is_error_page,
    shopify: s.shopify_product,
    excerpt: s.text_excerpt?.slice(0, 600),
  }));

  return `Store: ${manifest.store_url}
Audit ID: ${manifest.audit_id}
Purchase model: ${manifest.purchase_model}
Category keywords: ${manifest.category_keywords.join(", ")}

FUNNEL ANALYTICS:
${JSON.stringify(fa ?? {}, null, 2)}

STORE INSIGHTS:
${JSON.stringify(insights ?? {}, null, 2)}

SURFACES (evidence sources):
${JSON.stringify(surfaces, null, 2)}

Generate 10 experiments as JSON. Address all severity-4+ leaks. 2 experiments per pillar.`;
}

export function normalizeExperiments(experiments: Experiment[], auditId?: string): Experiment[] {
  return experiments
    .map((exp, i) => {
      let exp_id = exp.exp_id;
      if (!/^exp-[a-f0-9]{12}$/.test(exp_id)) {
        const seed = `${auditId || ""}-${exp.title}-${exp.url}-${i}`;
        exp_id = `exp-${createHash("sha256").update(seed).digest("hex").slice(0, 12)}`;
      }

      let expected_lift = exp.expected_lift;
      const liftNums = expected_lift.match(/(\d+)/g);
      if (liftNums) {
        const nums = liftNums.map(Number);
        const max = Math.max(...nums);
        if (max > 20) {
          const lo = Math.min(nums[0], 20);
          const hi = Math.min(nums.length > 1 ? nums[1] : nums[0], 20);
          expected_lift = `+${lo}–${hi}%`;
        }
      }

      const effort: "S" | "M" | "L" = ["S", "M", "L"].includes(exp.implementation_effort)
        ? exp.implementation_effort
        : "M";

      const liftMid = parseLiftMidpoint(expected_lift);
      const score = computePriorityScore(exp.confidence, liftMid, effort);
      return {
        ...exp,
        exp_id,
        expected_lift,
        implementation_effort: effort,
        priority_score: exp.priority_score || score,
        analytics_events: Array.isArray(exp.analytics_events) ? exp.analytics_events : ["conversion_event"],
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score);
}

export function validateExperiments(experiments: Experiment[]): string[] {
  const errors: string[] = [];
  if (experiments.length !== 10) errors.push(`Need 10 experiments, got ${experiments.length}`);

  const pillars = ["Conversion", "AOV", "Retention", "Acquisition", "Performance"];
  for (const p of pillars) {
    const count = experiments.filter((e) => e.pillar === p).length;
    if (count < 2) errors.push(`Need ≥2 ${p} experiments, got ${count}`);
  }

  const required = [
    "exp_id", "title", "pillar", "affected_surface", "url", "evidence",
    "hypothesis", "primary_change", "primary_kpi", "secondary_kpi",
    "decision_rule", "expected_lift", "confidence", "implementation_effort",
    "test_duration_weeks", "minimum_detectable_effect", "priority_score", "analytics_events",
  ] as const;

  for (let i = 0; i < experiments.length; i++) {
    const exp = experiments[i];
    for (const field of required) {
      if (exp[field] == null || exp[field] === "") {
        errors.push(`Experiment ${i + 1} missing ${field}`);
      }
    }
    if (!/^exp-[a-f0-9]{12}$/.test(exp.exp_id)) {
      errors.push(`Experiment ${i + 1} invalid exp_id: ${exp.exp_id}`);
    }
    if (!["S", "M", "L"].includes(exp.implementation_effort)) {
      errors.push(`Experiment ${i + 1} invalid effort: ${exp.implementation_effort}`);
    }
    const liftNums = exp.expected_lift.match(/(\d+)/g);
    if (liftNums) {
      const maxLift = Math.max(...liftNums.map(Number));
      if (maxLift > 25) errors.push(`Experiment ${i + 1} lift too high: ${exp.expected_lift}`);
      if (exp.implementation_effort === "L" && maxLift > 18) {
        errors.push(`Experiment ${i + 1}: L effort with +${maxLift}% lift needs strong evidence`);
      }
    }
  }

  return errors;
}
