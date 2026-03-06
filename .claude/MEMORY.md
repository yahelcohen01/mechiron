# Mechiron — Key Changes Summary & Sensitive Areas

## What Was Built (Commit 9bdbcd6)

### Infrastructure
- **Supabase SSR installed** (`@supabase/ssr`) — replaces all stubs with real implementations
- **Resend installed** — email client initialized from `RESEND_API_KEY`
- **Auth middleware** (`src/middleware.ts`) — refreshes Supabase session on every request, redirects unauthenticated users to `/login`

### UI Component Library (`src/components/ui/`)
Button, Input, Select, Modal, Badge (with StatusBadge), DataTable, EmptyState, Textarea — all RTL-ready, Hebrew labels

### Settings Pages (Full CRUD)
- **Clients** (`settings/clients/`) — table with expandable rows for supplier approvals, create/edit modal, delete with FK protection
- **Suppliers** (`settings/suppliers/`) — table with domain filter tabs, create/edit modal, domain auto-labeled in Hebrew

### RFQ Dashboard (`(dashboard)/page.tsx`)
- Server component fetching RFQs with joins (client, part, revision, request counts)
- Client-side filtering by status and client

### Server Actions Pattern
- `ActionResult<T>` type (`src/lib/types/actions.ts`) — discriminated union `{ success, data }` or `{ success: false, error }`
- All server actions use `getAccountId()` for multi-tenant scoping
- `revalidatePath()` after mutations

### Seed Data (`supabase/seed.sql`)
Test account + 2 clients (Elbit, Rafael) + 6 suppliers + approvals

---

## SENSITIVE / CRITICAL Areas

### 1. Multi-Tenant Boundary — `account_id` filtering
**Files:** Every server action, `src/lib/supabase/account.ts`
**Why critical:** ALL database queries MUST filter by `account_id`. Missing this = data leak between tenants. The `getAccountId()` function is the single source of truth.

### 2. Auth Middleware (`src/middleware.ts` + `src/lib/supabase/middleware.ts`)
**Why critical:** Session refresh + route protection. If broken, users can access dashboard without auth or get stuck in redirect loops. The cookie handling in `updateSession()` is delicate — must set cookies on both the request and response objects.

### 3. Server-Side Supabase Client (`src/lib/supabase/server.ts`)
**Why critical:** The `setAll` try/catch is intentional — `cookies().set()` throws in read-only Server Component contexts. Removing the catch breaks Server Components.

### 4. Client Name Exclusion from Emails
**Why critical (business rule):** Client names must NEVER appear in emails sent to suppliers. This is a hard business requirement — suppliers should not know which client the RFQ is for.

### 5. Revision Number Monotonicity
**Why critical (business rule):** Revision numbers on existing parts must only increase. New revision = `MAX(existing) + 1`. Going lower is forbidden.

### 6. Domain Constants (`src/lib/types/index.ts`)
Exactly 5 domains, enforced by DB CHECK constraints. Adding/removing domains requires DB migration.
