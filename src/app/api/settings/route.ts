import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getStoreSettings, updateStoreSettings } from "@/lib/userStore";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://qyqnpbpldiunablljlyg.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5cW5wYnBsZGl1bmFibGxqbHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMDA2NTUsImV4cCI6MjExMDU3NjY1NX0.k2P1mBWOKYWWZWqRsD18L4q5zIpP2zc-R-J9SRHHZwI";

/**
 * Fetch StoreSettings from Supabase REST API (HTTPS fallback when Prisma/PgBouncer fails)
 */
async function fetchSettingsFromSupabaseREST(): Promise<any | null> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/StoreSettings?id=eq.default&select=*`;
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
      if (Array.isArray(rows) && rows.length > 0) return rows[0];
    }
  } catch (err) {
    console.warn("Supabase REST settings fetch warning:", err);
  }
  return null;
}

/**
 * Upsert StoreSettings via Supabase REST API (HTTPS fallback)
 */
async function upsertSettingsViaSupabaseREST(data: Record<string, any>): Promise<any | null> {
  try {
    // Try PATCH first (update existing)
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/StoreSettings?id=eq.default`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    if (patchRes.ok) {
      const rows = await patchRes.json();
      if (Array.isArray(rows) && rows.length > 0) return rows[0];
    }

    // If PATCH returned empty (no row existed), POST to create
    const postRes = await fetch(`${SUPABASE_URL}/rest/v1/StoreSettings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ id: "default", ...data }),
    });
    if (postRes.ok) {
      const rows = await postRes.json();
      if (Array.isArray(rows) && rows.length > 0) return rows[0];
    }
  } catch (err) {
    console.warn("Supabase REST settings upsert warning:", err);
  }
  return null;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get("medical_store_name")?.value;
    const cookieStoreName = rawCookie ? decodeURIComponent(rawCookie).trim() : null;

    let currentUser: any = null;
    try {
      currentUser = await getCurrentUser();
    } catch {}

    const activeStoreName = currentUser?.storeName?.trim() || cookieStoreName;

    let settings: any = null;

    // Method 1: Try Prisma
    if (process.env.DATABASE_URL) {
      try {
        settings = await prisma.storeSettings.findUnique({
          where: { id: "default" },
        });
      } catch (dbError) {
        console.warn("Prisma storeSettings fetch failed, trying REST fallback:", dbError);
      }
    }

    // Method 2: Supabase REST fallback
    if (!settings) {
      settings = await fetchSettingsFromSupabaseREST();
    }

    // Method 3: Local in-memory fallback
    if (!settings) {
      settings = { ...getStoreSettings() };
    }

    // Prioritize active logged-in store name
    if (activeStoreName) {
      settings = {
        ...settings,
        storeName: activeStoreName,
      };
      updateStoreSettings({ storeName: activeStoreName });
    }

    return NextResponse.json(settings);
  } catch (error: unknown) {
    console.warn("Failed to fetch store settings, returning local fallback:", error);
    return NextResponse.json(getStoreSettings());
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const cleanStoreName = body.storeName ? String(body.storeName).trim() : undefined;

    if (cleanStoreName) {
      try {
        const cookieStore = await cookies();
        cookieStore.set("medical_store_name", encodeURIComponent(cleanStoreName), {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });
      } catch {}
    }

    // Always update runtime settings
    const updatedSettings = updateStoreSettings(body);

    const updatePayload: Record<string, any> = {};
    if (cleanStoreName) updatePayload.storeName = cleanStoreName;
    if (body.tagline !== undefined) updatePayload.tagline = body.tagline;
    if (body.address !== undefined) updatePayload.address = body.address;
    if (body.city !== undefined) updatePayload.city = body.city;
    if (body.state !== undefined) updatePayload.state = body.state;
    if (body.pincode !== undefined) updatePayload.pincode = body.pincode;
    if (body.phone !== undefined) updatePayload.phone = body.phone;
    if (body.email !== undefined) updatePayload.email = body.email;
    if (body.gstin !== undefined) updatePayload.gstin = body.gstin;
    if (body.dlNumber1 !== undefined) updatePayload.dlNumber1 = body.dlNumber1;
    if (body.dlNumber2 !== undefined) updatePayload.dlNumber2 = body.dlNumber2;
    if (body.fssaiNumber !== undefined) updatePayload.fssaiNumber = body.fssaiNumber;
    if (body.terms !== undefined) updatePayload.terms = body.terms;
    if (body.upiId !== undefined) updatePayload.upiId = body.upiId;
    if (body.smsGateway !== undefined) updatePayload.smsGateway = body.smsGateway;
    if (body.smsApiKey !== undefined) updatePayload.smsApiKey = body.smsApiKey;
    if (body.whatsappToken !== undefined) updatePayload.whatsappToken = body.whatsappToken;
    if (body.whatsappPhoneId !== undefined) updatePayload.whatsappPhoneId = body.whatsappPhoneId;

    // Method 1: Try Prisma
    if (process.env.DATABASE_URL) {
      try {
        const updated = await prisma.storeSettings.upsert({
          where: { id: "default" },
          update: updatePayload,
          create: {
            id: "default",
            ...body,
            ...(cleanStoreName ? { storeName: cleanStoreName } : {}),
          },
        });

        return NextResponse.json({
          ...updated,
          ...(cleanStoreName ? { storeName: cleanStoreName } : {}),
        });
      } catch (dbError: any) {
        console.warn("Prisma storeSettings upsert failed, trying REST fallback:", dbError?.message);
      }
    }

    // Method 2: Supabase REST fallback
    const restResult = await upsertSettingsViaSupabaseREST(updatePayload);
    if (restResult) {
      return NextResponse.json({
        ...restResult,
        ...(cleanStoreName ? { storeName: cleanStoreName } : {}),
      });
    }

    return NextResponse.json(updatedSettings);
  } catch (error: unknown) {
    console.warn("Failed to update store settings in database:", error);
    return NextResponse.json(getStoreSettings());
  }
}
