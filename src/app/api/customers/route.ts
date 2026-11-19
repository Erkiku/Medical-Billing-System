import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { mobile: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { invoices: true } },
      },
    });

    return NextResponse.json(customers);
  } catch (error: unknown) {
    console.error("Customers query failed:", error);
    return NextResponse.json({ error: "Customers could not be loaded from the database." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, mobile, email, address } = body;

    if (!name || !mobile) {
      return NextResponse.json({ error: "Customer name and mobile are required" }, { status: 400 });
    }

    const customer = await prisma.customer.upsert({
      where: { mobile },
      update: { name, email, address },
      create: { name, mobile, email, address },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

