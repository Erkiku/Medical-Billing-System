import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { getStoreSettings, updateStoreSettings } from "@/lib/userStore";

const GENERIC_AUTH_ERROR = "Authentication Access Denied";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://qyqnpbpldiunablljlyg.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5cW5wYnBsZGl1bmFibGxqbHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMDA2NTUsImV4cCI6MjExMDU3NjY1NX0.k2P1mBWOKYWWZWqRsD18L4q5zIpP2zc-R-J9SRHHZwI";

/**
 * Robust AllowedLogin user lookup:
 * 1. Attempts Prisma query (live database connection).
 * 2. If Prisma is unreachable, fails, or throws (e.g. serverless IPv6 or pooler issue on Vercel),
 *    falls back to direct HTTPS Supabase REST API (works across all mobile, desktop, and serverless environments).
 */
async function findAllowedLoginUser(cleanIdentifier: string) {
  // Method 1: Try Prisma
  if (process.env.DATABASE_URL) {
    try {
      const allowed = await prisma.allowedLogin.findFirst({
        where: {
          username: { equals: cleanIdentifier, mode: "insensitive" },
        },
      });
      if (allowed) return allowed;
    } catch (prismaErr) {
      console.warn("Prisma allowedLogin query warning, trying REST fallback:", prismaErr);
    }
  }

  // Method 2: Supabase REST API via HTTPS
  try {
    const url = `${SUPABASE_URL}/rest/v1/AllowedLogin?select=*&username=ilike.${encodeURIComponent(cleanIdentifier)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0];
      }
    }
  } catch (restErr) {
    console.error("Supabase REST API lookup error:", restErr);
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, username, password, storeName } = body;
    const identifier = String(username || email || "").trim().toLowerCase();
    const rawPassword = String(password || "").trim();

    if (!identifier || !rawPassword) {
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // 1. Fetch user strictly from AllowedLogin table in Supabase
    const allowed = await findAllowedLoginUser(identifier);

    if (!allowed) {
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // 2. Active status check
    if (!allowed.active) {
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // 3. Password comparison (supports direct plain text or bcrypt hash)
    let isPasswordValid = false;
    const cleanDbPass = String(allowed.password || "").trim();

    if (cleanDbPass === rawPassword || allowed.password === password) {
      isPasswordValid = true;
    } else {
      try {
        isPasswordValid = await verifyPassword(rawPassword, allowed.password);
      } catch {}
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // 4. Store Name Assignment Enforcement
    // "STORE NAME AAK BAAR STROE KISI NAEM KE ASSIGN HO GYA TO usssi ke login kar skta hai"
    const assignedStore = allowed.storeName ? String(allowed.storeName).trim() : null;
    const inputStore = storeName && typeof storeName === "string" ? storeName.trim() : "";

    if (assignedStore) {
      // If user typed a store name, it MUST match the assigned store name (case-insensitive)
      if (inputStore && inputStore.toLowerCase() !== assignedStore.toLowerCase()) {
        return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
      }
    }

    const finalStoreName = assignedStore || inputStore || getStoreSettings().storeName || "SAGAR MEDICAL STORE";

    const role = String(allowed.role || "ADMIN").trim().toUpperCase();
    const authenticatedUser = {
      id: allowed.id,
      name: allowed.name || allowed.username,
      username: allowed.username,
      email: `${allowed.username}@medicalpro.local`,
      role: role,
      storeName: finalStoreName,
    };

    // 5. Update runtime & DB store settings to keep all devices synchronized
    let currentStore = updateStoreSettings({ storeName: finalStoreName });

    if (process.env.DATABASE_URL) {
      try {
        const dbUpdated = await prisma.storeSettings.upsert({
          where: { id: "default" },
          update: { storeName: finalStoreName },
          create: { id: "default", storeName: finalStoreName },
        });
        currentStore = { ...currentStore, ...dbUpdated, storeName: finalStoreName };
      } catch {}
    } else {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/StoreSettings?id=eq.default`, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ storeName: finalStoreName }),
        });
      } catch {}
    }

    // 6. Establish Session Cookies & Generate Token for client/mobile storage
    const token = await createSessionToken(authenticatedUser);
    await setSessionCookie(authenticatedUser, finalStoreName);

    return NextResponse.json({
      success: true,
      token,
      user: authenticatedUser,
      store: {
        ...currentStore,
        storeName: finalStoreName,
      },
    });
  } catch (error: unknown) {
    console.error("Login route internal error:", error);
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }
}
