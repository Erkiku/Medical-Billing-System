import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { purchases: true } },
      },
    });
    return NextResponse.json(suppliers);
  } catch (error: unknown) {
    console.error("Suppliers query failed:", error);
    return NextResponse.json({ error: "Suppliers could not be loaded from the database." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, mobile, email, address, gstin, dlNumber, contactPerson } = body;

    if (!name || !mobile) {
      return NextResponse.json({ error: "Supplier name and mobile are required" }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: { name, mobile, email, address, gstin, dlNumber, contactPerson },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

