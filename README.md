# Medical Billing System (Frontend & Full-Stack Next.js)

Production-ready Pharmacy ERP & Medical Store Billing System built with Next.js 15, TypeScript, Tailwind CSS, Prisma, and Supabase PostgreSQL.

## Features
- **POS Billing & Invoicing**: Fast checkout with keyboard shortcuts (F2), FEFO batch dispatch, and printable A4 tax invoices.
- **Inventory & Batch Tracking**: Live stock counts, multi-batch expiry tracking, and instant stock update/restock tools.
- **Customer Ledger & Dues**: Customer accounts, statements, dues collection, and WhatsApp reminders.
- **Supabase Cloud Database**: High-availability PostgreSQL database connected with connection pooling.

---

## 🚀 Manual Deployment to Vercel

### Step 1: Import Repository
1. Go to [Vercel](https://vercel.com) and log in.
2. Click **Add New...** ➔ **Project**.
3. Select and import `Medical-Billing-System`.

### Step 2: Configure Environment Variables
In the **Environment Variables** section on Vercel, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres.qyqnpbpldiunablljlyg:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | `postgresql://postgres.qyqnpbpldiunablljlyg:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | `medical-pro-super-secret-key-2026` |
| `NEXT_PUBLIC_APP_NAME` | `Medical Pro` |

*(Replace `[YOUR-PASSWORD]` with your Supabase database password).*

### Step 3: Deploy
Click **Deploy**! Vercel will install dependencies, generate the Prisma client, build the application, and provide a live URL.

### Default Login:
- **Email**: `admin@medicalpro.com`
- **Password**: `admin123`
