#!/usr/bin/env npx tsx
/**
 * Qosmic audit eval CLI
 * Usage: npm run eval -- reports/zenrojas_audit.md --manifest audits/aud_xxx/manifest.json
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { runStructuralEval, structuralScore } from "./structural.js";
import { runHeuristicRubric, runLlmRubric, rubricAverage } from "./rubric.js";
import { runRegressionCheck } from "./regression.js";
import { pillarDiversityScore } from "./pillar-diversity.js";

async function main() {
  const args = process.argv.slice(2);
  const reportPath = args[0];
  const manifestIdx = args.indexOf("--manifest");
  const manifestPath = manifestIdx >= 0 ? args[manifestIdx + 1] : undefined;

  if (!reportPath) {
    console.error("Usage: npm run eval -- <report.md> [--manifest audits/aud_xxx/manifest.json]");
    process.exit(1);
  }

  const report = await readFile(reportPath, "utf-8");
  let storeUrl: string | undefined;
  let manifestData: { store_url?: string; funnel_analytics?: { leak_scores?: { severity: number }[] } } | undefined;
  if (manifestPath) {
    try {
      manifestData = JSON.parse(await readFile(manifestPath, "utf-8")) as typeof manifestData;
      storeUrl = manifestData?.store_url;
    } catch {
      /* ignore */
    }
  }

  const structural = runStructuralEval(report, manifestPath, manifestData, reportPath);
  const structuralPassed = structural.filter((r) => r.pass).length;
  const structuralTotal = structural.length;
  const structScore = structuralScore(structural);

  const llmRubric = await runLlmRubric(report);
  const rubric = llmRubric ?? runHeuristicRubric(report);
  const rubricMode = llmRubric ? "llm" : "heuristic";
  const rubricScore = rubricAverage(rubric);

  const regression = runRegressionCheck(report, storeUrl);
  const pillarScore = pillarDiversityScore(report);

  const overall = Math.round(structScore * 0.45 + rubricScore * 0.4 + pillarScore * 0.15);
  const failures = structural.filter((r) => !r.pass).map((r) => r.name);

  const result = {
    report: reportPath,
    manifest: manifestPath,
    evaluated_at: new Date().toISOString(),
    structural: {
      passed: structuralPassed,
      total: structuralTotal,
      score: structScore,
      checks: structural,
      failures,
    },
    rubric: {
      mode: rubricMode,
      score: rubricScore,
      dimensions: rubric,
    },
    pillar_diversity_score: pillarScore,
    regression,
    overall,
    verdict: overall >= 70 && failures.length <= 2 ? "PASS" : "FAIL",
    suggested_patches: failures.map((f) => {
      const patches: Record<string, string> = {
        pillar_retention: "Add Retention experiments (routines, reorder, subscription) in qosmic-reason skill",
        pillar_acquisition: "Add Acquisition landing-page experiments in qosmic-reason skill",
        experiment_count: "Ensure exactly 10 experiments with unique exp-{12hex} IDs",
        evidence_citations: "Every experiment must cite audits/{id}/screenshots/ path from manifest",
        technical_check_rows: "Import all 15 technical checks from manifest.json",
      };
      return patches[f] ?? `Fix structural check: ${f}`;
    }),
  };

  const outDir = join(process.cwd(), "eval", "results");
  await mkdir(outDir, { recursive: true });
  const outFile = join(
    outDir,
    `${basename(reportPath, ".md")}_${Date.now()}.json`
  );
  await writeFile(outFile, JSON.stringify(result, null, 2));

  console.log(`\n=== Qosmic Eval: ${reportPath} ===\n`);
  console.log(`STRUCTURAL: ${structuralPassed}/${structuralTotal} PASS (${structScore}%)`);
  if (failures.length) console.log(`  FAIL: ${failures.join(", ")}`);
  console.log(`\nRUBRIC (${rubricMode}): ${rubricScore}/100`);
  for (const d of rubric) {
    console.log(`  ${d.dimension}: ${d.score}/5 — ${d.rationale}`);
  }
  if (regression) {
    console.log(`\nREGRESSION (gingerpeople): ${regression.detail}`);
  }
  console.log(`\nPILLAR DIVERSITY: ${pillarScore}/100`);
  console.log(`\nOVERALL: ${overall}/100 — ${result.verdict}`);
  if (result.suggested_patches.length) {
    console.log(`\nSuggested patches:`);
    result.suggested_patches.forEach((p) => console.log(`  - ${p}`));
  }
  console.log(`\nResults: ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
