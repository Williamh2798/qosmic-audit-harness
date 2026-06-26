/**
 * Pillar diversity analysis for audit reports.
 */

const PILLARS = ["Conversion", "AOV", "Retention", "Acquisition", "Performance"];

export function countPillars(report: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of PILLARS) {
    counts[p] = (report.match(new RegExp(`\\*\\*Pillar:\\*\\*\\s*${p}`, "gi")) || []).length;
  }
  return counts;
}

export function pillarDiversityScore(report: string): number {
  const counts = countPillars(report);
  const present = Object.values(counts).filter((c) => c > 0).length;
  const balanced = Object.values(counts).filter((c) => c >= 2).length;
  return Math.round((present / 5) * 50 + (balanced / 5) * 50);
}
