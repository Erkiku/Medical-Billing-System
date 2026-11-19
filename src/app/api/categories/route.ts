import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { medicines: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error: unknown) {
    console.error("Categories query failed:", error);
    return NextResponse.json({ error: "Could not load categories from the database." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, description } = await req.json();
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }
    const cat = await prisma.category.upsert({
      where: { name: cleanName },
      update: description ? { description } : {},
      create: { name: cleanName, description: description || null },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (error: unknown) {
    console.error("Category save failed:", error);
    return NextResponse.json({ error: "Could not save the category to the database." }, { status: 500 });
  }
}

