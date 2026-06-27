/**
 * Validates audit markdown against the Qosmic output contract (takehome/README.md).
 */

import { runStructuralEval } from "../eval/structural.js";

/** The 15 standard technical checks from the brief. */
export const STANDARD_TECH_CHECKS = [
  "SSL Certificate",
  "HTTPS Redirect",
  "Sitemap",
  "Robots.txt",
  "Critical Pages Loading",
  "Meta Tags & Social Previews",
  "Structured Data",
  "Favicon",
  "Mobile-Friendly",
  "Page Speed Mobile",
  "Page Speed Desktop",
  "Broken Links",
  "Image Optimization",
  "Cookie/Privacy",
  "Checkout Reachable",
] as const;

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

type ManifestForValidation = {
  funnel_analytics?: {
    leak_scores?: { severity: number; id: string; description: string }[];
  };
};

export function validateReportOutput(
  report: string,
  manifest?: ManifestForValidation
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Section 1: Executive summary (2–3 paragraphs) ---
  if (!/##\s*Executive summary/i.test(report)) {
    errors.push("Missing ## Executive summary section");
  } else {
    const execBody =
      report.split(/##\s*Executive summary/i)[1]?.split(/##\s*Funnel diagnosis/i)[0] ?? "";
    const paragraphs = execBody.split(/\n\n+/).filter((p) => p.trim().length > 80);
    if (paragraphs.length < 2) {
      errors.push(`Executive summary needs 2–3 paragraphs of prose (found ${paragraphs.length})`);
    }
    if (paragraphs.length > 3) {
      warnings.push(`Executive summary has ${paragraphs.length} paragraphs (brief asks 2–3)`);
    }
  }

  // --- Funnel diagnosis ---
  if (!/##\s*Funnel diagnosis/i.test(report)) {
    errors.push("Missing ## Funnel diagnosis section");
  }

  // --- Priority matrix ---
  if (!/##\s*Experiment priority matrix/i.test(report)) {
    errors.push("Missing ## Experiment priority matrix section");
  }

  // --- Analytics instrumentation ---
  if (!/##\s*Analytics instrumentation/i.test(report)) {
    warnings.push("Missing ## Analytics instrumentation section");
  }

  // --- Section 2: 10 experiments with all fields ---
  if (!/##\s*Proposed experiments/i.test(report)) {
    errors.push("Missing ## Proposed experiments section");
  }

  const expHeaders = report.match(/###\s*exp-[a-f0-9]{12}\s*—/gi) || [];
  const uniqueExps = [...new Set(expHeaders.map((h) => h.toLowerCase()))];
  if (uniqueExps.length !== 10) {
    errors.push(`Need exactly 10 experiments with exp-{12hex} IDs (found ${uniqueExps.length})`);
  }

  const requiredFields = [
    "Pillar:",
    "Affected surface:",
    "URL:",
    "Evidence:",
    "Hypothesis:",
    "Primary change:",
    "Primary KPI:",
    "Secondary KPI:",
    "Decision rule:",
    "Expected lift:",
    "Confidence:",
    "Implementation effort:",
    "Test duration:",
    "Minimum detectable effect:",
    "Priority score:",
    "Analytics events:",
  ];
  const expBlocks = report.split(/###\s*exp-[a-f0-9]{12}/i).slice(1);
  for (let i = 0; i < Math.min(10, expBlocks.length); i++) {
    const missing = requiredFields.filter((f) => !expBlocks[i].includes(f));
    if (missing.length) {
      errors.push(`Experiment ${i + 1} missing fields: ${missing.join(", ")}`);
    }
  }

  const pillars = ["Conversion", "AOV", "Retention", "Acquisition", "Performance"];
  for (const p of pillars) {
    if (!new RegExp(`\\*\\*Pillar:\\*\\*\\s*${p}`, "i").test(report)) {
      errors.push(`No experiment with pillar: ${p}`);
    }
  }

  // Lift-effort consistency
  for (let i = 0; i < Math.min(10, expBlocks.length); i++) {
    const block = expBlocks[i];
    const effortMatch = block.match(/\*\*Implementation effort:\*\*\s*(S|M|L)/i);
    const liftMatch = block.match(/\*\*Expected lift:\*\*\s*\+?(\d+)/i);
    if (effortMatch?.[1] === "L" && liftMatch && parseInt(liftMatch[1], 10) > 18) {
      warnings.push(`Experiment ${i + 1}: L effort with high lift (+${liftMatch[1]}%) — verify evidence`);
    }
  }

  // Manifest leak coverage
  if (manifest?.funnel_analytics?.leak_scores) {
    const highSeverity = manifest.funnel_analytics.leak_scores.filter((l) => l.severity >= 4);
    for (const leak of highSeverity) {
      const keywords = leak.description.toLowerCase().split(/\s+/).filter((w) => w.length > 5).slice(0, 3);
      const covered = keywords.some((kw) => report.toLowerCase().includes(kw));
      if (!covered) {
        warnings.push(`Severity-${leak.severity} leak may lack experiment: ${leak.description.slice(0, 60)}`);
      }
    }
  }

  // --- Section 3: Competitor table (3–4 rows) ---
  if (!/##\s*Competitor analysis/i.test(report)) {
    errors.push("Missing ## Competitor analysis section");
  }
  const compSection = report.split(/##\s*Competitor analysis/i)[1]?.split(/##\s*Technical checks/i)[0] ?? "";
  const compRows = (compSection.match(/^\|[^|]+\|/gm) || []).filter(
    (r) => !r.includes("---") && !/^\|\s*Competitor\s*\|/i.test(r)
  );
  if (compRows.length < 3) {
    errors.push(`Competitor table needs 3–4 rows (found ${compRows.length})`);
  }
  if (compRows.length > 4) {
    warnings.push(`Competitor table has ${compRows.length} rows (brief asks 3–4)`);
  }

  // --- Section 4: Technical checks (~15 rows, Pass/Warn/Fail) ---
  if (!/##\s*Technical checks/i.test(report)) {
    errors.push("Missing ## Technical checks section");
  }
  const techSection = report.split(/##\s*Technical checks/i)[1] ?? "";
  const techRows = [...techSection.matchAll(/\|\s*([^|]+)\s*\|\s*(Pass|Warn|Fail)\s*\|\s*([^|]+)\s*\|/gi)];

  if (techRows.length < 15) {
    errors.push(`Technical checks need ~15 rows (found ${techRows.length})`);
  }

  for (const name of STANDARD_TECH_CHECKS) {
    const found = techRows.some((m) => m[1].trim() === name);
    if (!found) {
      errors.push(`Missing standard technical check: ${name}`);
    }
  }

  // Structural eval (shared with npm run eval)
  const structural = runStructuralEval(report, undefined, manifest);
  for (const check of structural.filter((c) => !c.pass)) {
    errors.push(`Structural: ${check.name} — ${check.detail}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
