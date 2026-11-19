# Medical Pro - System Architecture, Authentication & Troubleshooting Guide

This document is the **central source of truth** for the Medical Pro Pharmacy ERP & Billing System. Whenever a new task or issue is received, consult this document first to immediately understand the system structure, data flow, and past decisions.

---

## 1. Project Overview & Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database ORM:** Prisma 5 (`@prisma/client`) + Direct Supabase REST HTTPS API
- **Live Database:** Supabase PostgreSQL (Project ID: `qyqnpbpldiunablljlyg`, Region: `ap-northeast-1`)
- **Styling:** Tailwind CSS, Lucide React icons
- **Deployment Platform:** Vercel (`medical-billing-system-orpin.vercel.app`)
- **Git Repository:** `https://github.com/Erkiku/Medical-Billing-System.git` (Active branch: `main`)
- **Active Working Directory:** `frontend/` contains the active Next.js root, `package.json`, `prisma/`, and `src/`. Root directory also mirrors `src/` and `prisma/`.

---

## 2. Authentication & Access Control (Single Source of Truth)

### The `AllowedLogin` Table in Supabase
Authentication relies **strictly** on the `AllowedLogin` table in the live Supabase PostgreSQL database. There are **zero** hardcoded accounts, **zero** backdoors, and **zero** fallback accounts in memory.

#### Schema Definition (`prisma/schema.prisma`):
```prisma
model AllowedLogin {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String   // Supports plain text or bcrypt hash
  name      String?  @default("Assigned User")
  role      String   @default("ADMIN") // ADMIN, PHARMACIST, STAFF
  storeName String?  // Assigned store name tied to this user
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Dual-Lookup Engine (`src/app/api/auth/login/route.ts`):
1. **Method 1 (Prisma Query):** Attempts to query `prisma.allowedLogin.findFirst` matching `username` case-insensitively.
2. **Method 2 (Supabase HTTPS REST API):** If Prisma is unreachable, unconfigured, or throws connection errors (such as Vercel serverless IPv6 or PgBouncer `tenant/user not found` issues), it immediately queries the Supabase REST API via HTTPS (`https://qyqnpbpldiunablljlyg.supabase.co/rest/v1/AllowedLogin`).
   - This guarantees **100% login uptime across all mobile devices, tablets, and laptops**.

#### Strict Validation Rules:
1. **Username Check:** Must exist in `AllowedLogin`. If not found, access is immediately denied.
2. **Active Check:** `allowed.active` must be `true`.
3. **Password Comparison:** Compares trimmed plain text (`cleanAllowedPass === cleanInputPass`) or validates bcrypt hash.
4. **Store Name Assignment Enforcement:**
   - If `allowed.storeName` is set (e.g. `SAGAR MEDICAL STORE`), the user **can ONLY log in to that specific store**.
   - If a user enters a different store name (e.g. `Apollo Pharmacy`), the login is rejected with `Authentication Access Denied`.
5. **Zero Sensitive Leakage:**
   - Any authentication error (bad password, missing user, store mismatch, or inactive user) responds strictly with:
     ```json
     { "error": "Authentication Access Denied" }
     ```

#### Cross-Device & Mobile Session Management:
- A signed JWT cookie `medical_session` is set via HTTP-only headers and client-side fallback.
- A store cookie `medical_store_name` is set with path `/` and max-age 30 days.
- User info is stored in `localStorage` (`medical_user_info`, `medical_store_name`).

---

## 3. Store Name Binding & Multi-Tenancy

1. Default store name is `SAGAR MEDICAL STORE`.
2. When a user logs in, their assigned `storeName` from `AllowedLogin` is adopted.
3. The store name is persisted to:
   - `StoreSettings` table in Supabase (`id: "default"`)
   - `medical_store_name` HTTP cookie
   - Browser `localStorage` (`medical_store_name`, `medical_store_info`)
   - Dispatched event `store-updated` to synchronize active React components in real time.
4. Printed invoices, bill headers, and dashboard top bars automatically display this store name.

---

## 4. UI Cleanups & Modifications

1. **Settings / Admin Page (`src/app/settings/page.tsx`):**
   - In-app user account creation and credential assignment cards were removed.
   - Store owners manage users directly via the Supabase Table Editor (`AllowedLogin` table).
   - The settings page is focused solely on Store Profile, GSTIN, Drug License numbers, Bill terms, and SMS/WhatsApp notifications.
2. **Login Page (`src/app/login/page.tsx`):**
   - Separate "Admin Portal Login" links were removed.
   - Routes `/admin/login` and `/admin-login` permanently redirect to `/login`.
   - Errors display strictly as `"Authentication Access Denied"` with no stack traces or server paths.
   - Mobile-optimized: auto-capitalization disabled for username and password fields to prevent mobile keyboard typos.
3. **Medicine Catalog (`src/app/medicines/page.tsx`, `src/app/billing/page.tsx`):**
   - Added Drug Schedule input (`H`, `H1`, `C`, `C1`, `X`) in both the medicine catalog modal and the billing item listing.

---

## 5. File Map & Directory Index

| Purpose | Active File Path |
| :--- | :--- |
| **Auth API Route** | `frontend/src/app/api/auth/login/route.ts` |
| **Auth JWT & Hashing** | `frontend/src/lib/auth.ts` |
| **In-Memory Store Helper** | `frontend/src/lib/userStore.ts` (`DEFAULT_USERS` is empty) |
| **Database Schema** | `frontend/prisma/schema.prisma` & `prisma/schema.prisma` |
| **Login UI Page** | `frontend/src/app/login/page.tsx` |
| **Settings UI Page** | `frontend/src/app/settings/page.tsx` |
| **Settings API Route** | `frontend/src/app/api/settings/route.ts` |
| **Billing & POS Page** | `frontend/src/app/billing/page.tsx` |
| **Medicines Catalog** | `frontend/src/app/medicines/page.tsx` |
| **Store Context** | `frontend/src/context/StoreContext.tsx` |
| **App Shell & Layout** | `frontend/src/components/layout/AppShell.tsx` |

---

## 6. Troubleshooting Guide for Future Tasks

### If Login Fails:
1. Check rows in Supabase:
   ```sql
   SELECT id, username, password, name, role, "storeName", active FROM "AllowedLogin";
   ```
2. Verify that `active = true`.
3. Verify password: plain text matches or valid bcrypt hash.
4. Verify store name: if user is assigned to `SAGAR MEDICAL STORE`, they must use `SAGAR MEDICAL STORE`.

### If TypeScript / Build Errors Occur:
1. Always compile using:
   ```powershell
   cd frontend; npx tsc --noEmit
   ```
2. If `schema.prisma` is updated, run:
   ```powershell
   cd frontend; npx prisma generate
   ```
3. Sync files from `frontend/src/` to root `src/` to ensure parity.

### User Commitments:
- **Constraint:** *"do'nt test yourself i can check maually"* — Do NOT run end-to-end interactive test scripts or browser suites. Use static analysis (`tsc --noEmit`) and manual user verification.
- Reference files with GitHub markdown `file:///` format using forward slashes.
