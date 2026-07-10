# Mechiron Documentation

Project-level documentation for Mechiron (מחירון) — the RFQ management app for Israeli CNC manufacturers.

> For coding conventions, architecture, and business rules, see [`../CLAUDE.md`](../CLAUDE.md).
> For the full database/RFQ spec, see [`../rfq-system-spec.md`](../rfq-system-spec.md).

## Contents

### Runbooks
Step-by-step operational procedures for recurring or high-risk tasks.

- [Migrate to a new Supabase project (no data)](./runbooks/migrate-to-new-supabase-project/README.md) — provision a fresh Supabase project (e.g. a different region) and point the app at it, starting with an empty database. Includes a script ([`migrate-to-new-project.sh`](./runbooks/migrate-to-new-supabase-project/migrate-to-new-project.sh)) that applies all migrations.

## Conventions for this folder

- **Runbooks** live in [`runbooks/`](./runbooks/). Each runbook gets its **own folder** containing a `README.md` (the procedure) plus any scripts/templates it needs, so everything for a procedure sits together.
- Keep runbooks reproducible: prefer migrations and scripts over "click here in the dashboard" steps. When a manual step is unavoidable, call it out explicitly.
- When a procedure changes the database, it must reference a migration in [`../supabase/migrations/`](../supabase/migrations/).
