/**
 * Deterministic Write phase — experiments.json + manifest → audit markdown.
 */

export type Experiment = {
  exp_id: string;
  title: string;
  pillar: string;
  affected_surface: string;
  url: string;
  evidence: string;
  hypothesis: string;
  primary_change: string;
  primary_kpi: string;
  decision_rule: string;
  expected_lift: string;
  confidence: number;
};

export type CompetitorRow = {
  competitor: string;
  domain: string;
  positioning: string;
  easier: string;
  edge: string;
  pattern: string;
};

export type AuditPackage = {
  store_name: string;
  thesis: string;
  executive_summary: [string, string, string];
  experiments: Experiment[];
  competitor_intro: string;
  competitors: CompetitorRow[];
};

import { STANDARD_TECH_CHECKS } from "./validate-output.js";

type Manifest = {
  store_url: string;
  audit_id: string;
  technical_checks: { check: string; status: string; detail: string }[];
};

function normalizeTechnicalChecks(
  manifest: Manifest
): { check: string; status: string; detail: string }[] {
  const byName = new Map(manifest.technical_checks.map((r) => [r.check, r]));
  return STANDARD_TECH_CHECKS.map((name) => {
    const row = byName.get(name);
    return (
      row ?? {
        check: name,
        status: "Warn",
        detail: "Not evaluated in this crawl pass.",
      }
    );
  });
}

export function storeSlug(storeUrl: string): string {
  try {
    const host = new URL(storeUrl).hostname.replace(/^www\./, "");
    return host.split(".")[0] || "store";
  } catch {
    return "store";
  }
}

export function renderReport(manifest: Manifest, pkg: AuditPackage): string {
  const lines: string[] = [];

  lines.push(`# ${pkg.store_name} audit — ${pkg.thesis}`);
  lines.push("");
  lines.push("## Executive summary");
  lines.push("");
  for (const para of pkg.executive_summary) {
    lines.push(para);
    lines.push("");
  }

  lines.push("## Proposed experiments");
  lines.push("");

  for (const exp of pkg.experiments) {
    lines.push(`### ${exp.exp_id} — ${exp.title}`);
    lines.push("");
    lines.push(`**Pillar:** ${exp.pillar}`);
    lines.push(`**Affected surface:** ${exp.affected_surface}`);
    lines.push(`**URL:** ${exp.url}`);
    lines.push(`**Evidence:** \`${exp.evidence}\``);
    lines.push(`**Hypothesis:** ${exp.hypothesis}`);
    lines.push(`**Primary change:** ${exp.primary_change}`);
    lines.push(`**Primary KPI:** ${exp.primary_kpi}`);
    lines.push(`**Decision rule:** ${exp.decision_rule}`);
    lines.push(`**Expected lift:** ${exp.expected_lift}`);
    lines.push(`**Confidence:** ${exp.confidence}%`);
    lines.push("");
  }

  lines.push("## Competitor analysis");
  lines.push("");
  lines.push(pkg.competitor_intro);
  lines.push("");
  lines.push(
    "| Competitor | Domain | Positioning | What they make easier | " +
      `${pkg.store_name} edge | Pattern to adapt |`
  );
  lines.push("|---|---|---|---|---|---|");
  for (const c of pkg.competitors) {
    lines.push(
      `| ${c.competitor} | ${c.domain} | ${c.positioning} | ${c.easier} | ${c.edge} | ${c.pattern} |`
    );
  }
  lines.push("");

  lines.push("## Technical checks");
  lines.push("");
  lines.push("| Check | Status | Detail |");
  lines.push("|---|---|---|");
  for (const row of normalizeTechnicalChecks(manifest)) {
    lines.push(`| ${row.check} | ${row.status} | ${row.detail} |`);
  }
  lines.push("");

  return lines.join("\n");
}
