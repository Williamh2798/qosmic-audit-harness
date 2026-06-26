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

export function validateReportOutput(report: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Section 1: Executive summary (2–3 paragraphs) ---
  if (!/##\s*Executive summary/i.test(report)) {
    errors.push("Missing ## Executive summary section");
  } else {
    const execBody =
      report.split(/##\s*Executive summary/i)[1]?.split(/##\s*Proposed experiments/i)[0] ?? "";
    const paragraphs = execBody.split(/\n\n+/).filter((p) => p.trim().length > 80);
    if (paragraphs.length < 2) {
      errors.push(`Executive summary needs 2–3 paragraphs of prose (found ${paragraphs.length})`);
    }
    if (paragraphs.length > 3) {
      warnings.push(`Executive summary has ${paragraphs.length} paragraphs (brief asks 2–3)`);
    }
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
    "Decision rule:",
    "Expected lift:",
    "Confidence:",
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
  const structural = runStructuralEval(report);
  for (const check of structural.filter((c) => !c.pass)) {
    errors.push(`Structural: ${check.name} — ${check.detail}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
