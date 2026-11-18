import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getStoreSettings, updateStoreSettings } from "@/lib/userStore";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get("medical_store_name")?.value;
    const cookieStoreName = rawCookie ? decodeURIComponent(rawCookie).trim() : null;
    const currentUser = await getCurrentUser();
    const activeStoreName = currentUser?.storeName?.trim() || cookieStoreName;

    let settings: any = null;

    if (process.env.DATABASE_URL) {
      try {
        settings = await prisma.storeSettings.findUnique({
          where: { id: "default" },
        });
      } catch (dbError) {
        console.warn("Database storeSettings fetch warning (using cached settings):", dbError);
      }
    }

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

    if (process.env.DATABASE_URL) {
      try {
        const updated = await prisma.storeSettings.upsert({
          where: { id: "default" },
          update: {
            ...(cleanStoreName ? { storeName: cleanStoreName } : {}),
            ...(body.tagline !== undefined ? { tagline: body.tagline } : {}),
            ...(body.address !== undefined ? { address: body.address } : {}),
            ...(body.city !== undefined ? { city: body.city } : {}),
            ...(body.state !== undefined ? { state: body.state } : {}),
            ...(body.pincode !== undefined ? { pincode: body.pincode } : {}),
            ...(body.phone !== undefined ? { phone: body.phone } : {}),
            ...(body.email !== undefined ? { email: body.email } : {}),
            ...(body.gstin !== undefined ? { gstin: body.gstin } : {}),
            ...(body.dlNumber1 !== undefined ? { dlNumber1: body.dlNumber1 } : {}),
            ...(body.dlNumber2 !== undefined ? { dlNumber2: body.dlNumber2 } : {}),
            ...(body.fssaiNumber !== undefined ? { fssaiNumber: body.fssaiNumber } : {}),
            ...(body.terms !== undefined ? { terms: body.terms } : {}),
            ...(body.upiId !== undefined ? { upiId: body.upiId } : {}),
            ...(body.smsGateway !== undefined ? { smsGateway: body.smsGateway } : {}),
            ...(body.smsApiKey !== undefined ? { smsApiKey: body.smsApiKey } : {}),
            ...(body.whatsappToken !== undefined ? { whatsappToken: body.whatsappToken } : {}),
            ...(body.whatsappPhoneId !== undefined ? { whatsappPhoneId: body.whatsappPhoneId } : {}),
          },
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
        console.warn("Database storeSettings upsert warning:", dbError?.message);
      }
    }

    return NextResponse.json(updatedSettings);
  } catch (error: unknown) {
    console.warn("Failed to update store settings in database:", error);
    return NextResponse.json(getStoreSettings());
  }
}
