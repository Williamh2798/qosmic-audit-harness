#!/usr/bin/env npx tsx
console.log(`
Qosmic Audit Harness

SETUP (once):
  npm run key -- sk-ant-your-key

FULL AUDIT → report (.md, .html, .pdf):
  npm run audit -- https://gingerpeople.com

Outputs:
  reports/{slug}_audit.md   ← agent/engineering artifact
  reports/{slug}_audit.html ← browser preview
  reports/{slug}_audit.pdf  ← human deliverable

Re-render HTML + PDF from existing markdown (no LLM):
  npm run digest -- reports/gingerpeople_audit.md

Crawl only (raw JSON, no report):
  npm run crawl -- https://gingerpeople.com
`);
