#!/usr/bin/env npx tsx
/**
 * Full audit pipeline: URL → crawl → Claude writes readable report → eval
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
import { completeMarkdown } from "./llm.js";
import { appendTechnicalChecks, storeSlug } from "./render-report.js";
import { REPORT_SYSTEM, buildReportPrompt } from "./report-prompt.js";
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
    screenshot?: string;
    title?: string;
    text_excerpt?: string;
    has_add_to_cart?: boolean;
    has_price?: boolean;
  }[];
  technical_checks: { check: string; status: string; detail: string }[];
};

async function writeReportWithRetry(manifest: Manifest, maxAttempts = 3): Promise<string> {
  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`  attempt ${attempt}/${maxAttempts}...`);
    const userPrompt =
      buildReportPrompt(manifest) +
      (lastError ? `\n\nPREVIOUS DRAFT REJECTED:\n${lastError}\nRewrite the full markdown report fixing these issues.` : "");

    let body = await completeMarkdown(REPORT_SYSTEM, userPrompt);
    body = appendTechnicalChecks(body, manifest);

    const validation = validateReportOutput(body);
    if (validation.valid) {
      if (validation.warnings.length) {
        validation.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
      }
      return body;
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

  console.log("\n→ Writing report (Claude)...");
  const report = await writeReportWithRetry(manifest);

  const slug = storeSlug(manifest.store_url);
  await mkdir(join(ROOT, "sample_output"), { recursive: true });
  const reportPath = join(ROOT, "sample_output", `${slug}_audit.md`);
  await writeFile(reportPath, report);

  // Also save readable copy next to crawl artifacts
  const auditCopy = join(dirname(manifestPath), "report.md");
  await writeFile(auditCopy, report);

  console.log(`\n════════════════════════════════════════════`);
  console.log(`  📄 YOUR REPORT: ${reportPath}`);
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
