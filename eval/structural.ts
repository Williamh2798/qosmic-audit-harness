/**
 * Structural eval — deterministic checks on audit reports.
 */

export type CheckResult = {
  name: string;
  pass: boolean;
  detail: string;
};

const PILLARS = ["Conversion", "AOV", "Retention", "Acquisition", "Performance"] as const;
const REQUIRED_EXP_FIELDS = [
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

export function runStructuralEval(report: string, manifestPath?: string): CheckResult[] {
  const results: CheckResult[] = [];

  const hasExec = /##\s*Executive summary/i.test(report);
  results.push({
    name: "executive_summary_section",
    pass: hasExec,
    detail: hasExec ? "Executive summary present" : "Missing executive summary",
  });

  const hasExperiments = /##\s*Proposed experiments/i.test(report);
  results.push({
    name: "experiments_section",
    pass: hasExperiments,
    detail: hasExperiments ? "Proposed experiments section present" : "Missing experiments section",
  });

  const hasCompetitors = /##\s*Competitor analysis/i.test(report);
  results.push({
    name: "competitor_section",
    pass: hasCompetitors,
    detail: hasCompetitors ? "Competitor analysis present" : "Missing competitor analysis",
  });

  const hasTechnical = /##\s*Technical checks/i.test(report);
  results.push({
    name: "technical_section",
    pass: hasTechnical,
    detail: hasTechnical ? "Technical checks present" : "Missing technical checks",
  });

  const expIds = report.match(/###\s*exp-[a-f0-9]{12}/gi) || [];
  const uniqueExpIds = [...new Set(expIds.map((x) => x.toLowerCase()))];
  results.push({
    name: "experiment_count",
    pass: uniqueExpIds.length === 10,
    detail: `Found ${uniqueExpIds.length}/10 experiments`,
  });

  const invalidIds = (report.match(/###\s*exp-[^\s]+/gi) || []).filter(
    (id) => !/^###\s*exp-[a-f0-9]{12}$/i.test(id.trim())
  );
  results.push({
    name: "experiment_id_format",
    pass: invalidIds.length === 0,
    detail:
      invalidIds.length === 0
        ? "All exp IDs match exp-{12hex}"
        : `Invalid IDs: ${invalidIds.slice(0, 3).join(", ")}`,
  });

  for (const pillar of PILLARS) {
    const re = new RegExp(`\\*\\*Pillar:\\*\\*\\s*${pillar}`, "i");
    const count = (report.match(re) || []).length;
    results.push({
      name: `pillar_${pillar.toLowerCase()}`,
      pass: count >= 1,
      detail: `${pillar}: ${count} experiment(s)`,
    });
  }

  const pillarCounts = PILLARS.map(
    (p) => (report.match(new RegExp(`\\*\\*Pillar:\\*\\*\\s*${p}`, "gi")) || []).length
  );
  results.push({
    name: "pillar_diversity_ideal",
    pass: pillarCounts.every((c) => c >= 2),
    detail: `Per-pillar counts: ${PILLARS.map((p, i) => `${p}=${pillarCounts[i]}`).join(", ")}`,
  });

  const experimentBlocks = report.split(/###\s*exp-/i).slice(1);
  let fieldsOk = 0;
  for (const block of experimentBlocks.slice(0, 10)) {
    const missing = REQUIRED_EXP_FIELDS.filter((f) => !block.includes(f));
    if (missing.length === 0) fieldsOk++;
  }
  results.push({
    name: "experiment_required_fields",
    pass: fieldsOk === 10,
    detail: `${fieldsOk}/10 experiments have all required fields`,
  });

  const evidenceRefs = report.match(/\*\*Evidence:\*\*[^\n]+/gi) || [];
  const grounded = evidenceRefs.filter(
    (e) => /audits\/|https?:\/\//i.test(e)
  ).length;
  results.push({
    name: "evidence_citations",
    pass: grounded === evidenceRefs.length && evidenceRefs.length >= 10,
    detail: `${grounded}/${evidenceRefs.length} evidence lines cite audits/ or URL`,
  });

  const techRows = (report.match(/\|\s*[^|]+\s*\|\s*(Pass|Warn|Fail)\s*\|/gi) || []).length;
  results.push({
    name: "technical_check_rows",
    pass: techRows >= 15,
    detail: `${techRows} technical check rows (need ≥15)`,
  });

  const execParagraphs = (report.split(/##\s*Executive summary/i)[1]?.split(/##\s*Proposed experiments/i)[0] || "")
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 80).length;
  results.push({
    name: "executive_summary_length",
    pass: execParagraphs >= 2,
    detail: `${execParagraphs} substantive executive paragraphs`,
  });

  const competitorRows = (report.match(/\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|/g) || []).length;
  results.push({
    name: "competitor_table_rows",
    pass: competitorRows >= 4,
    detail: `${Math.max(0, competitorRows - 1)} competitor rows (need 3–4)`,
  });

  if (manifestPath) {
    results.push({
      name: "manifest_reference",
      pass: /audits\/aud_[a-f0-9]+/i.test(report),
      detail: "Report references audit artifact paths",
    });
  }

  return results;
}

export function structuralScore(results: CheckResult[]): number {
  const passed = results.filter((r) => r.pass).length;
  return Math.round((passed / results.length) * 100);
}
