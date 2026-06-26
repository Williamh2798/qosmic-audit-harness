#!/usr/bin/env npx tsx
/**
 * Turn saved audit JSON into readable markdown (no LLM, no crawl).
 * Usage: npm run digest -- audits/aud_xxx
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { renderReport, storeSlug, type AuditPackage } from "./render-report.js";

const auditDir = process.argv[2];
if (!auditDir) {
  console.error("Usage: npm run digest -- audits/aud_xxx");
  process.exit(1);
}

const root = process.cwd();
const dir = auditDir.startsWith("/") ? auditDir : join(root, auditDir);
const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf-8"));
const pkg: AuditPackage = JSON.parse(await readFile(join(dir, "audit-package.json"), "utf-8"));

const report = renderReport(manifest, pkg);
const slug = storeSlug(manifest.store_url);
await mkdir(join(root, "sample_output"), { recursive: true });
const out = join(root, "sample_output", `${slug}_audit.md`);
await writeFile(out, report);

console.log(`\n📄 Report written: ${out}`);
