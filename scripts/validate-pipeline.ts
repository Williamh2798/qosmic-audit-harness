#!/usr/bin/env npx tsx
/**
 * Deterministic pipeline validation — render report from manifest without LLM.
 * Usage: npx tsx scripts/validate-pipeline.ts audits/aud_xxx/manifest.json
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { renderReport, storeSlug } from "./render-report.js";
import { normalizeExperiments, type Experiment } from "./reason-prompt.js";
import { REPORTS_DIR } from "./paths.js";
import { validateReportOutput } from "./validate-output.js";
import { computePriorityScore, parseLiftMidpoint } from "./benchmarks.js";

const PILLARS = ["Conversion", "AOV", "Retention", "Acquisition", "Performance"] as const;

function expId(seed: string): string {
  return `exp-${createHash("sha256").update(seed).digest("hex").slice(0, 12)}`;
}

function generateExperiments(manifest: {
  audit_id: string;
  store_url: string;
  funnel_analytics?: {
    leak_scores: {
      id: string;
      surface: string;
      pillar: string;
      severity: number;
      affected_traffic_pct: string;
      description: string;
      evidence: string;
    }[];
  };
  surfaces: { url: string; type: string; screenshot?: string }[];
  store_insights?: { experiment_seeds?: string[] };
}): Experiment[] {
  const leaks = manifest.funnel_analytics?.leak_scores ?? [];
  const seeds = manifest.store_insights?.experiment_seeds ?? [];
  const experiments: Experiment[] = [];

  const templates: Omit<Experiment, "exp_id" | "pillar">[] = [];

  for (const leak of leaks) {
    templates.push({
      title: `Fix ${leak.surface} leak`,
      affected_surface: leak.surface,
      url: manifest.surfaces.find((s) => s.screenshot === leak.evidence)?.url || manifest.store_url,
      evidence: leak.evidence.startsWith("audits/") ? leak.evidence : `audits/${manifest.audit_id}/screenshots/placeholder.png`,
      hypothesis: `CVR improves by addressing ${leak.description.toLowerCase()} because crawl evidence shows severity ${leak.severity} impact on ~${leak.affected_traffic_pct} of sessions.`,
      primary_change: `Resolve: ${leak.description.slice(0, 80)}`,
      primary_kpi: leak.pillar === "Retention" ? "Email capture rate" : "Conversion rate",
      secondary_kpi: "Bounce rate",
      decision_rule: "Ship if primary KPI improves without hurting secondary KPI over 3 weeks.",
      expected_lift: leak.severity >= 4 ? "+10–16%" : "+6–12%",
      confidence: leak.severity >= 4 ? 78 : 72,
      implementation_effort: leak.severity >= 5 ? "M" : "S",
      test_duration_weeks: 3,
      minimum_detectable_effect: "+8% relative on primary KPI",
      priority_score: 0,
      analytics_events: ["conversion_event", "surface_impression"],
    });
  }

  while (templates.length < 10) {
    const i = templates.length;
    const pillar = PILLARS[i % 5];
    const surface = manifest.surfaces[i % manifest.surfaces.length];
    templates.push({
      title: seeds[i] || `Improve ${surface?.type || "storefront"} UX`,
      affected_surface: surface?.type || "Homepage",
      url: surface?.url || manifest.store_url,
      evidence: surface?.screenshot || `audits/${manifest.audit_id}/screenshots/placeholder.png`,
      hypothesis: `CVR improves by optimizing the ${surface?.type || "homepage"} experience because crawl shows room for clearer purchase paths.`,
      primary_change: "Add clearer CTA and purchase guidance on this surface.",
      primary_kpi: pillar === "AOV" ? "Average order value" : "Conversion rate",
      secondary_kpi: "Time on page",
      decision_rule: "Ship if primary KPI improves at 95% confidence over 3 weeks.",
      expected_lift: "+6–10%",
      confidence: 70,
      implementation_effort: "S",
      test_duration_weeks: 3,
      minimum_detectable_effect: "+6% relative on primary KPI",
      priority_score: 0,
      analytics_events: ["cta_click"],
    });
  }

  for (let i = 0; i < 10; i++) {
    const t = templates[i];
    const pillar = PILLARS[Math.floor(i / 2) % 5];
    const liftMid = parseLiftMidpoint(t.expected_lift);
    experiments.push({
      ...t,
      exp_id: expId(`${manifest.audit_id}-${i}`),
      pillar,
      priority_score: computePriorityScore(t.confidence, liftMid, t.implementation_effort),
    });
  }

  return normalizeExperiments(experiments);
}

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error("Usage: npx tsx scripts/validate-pipeline.ts audits/aud_xxx/manifest.json");
    process.exit(1);
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
  const experiments = generateExperiments(manifest);
  const auditDir = dirname(manifestPath);
  await writeFile(join(auditDir, "experiments.json"), JSON.stringify(experiments, null, 2));

  const fa = manifest.funnel_analytics;
  const report = renderReport(manifest, {
    store_name: manifest.store_insights?.store_name || storeSlug(manifest.store_url),
    thesis: "conversion leaks need fixing",
    executive_summary: [
      "**The store has product proof but structural gaps in the purchase path.** Crawl artifacts show clear strengths in brand and catalog depth, but funnel analytics flagged multiple leaks affecting session conversion.",
      "**High-severity leaks cluster on key purchase surfaces** — cart, PDP buy modules, and navigation handoffs need attention. Estimated session impact ranges from 3–25% depending on leak type.",
      "**Start with the highest-priority experiment** from the priority matrix — lowest implementation effort with the highest confidence and lift potential.",
    ],
    funnel_diagnosis_rows: (fa?.leak_scores ?? []).slice(0, 6).map((l: { surface: string; severity: number; description: string; affected_traffic_pct: string }) => ({
      stage: l.surface,
      health: `Severity ${l.severity}/5`,
      gap: l.description.slice(0, 60),
      session_impact: l.affected_traffic_pct,
    })),
    analytics_instrumentation: ["buy_box_impression", "add_to_cart", "cta_click"],
    experiments,
    competitor_intro: "Category competitors set a higher bar for purchase clarity and guided shopping.",
    competitors: [
      { competitor: "Harney & Sons", domain: "harney.com", positioning: "Premium tea DTC", easier: "Clear product taxonomy", edge: "Organic focus", pattern: "Need-first homepage blocks" },
      { competitor: "Traditional Medicinals", domain: "traditionalmedicinals.com", positioning: "Wellness tea leader", easier: "Benefit-led navigation", edge: "Veteran story", pattern: "Health benefit filters" },
      { competitor: "Yogi Tea", domain: "yogiproducts.com", positioning: "Mass wellness", easier: "Retailer + DTC paths", edge: "Ritual branding", pattern: "Dual buy paths" },
    ],
  });

  const slug = storeSlug(manifest.store_url);
  const reportPath = join(process.cwd(), REPORTS_DIR, `${slug}_audit.md`);
  await mkdir(join(process.cwd(), REPORTS_DIR), { recursive: true });
  await writeFile(reportPath, report);
  await writeFile(join(auditDir, "report.md"), report);

  const validation = validateReportOutput(report, manifest);
  console.log(`Report: ${reportPath}`);
  console.log(`Validation: ${validation.valid ? "PASS" : "FAIL"}`);
  if (validation.errors.length) validation.errors.forEach((e) => console.log(`  ERROR: ${e}`));
  if (validation.warnings.length) validation.warnings.forEach((w) => console.log(`  WARN: ${w}`));

  await new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["tsx", "eval/run.ts", reportPath, "--manifest", manifestPath], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`eval exit ${code}`))));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
