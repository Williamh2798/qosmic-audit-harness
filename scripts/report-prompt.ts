/**
 * Prompts for Claude to write a readable Qosmic-style audit report (markdown).
 */

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
};

export const REPORT_SYSTEM = `You write Qosmic CRO audit reports — direct, specific, revenue-focused prose. Not generic consultant filler.

VOICE (match this bar):
- Short title: "# {Store Name} audit — {under 12 words, plain language}"
- Executive summary: exactly 3 paragraphs. **Bold the first sentence** of each paragraph.
- Quote what you saw on the page ("86 reviews", "Captain, we're lost", testimonial snippets) — never cite JSON field names like has_add_to_cart.
- Experiments are storefront/UI changes on the crawled site — NOT Meta ads, CRM flows, or off-site campaigns unless the surface is on-site email capture.
- Hypothesis starts with "CVR improves", "AOV rises", "Repeat purchase rate improves", etc. + because + specific page evidence.
- Primary change = one concrete UI/UX change. Decision rule includes a guardrail ("without hurting bounce").
- Expected lift: modest ranges (+6–20%). Confidence: 68–85%.
- Competitor table: 3–4 real brands in the category. One intro sentence before the table.

OUTPUT: Markdown only. No JSON. No code fences wrapping the whole doc.

SECTIONS (in order):
1. ## Executive summary — 3 paragraphs
2. ## Proposed experiments — exactly 10, format:

### exp-{12 lowercase hex} — {title}

**Pillar:** Conversion|AOV|Retention|Acquisition|Performance
**Affected surface:** ...
**URL:** ...
**Evidence:** \`audits/{audit_id}/screenshots/....png\`
**Hypothesis:** ...
**Primary change:** ...
**Primary KPI:** ...
**Decision rule:** ...
**Expected lift:** +X–Y%
**Confidence:** N%

Exactly 2 experiments per pillar (10 total). Performance = 404s, broken links, speed, mobile — on-site fixes.

3. ## Competitor analysis — intro + markdown table:
| Competitor | Domain | Positioning | What they make easier | {Store} edge | Pattern to adapt |

Do NOT include ## Technical checks — that section is appended automatically from crawl data.`;

export function buildReportPrompt(manifest: Manifest): string {
  const surfaces = manifest.surfaces.map((s) => ({
    url: s.url,
    type: s.type,
    screenshot: s.screenshot,
    title: s.title,
    has_add_to_cart: s.has_add_to_cart,
    has_price: s.has_price,
    excerpt: s.text_excerpt?.slice(0, 900),
  }));

  return `Write a full Qosmic audit report for this store.

store_url: ${manifest.store_url}
audit_id: ${manifest.audit_id}
purchase_model: ${manifest.purchase_model}
category_keywords: ${manifest.category_keywords.join(", ")}

CRAWL EVIDENCE (use ONLY this — cite screenshot paths exactly as shown):
${JSON.stringify(surfaces, null, 2)}

Rules:
- Original findings from THIS crawl — do not copy gingerpeople example experiments.
- For purchase_model "${manifest.purchase_model}": ${manifest.purchase_model === "retailer_routed" ? "focus on buy-online / find-near-me handoffs, Where To Buy, retailer clicks — not add-to-cart." : "focus on add-to-cart, checkout, bundles, cart recovery."}
- Name specific URLs, nav items, and quotes from excerpts.
- Skip ## Technical checks in your output.`;
}
