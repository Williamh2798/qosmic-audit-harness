/**
 * Rubric-based eval — heuristic scoring without LLM (portable fallback).
 * With OPENAI_API_KEY, can extend to LLM-as-judge.
 */

export type RubricDimension =
  | "evidence_grounding"
  | "hypothesis_quality"
  | "pillar_diversity"
  | "executive_coherence"
  | "competitor_relevance"
  | "technical_honesty";

export type RubricScore = {
  dimension: RubricDimension;
  score: number;
  rationale: string;
};

export function runHeuristicRubric(report: string): RubricScore[] {
  const scores: RubricScore[] = [];

  const evidenceLines = report.match(/\*\*Evidence:\*\*[^\n]+/gi) || [];
  const grounded = evidenceLines.filter((e) => /audits\/|https?:\/\//i.test(e)).length;
  const speculation = (report.match(/\b(likely|probably|might|could be|seems)\b/gi) || []).length;
  scores.push({
    dimension: "evidence_grounding",
    score: Math.min(5, Math.round((grounded / Math.max(evidenceLines.length, 1)) * 5 - speculation * 0.2)),
    rationale: `${grounded}/${evidenceLines.length} evidence lines grounded; ${speculation} speculative terms`,
  });

  const hypotheses = report.match(/\*\*Hypothesis:\*\*[^\n]+/gi) || [];
  const withBecause = hypotheses.filter((h) => /because|by converting|improves by/i.test(h)).length;
  const hasFunnelDiagnosis = /##\s*Funnel diagnosis/i.test(report);
  const hasPriorityMatrix = /##\s*Experiment priority matrix/i.test(report);
  const hasSecondaryKpi = (report.match(/\*\*Secondary KPI:\*\*/gi) || []).length;
  const hasEffort = (report.match(/\*\*Implementation effort:\*\*/gi) || []).length;
  scores.push({
    dimension: "hypothesis_quality",
    score: Math.min(
      5,
      Math.round((withBecause / Math.max(hypotheses.length, 1)) * 4) +
        (hasFunnelDiagnosis ? 1 : 0)
    ),
    rationale: `${withBecause}/${hypotheses.length} hypotheses causal; funnel diagnosis=${hasFunnelDiagnosis}; priority matrix=${hasPriorityMatrix}; secondary KPIs=${hasSecondaryKpi}; effort tags=${hasEffort}`,
  });

  const pillars = ["Conversion", "AOV", "Retention", "Acquisition", "Performance"];
  const pillarHits = pillars.filter((p) =>
    new RegExp(`\\*\\*Pillar:\\*\\*\\s*${p}`, "i").test(report)
  ).length;
  scores.push({
    dimension: "pillar_diversity",
    score: Math.min(5, Math.round((pillarHits / 5) * 5)),
    rationale: `${pillarHits}/5 pillars represented`,
  });

  const exec = report.split(/##\s*Executive summary/i)[1]?.split(/##\s*Funnel diagnosis/i)[0] || "";
  const expTitles = (report.match(/###\s*exp-[^—]+—\s*([^\n]+)/gi) || []).map((t) => t.toLowerCase());
  const execWords = exec.toLowerCase();
  const overlap = expTitles.filter((t) => {
    const words = t.replace(/###\s*exp-[^—]+—\s*/i, "").split(/\s+/).slice(0, 3);
    return words.some((w) => w.length > 4 && execWords.includes(w));
  }).length;
  scores.push({
    dimension: "executive_coherence",
    score: Math.min(5, Math.max(2, Math.round((overlap / Math.max(expTitles.length, 1)) * 5) + 1)),
    rationale: `Executive summary overlaps ${overlap} experiment themes`,
  });

  const competitorSection = report.split(/##\s*Competitor analysis/i)[1]?.split(/##\s*Technical checks/i)[0] || "";
  const domains = competitorSection.match(/[a-z0-9-]+\.(com|co|net|org)/gi) || [];
  scores.push({
    dimension: "competitor_relevance",
    score: Math.min(5, domains.length >= 3 ? 4 : domains.length >= 2 ? 3 : 2),
    rationale: `${domains.length} competitor domains cited`,
  });

  const techSection = report.split(/##\s*Technical checks/i)[1] || "";
  const warns = (techSection.match(/\|\s*Warn\s*\|/gi) || []).length;
  const fails = (techSection.match(/\|\s*Fail\s*\|/gi) || []).length;
  const passes = (techSection.match(/\|\s*Pass\s*\|/gi) || []).length;
  const hasHonestWarn = /not (inspected|performed|evaluated)|no lighthouse/i.test(techSection);
  scores.push({
    dimension: "technical_honesty",
    score: Math.min(5, (hasHonestWarn ? 4 : 3) + (fails > 0 ? 1 : 0)),
    rationale: `Pass=${passes} Warn=${warns} Fail=${fails}; honest gaps=${hasHonestWarn}`,
  });

  return scores.map((s) => ({
    ...s,
    score: Math.max(0, Math.min(5, s.score)),
  }));
}

export async function runLlmRubric(report: string): Promise<RubricScore[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Score the audit report on 6 dimensions 0-5. Return JSON: { scores: [{ dimension, score, rationale }] }. Dimensions: evidence_grounding, hypothesis_quality, pillar_diversity, executive_coherence, competitor_relevance, technical_honesty.",
          },
          { role: "user", content: report.slice(0, 12000) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    const parsed = JSON.parse(data.choices[0].message.content) as {
      scores: RubricScore[];
    };
    return parsed.scores;
  } catch {
    return null;
  }
}

export function rubricAverage(scores: RubricScore[]): number {
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((a, s) => a + s.score, 0) / scores.length) * 20);
}
