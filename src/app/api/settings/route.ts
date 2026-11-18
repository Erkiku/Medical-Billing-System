import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: "default" },
    });
    return NextResponse.json(settings);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
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

