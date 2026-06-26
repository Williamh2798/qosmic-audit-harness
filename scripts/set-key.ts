#!/usr/bin/env npx tsx
/**
 * Save API key to .env (gitignored)
 * Usage: npm run key -- sk-ant-...
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const key = process.argv[2];

if (!key || key.startsWith("--")) {
  console.log(`
Save your API key (one time):

  npm run key -- sk-ant-your-key-here

Then run audits:

  npm run report -- https://gingerpeople.com
`);
  process.exit(key ? 0 : 1);
}

const envPath = join(process.cwd(), ".env");
writeFileSync(envPath, `ANTHROPIC_API_KEY=${key}\n`, "utf-8");
console.log(`✓ Saved to .env`);
console.log(`  Run: npm run report -- https://gingerpeople.com`);
