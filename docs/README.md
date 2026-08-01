# Mechiron Documentation

Project-level documentation for Mechiron (מחירון) — the RFQ management app for Israeli CNC manufacturers.

> For coding conventions, architecture, and business rules, see [`../CLAUDE.md`](../CLAUDE.md).
> For the full database/RFQ spec, see [`../rfq-system-spec.md`](../rfq-system-spec.md).

## Contents

### Runbooks
Step-by-step operational procedures for recurring or high-risk tasks.

- [Apply a database migration (reversible)](./runbooks/apply-migration/README.md) — apply a pending migration to the existing project, safely and reversibly: dry-run preview, `db:migrate:safe` (pg_dump backup then push) for destructive changes, paired down scripts in [`supabase/rollback/`](../supabase/rollback/).
- [Migrate to a new Supabase project (no data)](./runbooks/migrate-to-new-supabase-project/README.md) — provision a fresh Supabase project (e.g. a different region) and point the app at it, starting with an empty database. Includes a script ([`migrate-to-new-project.sh`](./runbooks/migrate-to-new-supabase-project/migrate-to-new-project.sh)) that applies all migrations.

### Development
Feature specs — the problem, the solution, and every decision made while designing it, written before implementation starts.

- [Drawing auto-detection](./development/drawing-auto-detection/README.md) — AI extraction of material, coating, passivation, quenching and hardening specs from an uploaded engineering drawing, so RFQ domain sections arrive pre-filled. Covers the two-pass native-resolution read, abstention and learned mappings, migrations `008`/`009`, and the rollback plan.

### Research
Investigations into tools, frameworks, and technical decisions, each written up against primary sources.

- [Vercel Eve & the agent stack](./research/vercel-eve-agent-stack.md) — evaluates Vercel Eve vs. the Vercel AI SDK for Mechiron's customer-facing agent. Verdict: build on the AI SDK (GA) rather than Eve (beta). Covers Eve's maturity, the full agent stack, deployment/lock-in, pricing, fit for Mechiron, and a follow-up Q&A.

## Conventions for this folder

- **Runbooks** live in [`runbooks/`](./runbooks/). Each runbook gets its **own folder** containing a `README.md` (the procedure) plus any scripts/templates it needs, so everything for a procedure sits together.
- **Development** specs live in [`development/`](./development/). Each feature gets its **own folder** named after the feature, containing a `README.md` (the spec) plus any supporting material. Record decisions *and* the alternatives that were rejected, so the reasoning survives the conversation that produced it.
- **Research** notes live in [`research/`](./research/) — one Markdown file per investigation, citing primary sources inline. Distinguish verified facts from marketing claims and analysis.
- Keep runbooks reproducible: prefer migrations and scripts over "click here in the dashboard" steps. When a manual step is unavoidable, call it out explicitly.
- When a procedure changes the database, it must reference a migration in [`../supabase/migrations/`](../supabase/migrations/).
