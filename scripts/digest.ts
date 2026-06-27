#!/usr/bin/env npx tsx
/**
 * Re-render HTML + PDF from existing audit markdown + manifest (no LLM, no re-crawl).
 *
 * Usage:
 *   npm run digest -- reports/gingerpeople_audit.md
 *   npm run digest -- reports/gingerpeople_audit.md --manifest audits/aud_xxx/manifest.json
 */

import { readFile, access } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { writeAuditHtml, clampThesis } from "./render-html.js";
import { renderPdfFromHtml } from "./render-pdf.js";
import { storeSlug, type AuditPackage, type CompetitorRow } from "./render-report.js";
import type { Experiment } from "./reason-prompt.js";

import { REPORTS_DIR } from "./paths.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseTitleLine(line: string): { store_name: string; thesis: string } {
  const m = line.match(/^#\s+(.+?)\s+audit\s+[—–-]\s+(.+)$/i);
  if (m) return { store_name: m[1].trim(), thesis: clampThesis(m[2].trim()) };
  const plain = line.replace(/^#\s+/, "").trim();
  return { store_name: plain, thesis: "conversion audit" };
}

function sectionBody(report: string, heading: string): string {
  const re = new RegExp(`##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const m = report.match(re);
  return m?.[1]?.trim() ?? "";
}

function parseExecutiveSummary(report: string): [string, string, string] {
  const body = sectionBody(report, "Executive summary");
  const paras = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  while (paras.length < 3) paras.push("**Additional analysis pending.**");
  return [paras[0], paras[1], paras[2]];
}

function parseCompetitors(report: string): { intro: string; rows: CompetitorRow[] } {
  const body = sectionBody(report, "Competitor analysis");
  const lines = body.split("\n");
  const intro = lines.find((l) => l.trim() && !l.startsWith("|"))?.trim() ?? "";
  const tableLines = lines.filter((l) => l.startsWith("|") && !l.includes("---"));
  const rows: CompetitorRow[] = [];
  for (const line of tableLines.slice(1)) {
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 6) {
      rows.push({
        competitor: cells[0],
        domain: cells[1],
        positioning: cells[2],
        easier: cells[3],
        edge: cells[4],
        pattern: cells[5],
      });
    }
  }
  return { intro, rows };
}

function parseAnalytics(report: string): string[] {
  const body = sectionBody(report, "Analytics instrumentation");
  return [...body.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

function inferAuditId(report: string): string | null {
  const m = report.match(/audits\/(aud_[a-f0-9]+)\//);
  return m?.[1] ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const manifestFlag = args.indexOf("--manifest");
  const manifestArg = manifestFlag >= 0 ? args[manifestFlag + 1] : undefined;
  const reportArg = args.find((a) => !a.startsWith("--") && a !== manifestArg);

  if (!reportArg) {
    console.error(`Usage: npm run digest -- ${REPORTS_DIR}/{slug}_audit.md [--manifest audits/aud_xxx/manifest.json]`);
    process.exit(1);
  }

  const reportPath = reportArg.startsWith("/") ? reportArg : join(ROOT, reportArg);
  const report = await readFile(reportPath, "utf-8");

  let manifestPath: string;
  if (manifestArg) {
    manifestPath = manifestArg.startsWith("/") ? manifestArg : join(ROOT, manifestArg);
  } else {
    const auditId = inferAuditId(report);
    if (!auditId) {
      console.error("Could not infer audit_id from report evidence paths. Pass --manifest.");
      process.exit(1);
    }
    manifestPath = join(ROOT, "audits", auditId, "manifest.json");
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
  const auditDir = dirname(manifestPath);
  const experimentsPath = join(auditDir, "experiments.json");

  let experiments: Experiment[];
  try {
    await access(experimentsPath);
    experiments = JSON.parse(await readFile(experimentsPath, "utf-8"));
  } catch {
    console.error(`Missing ${experimentsPath} — run full audit first.`);
    process.exit(1);
  }

  const titleLine = report.split("\n").find((l) => l.startsWith("# ")) ?? "# Store audit — conversion audit";
  const { store_name, thesis } = parseTitleLine(titleLine);
  const { intro, rows } = parseCompetitors(report);

  const pkg: AuditPackage = {
    store_name,
    thesis,
    executive_summary: parseExecutiveSummary(report),
    analytics_instrumentation: parseAnalytics(report),
    experiments,
    competitor_intro: intro,
    competitors: rows.length >= 3 ? rows : [
      { competitor: "Competitor A", domain: "example.com", positioning: "—", easier: "—", edge: "—", pattern: "—" },
      { competitor: "Competitor B", domain: "example2.com", positioning: "—", easier: "—", edge: "—", pattern: "—" },
      { competitor: "Competitor C", domain: "example3.com", positioning: "—", easier: "—", edge: "—", pattern: "—" },
    ],
  };

  const slug = basename(reportPath).replace(/_audit\.md$/, "") || storeSlug(manifest.store_url);
  const htmlPath = join(ROOT, REPORTS_DIR, `${slug}_audit.html`);
  const pdfPath = join(ROOT, REPORTS_DIR, `${slug}_audit.pdf`);

  console.log(`Rendering HTML + PDF for ${slug}...`);
  await writeAuditHtml(manifest, pkg, htmlPath);
  await writeAuditHtml(manifest, pkg, join(auditDir, "report.html"));
  await renderPdfFromHtml(htmlPath, pdfPath, pkg.store_name);
  await renderPdfFromHtml(join(auditDir, "report.html"), join(auditDir, "report.pdf"), pkg.store_name);

  console.log(`  HTML: ${htmlPath}`);
  console.log(`  PDF:  ${pdfPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
