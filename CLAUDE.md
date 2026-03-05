# CLAUDE.md — Mechiron (מחירון)

## Project Overview

**Mechiron** (מחירון) — a web app for Israeli CNC manufacturers to manage their Request for Quotation process. When a client brings a part drawing, the manufacturer requests quotes from suppliers across 5 domains: raw material, coating, passivation, quenching, and subcontractor.

**Target market:** Israeli manufacturers. The entire UI is in Hebrew with full RTL support.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database / Auth / Storage:** Supabase (Postgres, Auth, file storage)
- **Email:** Resend
- **Styling:** Tailwind CSS with RTL support
- **Language:** TypeScript (strict mode)
- **Font:** Heebo or Assistant (Google Fonts, Hebrew-optimized)
- **Layout direction:** RTL (`dir="rtl"` at the root layout)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth pages (login, signup)
│   ├── (dashboard)/        # Authenticated layout
│   │   ├── page.tsx        # Home — RFQ dashboard
│   │   ├── rfq/
│   │   │   ├── new/        # Submit new RFQ form
│   │   │   └── [id]/       # Part page (RFQ detail)
│   │   └── settings/
│   │       ├── clients/    # Client management
│   │       └── suppliers/  # Supplier management
│   ├── layout.tsx          # Root layout (RTL, font, providers)
│   └── globals.css
├── components/
│   ├── ui/                 # Reusable UI primitives
│   └── ...                 # Feature-specific components
├── lib/
│   ├── supabase/           # Supabase client, server client, middleware
│   ├── resend/             # Email sending utilities
│   ├── types/              # TypeScript types and enums
│   └── utils/              # Helpers (formatting, validation)
└── hooks/                  # Custom React hooks
```

## Database Schema

10 tables, all scoped by `account_id` for future multi-tenant isolation:

- **accounts** — the manufacturer entity
- **users** — linked to Supabase Auth, all admins in phase 1
- **clients** — manufacturer's customers. Unique by `(account_id, name)`
- **suppliers** — one supplier = one domain. Unique by `(account_id, name, domain)`
- **client_supplier_approvals** — maps client → supplier. Unique by `(client_id, supplier_id)`
- **parts** — identified by serial number, unique per client `(client_id, serial_number)`
- **part_revisions** — numeric double-digit (00, 01, 02...). Stored as integer, displayed zero-padded
- **rfqs** — the core RFQ record. Status: draft → in_progress → completed
- **rfq_domain_configs** — per-domain settings (quantity override, custom subject, email free-text)
- **rfq_requests** — individual outbound emails to suppliers. Status: pending → sent

See `rfq-system-spec.md` for the full schema with column definitions and constraints.

## Domain Constants

There are exactly 5 RFQ domains. Enforced via CHECK constraints in the DB.

```typescript
export const RFQ_DOMAINS = [
  'raw_material',
  'coating',
  'passivation',
  'quenching',
  'subcontractor',
] as const;

export type RfqDomain = typeof RFQ_DOMAINS[number];

export const DOMAIN_LABELS_HE: Record<RfqDomain, string> = {
  raw_material: 'חומר גלם',
  coating: 'ציפוי',
  passivation: 'פסיבציה',
  quenching: 'חישול',
  subcontractor: 'קבלן משנה',
};
```

## Key Business Rules

### RFQ Form
- Client → Part SN → Revision is a cascading dependency. Changing client resets Part SN and Revision.
- Part SN is unique per client (not globally). Same SN can exist for different clients.
- Every new RFQ always creates a new revision. Re-quoting an existing revision is not allowed.
- Revision on existing part = `MAX(revision_number) + 1`, cannot go lower. On new part = defaults to 0.
- Drawing: single file, PDF/PNG/JPEG/JPG, max 25MB.
- Clients and parts can be created inline from the form.

### Part Page
- 5 domain sections, each optional (skip irrelevant domains).
- Base quantity can be overridden per domain.
- Approved suppliers for the client are shown first. Non-approved suppliers can be added with a confirmation modal (one-time use, NOT saved to approved list).
- New suppliers can be created inline (domain auto-set from the section).
- Send is per-domain, not global.
- After sending, the section remains editable — user can add more suppliers and send again. Already-sent suppliers are locked.
- Email subject is editable per domain (default provided, persisted).
- Email body has a fixed template with an editable free-text section per domain.

### Email
- Client name is NEVER included in emails to suppliers.
- Editable section is per-domain, not per-supplier — all suppliers in a domain get the same email.
- Drawing is attached to every email.
- Sender: system domain with manufacturer company name as display name.

### Suppliers
- One supplier serves exactly one domain. If a real-world company serves 2 domains, create 2 supplier records.
- Managed in settings pages + inline creation during RFQ flow.

## Coding Conventions

### General
- All code in TypeScript with strict mode enabled.
- Use `async/await` over `.then()` chains.
- Prefer named exports over default exports (except for Next.js pages/layouts).
- Use early returns to reduce nesting.
- Error handling: wrap Supabase calls in try/catch, return typed error objects (not thrown exceptions) from server actions.

### Naming
- Files and folders: `kebab-case`
- React components: `PascalCase`
- Functions, variables, hooks: `camelCase`
- Database columns: `snake_case`
- TypeScript types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

### React / Next.js
- Server Components by default. Use `'use client'` only when needed (interactivity, hooks, browser APIs).
- Use Server Actions for mutations (form submissions, sending emails).
- Use Supabase server client in Server Components and Server Actions, browser client only in Client Components.
- Colocate components with their page when they're single-use. Move to `components/` when reused.

### Supabase
- Always filter by `account_id` in queries. This is the multi-tenant boundary.
- Use the generated TypeScript types from Supabase CLI (`supabase gen types`).
- File uploads go to a `drawings` bucket in Supabase Storage, path: `{account_id}/{rfq_id}/{filename}`.

### Styling / RTL
- Tailwind CSS only. No CSS modules, no styled-components.
- Use logical properties in Tailwind where available (`ps-4` instead of `pl-4`, `ms-2` instead of `ml-2`).
- For custom CSS (rare), use `margin-inline-start` / `padding-inline-end` instead of left/right.
- Test all layouts in RTL. The root layout sets `dir="rtl"` and `lang="he"`.

### Hebrew UI Text
- All user-facing strings are in Hebrew.
- Keep strings inline for now (no i18n library in phase 1). If we add English later, we'll extract.
- Use Hebrew for labels, placeholders, button text, error messages, empty states.

## Common Patterns

### Revision Formatting
```typescript
// Store as integer, display as zero-padded double digit
const formatRevision = (rev: number): string => rev.toString().padStart(2, '0');
```

### Email Default Subject
```typescript
const defaultSubject = (partSn: string, revision: number, domain: RfqDomain): string =>
  `בקשה להצעת מחיר | מק"ט: ${partSn} | רוויזיה: ${formatRevision(revision)} | ${DOMAIN_LABELS_HE[domain]}`;
```

### Quantity Resolution
```typescript
// Per-domain quantity: use override if set, otherwise base quantity
const getQuantity = (baseQuantity: number, domainConfig?: { quantity_override: number | null }): number =>
  domainConfig?.quantity_override ?? baseQuantity;
```

## RFQ Status Transitions

```
draft ──[first email sent in any domain]──> in_progress ──[manual]──> completed
```

No automatic completion. User explicitly marks an RFQ as completed.

## File Uploads

- Bucket: `drawings` (Supabase Storage)
- Path: `{account_id}/{rfq_id}/{original_filename}`
- Accepted MIME types: `application/pdf`, `image/png`, `image/jpeg`
- Max size: 25MB
- Store both `drawing_url` (storage path) and `drawing_filename` (original name) on the rfqs table.

## Commands

```bash
# Dev
npm run dev

# Type generation from Supabase
npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts

# Lint
npm run lint

# Build
npm run build
```

## Do NOT

- Do not use `localStorage` or `sessionStorage` — use server-side state and database.
- Do not expose Supabase service role key on the client.
- Do not skip `account_id` filtering in any database query.
- Do not include client names in supplier-facing emails.
- Do not allow revision numbers to decrease on existing parts.
- Do not auto-add non-approved suppliers to the client's approved list during RFQ flow.
- Do not use left/right CSS properties — use logical properties for RTL compatibility.
