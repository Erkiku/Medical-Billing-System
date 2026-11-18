import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_STORE_SETTINGS = {
  id: "default",
  storeName: "R & A Medical Store",
  tagline: "Retail & Wholesale Chemists • Complete Healthcare",
  address: "123, Main Hospital Road, Civil Lines",
  city: "New Delhi",
  state: "Delhi",
  pincode: "110001",
  phone: "+91 98765 43210",
  email: "contact@ramedical.com",
  gstin: "07AAAAA0000A1Z5",
  dlNumber1: "DL-20B-123456",
  dlNumber2: "DL-21B-654321",
  fssaiNumber: "10012345678901",
  terms: "1. Goods once sold will not be taken back without valid bill.\n2. Medicines must be stored under prescribed temperature.\n3. Keep medicines out of reach of children.",
  upiId: "ramedical@upi",
  smsGateway: "MOCK",
};

export async function GET() {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: "default" },
    });
    return NextResponse.json(settings || DEFAULT_STORE_SETTINGS);
  } catch (error: unknown) {
    console.warn("Failed to fetch store settings from database, returning default fallback:", error);
    return NextResponse.json(DEFAULT_STORE_SETTINGS);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updated = await prisma.storeSettings.upsert({
      where: { id: "default" },
      update: {
        storeName: body.storeName,
        tagline: body.tagline,
        address: body.address,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        phone: body.phone,
        email: body.email,
        gstin: body.gstin,
        dlNumber1: body.dlNumber1,
        dlNumber2: body.dlNumber2,
        fssaiNumber: body.fssaiNumber,
        terms: body.terms,
        upiId: body.upiId,
        smsGateway: body.smsGateway,
        smsApiKey: body.smsApiKey,
        whatsappToken: body.whatsappToken,
        whatsappPhoneId: body.whatsappPhoneId,
      },
      create: {
        id: "default",
        ...body,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

