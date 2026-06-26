#!/usr/bin/env npx tsx
console.log(`
Qosmic Audit Harness

SETUP (once):
  npm run key -- sk-ant-your-key

FULL AUDIT → readable report (.md):
  npm run audit -- https://gingerpeople.com

Output: sample_output/gingerpeople_audit.md  ← open THIS

Crawl only (raw JSON, no report):
  npm run crawl -- https://gingerpeople.com
`);
