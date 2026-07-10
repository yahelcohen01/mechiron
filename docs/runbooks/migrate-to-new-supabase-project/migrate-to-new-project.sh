#!/usr/bin/env bash
#
# migrate-to-new-project.sh
# ---------------------------------------------------------------------------
# Automates the provisioning side of:
#   docs/runbooks/migrate-to-new-supabase-project.md
#
# Applies ALL migrations in supabase/migrations/ (001 -> 005) to a NEW, empty
# Supabase project using the Supabase CLI with a direct connection string.
# No `supabase login`, access token, or local linking state required.
#
# It does NOT migrate data, uploaded files, or auth users — you start empty and
# sign up fresh. See the runbook for the full picture.
#
# Credentials: copy .env.migration.example -> .env.migration (in this folder,
# gitignored) and fill it in, or pass --db-url on the command line.
#
# Usage (run from anywhere):
#   docs/runbooks/migrate-to-new-supabase-project/migrate-to-new-project.sh [--dry-run] [--seed] [--write-env] [--yes]
#   docs/runbooks/migrate-to-new-supabase-project/migrate-to-new-project.sh --db-url "postgresql://...:5432/postgres"
#
# Flags:
#   --db-url <url>  Postgres connection string for the NEW project (overrides
#                   TARGET_DB_URL from the env file). Percent-encode the password.
#   --dry-run       Show which migrations WOULD be applied, then exit. No changes.
#   --seed          Also apply supabase/seed.sql (dev sample data). Optional.
#   --write-env     After a successful push, point the app at the new project by
#                   updating SUPABASE_URL / ANON / SERVICE_ROLE in .env.local
#                   (a timestamped backup is made first). Requires the NEW_*
#                   values in the env file.
#   -y, --yes       Skip the interactive confirmation prompt.
#   -h, --help      Show this help.
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.migration"

# ---- defaults ----
DO_SEED=false
DO_WRITE_ENV=false
DRY_RUN=false
ASSUME_YES=false

err()  { printf '\033[0;31mERROR:\033[0m %s\n' "$*" >&2; }
info() { printf '\033[0;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }

usage() { sed -n '2,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

# ---- load env file first, so CLI flags can override it ----
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
DB_URL="${TARGET_DB_URL:-}"

# ---- parse args (override env) ----
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url)    DB_URL="${2:-}"; shift 2 ;;
    --seed)      DO_SEED=true; shift ;;
    --write-env) DO_WRITE_ENV=true; shift ;;
    --dry-run)   DRY_RUN=true; shift ;;
    -y|--yes)    ASSUME_YES=true; shift ;;
    -h|--help)   usage; exit 0 ;;
    *) err "Unknown option: $1"; echo; usage; exit 1 ;;
  esac
done

# ---- preconditions ----
if ! command -v supabase >/dev/null 2>&1; then
  err "Supabase CLI not found. Install it: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ -z "$DB_URL" ]]; then
  err "No connection string. Set TARGET_DB_URL in $ENV_FILE (copy from .env.migration.example) or pass --db-url."
  err "Get it from: Dashboard -> new project -> Connect -> Connection string (URI, Session pooler)."
  exit 1
fi

if [[ ! -d "$ROOT_DIR/supabase/migrations" ]]; then
  err "supabase/migrations not found at $ROOT_DIR/supabase/migrations"
  exit 1
fi

# Host only — never print the password.
TARGET_HOST="$(printf '%s' "$DB_URL" | sed -E 's#^[a-zA-Z]+://[^@]*@([^:/?]+).*#\1#')"

echo
info "Target database host : $TARGET_HOST"
info "Migrations           : $(find "$ROOT_DIR/supabase/migrations" -maxdepth 1 -name '*.sql' | wc -l | tr -d ' ') file(s) in supabase/migrations/"
info "Seed dev data        : $DO_SEED"
info "Update .env.local     : $DO_WRITE_ENV"
$DRY_RUN && info "Mode                 : DRY RUN (no changes)"
echo

# ---- dry run ----
if $DRY_RUN; then
  info "Migrations that would be applied:"
  ( cd "$ROOT_DIR" && supabase db push --db-url "$DB_URL" --dry-run )
  exit 0
fi

# ---- confirmation ----
if ! $ASSUME_YES; then
  printf 'Apply migrations to \033[1m%s\033[0m ? [y/N] ' "$TARGET_HOST"
  read -r reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *) err "Aborted."; exit 1 ;;
  esac
fi

# ---- push migrations (+ optional seed) ----
push_args=(db push --db-url "$DB_URL" --yes)
$DO_SEED && push_args+=(--include-seed)

info "Pushing migrations..."
( cd "$ROOT_DIR" && supabase "${push_args[@]}" )
ok "Migrations applied."

# ---- optional: point the app at the new project ----
if $DO_WRITE_ENV; then
  ENV_LOCAL="$ROOT_DIR/.env.local"
  if [[ -z "${NEW_SUPABASE_URL:-}${NEW_SUPABASE_ANON_KEY:-}${NEW_SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    err "--write-env requires NEW_SUPABASE_URL / NEW_SUPABASE_ANON_KEY / NEW_SUPABASE_SERVICE_ROLE_KEY in $ENV_FILE. Skipping env update."
  elif [[ ! -f "$ENV_LOCAL" ]]; then
    err ".env.local not found — create it from .env.local.example first. Skipping env update."
  else
    BACKUP="$ENV_LOCAL.bak.$(date +%Y%m%d%H%M%S)"
    cp "$ENV_LOCAL" "$BACKUP"
    node - "$ENV_LOCAL" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const map = {
  SUPABASE_URL: process.env.NEW_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEW_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.NEW_SUPABASE_SERVICE_ROLE_KEY,
};
let text = fs.readFileSync(file, 'utf8');
for (const [key, val] of Object.entries(map)) {
  if (!val) continue;
  const re = new RegExp('^' + key + '=.*$', 'm');
  if (re.test(text)) text = text.replace(re, key + '=' + val);
  else text += (text.endsWith('\n') ? '' : '\n') + key + '=' + val + '\n';
}
fs.writeFileSync(file, text);
NODE
    ok "Updated .env.local (backup: $(basename "$BACKUP"))"
  fi
fi

echo
ok "Done. Next steps:"
cat <<'EOF'
  1. Recreate the `drawings` bucket check: it is created by 005_storage_drawings.sql
     (verify in Dashboard -> Storage that the bucket exists and is private).
  2. If you did NOT use --write-env, update .env.local with the new project's
     SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.
  3. Restart the dev server (or redeploy) so the new env is picked up.
  4. Sign up a fresh user and confirm accounts/users rows + a drawing upload.

  Full checklist: docs/runbooks/migrate-to-new-supabase-project.md
EOF
