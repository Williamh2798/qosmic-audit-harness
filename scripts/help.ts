#!/usr/bin/env npx tsx
console.log(`
Qosmic Audit Harness — pass any Shopify URL

ONE COMMAND (crawl + report + eval):
  npm run report -- https://zenrojas.com
  npm run report -- https://gingerpeople.com

  Requires OPENAI_API_KEY or ANTHROPIC_API_KEY in your environment.

CRAWL ONLY (no API key):
  npm run audit -- https://gingerpeople.com
  npm run audit -- https://gingerpeople.com --headed

Then use Cursor Agent + AGENTS.md for Reason + Write, or re-run with API key.

EVAL:
  npm run eval -- sample_output/zenrojas_audit.md --manifest audits/aud_xxx/manifest.json

Or:
  ./run.sh https://zenrojas.com          # full report if API key set
  ./run.sh crawl https://zenrojas.com    # crawl only
`);
