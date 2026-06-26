#!/usr/bin/env npx tsx
/**
 * Full audit pipeline: URL → crawl → reason (LLM) → report → eval
 *
 * Usage:
 *   npm run report -- https://zenrojas.com
 *   npm run report -- https://gingerpeople.com --headed
 *   npm run report -- --manifest audits/aud_xxx/manifest.json   # skip crawl
 *
 * Requires OPENAI_API_KEY or ANTHROPIC_API_KEY for the Reason phase.
 */

import { loadEnv } from "./load-env.js";
loadEnv();

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { completeJson } from "./llm.js";
import {
  renderReport,
  storeSlug,
  type AuditPackage,
  type Experiment,
} from "./render-report.js";
import { validateReportOutput } from "./validate-output.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

type Manifest = {
  store_url: string;
  audit_id: string;
  purchase_model: string;
  category_keywords: string[];
  surfaces: {
    url: string;
    type: string;
    status: number;
    status_note?: string;
    screenshot?: string;
    mobile_screenshot?: string;
    title?: string;
    meta_description?: string;
    text_excerpt?: string;
    has_add_to_cart?: boolean;
    has_price?: boolean;
  }[];
  technical_checks: { check: string; status: string; detail: string }[];
};

const PILLARS = ["Conversion", "AOV", "Retention", "Acquisition", "Performance"] as const;

function newExpId(): string {
  return `exp-${randomBytes(6).toString("hex")}`;
}

function finalizeExperimentSet(raw: Experiment[]): Experiment[] {
  const byPillar = new Map<string, Experiment[]>();
  for (const p of PILLARS) byPillar.set(p, []);
  for (const exp of raw) {
    if (byPillar.has(exp.pillar)) byPillar.get(exp.pillar)!.push(exp);
  }

  const picked: Experiment[] = [];
  for (const p of PILLARS) {
    const list = byPillar.get(p)!.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    picked.push(...list.slice(0, 2));
  }

  if (picked.length < 10) {
    throw new Error(
      `Need 2 experiments per pillar; missing: ${PILLARS.filter((p) => byPillar.get(p)!.length < 2).join(", ")}`
    );
  }
  return picked.slice(0, 10);
}

function normalizeExperiments(raw: Experiment[]): Experiment[] {
  const seen = new Set<string>();
  const deduped = raw.map((exp) => {
    let id = exp.exp_id?.toLowerCase() ?? "";
    if (!/^exp-[a-f0-9]{12}$/.test(id) || seen.has(id)) {
      id = newExpId();
    }
    seen.add(id);
    return { ...exp, exp_id: id };
  });
  return finalizeExperimentSet(deduped);
}

function validatePackage(pkg: AuditPackage, manifest: Manifest): void {
  if (!pkg.executive_summary || pkg.executive_summary.length !== 3) {
    throw new Error("LLM response must include exactly 3 executive_summary paragraphs");
  }
  if (!pkg.experiments || pkg.experiments.length !== 10) {
    throw new Error(`Expected 10 experiments, got ${pkg.experiments?.length ?? 0}`);
  }
  if (!pkg.competitors || pkg.competitors.length < 3 || pkg.competitors.length > 4) {
    throw new Error(`Expected 3–4 competitors, got ${pkg.competitors?.length ?? 0}`);
  }

  const screenshotPaths = new Set(
    manifest.surfaces.flatMap((s) => [s.screenshot, s.mobile_screenshot].filter(Boolean))
  );

  for (const exp of pkg.experiments) {
    if (!PILLARS.includes(exp.pillar as (typeof PILLARS)[number])) {
      throw new Error(`Invalid pillar: ${exp.pillar}`);
    }
    const citesManifest =
      exp.evidence.startsWith(`audits/${manifest.audit_id}/`) ||
      manifest.surfaces.some((s) => s.url === exp.evidence);
    const citesScreenshot = screenshotPaths.has(exp.evidence);
    if (!citesManifest && !citesScreenshot && !exp.evidence.startsWith("http")) {
      throw new Error(`Experiment ${exp.exp_id} evidence must cite a manifest screenshot path or URL`);
    }
  }

  const pillarCounts = Object.fromEntries(PILLARS.map((p) => [p, 0])) as Record<string, number>;
  for (const exp of pkg.experiments) pillarCounts[exp.pillar]++;
  const missing = PILLARS.filter((p) => pillarCounts[p] === 0);
  if (missing.length) {
    throw new Error(`Missing pillars: ${missing.join(", ")}`);
  }
  const thin = PILLARS.filter((p) => pillarCounts[p] < 2);
  if (thin.length) {
    throw new Error(`Each pillar needs ≥2 experiments; thin: ${thin.join(", ")}`);
  }
}

async function reasonWithRetry(manifest: Manifest, maxAttempts = 3): Promise<AuditPackage> {
  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const userPrompt =
      buildReasonPrompt(manifest) +
      (lastError ? `\n\nPREVIOUS ATTEMPT REJECTED:\n${lastError}\nFix and resubmit.` : "");
    console.log(`  attempt ${attempt}/${maxAttempts}...`);
    const raw = await completeJson<AuditPackage>(REASON_SYSTEM, userPrompt);
    raw.experiments = normalizeExperiments(raw.experiments);
    try {
      validatePackage(raw, manifest);
      return raw;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`  ⚠ ${lastError}`);
    }
  }
  throw new Error(`Reason phase failed after ${maxAttempts} attempts: ${lastError}`);
}

function buildReasonPrompt(manifest: Manifest): string {
  const surfaces = manifest.surfaces.map((s) => ({
    url: s.url,
    type: s.type,
    status: s.status,
    status_note: s.status_note,
    screenshot: s.screenshot,
    mobile_screenshot: s.mobile_screenshot,
    title: s.title,
    has_add_to_cart: s.has_add_to_cart,
    has_price: s.has_price,
    text_excerpt: s.text_excerpt?.slice(0, 800),
  }));

  return JSON.stringify(
    {
      store_url: manifest.store_url,
      audit_id: manifest.audit_id,
      purchase_model: manifest.purchase_model,
      category_keywords: manifest.category_keywords,
      surfaces,
      technical_checks: manifest.technical_checks,
      instructions: [
        "Produce a Qosmic CRO audit package for this store.",
        "Use ONLY evidence from the surfaces above — cite screenshot paths from this crawl.",
        "Do NOT copy gingerpeople.com example experiments verbatim; reason from this manifest.",
        "Exactly 10 experiments: 2 per pillar (Conversion=2, AOV=2, Retention=2, Acquisition=2, Performance=2). Performance = 404s, broken links, mobile, speed, checkout from technical_checks.",
        "For retailer_routed stores, focus on buy-online/find-near-me handoffs not add-to-cart.",
        "exp_id format: exp-{12 lowercase hex chars} — generate new unique IDs.",
        "confidence is integer 60-90.",
        "Find 3-4 plausible competitors for this category.",
      ],
    },
    null,
    2
  );
}

const REASON_SYSTEM = `You are the Qosmic audit Reason agent.

Your JSON output will be rendered into a markdown audit report with EXACTLY these four sections:

1. EXECUTIVE SUMMARY — exactly 3 paragraphs of prose. Highest-level read on what's costing the store sales. Bold the first sentence of each paragraph.

2. TEN PROPOSED EXPERIMENTS — each must include:
   - title + exp_id (format: exp-{12 lowercase hex})
   - pillar: Conversion | AOV | Retention | Acquisition | Performance
   - affected surface + url
   - evidence: screenshot path from the manifest (audits/{audit_id}/screenshots/....png) or live URL
   - hypothesis, primary_change, primary_kpi, decision_rule, expected_lift (e.g. "+8–14%"), confidence (integer %)
   All 10 must be exactly 2 per pillar: Conversion=2, AOV=2, Retention=2, Acquisition=2, Performance=2.

3. COMPETITOR ANALYSIS — 3–4 competitors with: competitor, domain, positioning, what they make easier, store edge, pattern to adapt.

4. TECHNICAL CHECKS — handled by crawl; you do not generate these.

Return JSON:
{
  "store_name": "Display name",
  "thesis": "one-line revenue constraint for the report title",
  "executive_summary": ["para1", "para2", "para3"],
  "experiments": [{ "exp_id", "title", "pillar", "affected_surface", "url", "evidence", "hypothesis", "primary_change", "primary_kpi", "decision_rule", "expected_lift", "confidence" }],
  "competitor_intro": "one sentence",
  "competitors": [{ "competitor", "domain", "positioning", "easier", "edge", "pattern" }]
}`;

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
    console.log(`\n=== Qosmic full audit: ${storeUrl} ===\n`);
    manifestPath = await runCrawl(storeUrl, headed);
  } else {
    console.error(
      "Usage: npm run report -- <shopify-url> [--headed] [--no-eval]\n" +
        "       npm run report -- --manifest audits/aud_xxx/manifest.json"
    );
    process.exit(1);
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf-8")) as Manifest;
  const auditDir = dirname(manifestPath);

  console.log("\n→ Reason phase (LLM)...");
  const raw = await reasonWithRetry(manifest);

  const experimentsPath = join(auditDir, "experiments.json");
  await writeFile(experimentsPath, JSON.stringify(raw.experiments, null, 2));
  console.log(`  experiments: ${experimentsPath}`);

  const report = renderReport(manifest, raw);
  const validation = validateReportOutput(report);
  if (!validation.valid) {
    console.error("\nReport failed output contract validation:");
    validation.errors.forEach((e) => console.error(`  ✗ ${e}`));
    throw new Error("Generated report does not match Qosmic output contract");
  }
  if (validation.warnings.length) {
    validation.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
  }

  const slug = storeSlug(manifest.store_url);
  await mkdir(join(ROOT, "sample_output"), { recursive: true });
  const reportPath = join(ROOT, "sample_output", `${slug}_audit.md`);
  await writeFile(reportPath, report);
  console.log(`  report: ${reportPath}`);

  if (!skipEval) {
    console.log("\n→ Eval phase...");
    const code = await runEval(reportPath, manifestPath);
    if (code !== 0) {
      console.warn("\nEval reported issues — review output above.");
    }
  }

  console.log("\n✓ Done");
  console.log(`  Manifest:  ${manifestPath}`);
  console.log(`  Report:    ${reportPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
