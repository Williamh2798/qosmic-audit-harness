/**
 * Deterministic HTML report from manifest + audit package (no LLM).
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Experiment } from "./reason-prompt.js";
import type { AuditPackage } from "./render-report.js";
import { STANDARD_TECH_CHECKS } from "./validate-output.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

type Manifest = {
  store_url: string;
  audit_id: string;
  crawled_at?: string;
  technical_checks: { check: string; status: string; detail: string }[];
  funnel_analytics?: {
    funnel_health_score: number;
    buy_path_completeness: number;
    leak_scores: { surface: string; severity: number; affected_traffic_pct: string; description: string; pillar: string }[];
  };
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mdBoldToHtml(s: string): string {
  return escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "pass") return "status-pass";
  if (s === "fail") return "status-fail";
  return "status-warn";
}

function resolveEvidencePath(evidence: string): string {
  const rel = evidence.replace(/^`|`$/g, "").trim();
  if (rel.startsWith("http")) return rel;
  const abs = rel.startsWith("/") ? rel : join(ROOT, rel);
  return `file://${abs}`;
}

function polishCheckDetail(detail: string): string {
  return detail.replace(/in sample\./gi, "in homepage link check.");
}

function normalizeTechnicalChecks(manifest: Manifest) {
  const byName = new Map(manifest.technical_checks.map((r) => [r.check, r]));
  return STANDARD_TECH_CHECKS.map((name) => {
    const row = byName.get(name);
    const base = row ?? { check: name, status: "Warn", detail: "Not evaluated in this crawl pass." };
    return { ...base, detail: polishCheckDetail(base.detail) };
  });
}

function clampThesis(thesis: string, maxWords = 12): string {
  const words = thesis.trim().split(/\s+/);
  if (words.length <= maxWords) return thesis.trim();
  return words.slice(0, maxWords).join(" ");
}

export function renderAuditHtml(manifest: Manifest, pkg: AuditPackage): string {
  const thesis = clampThesis(pkg.thesis);
  const auditDate = manifest.crawled_at
    ? new Date(manifest.crawled_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const fa = manifest.funnel_analytics;
  const sortedExps = [...pkg.experiments].sort((a, b) => b.priority_score - a.priority_score);

  const funnelRows =
    pkg.funnel_diagnosis_rows && pkg.funnel_diagnosis_rows.length > 0
      ? pkg.funnel_diagnosis_rows
      : (fa?.leak_scores.slice(0, 6) ?? []).map((l) => ({
          stage: l.surface,
          health: `Severity ${l.severity}/5`,
          gap: l.description.slice(0, 80),
          session_impact: l.affected_traffic_pct,
        }));

  const experimentCards = sortedExps
    .map((exp) => renderExperimentCard(exp))
    .join("\n");

  const techRows = normalizeTechnicalChecks(manifest)
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.check)}</td><td class="${statusClass(r.status)}">${escapeHtml(r.status)}</td><td>${escapeHtml(r.detail)}</td></tr>`
    )
    .join("\n");

  const priorityRows = sortedExps
    .map(
      (exp, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(exp.exp_id)}</td><td>${escapeHtml(exp.expected_lift)}</td><td>${escapeHtml(exp.implementation_effort)}</td><td>${exp.priority_score}</td><td>${escapeHtml(exp.title.slice(0, 50))}</td></tr>`
    )
    .join("\n");

  const competitorRows = pkg.competitors
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c.competitor)}</td><td>${escapeHtml(c.domain)}</td><td>${escapeHtml(c.positioning)}</td><td>${escapeHtml(c.easier)}</td><td>${escapeHtml(c.edge)}</td><td>${escapeHtml(c.pattern)}</td></tr>`
    )
    .join("\n");

  const funnelTableRows = funnelRows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.stage)}</td><td>${escapeHtml(r.health)}</td><td>${escapeHtml(r.gap)}</td><td>${escapeHtml(r.session_impact)}</td></tr>`
    )
    .join("\n");

  const events = (pkg.analytics_instrumentation ?? [])
    .map((e) => `<li><code>${escapeHtml(e)}</code></li>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(pkg.store_name)} — Qosmic Audit</title>
  <style id="qosmic-audit-css">/* CSS injected at write time */</style>
</head>
<body>
  <section class="cover">
    <div class="store-name">${escapeHtml(pkg.store_name)}</div>
    <p class="thesis">${escapeHtml(thesis)}</p>
    <p class="meta">Qosmic CRO Audit · ${escapeHtml(auditDate)}</p>
    ${
      fa
        ? `<div class="score-badge">Funnel health ${fa.funnel_health_score}/100 · Buy path ${fa.buy_path_completeness}%</div>`
        : ""
    }
  </section>

  <h2>Executive summary</h2>
  ${pkg.executive_summary.map((p) => `<p>${mdBoldToHtml(p)}</p>`).join("\n")}

  <h2>Funnel diagnosis</h2>
  ${
    fa
      ? `<p><strong>Funnel health score:</strong> ${fa.funnel_health_score}/100 · <strong>Buy path completeness:</strong> ${fa.buy_path_completeness}%</p>`
      : ""
  }
  <table>
    <thead><tr><th>Stage</th><th>Health</th><th>Gap</th><th>Est. session impact</th></tr></thead>
    <tbody>${funnelTableRows}</tbody>
  </table>

  <h2>Experiment priority matrix</h2>
  <table>
    <thead><tr><th>Rank</th><th>Experiment</th><th>Lift</th><th>Effort</th><th>Priority</th><th>Why now</th></tr></thead>
    <tbody>${priorityRows}</tbody>
  </table>

  ${
    events
      ? `<h2>Analytics instrumentation</h2><p>Events to add before testing:</p><ul class="events">${events}</ul>`
      : ""
  }

  <h2>Proposed experiments</h2>
  ${experimentCards}

  <h2>Competitor analysis</h2>
  <p>${escapeHtml(pkg.competitor_intro)}</p>
  <table>
    <thead><tr><th>Competitor</th><th>Domain</th><th>Positioning</th><th>What they make easier</th><th>${escapeHtml(pkg.store_name)} edge</th><th>Pattern to adapt</th></tr></thead>
    <tbody>${competitorRows}</tbody>
  </table>

  <h2>Technical checks</h2>
  <table>
    <thead><tr><th>Check</th><th>Status</th><th>Detail</th></tr></thead>
    <tbody>${techRows}</tbody>
  </table>
</body>
</html>`;
}

function renderExperimentCard(exp: Experiment): string {
  const imgSrc = resolveEvidencePath(exp.evidence);
  return `<article class="experiment-card">
  <h3><span class="pillar-badge">${escapeHtml(exp.pillar)}</span>${escapeHtml(exp.exp_id)} — ${escapeHtml(exp.title)} <span class="priority-score">Priority ${exp.priority_score}</span></h3>
  <img class="evidence-img" src="${escapeHtml(imgSrc)}" alt="Evidence for ${escapeHtml(exp.title)}" />
  <p><strong>Affected surface:</strong> ${escapeHtml(exp.affected_surface)} · <a href="${escapeHtml(exp.url)}">${escapeHtml(exp.url)}</a></p>
  <p><strong>Hypothesis:</strong> ${escapeHtml(exp.hypothesis)}</p>
  <p><strong>Primary change:</strong> ${escapeHtml(exp.primary_change)}</p>
  <dl class="grid-2">
    <dt>Primary KPI</dt><dd>${escapeHtml(exp.primary_kpi)}</dd>
    <dt>Secondary KPI</dt><dd>${escapeHtml(exp.secondary_kpi)}</dd>
    <dt>Decision rule</dt><dd>${escapeHtml(exp.decision_rule)}</dd>
    <dt>Expected lift</dt><dd>${escapeHtml(exp.expected_lift)}</dd>
    <dt>Confidence</dt><dd>${exp.confidence}%</dd>
    <dt>Effort</dt><dd>${escapeHtml(exp.implementation_effort)} · ${exp.test_duration_weeks} weeks · MDE ${escapeHtml(exp.minimum_detectable_effect)}</dd>
    <dt>Analytics events</dt><dd>${escapeHtml(exp.analytics_events.join(", "))}</dd>
  </dl>
</article>`;
}

export async function writeAuditHtml(
  manifest: Manifest,
  pkg: AuditPackage,
  outPath: string
): Promise<void> {
  const { writeFile } = await import("node:fs/promises");
  let html = renderAuditHtml(manifest, pkg);
  const css = await readFile(join(ROOT, "templates", "audit-report.css"), "utf-8");
  html = html.replace("/* CSS injected at write time */", css);
  await writeFile(outPath, html, "utf-8");
}

export { clampThesis };
