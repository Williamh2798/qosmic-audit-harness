/**
 * Deterministic Write phase — experiments.json + manifest → audit markdown.
 */

import type { Experiment } from "./reason-prompt.js";

export type { Experiment };

export type CompetitorRow = {
  competitor: string;
  domain: string;
  positioning: string;
  easier: string;
  edge: string;
  pattern: string;
};

export type FunnelDiagnosisRow = {
  stage: string;
  health: string;
  gap: string;
  session_impact: string;
};

export type AuditPackage = {
  store_name: string;
  thesis: string;
  executive_summary: [string, string, string];
  funnel_diagnosis_rows?: FunnelDiagnosisRow[];
  analytics_instrumentation?: string[];
  experiments: Experiment[];
  competitor_intro: string;
  competitors: CompetitorRow[];
};

import { STANDARD_TECH_CHECKS } from "./validate-output.js";

type Manifest = {
  store_url: string;
  audit_id: string;
  technical_checks: { check: string; status: string; detail: string }[];
  funnel_analytics?: {
    funnel_health_score: number;
    buy_path_completeness: number;
    leak_scores: { surface: string; severity: number; affected_traffic_pct: string; description: string; pillar: string }[];
  };
};

function polishCheckDetail(detail: string): string {
  return detail.replace(/in sample\./gi, "in homepage link check.");
}

function normalizeTechnicalChecks(
  manifest: Manifest
): { check: string; status: string; detail: string }[] {
  const byName = new Map(manifest.technical_checks.map((r) => [r.check, r]));
  return STANDARD_TECH_CHECKS.map((name) => {
    const row = byName.get(name);
    const base =
      row ?? {
        check: name,
        status: "Warn",
        detail: "Not evaluated in this crawl pass.",
      };
    return { ...base, detail: polishCheckDetail(base.detail) };
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

function renderFunnelDiagnosis(
  pkg: AuditPackage,
  manifest: Manifest
): string[] {
  const lines: string[] = [];
  lines.push("## Funnel diagnosis");
  lines.push("");
  const fa = manifest.funnel_analytics;
  if (fa) {
    lines.push(
      `**Funnel health score:** ${fa.funnel_health_score}/100 | **Buy path completeness:** ${fa.buy_path_completeness}%`
    );
    lines.push("");
  }
  lines.push("| Stage | Health | Gap | Est. session impact |");
  lines.push("|---|---|---|---|");

  const rows = pkg.funnel_diagnosis_rows ?? [];
  if (rows.length > 0) {
    for (const r of rows) {
      lines.push(`| ${r.stage} | ${r.health} | ${r.gap} | ${r.session_impact} |`);
    }
  } else if (fa?.leak_scores.length) {
    for (const l of fa.leak_scores.slice(0, 6)) {
      lines.push(
        `| ${l.surface} | Severity ${l.severity}/5 | ${l.description.slice(0, 60)} | ${l.affected_traffic_pct} |`
      );
    }
  }
  lines.push("");
  return lines;
}

function renderPriorityMatrix(experiments: Experiment[]): string[] {
  const lines: string[] = [];
  lines.push("## Experiment priority matrix");
  lines.push("");
  lines.push("| Rank | Experiment | Lift | Effort | Priority | Why now |");
  lines.push("|---|---|---|---|---|---|");
  const sorted = [...experiments].sort((a, b) => b.priority_score - a.priority_score);
  sorted.forEach((exp, i) => {
    lines.push(
      `| ${i + 1} | ${exp.exp_id} | ${exp.expected_lift} | ${exp.implementation_effort} | ${exp.priority_score} | ${exp.title.slice(0, 50)} |`
    );
  });
  lines.push("");
  return lines;
}

function renderAnalyticsInstrumentation(events: string[]): string[] {
  const lines: string[] = [];
  lines.push("## Analytics instrumentation");
  lines.push("");
  lines.push("Events to add before testing:");
  lines.push("");
  for (const e of events) {
    lines.push(`- \`${e}\``);
  }
  lines.push("");
  return lines;
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

  lines.push(...renderFunnelDiagnosis(pkg, manifest));
  lines.push(...renderPriorityMatrix(pkg.experiments));

  if (pkg.analytics_instrumentation?.length) {
    lines.push(...renderAnalyticsInstrumentation(pkg.analytics_instrumentation));
  }

  lines.push("## Proposed experiments");
  lines.push("");

  const sortedExps = [...pkg.experiments].sort((a, b) => b.priority_score - a.priority_score);
  for (const exp of sortedExps) {
    lines.push(`### ${exp.exp_id} — ${exp.title}`);
    lines.push("");
    lines.push(`**Pillar:** ${exp.pillar}`);
    lines.push(`**Affected surface:** ${exp.affected_surface}`);
    lines.push(`**URL:** ${exp.url}`);
    lines.push(`**Evidence:** \`${exp.evidence}\``);
    lines.push(`**Hypothesis:** ${exp.hypothesis}`);
    lines.push(`**Primary change:** ${exp.primary_change}`);
    lines.push(`**Primary KPI:** ${exp.primary_kpi}`);
    lines.push(`**Secondary KPI:** ${exp.secondary_kpi}`);
    lines.push(`**Decision rule:** ${exp.decision_rule}`);
    lines.push(`**Expected lift:** ${exp.expected_lift}`);
    lines.push(`**Confidence:** ${exp.confidence}%`);
    lines.push(`**Implementation effort:** ${exp.implementation_effort}`);
    lines.push(`**Test duration:** ${exp.test_duration_weeks} weeks`);
    lines.push(`**Minimum detectable effect:** ${exp.minimum_detectable_effect}`);
    lines.push(`**Priority score:** ${exp.priority_score}`);
    lines.push(`**Analytics events:** ${exp.analytics_events.join(", ")}`);
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

/** Append crawl technical checks (LLM must not invent these). */
export function appendTechnicalChecks(
  reportBody: string,
  manifest: Manifest
): string {
  const stripped = reportBody.replace(/\n##\s*Technical checks[\s\S]*$/i, "").trim();
  const lines = [stripped, "", "## Technical checks", "", "| Check | Status | Detail |", "|---|---|---|"];
  for (const row of normalizeTechnicalChecks(manifest)) {
    lines.push(`| ${row.check} | ${row.status} | ${row.detail} |`);
  }
  lines.push("");
  return lines.join("\n");
}
