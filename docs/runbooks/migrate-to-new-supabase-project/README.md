# Runbook: Migrate to a new Supabase project (no data)

**Goal:** Stand up a fresh Supabase project — typically in a different region (e.g. moving from **Tokyo** to **Frankfurt** to reduce latency for Israeli users) — and point the app at it. This procedure **does not migrate existing data, files, or users**. You start with an empty database and sign up fresh.

**When to use this:** Region change, splitting environments, or rebuilding a non-prod project from scratch.

**When NOT to use this:** If you need to preserve existing rows, uploaded drawings, or auth users. That is a data-migration procedure (dump/restore + Storage copy + `auth.users` export), which is out of scope here.

---

## Mental model

A Supabase "region migration" is really **"provision a brand-new project and re-apply everything."** Three things are **not** covered by database migrations and must be handled separately:

| Concern | Covered by migrations? | Notes |
| --- | --- | --- |
| Schema, RLS, functions, triggers, indexes | ✅ Yes | `001`–`005` are self-contained |
| Storage bucket + its policies | ✅ Yes (as of `005`) | `005_storage_drawings.sql` creates the `drawings` bucket + policies |
| **Data rows** | ❌ No | Migrations create empty tables. Use `seed.sql` for dev data. |
| **Auth users** (`auth.users`) | ❌ No | New project = zero users. Sign up fresh. |
| **Uploaded files** in Storage | ❌ No | Not copied. Fine for a no-data migration. |

Also note: **the JWT secret changes** with the new project. All existing sessions/cookies become invalid (expected — you sign in fresh), and any hardcoded signed Storage URLs would break.

---

## Prerequisites

- Access to the [Supabase dashboard](https://supabase.com/dashboard) with permission to create projects.
- Local repo with the `supabase/migrations/` folder up to date.
- Supabase CLI installed and authenticated (`supabase login`), **or** willingness to paste SQL into the dashboard SQL editor.
- The app's env file (`.env.local`) handy for swapping credentials.

---

## Automated path (recommended)

Most of this runbook is scripted in [`migrate-to-new-project.sh`](./migrate-to-new-project.sh) (in this folder). It applies all migrations (`001`→`005`) to the new project via the Supabase CLI using a direct connection string — **no `supabase login`, access token, or local linking required**. It can optionally seed dev data and repoint `.env.local`.

```bash
# 1. Create the new project in the dashboard (see step 1 below).

# 2. Provide credentials (this file is gitignored — never commit real creds):
cp docs/runbooks/migrate-to-new-supabase-project/.env.migration.example \
   docs/runbooks/migrate-to-new-supabase-project/.env.migration
#    Fill in TARGET_DB_URL from: Dashboard -> new project -> Connect -> Connection string (URI).
#    (Optional) fill NEW_SUPABASE_* to let the script repoint .env.local.

# 3. Preview what would run (no changes made):
docs/runbooks/migrate-to-new-supabase-project/migrate-to-new-project.sh --dry-run

# 4. Apply. Add --seed for dev data, --write-env to repoint .env.local:
docs/runbooks/migrate-to-new-supabase-project/migrate-to-new-project.sh --seed --write-env
```

The script never migrates data / files / auth users — it only builds the empty schema (+ optional seed). The dashboard-only steps below (create project, verify Storage, fresh signup) still apply. The manual procedure that follows is the reference for what the script does.

---

## Procedure

### 1. Create the new project
1. In the Supabase dashboard, create a new project in the target region (e.g. **Frankfurt / eu-central-1**).
2. Set a strong database password and save it in your password manager.
3. Wait for the project to finish provisioning.

### 2. Apply the database migrations
Apply migrations **in order** (`001` → `005`). Any of these work:

**Option A — the script (recommended):** see [Automated path](#automated-path-recommended) above. It runs `supabase db push --db-url "<TARGET_DB_URL>"`, which needs only the connection string.

**Option B — Supabase CLI by hand:**
```bash
# Push directly with a connection string (no login/linking needed):
supabase db push --db-url "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

**Option C — SQL editor (manual):**
Open each file in `supabase/migrations/` in order and run its contents in the dashboard SQL editor:
1. `001_initial_schema.sql` — schema (10 tables, triggers, indexes)
2. `002_add_rls_policies.sql` — RLS policies + `get_user_account_id()`
3. `003_add_spec_value.sql` — adds `rfq_domain_configs.spec_value`
4. `004_pending_invites.sql` — `pending_invites` table + related policies
5. `005_storage_drawings.sql` — `drawings` Storage bucket + its RLS policies

> `005` is idempotent (`ON CONFLICT DO NOTHING` + `DROP POLICY IF EXISTS`), so re-running it is safe.

### 3. Verify Storage
Confirm the `drawings` bucket exists and is **private**:
- Dashboard → Storage → you should see a `drawings` bucket (created by migration `005`).
- Dashboard → Storage → Policies → three policies on `storage.objects` for the `drawings` bucket (authenticated insert / select / delete).

If the bucket is missing, re-run `005_storage_drawings.sql`.

### 4. (Optional) Seed dev data
For a non-prod environment you may want the sample data:
```bash
# Via the script:
docs/runbooks/migrate-to-new-supabase-project/migrate-to-new-project.sh --seed

# Or by hand with the CLI:
supabase db push --db-url "<TARGET_DB_URL>" --include-seed
```
Or paste `supabase/seed.sql` into the SQL editor. Skip this if you want a truly empty project.

### 5. Swap the app credentials
In `.env.local`, replace the three Supabase values with the **new project's** credentials (Dashboard → Project Settings → API):

```dotenv
SUPABASE_URL=<new-project-url>
SUPABASE_ANON_KEY=<new-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
```

- `RESEND_API_KEY` is provider-independent — **no change needed**.
- ⚠️ Never commit real keys. Keep them in `.env.local` (gitignored) and update any deployment env (e.g. Vercel) separately.

Restart the dev server (or redeploy) so the new env is picked up.

### 6. Sign up a fresh user and verify the flow
1. Go to the signup page and create a new account.
2. Confirm the two-step signup created both an `accounts` row and a `users` row, and that `users.id` matches the new Supabase Auth user ID.
3. Create a client, a supplier, and a new RFQ with a drawing upload to confirm Storage insert/read works end-to-end.

---

## Verification checklist

- [ ] New project provisioned in the target region.
- [ ] Migrations `001`→`005` applied in order, no errors.
- [ ] `drawings` bucket exists, private, with 3 authenticated policies.
- [ ] (Optional) `seed.sql` run if dev data wanted.
- [ ] `.env.local` (and deployment env) updated with the 3 new Supabase values.
- [ ] Dev server / deployment restarted.
- [ ] Fresh signup creates matching `accounts` + `users` rows.
- [ ] RFQ creation with a drawing upload succeeds (Storage insert + signed-URL read).

---

## Rollback

Because this procedure only changes **which project the app points at**, rollback is trivial:
1. Restore the previous Supabase values in `.env.local` (and deployment env).
2. Restart / redeploy.

The old project is untouched by this procedure, so it remains a working fallback until you decide to decommission it.

---

## Notes & gotchas

- **Storage policies are broad, not account-scoped.** Tenant isolation for drawings is enforced at the app layer via the `{account_id}/{rfq_id}/{filename}` path, not in the Storage RLS policies. See `005_storage_drawings.sql`.
- **JWT secret differs per project** — existing cookies/sessions and any hardcoded signed URLs become invalid. Signing in fresh resolves this.
- **Keep migrations as the source of truth.** If you ever change the DB via the dashboard, back-fill a migration so this runbook stays fully reproducible.
