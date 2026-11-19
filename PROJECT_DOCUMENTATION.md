# Medical Pro - System Architecture, Authentication & Troubleshooting Guide

This document is the **central source of truth** for the Medical Pro Pharmacy ERP & Billing System. Whenever a new task or issue is received, consult this document first to immediately understand the system structure, data flow, and past decisions.

---

## 1. Project Overview & Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database ORM:** Prisma 5 (`@prisma/client`)
- **Live Database:** Supabase PostgreSQL (Project ID: `qyqnpbpldiunablljlyg`)
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
  storeName String?  // Optional store name tied to this user
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### How Authentication Works (`src/app/api/auth/login/route.ts`):
1. User enters **Store Name**, **Username**, and **Password** on `/login`.
2. The API queries `prisma.allowedLogin.findFirst` for a case-insensitive match on `username`.
3. **Strict Validation:**
   - If the username is **not found** in `AllowedLogin` (e.g. deleted by owner): Login is rejected immediately.
   - If `allowed.active` is `false`: Login is rejected immediately.
   - Password comparison: Checks plain-text match (`allowed.password === password`) and bcrypt hash verification (`verifyPassword(password, allowed.password)`). If incorrect, login is rejected immediately.
4. **Generic Error Policy (Zero Sensitive Information Leakage):**
   - On **ANY** authentication failure (wrong username, wrong password, inactive user, or DB error), the API returns exclusively:
     ```json
     { "error": "Authentication Access Denied" }
     ```
   - No internal database error messages, table names, or account existence clues are ever exposed to the client.
5. **Session Management:**
   - A signed JWT cookie `medical_session` is issued via `lib/auth.ts`.
   - A store cookie `medical_store_name` is set with path `/` and max-age 30 days.

---

## 3. Store Name Binding & Multi-Tenancy

1. When a user logs in, their assigned `storeName` from `AllowedLogin` or the input box on the login screen is adopted.
2. The store name is saved to:
   - `StoreSettings` table in Supabase (`id: "default"`)
   - `medical_store_name` HTTP cookie
   - Browser `localStorage` (`medical_store_name`, `medical_store_info`)
   - Dispatched event `store-updated` to synchronize active React components in real time.
3. Printed invoices, bill headers, and dashboard top bars automatically display this store name.

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
3. Verify password: either plain text matches or valid bcrypt hash.
4. Verify `DATABASE_URL` environment variable is reachable.

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
