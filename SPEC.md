# Mechiron (מחירון) — Product Specification

## מחירון — מערכת ניהול בקשות הצעת מחיר

---

## 1. Overview

A web application for CNC manufacturers to manage their Request for Quotation (RFQ) process. When a client brings a part drawing, the manufacturer needs to request quotes from multiple suppliers across different domains (raw material, coating, passivation, quenching, subcontractor). Today this process is manual, undocumented, and error-prone. This system digitizes and organizes the entire flow.

### Target Market

Israeli CNC manufacturers. Hebrew-first UI with full RTL support.

### Core Pages

1. **Home Page** — RFQ dashboard with status overview and the ability to create new RFQs.
2. **Submit New RFQ** — Smart form to capture part details, drawing, and quantity.
3. **Part Page** — Per-domain supplier selection, email preview, and send flow.

### Tech Stack

- **Frontend/Backend:** Next.js 14+ (App Router)
- **Database & Auth & Storage:** Supabase (Postgres, Auth, Storage)
- **Email:** Resend
- **Styling:** Tailwind CSS with RTL support
- **Language:** Hebrew-first, RTL layout (`dir="rtl"`)
- **Font:** Heebo or Assistant (Google Fonts, Hebrew-optimized)

### Deployment

Start simple (single-tenant), design for multi-tenant. Every table includes `account_id` as the future tenant boundary. Supabase RLS policies will enforce isolation later.

### Accounts & Users

Each account represents a manufacturer. All users within an account are admins in phase 1. A `role` column exists for future permission differentiation.

---

## 2. Entity Relationships

```
Account (Manufacturer)
├── Users
├── Clients
│   ├── Parts
│   │   └── Part Revisions
│   └── Client-Supplier Approvals
├── Suppliers (one domain each)
└── RFQs
    ├── RFQ Domain Configs (per-domain settings)
    └── RFQ Requests (per-supplier outbound emails)
```

### Key Relationships

- **Account** → has many Users, Clients, Suppliers, RFQs
- **Client** → belongs to Account, has many Parts, has many approved Suppliers
- **Part** → belongs to Client, identified by Serial Number (unique per client)
- **Part Revision** → belongs to Part, numeric double-digit format (00, 01, 02...)
- **Supplier** → belongs to Account, serves exactly one domain
- **RFQ** → belongs to a Part Revision, contains domain configs and outbound requests
- **Client-Supplier Approval** → maps a Client to a Supplier (domain is implicit from supplier)

---

## 3. Database Schema

### 3.1 accounts

The manufacturer entity. Everything in the system is scoped to an account.

| Column       | Type        | Constraints                   | Notes                                 |
| ------------ | ----------- | ----------------------------- | ------------------------------------- |
| id           | uuid        | PK, default gen_random_uuid() |                                       |
| name         | text        | NOT NULL                      | Company name, used in email signature |
| sender_email | text        |                               | System email or custom domain later   |
| created_at   | timestamptz | DEFAULT now()                 |                                       |
| updated_at   | timestamptz | DEFAULT now()                 |                                       |

### 3.2 users

| Column     | Type        | Constraints             | Notes                               |
| ---------- | ----------- | ----------------------- | ----------------------------------- |
| id         | uuid        | PK                      | Maps to Supabase auth.users         |
| account_id | uuid        | FK → accounts, NOT NULL |                                     |
| full_name  | text        | NOT NULL                |                                     |
| email      | text        | NOT NULL                |                                     |
| role       | text        | DEFAULT 'admin'         | Future-proofing, all admins for now |
| created_at | timestamptz | DEFAULT now()           |                                     |

### 3.3 clients

| Column        | Type        | Constraints                   | Notes        |
| ------------- | ----------- | ----------------------------- | ------------ |
| id            | uuid        | PK, default gen_random_uuid() |              |
| account_id    | uuid        | FK → accounts, NOT NULL       |              |
| name          | text        | NOT NULL                      | Company name |
| contact_name  | text        |                               |              |
| contact_email | text        |                               |              |
| contact_phone | text        |                               |              |
| created_at    | timestamptz | DEFAULT now()                 |              |
| updated_at    | timestamptz | DEFAULT now()                 |              |

**Unique constraint:** `(account_id, name)`

### 3.4 suppliers

Each supplier serves exactly one domain. If a real-world company serves multiple domains, it is represented as separate supplier records.

| Column       | Type        | Constraints                   | Notes                                                                |
| ------------ | ----------- | ----------------------------- | -------------------------------------------------------------------- |
| id           | uuid        | PK, default gen_random_uuid() |                                                                      |
| account_id   | uuid        | FK → accounts, NOT NULL       |                                                                      |
| name         | text        | NOT NULL                      |                                                                      |
| contact_name | text        |                               |                                                                      |
| email        | text        | NOT NULL                      | RFQ emails are sent here                                             |
| phone        | text        |                               |                                                                      |
| domain       | text        | NOT NULL, CHECK constraint    | One of: raw_material, coating, passivation, quenching, subcontractor |
| created_at   | timestamptz | DEFAULT now()                 |                                                                      |
| updated_at   | timestamptz | DEFAULT now()                 |                                                                      |

**CHECK constraint on domain:**

```sql
CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'subcontractor'))
```

**Unique constraint:** `(account_id, name, domain)` — prevents exact duplicate entries.

### 3.5 client_supplier_approvals

Maps which suppliers are approved for which clients. Domain is implicit from the supplier record.

| Column      | Type        | Constraints                   | Notes |
| ----------- | ----------- | ----------------------------- | ----- |
| id          | uuid        | PK, default gen_random_uuid() |       |
| client_id   | uuid        | FK → clients, NOT NULL        |       |
| supplier_id | uuid        | FK → suppliers, NOT NULL      |       |
| created_at  | timestamptz | DEFAULT now()                 |       |

**Unique constraint:** `(client_id, supplier_id)`

### 3.6 parts

| Column        | Type        | Constraints                   | Notes                                  |
| ------------- | ----------- | ----------------------------- | -------------------------------------- |
| id            | uuid        | PK, default gen_random_uuid() |                                        |
| account_id    | uuid        | FK → accounts, NOT NULL       | Denormalized for simpler queries & RLS |
| client_id     | uuid        | FK → clients, NOT NULL        |                                        |
| serial_number | text        | NOT NULL                      | The מק"ט                               |
| description   | text        |                               | Optional, for display hints            |
| created_at    | timestamptz | DEFAULT now()                 |                                        |
| updated_at    | timestamptz | DEFAULT now()                 |                                        |

**Unique constraint:** `(client_id, serial_number)` — SN is unique per client.

### 3.7 part_revisions

| Column          | Type        | Constraints                   | Notes                                                         |
| --------------- | ----------- | ----------------------------- | ------------------------------------------------------------- |
| id              | uuid        | PK, default gen_random_uuid() |                                                               |
| part_id         | uuid        | FK → parts, NOT NULL          |                                                               |
| revision_number | integer     | NOT NULL                      | Stored as integer (0, 1, 2...), displayed as "00", "01", "02" |
| created_at      | timestamptz | DEFAULT now()                 |                                                               |

**Unique constraint:** `(part_id, revision_number)`

### 3.8 rfqs

| Column           | Type        | Constraints                   | Notes                                            |
| ---------------- | ----------- | ----------------------------- | ------------------------------------------------ |
| id               | uuid        | PK, default gen_random_uuid() |                                                  |
| account_id       | uuid        | FK → accounts, NOT NULL       | Denormalized for queries & RLS                   |
| part_revision_id | uuid        | FK → part_revisions, NOT NULL |                                                  |
| base_quantity    | integer     | NOT NULL                      |                                                  |
| drawing_url      | text        | NOT NULL                      | Path in Supabase Storage                         |
| drawing_filename | text        | NOT NULL                      | Original filename for display & email attachment |
| notes            | text        |                               | Optional free-text from form                     |
| status           | text        | DEFAULT 'draft'               | draft, in_progress, completed                    |
| created_at       | timestamptz | DEFAULT now()                 |                                                  |
| updated_at       | timestamptz | DEFAULT now()                 |                                                  |

**Status transitions:**

- `draft` → created, no emails sent yet
- `in_progress` → at least one email sent in any domain
- `completed` → manually marked by user (no automatic rules in phase 1)

### 3.9 rfq_domain_configs

Per-domain settings for an RFQ. Only created when the user interacts with a domain section. Skipped domains have no record.

| Column            | Type        | Constraints                   | Notes                                  |
| ----------------- | ----------- | ----------------------------- | -------------------------------------- |
| id                | uuid        | PK, default gen_random_uuid() |                                        |
| rfq_id            | uuid        | FK → rfqs, NOT NULL           |                                        |
| domain            | text        | NOT NULL, CHECK constraint    | Same CHECK as suppliers.domain         |
| quantity_override | integer     |                               | NULL means use base quantity           |
| email_subject     | text        |                               | Custom subject, NULL means use default |
| email_body_text   | text        |                               | Editable free-text section content     |
| created_at        | timestamptz | DEFAULT now()                 |                                        |
| updated_at        | timestamptz | DEFAULT now()                 |                                        |

**Unique constraint:** `(rfq_id, domain)`

### 3.10 rfq_requests

Individual outbound email records — one per supplier per RFQ.

| Column               | Type        | Constraints                   | Notes                                     |
| -------------------- | ----------- | ----------------------------- | ----------------------------------------- |
| id                   | uuid        | PK, default gen_random_uuid() |                                           |
| rfq_id               | uuid        | FK → rfqs, NOT NULL           |                                           |
| supplier_id          | uuid        | FK → suppliers, NOT NULL      |                                           |
| domain               | text        | NOT NULL                      | Denormalized from supplier for grouping   |
| status               | text        | DEFAULT 'pending'             | pending, sent                             |
| sent_at              | timestamptz |                               | NULL until sent                           |
| is_approved_supplier | boolean     | DEFAULT true                  | Was this supplier from the approved list? |
| created_at           | timestamptz | DEFAULT now()                 |                                           |

**Unique constraint:** `(rfq_id, supplier_id)` — can't send to the same supplier twice per RFQ.

---

## 4. RFQ Submission Form (הגשת בקשה חדשה)

### 4.1 Fields

#### Client (לקוח) — Required

- Searchable combobox over existing clients for this account.
- "הוסף לקוח חדש" (Add new client) option at the bottom.
- Inline creation fields: company name, contact name, contact email, contact phone.
- On selection: triggers Part SN field to load associated parts.

#### Part Serial Number (מק"ט) — Required

- Searchable combobox, **disabled until client is selected**.
- Shows existing parts for the selected client (SN + optional description as hint).
- User can select an existing part or type a new SN (free-text).
- Part SN is unique per client, not globally.
- **Changing the client resets this field and all dependent fields.**

#### Revision (רוויזיה) — Required

- Double-digit numeric format: 00, 01, 02, 03...
- Stored as integer, displayed with zero-padding.

| Scenario                | Behavior                                                     |
| ----------------------- | ------------------------------------------------------------ |
| Existing part selected  | Auto-fills with `MAX(revision_number) + 1`. Cannot go lower. |
| New part (free-text SN) | Defaults to `00`. User can set freely.                       |

- Every new RFQ always creates a new revision. Re-quoting an existing revision is not supported.

#### Quantity (כמות) — Required

- Numeric input field.
- This is the base quantity for the RFQ.
- Can be overridden per domain on the Part page.

#### Drawing (שרטוט) — Required

- Single file upload only.
- Accepted formats: PDF, PNG, JPEG, JPG.
- Max file size: 25MB.
- Drag-and-drop zone or click to browse.
- Shows thumbnail/filename preview after selection.
- Uploaded to Supabase Storage on form submit.

#### Notes (הערות) — Optional

- Free-text textarea.
- Contextual notes for suppliers (e.g., "material changed to 316L").
- Carried through to the email template.

### 4.2 Submission Flow

1. Validate all required fields.
2. If new client → create client record.
3. If new part SN → create part record linked to client.
4. Create part_revision record.
5. Upload drawing to Supabase Storage.
6. Create RFQ record with status `draft`, linking to part_revision, drawing URL/filename, base quantity, and notes.
7. Redirect to Part page for this RFQ.

### 4.3 Validation Rules

| Field    | Rule                                                            |
| -------- | --------------------------------------------------------------- |
| Client   | Must be selected or inline-created with at least a company name |
| Part SN  | Must not be empty                                               |
| Revision | Must be ≥ 0. If existing part: must be > last revision          |
| Quantity | Must be a positive integer                                      |
| Drawing  | Must have one file, valid format, under 25MB                    |

---

## 5. Part Page (דף פריט)

### 5.1 Layout

**Summary Header (always visible):**

- Client name
- Part SN (מק"ט)
- Revision (רוויזיה), displayed as double-digit
- Base Quantity (כמות)
- Drawing thumbnail/link (click to view/download)
- Notes (if any)

**Domain Sections (5 collapsible cards):**

1. קבלן משנה (Subcontractor)
2. חומר גלם (Raw Material)
3. ציפוי (Coating)
4. פסיבציה (Passivation)
5. חישול (Quenching)

Each domain is **optional** — the user only fills domains relevant to the part.

### 5.2 Domain Section States

| State              | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| **Empty**          | No suppliers selected, section collapsed. User can expand or skip. |
| **In Progress**    | Suppliers selected but not yet sent.                               |
| **Partially Sent** | Some suppliers sent, user added more that are pending.             |
| **Sent**           | All selected suppliers have been emailed.                          |

### 5.3 Inside Each Domain Section

#### Quantity Override

- Shows base quantity by default.
- Toggle/edit to override for this domain.
- Override value is what appears in the email for this domain.

#### Approved Suppliers

- Listed with checkboxes. Shows supplier name and email.
- If no approved suppliers exist: show "אין ספקים מאושרים לתחום זה" (No approved suppliers for this domain).

#### Add Supplier Button

- Opens a searchable dropdown of all other suppliers in this account for this domain (excluding already-approved ones).
- Selecting a non-approved supplier triggers a **confirmation modal:**
  - "ספק זה אינו מאושר עבור לקוח זה. להוסיף לבקשה זו בלבד?" (This supplier isn't approved for this client. Add to this request only?)
  - On confirm: supplier appears in the section with a visual distinction (badge/border).
  - **One-time only** — supplier is NOT added to the client's approved list.
- At the bottom of the dropdown: **"הוסף ספק חדש"** (Add new supplier) — inline creation fields: name, contact name, email, phone. Domain is auto-set from the section. Supplier is created in the system AND added to this RFQ (but not to the client's approved list).

#### Email Preview

- Expandable preview of the composed email for this domain.
- Shows the full message in Hebrew with all variables filled in.
- Subject line is editable (default provided).
- Free-text section in the body is editable.

#### Send Button

- Label: **"שלח הצעות מחיר"** (Send RFQs).
- Sends to all checked and unsent suppliers in this domain.
- After sending:
  - Sent suppliers show "נשלח" (Sent) badge with timestamp.
  - Sent suppliers become locked (checkbox disabled).
  - RFQ status updates to `in_progress` if it was `draft`.
- If some suppliers already sent and new ones added, button label changes to: **"שלח לספקים נוספים"** (Send to additional suppliers).

### 5.4 After-Send Behavior

- Domain section remains editable after sending.
- Already-sent suppliers are locked with status and timestamp.
- User can add more suppliers (approved, non-approved, or new) and send again.
- Only unsent suppliers receive emails on subsequent sends.
- Edited email subject persists — new suppliers get the same customized subject.

### 5.5 State Persistence

- All data persists to the database (rfq_domain_configs, rfq_requests).
- User can leave and return anytime from the home page.
- Page fully reconstructs from stored records.

---

## 6. Supplier Approval System

### 6.1 Supplier Entity

- One supplier = one domain (specialist model).
- Fields: name, contact name, email, phone, domain.
- Domain is exactly one of: raw_material, coating, passivation, quenching, subcontractor.
- Managed in settings pages and created inline during RFQ flow.

### 6.2 Approval Model

- Client-supplier approval is a simple mapping: client X has approved supplier Y.
- Domain is implicit from the supplier record (no domain column on the approval table).
- Managed exclusively through the client settings page.
- Non-approved supplier usage during RFQ is one-time only (not saved to approvals).

### 6.3 Management Interfaces

#### Settings: Suppliers Page (ניהול ספקים)

- Table of all suppliers for the account.
- Filterable by domain.
- Add / edit / delete suppliers.

#### Settings: Clients Page (ניהול לקוחות)

- Table of all clients for the account.
- Click into a client to view/manage approved suppliers.
- Approved suppliers grouped by domain.
- Add approvals by selecting from existing suppliers.
- Remove approvals.

#### Inline: RFQ Form

- Create a new client inline (company name, contact name, email, phone).

#### Inline: Part Page

- Add existing non-approved supplier to RFQ (one-time, with confirmation modal).
- Create a brand new supplier inline (name, contact name, email, phone; domain auto-set from section).

### 6.4 Cold Start / Empty States

- New accounts need to seed: suppliers → clients → approvals.
- Empty states with clear CTAs: "הוסף ספק ראשון" (Add your first supplier), "הוסף לקוח ראשון" (Add your first client).

---

## 7. Email Template & Sending

### 7.1 Sending Infrastructure

- **Service:** Resend
- **Sender:** System domain (`noreply@[app-domain]`) with display name set to the manufacturer's company name.
- **Custom domains:** Deferred to a later phase.

### 7.2 Email Template

**Subject (editable with default):**

```
בקשה להצעת מחיר | מק"ט: [Part SN] | רוויזיה: [Revision] | [Domain Hebrew Name]
```

**Domain Hebrew names for subject:**
| Domain Key | Hebrew Display |
|------------|---------------|
| raw_material | חומר גלם |
| coating | ציפוי |
| passivation | פסיבציה |
| quenching | חישול |
| subcontractor | קבלן משנה |

**Body:**

```
שלום [Supplier Contact Name],

נבקש לקבל הצעת מחיר עבור הפריט הבא:

מק"ט: [Part SN]
רוויזיה: [Revision, double-digit format]
כמות: [Quantity — base or domain override]

[Editable free-text section — user can add per-domain context]

הערות: [Notes from RFQ form, if any — omit section if empty]

השרטוט מצורף.

נודה לקבלת הצעת מחיר בהקדם האפשרי.

בברכה,
[Manufacturer Company Name]
```

**Attachment:** Drawing file (PDF/PNG/JPEG).

### 7.3 Template Rules

- **Client name is never included** in the email (hidden from suppliers).
- **Editable section is per-domain**, not per-supplier. All suppliers in the same domain receive the same email.
- **Notes from the form** are included in all domain emails (if present).
- **If the notes field is empty**, the "הערות:" line is omitted entirely.
- **Edited subject is saved** to rfq_domain_configs and reused if additional suppliers are added later.

---

## 8. Home Page (דף הבית)

### 8.1 Purpose

Dashboard showing all RFQs with their statuses. Entry point for creating new RFQs and resuming existing ones.

### 8.2 RFQ List

Table or card list showing:

- Client name
- Part SN (מק"ט)
- Revision
- Base quantity
- Status (draft / in_progress / completed)
- Created date
- Number of suppliers emailed (e.g., "6/8 נשלחו")

### 8.3 Actions

- **"בקשה חדשה"** (New RFQ) button → navigates to Submit New RFQ form.
- Click on any RFQ → navigates to its Part page.
- Filter/search by client, part SN, status.
- Sort by date (newest first by default).

### 8.4 Status Display

| Status      | Hebrew | Visual            |
| ----------- | ------ | ----------------- |
| draft       | טיוטה  | Gray badge        |
| in_progress | בתהליך | Blue/yellow badge |
| completed   | הושלם  | Green badge       |

---

## 9. Open Decisions for Implementation

These items were discussed but left as implementation decisions:

1. **Drawing filename storage** — store as separate column on rfqs table (`drawing_filename`) or extract from URL at runtime.
2. **Domain values** — CHECK constraint on the column vs. separate lookup table. Recommendation: CHECK constraint for simplicity.
3. **rfq_domain_configs table** — validated as the right approach for per-domain quantity overrides, custom subjects, and editable email text.
4. **Supplier uniqueness** — `(account_id, name, domain)` as unique constraint to prevent exact duplicates.

---

## 10. Future Phase Considerations (Out of Scope for Phase 1)

- Supplier quote tracking (prices, response dates, comparison)
- Custom email domains per manufacturer
- Role-based permissions (viewer, editor, admin)
- Multi-tenant enforcement via Supabase RLS
- Part templates / recurring RFQ patterns
- Supplier portal for submitting quotes
- WhatsApp integration for supplier communication
- Analytics and reporting
- Document versioning / drawing history per revision
