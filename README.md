# Qosmic Audit Harness

Clone, install, run. No cookies, no API keys, no manual setup beyond Node.js.

## Quick start

```bash
npm install

# 1. Save your key (one time)
npm run key -- sk-ant-your-key-here

# 2. Run an audit
npm run report -- https://gingerpeople.com
```

Output: `audits/{audit_id}/manifest.json` + screenshots + `sample_output/{store}_audit.md`

### Without an API key

Crawl only, then use a coding agent with `AGENTS.md`:

```bash
npm run audit -- https://gingerpeople.com
# Open Cursor Agent → "Run full audit per AGENTS.md for audits/aud_xxx"
```

## Full audit workflow

**Automated** (`npm run report`):

1. **Crawl** — Playwright captures surfaces + screenshots
2. **Reason** — LLM reads manifest, writes `experiments.json`
3. **Write** — deterministic template → `sample_output/{store}_audit.md`
4. **Eval** — `npm run eval` scores the report

**Manual** (Cursor / Claude Code / Codex reads `AGENTS.md`):

1. **Crawl** — `npm run crawl -- <url>`
2. **Reason** — agent reads manifest + screenshots, writes `experiments.json`
3. **Write** — agent produces `sample_output/{store}_audit.md`
4. **Eval** — `npm run eval -- <report.md> --manifest <manifest>`

## Crawl behavior

The crawler is built to work out of the box for anyone:

| Feature | What it does |
|---------|----------------|
| **Stealth mode** | `playwright-extra` + anti-bot fingerprint masking |
| **Click-only nav** | Navigates by clicking links from homepage (not direct URL loads) |
| **Sitemap discovery** | Pulls URLs from `sitemap.xml` when nav links are sparse |
| **Auto-retry** | If >30% of pages hit WAF, retries with real Chrome (headed) |
| **WAF detection** | Marks Cloudflare blocks in manifest; honest technical checks |

For aggressive bot protection (e.g. some Cloudflare configs), the crawl may still partially block. The harness documents this — it does not fake results.

Optional: force visible browser (sometimes helps locally):

```bash
npm run crawl -- https://gingerpeople.com --headed
```

## Requirements

- Node.js 18+
- macOS / Linux / Windows
- ~200MB for Chromium (installed automatically)

## Structure

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Entry contract for any coding agent |
| `.cursor/skills/qosmic-*/` | Skills: Crawl, Reason, Write |
| `scripts/crawl.ts` | Playwright crawl + technical checks |
| `scripts/full-audit.ts` | One-command: crawl → LLM reason → report → eval |
| `eval/` | Structural + rubric eval CLI |
| `sample_output/` | Example audits (gingerpeople + zenrojas) |

## Test stores

- **zenrojas.com** — DTC; crawls fully automated
- **gingerpeople.com** — retailer-routed; may hit WAF (auto-retry included)

## Docs

- `AGENT_LOG.md` — build log and delegation notes
- `EVAL_LOOP.md` — how evals become self-improving
- `WORKFLOWS.md` — day-to-day agent workflow
