# Apply a database migration (reversible)

How to apply a pending migration in [`supabase/migrations/`](../../../supabase/migrations/) to the existing project — safely and reversibly, using the `db:*` npm scripts.

> **When NOT to use this:** provisioning a brand-new/empty project is a different procedure — see [migrate-to-new-supabase-project](../migrate-to-new-supabase-project/README.md).

## The reversibility model

`supabase db push` is **forward-only** — there is no automatic "down". Reversibility comes from three layers, cheapest → strongest:

1. **Expand/contract authoring.** Never do a destructive change in one shot. Add → migrate data → drop, across separate migrations, so any single push is safe to leave in place.
2. **A paired down script** in [`supabase/rollback/`](../../../supabase/rollback/) — `NNN_name.down.sql`, the hand-written inverse. It lives **outside** `supabase/migrations/` on purpose: anything in `migrations/` gets *applied* by `db push`, so a down file there would run as a forward migration. A down script reverses **structure**, not data.
3. **A `pg_dump` backup** (`npm run db:backup`). The only thing that reverses **data** loss — a down script recreates an empty column, not the rows that were in it. Take one before any destructive migration.

## Authoring convention

For every forward migration `supabase/migrations/NNN_name.sql`, if it is anything beyond purely additive, write the inverse at `supabase/rollback/NNN_name.down.sql`. Purely additive migrations (new table, new column, widening a CHECK) can skip the down file — rolling forward with a fix is simpler.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed, and the correct project linked (`supabase link --project-ref <ref>`). Verify with `cat supabase/.temp/project-ref`.
- `$DATABASE_URL` set in your shell — the Postgres connection string for the target project (Dashboard → Connect → URI). Required by `db:backup` and `db:seed`. Keep it in your shell env or a gitignored file; **never commit it**.
- For backups: `pg_dump`. For rollback: `psql`.

## Apply a migration

### Additive migration (new column/table, widening a CHECK)

```bash
npm run db:migrate:dry     # preview: which migrations would apply
npm run db:migrate         # apply (db push prompts to confirm)
```

### Destructive / data-touching migration (drop, type change, backfill, narrowing a CHECK)

```bash
npm run db:migrate:dry     # preview
npm run db:migrate:safe    # pg_dump to backups/ FIRST, then push
```

`db:migrate:safe` runs `db:backup && supabase db push` — if the dump fails, the push never happens. The backup lands in `backups/backup_<timestamp>.sql` (gitignored — it contains data).

### After either

Verify the change landed, e.g.:

```bash
psql "$DATABASE_URL" -c '\d suppliers'   # confirm the new/changed constraint
```

Then commit the migration file (and its `supabase/rollback/*.down.sql`, if any).

## Roll back

Only if a just-applied migration is broken. `db push` can't undo — apply the down script by hand:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/rollback/006_add_hardening_domain.down.sql
```

Then, only if you intend to re-push a corrected forward version, remove its history row so `db push` will re-apply it:

```bash
psql "$DATABASE_URL" -c "DELETE FROM supabase_migrations.schema_migrations WHERE version = '006';"
```

To restore **data** from a backup taken with `db:backup`:

```bash
psql "$DATABASE_URL" -f backups/backup_<timestamp>.sql
```

> **Data caution:** a down script that restores a narrower CHECK/enum fails if rows already use the value being removed — reassign or delete those rows first (the down file documents this). This is why destructive rollbacks need a real backup, not just a down script.

## The npm scripts

| Script | Does |
|---|---|
| `npm run db:migrate:dry` | `supabase db push --dry-run` — preview pending migrations. |
| `npm run db:migrate` | `supabase db push` — apply (prompts to confirm). |
| `npm run db:backup` | `pg_dump "$DATABASE_URL"` → `backups/backup_<timestamp>.sql`. |
| `npm run db:migrate:safe` | `db:backup` then `db push` — use for destructive migrations. |
