# Qosmic — founding engineer take-home

Qosmic is trying to figure out what an engineering org looks like when most of the work is done by coding agents. A handful of humans steering. Maximum delegation, but reliable — no slop, no half-shipped features. We're hiring the first engineer to build the harness that makes this real.

There are two harnesses we care about:

- The **internal coding-agent harness** that lets Claude Code / Codex / future agents ship product into our repo autonomously.
- The **runtime harness** that turns any coding agent into Qosmic's runtime audit agent — the one that inspects Shopify storefronts and produces CRO audits for our merchants.

This assignment is about the second one, plus the eval system around it.

Heads-up before you dive in: this is an ambitious 4 hours. That's deliberate — we want to see how you think when the scope is bigger than the time. There's no single right answer, and we've left a lot of decisions to you on purpose.

---

## The brief

**Timebox:** ~4 hours total. Self-report time in `AGENT_LOG.md`. Hard ceiling 5.

**What you're building:**

1. A **runtime harness** that, handed to any coding agent (Claude Code, Codex, anything else), makes that agent simulate being the Qosmic audit agent itself. Point it at a Shopify URL → audit report at the bar of `target_report.md`.
2. An **eval system** around it + a plan for how that eval system becomes autonomous and self-learning over time.

## The contract

**Input:** a single Shopify storefront URL. Nothing else — no manual data, no extra config.

**Output:** one audit report file (`.md` or `.html`) containing exactly:

1. **Executive summary** — 2-3 paragraphs of prose. The highest-level read on what's costing the store sales right now.
2. **10 proposed experiments** — each with: title + exp-id, pillar (Conversion / AOV / Retention / Acquisition / Performance), affected surface + URL, evidence (screenshot path or URL), hypothesis, primary change, primary KPI, decision rule, expected lift range, confidence %. The 10 should span all 5 pillars.
3. **Competitor analysis** — a table comparing the store to 3-4 competitors on positioning, what they make easier, and patterns to adapt.
4. **Technical checks** — a table of ~15 standard storefront checks (SSL, HTTPS redirect, sitemap, robots.txt, critical pages loading, meta tags, structured data, favicon, mobile-friendly, mobile + desktop page speed, broken links, image optimization, cookie/privacy, checkout reachable). Each with status (Pass / Warn / Fail) and a one-line detail.

Your harness has to produce this for any Shopify store, not just gingerpeople. See `target_report.md` for what each section should feel like.

## How a Qosmic audit works, roughly

Every audit goes through three phases:

1. **Crawl** — visit the storefront and capture artifacts: screenshots and page contents from a representative set of surfaces (homepage, product pages, a collection or two, cart, key content pages like FAQ / Where To Buy / blog).
2. **Reason** — over those artifacts, identify revenue leaks across five pillars (Conversion, AOV, Retention, Acquisition, Performance) and construct experiments with explicit hypotheses, evidence citations, and clear control/variant changes.
3. **Write** — produce the structured report you see in `target_report.md`: executive summary (prose), 10 proposed experiments (canonical schema), competitor analysis, technical checks.

A few quality bars that matter to us:

- **Cite everything.** Every claim ties to a specific artifact — screenshot path or URL. No speculation.
- **Diversify pillars.** Your 10 experiments should span Conversion / AOV / Retention / Acquisition / Performance — don't be all-Conversion.
- **Generalize.** Your harness generalizes to other Shopify stores. We'll point it at storefronts it has never seen — don't bake gingerpeople-specific shortcuts in.

How you architect the crawl, the reasoning, and the writing — single agent, subagents, custom skills, MCP tools, anything — is your call. The phases are the bar; the architecture is the test.

## Provided in this repo

- `target_report.md` — a production-quality Qosmic audit. Calibration anchor.
- **Test URLs:**
  - `gingerpeople.com` — calibration target. Your output should approach `target_report.md`'s bar.
  - `zenrojas.com` — generalization target. We have an internal reference for this one; your harness has to produce a good audit for a store you haven't been calibrated against.

## Part 1 (~2 hours): Runtime harness

A coding agent plus your harness should be able to act as a Qosmic audit agent.

Default recommendation: write skills (YAML frontmatter + progressive-disclosure bodies) for Claude Code or Codex, plus an entry-point context file (`CLAUDE.md` / `AGENTS.md`). The point of this default is fastest possible iteration on output quality, not a constraint. If you'd rather reach for LangChain / Playwright / paid APIs / a custom runtime — go for it. We're not testing infra plumbing; we're testing the audit agent your harness produces.

Your harness must run end-to-end on both URLs. Ship outputs in `sample_output/` as either `.md` or `.html` — your call. Styling doesn't matter. The content, the reasoning that produced it, and whether your harness generalizes are what we read.

## Part 2 (~2 hours): Eval system + autonomy plan ← weighted heavier

Build the eval system. Shape, tools, methodology — your call. Generality required: your evals have to score audit reports for stores they've never seen, not just gingerpeople.

In `EVAL_LOOP.md` (≤1 page), answer: **how does this eval system become autonomous and self-learning with minimal humans in the loop?** What does it look like 1–3 months out? How does it improve itself? Where do humans enter — and how do you keep that surface shrinking over time?

This is the headline signal. A sharp self-improving eval loop on a thin runtime harness beats a beautiful runtime harness with static evals.

## Deliverables

- Runtime harness + eval system + `sample_output/`
- `AGENT_LOG.md` — time per part, prompts you fed your agent, where the agent drove vs. where you took the wheel
- `EVAL_LOOP.md` — how the eval system becomes autonomous + self-learning
- `WORKFLOWS.md` (≤1 page) — how you actually use coding agents day-to-day. Tool stack, delegation patterns, custom skills / slash commands / MCP servers you've built, what you let agents drive vs. always take the wheel on. Not about this take-home — about how you work.
- 3-5min Loom — walk through your harness and your eval loop; name one decision you'd reverse; name one dimension you didn't measure that you think matters

**Submission:** either send over a zip containing your deliverables or create a GitHub repo, push your work, share the URL. Also include a Loom link with us by email (trustin@qosmic.ai). No fixed deadline — turn it around within a few days of starting.

---

## A few things worth saying directly

- **AI-agent use is expected — that's the role.** Show us how you use them; the `AGENT_LOG.md` and `WORKFLOWS.md` files are how we read it.
- **Audit output format is markdown or HTML — your call.** Styling is irrelevant. We're reading the content, the reasoning that produced it, and whether your harness generalizes.
- **We've intentionally left a lot of decisions to you.** The "right" answer is whatever you'd do. We're more interested in your taste than in you guessing what we'd want.
- **The eval loop is the headline.** Better runtime is upside on top, not a substitute.

Happy to answer any questions — ping us at trustin@qosmic.ai.
