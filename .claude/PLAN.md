# Mechiron — Implementation Plan

## Completed

- [x] Project scaffolding (Next.js 16, Tailwind v4, RTL layout, DB schema)
- [x] Install @supabase/ssr and resend packages
- [x] Supabase client/server/middleware setup with auth session refresh
- [x] Next.js middleware for route protection
- [x] Reusable UI component library (Button, Input, Select, Modal, Badge, DataTable, EmptyState, Textarea)
- [x] Settings: Clients CRUD with supplier approvals management
- [x] Settings: Suppliers CRUD with domain filtering
- [x] RFQ Dashboard with filters and data table
- [x] Server actions pattern with ActionResult<T>
- [x] Account scoping utility (getAccountId)
- [x] Seed data for development

---

## Next Steps

### Phase 1: Auth Flow ✅
- [x] Build login page (`src/app/(auth)/login/page.tsx`) — email/password form, call `supabase.auth.signInWithPassword()`
- [x] Build signup page (`src/app/(auth)/signup/page.tsx`) — email/password + company name + full name, two-step: auth signup → server action for account/user DB records
- [x] Auth layout (`src/app/(auth)/layout.tsx`) — centered card on gray-50, "מחירון" header
- [x] Server action (`src/app/(auth)/actions.ts`) — `createAccountAndUser` with explicit `users.id = authUserId`
- [x] Logout button (`src/components/logout-button.tsx`) — added to dashboard sidebar bottom
- [ ] Test full auth flow: signup → dashboard, login → dashboard, unauthenticated → redirect to login

### Phase 2: New RFQ Form (`src/app/(dashboard)/rfq/new/`) ✅
- [x] Cascading selects: Client → Part SN → Revision (auto-calculated)
- [x] Inline creation: new client modal, new part input
- [x] Drawing file upload (PDF/PNG/JPEG, max 25MB) to Supabase Storage
- [x] Base quantity input
- [x] On submit: create part (if new) + part_revision + rfq record → redirect to `/rfq/[id]`

### Phase 3: RFQ Part Page (`src/app/(dashboard)/rfq/[id]/`)
- [ ] 5 domain sections (collapsible, each optional)
- [ ] Per-domain: supplier selection from approved list, quantity override, editable email subject + free-text
- [ ] Non-approved supplier addition with confirmation modal (one-time, not saved to approvals)
- [ ] Inline supplier creation (domain auto-set)
- [ ] Per-domain send button — creates rfq_requests, sends emails via Resend
- [ ] Lock already-sent suppliers, allow adding more and re-sending
- [ ] RFQ status transition: draft → in_progress on first send
- [ ] Manual "mark as completed" button

### Phase 4: Email System
- [ ] Email template: fixed structure with editable free-text section
- [ ] Drawing attachment in every email
- [ ] Sender: system domain with manufacturer company name as display name
- [ ] Ensure client name is NEVER included in email content
- [ ] Track send status per rfq_request record

### Phase 5: Polish & Testing
- [ ] Error states and loading skeletons across all pages
- [ ] Form validation (client-side + server-side)
- [ ] Responsive design testing (mobile RTL)
- [ ] Build verification (`npm run build` passes)
- [ ] Supabase RLS policies (row-level security for account_id isolation)
- [ ] Environment variable documentation (.env.example)
