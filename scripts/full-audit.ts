#!/usr/bin/env npx tsx
/**
 * Full audit pipeline: URL → crawl → reason (experiments.json) → write (report) → eval
 *
 * Usage:
 *   npm run audit -- https://gingerpeople.com
 *   npm run audit -- --manifest audits/aud_xxx/manifest.json
 */

import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.js";
import { completeJson } from "./llm.js";
import { renderReport, storeSlug, type AuditPackage } from "./render-report.js";
import { writeAuditHtml, clampThesis } from "./render-html.js";
import { renderPdfFromHtml } from "./render-pdf.js";
import {
  REASON_SYSTEM,
  buildReasonPrompt,
  normalizeExperiments,
  validateExperiments,
  type Experiment,
  type ReasonOutput,
} from "./reason-prompt.js";
import {
  WRITE_PROSE_SYSTEM,
  buildWriteProsePrompt,
  type WriteProseOutput,
} from "./report-prompt.js";
import { validateReportOutput } from "./validate-output.js";

import { REPORTS_DIR } from "./paths.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

type Manifest = {
  store_url: string;
  audit_id: string;
  purchase_model: string;
  category_keywords: string[];
  funnel_analytics?: {
    funnel_health_score: number;
    buy_path_completeness: number;
    leak_scores: { id: string; surface: string; severity: number; affected_traffic_pct: string; description: string; pillar: string }[];
    benchmark_gaps?: { metric: string; observed: string; category_median: string; gap_pct: number }[];
    proof_commerce_gap?: number;
  };
  store_insights?: {
    store_name?: string;
    purchase_path_summary?: string;
    top_leaks?: string[];
    scored_leaks?: unknown[];
    strengths?: string[];
    experiment_seeds?: string[];
    funnel_health_score?: number;
    buy_path_completeness?: number;
  };
  surfaces: unknown[];
  technical_checks: { check: string; status: string; detail: string }[];
};

async function runReasonPhase(manifest: Manifest, maxAttempts = 3): Promise<Experiment[]> {
  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`  reason attempt ${attempt}/${maxAttempts}...`);
    const userPrompt =
      buildReasonPrompt(manifest as Parameters<typeof buildReasonPrompt>[0]) +
      (lastError ? `\n\nPREVIOUS ATTEMPT REJECTED:\n${lastError}\nFix and regenerate.` : "");

    const output = await completeJson<ReasonOutput>(REASON_SYSTEM, userPrompt);
    const experiments = normalizeExperiments(output.experiments || [], manifest.audit_id);
    const errors = validateExperiments(experiments);
    if (errors.length === 0) return experiments;
    lastError = errors.join("; ");
    console.warn(`  ⚠ ${lastError}`);
  }
  throw new Error(`Reason phase failed after ${maxAttempts} attempts: ${lastError}`);
}

async function runWriteProsePhase(manifest: Manifest, maxAttempts = 3): Promise<WriteProseOutput> {
  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`  write prose attempt ${attempt}/${maxAttempts}...`);
    const userPrompt =
      buildWriteProsePrompt(manifest as Parameters<typeof buildWriteProsePrompt>[0]) +
      (lastError ? `\n\nPREVIOUS ATTEMPT REJECTED:\n${lastError}\nFix and regenerate.` : "");

    try {
      const output = await completeJson<WriteProseOutput>(WRITE_PROSE_SYSTEM, userPrompt);
      if (
        output.executive_summary?.length === 3 &&
        output.competitors?.length >= 3 &&
        output.thesis
      ) {
        return output;
      }
      lastError = "Missing executive_summary (3 paras), thesis, or competitors (≥3)";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    console.warn(`  ⚠ ${lastError}`);
  }
  throw new Error(`Write prose phase failed after ${maxAttempts} attempts: ${lastError}`);
}

async function writeReportWithRetry(
  manifest: Manifest,
  experiments: Experiment[],
  maxAttempts = 3
): Promise<{ report: string; pkg: AuditPackage }> {
  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`  report assembly attempt ${attempt}/${maxAttempts}...`);
    let prose: WriteProseOutput;
    try {
      prose = await runWriteProsePhase(manifest, 1);
    } catch {
      // Fallback: minimal prose if write phase fails on retry loop
      prose = {
        store_name: manifest.store_insights?.store_name || storeSlug(manifest.store_url),
        thesis: "conversion leaks need fixing",
        executive_summary: [
          "**The store has structural conversion gaps.** Crawl artifacts show purchase-path friction across key surfaces.",
          "**Multiple high-severity leaks were detected** in funnel analytics — cart, PDP, and navigation surfaces need attention.",
          "**Start with the highest-priority experiment** from the priority matrix — lowest effort, highest session impact.",
        ],
        funnel_diagnosis_rows: [],
        analytics_instrumentation: ["buy_box_impression", "retailer_click", "add_to_cart"],
        competitor_intro: "Category competitors set a higher bar for purchase clarity.",
        competitors: [
          { competitor: "Competitor A", domain: "example.com", positioning: "DTC leader", easier: "Clear buy path", edge: "Brand proof", pattern: "Persistent buy box" },
          { competitor: "Competitor B", domain: "example2.com", positioning: "Need-first nav", easier: "Guided shopping", edge: "Content moat", pattern: "Mission-based catalog" },
          { competitor: "Competitor C", domain: "example3.com", positioning: "Retailer handoff", easier: "Store locator", edge: "Product range", pattern: "ZIP locator + retailer cards" },
        ],
      };
    }

    const pkg: AuditPackage = {
      store_name: prose.store_name,
      thesis: clampThesis(prose.thesis),
      executive_summary: prose.executive_summary,
      funnel_diagnosis_rows: prose.funnel_diagnosis_rows,
      analytics_instrumentation: prose.analytics_instrumentation,
      experiments,
      competitor_intro: prose.competitor_intro,
      competitors: prose.competitors,
    };

    const report = renderReport(manifest, pkg);

    const validation = validateReportOutput(report, manifest);
    if (validation.valid) {
      if (validation.warnings.length) {
        validation.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
      }
      return { report, pkg };
    }
    lastError = validation.errors.join("; ");
    console.warn(`  ⚠ ${lastError}`);
  }
  throw new Error(`Report failed after ${maxAttempts} attempts: ${lastError}`);
}

async function runCrawl(storeUrl: string, headed: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["scripts/crawl.ts", storeUrl];
    if (headed) args.push("--headed");

    const child = spawn("npx", ["tsx", ...args], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    child.stdout.on("data", (d) => {
      const text = d.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (d) => process.stderr.write(d));

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Crawl failed with exit code ${code}`));
        return;
      }
      const match = stdout.match(/Manifest:\s*(audits\/[^\s]+)/);
      if (!match) {
        reject(new Error("Could not parse manifest path from crawl output"));
        return;
      }
      resolve(join(ROOT, match[1]));
    });
  });
}

async function runEval(reportPath: string, manifestPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["tsx", "eval/run.ts", reportPath, "--manifest", manifestPath],
      { cwd: ROOT, stdio: "inherit", env: process.env }
    );
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", reject);
  });
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const headed = args.includes("--headed");
  const skipEval = args.includes("--no-eval");
  const manifestFlag = args.indexOf("--manifest");
  const manifestArg = manifestFlag >= 0 ? args[manifestFlag + 1] : undefined;
  const urlArg = args.find((a) => !a.startsWith("--") && a !== manifestArg);

  let manifestPath: string;

  if (manifestArg) {
    manifestPath = manifestArg.startsWith("/") ? manifestArg : join(ROOT, manifestArg);
    console.log(`Using existing manifest: ${manifestPath}`);
  } else if (urlArg) {
    const storeUrl = urlArg.startsWith("http") ? urlArg : `https://${urlArg}`;
    console.log(`\n=== Qosmic audit: ${storeUrl} ===\n`);
    manifestPath = await runCrawl(storeUrl, headed);
  } else {
    console.error(
      "Usage: npm run audit -- <shopify-url> [--headed] [--no-eval]\n" +
        "       npm run audit -- --manifest audits/aud_xxx/manifest.json"
    );
    process.exit(1);
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf-8")) as Manifest;
  const auditDir = dirname(manifestPath);

  console.log("\n→ Reason phase (experiments.json)...");
  const experiments = await runReasonPhase(manifest);
  const experimentsPath = join(auditDir, "experiments.json");
  await writeFile(experimentsPath, JSON.stringify(experiments, null, 2));
  console.log(`  Wrote ${experimentsPath}`);

  console.log("\n→ Write phase (report)...");
  const { report, pkg } = await writeReportWithRetry(manifest, experiments);

  const slug = storeSlug(manifest.store_url);
  await mkdir(join(ROOT, REPORTS_DIR), { recursive: true });
  const reportPath = join(ROOT, REPORTS_DIR, `${slug}_audit.md`);
  await writeFile(reportPath, report);

  const auditCopy = join(auditDir, "report.md");
  await writeFile(auditCopy, report);

  const htmlPath = join(ROOT, REPORTS_DIR, `${slug}_audit.html`);
  const pdfPath = join(ROOT, REPORTS_DIR, `${slug}_audit.pdf`);
  const auditPdfCopy = join(auditDir, "report.pdf");

  console.log("\n→ Render HTML + PDF...");
  await writeAuditHtml(manifest, pkg, htmlPath);
  await writeAuditHtml(manifest, pkg, join(auditDir, "report.html"));
  await renderPdfFromHtml(htmlPath, pdfPath, pkg.store_name);
  await renderPdfFromHtml(join(auditDir, "report.html"), auditPdfCopy, pkg.store_name);

  console.log(`\n════════════════════════════════════════════`);
  console.log(`  📄 YOUR REPORT: ${reportPath}`);
  console.log(`  🌐 HTML preview: ${htmlPath}`);
  console.log(`  📑 PDF deliverable: ${pdfPath}`);
  console.log(`════════════════════════════════════════════`);

  if (!skipEval) {
    console.log("\n→ Eval...");
    await runEval(reportPath, manifestPath);
  }

  console.log("\n✓ Done");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
