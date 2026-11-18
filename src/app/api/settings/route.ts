import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStoreSettings, updateStoreSettings } from "@/lib/userStore";

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      try {
        const settings = await prisma.storeSettings.findUnique({
          where: { id: "default" },
        });
        if (settings) {
          updateStoreSettings(settings);
          return NextResponse.json(settings);
        }
      } catch (dbError) {
        console.warn("Database storeSettings fetch warning (using cached settings):", dbError);
      }
    }

    return NextResponse.json(getStoreSettings());
  } catch (error: unknown) {
    console.warn("Failed to fetch store settings, returning local fallback:", error);
    return NextResponse.json(getStoreSettings());
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // Always update runtime settings
    const updatedSettings = updateStoreSettings(body);

    if (process.env.DATABASE_URL) {
      try {
        const updated = await prisma.storeSettings.upsert({
          where: { id: "default" },
          update: {
            ...(body.storeName ? { storeName: body.storeName } : {}),
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
          },
        });

        return NextResponse.json(updated);
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
