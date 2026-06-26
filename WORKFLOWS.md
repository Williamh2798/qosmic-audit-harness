# Workflows — how I use coding agents day-to-day

## Tool stack

- **Cursor** — primary IDE; Agent mode for multi-file implementation
- **Skills** — project `.cursor/skills/` for repeatable workflows (audit phases, eval, deploy)
- **Playwright** — deterministic I/O (crawl, screenshots); agents handle judgment
- **MCP** — browser MCP for interactive debugging; not a production runtime dependency
- **gh CLI** — PRs, CI, issues

## Delegation pattern

| Task | Agent | Me |
|------|-------|-----|
| Scaffold, scripts, boilerplate | ✓ | Review architecture |
| Multi-file feature implementation | ✓ | Schema design, quality gates |
| Report / content first drafts | ✓ | Calibrate against rubric |
| Eval rubrics, promotion thresholds | | ✓ |
| Secrets, deploy keys, prod config | | ✓ always |
| Git push to main, eval threshold changes | | ✓ always |

## Loop

1. Write a thin contract (`AGENTS.md` or plan)
2. Agent implements; I run eval / tests
3. Failures → skill patch or schema tweak
4. Repeat until eval passes

## What I never delegate

- API keys and `.env`
- Force push, production deploys
- Changing eval pass thresholds without reviewing impact on golden set

## Slash commands / skills I rely on

- Custom project skills (like `qosmic-audit`) over long chat context
- `npm run crawl` / `npm run eval` as fixed agent tool boundaries
- Plan mode for scope &gt;2h before Agent mode execution

## Taste

Maximum delegation on implementation; minimum delegation on **what good looks like** — schemas, rubrics, and golden examples stay human-owned until the eval loop proves it can match my labels.
