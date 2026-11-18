import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const categories = await prisma.category.findMany({
        include: {
          _count: { select: { medicines: true } },
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(categories);
    }
    return NextResponse.json([]);
  } catch (error: unknown) {
    console.warn("Categories query error, returning empty list:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { name, description } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }
    const cat = await prisma.category.create({
      data: { name, description },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

