import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        batches: {
          orderBy: { expiryDate: "asc" },
        },
      },
    });

    if (!medicine) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }

    return NextResponse.json(medicine);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.medicine.update({
      where: { id },
      data: {
        name: body.name,
        genericName: body.genericName,
        saltComposition: body.saltComposition,
        company: body.company,
        categoryId: body.categoryId || null,
        barcode: body.barcode || null,
        packSize: body.packSize,
        hsnCode: body.hsnCode,
        schedule: body.schedule !== undefined ? body.schedule : undefined,
        purchasePrice: Number(body.purchasePrice) || 0,
        mrp: Number(body.mrp) || 0,
        sellingPrice: Number(body.sellingPrice) || 0,
        gstRate: Number(body.gstRate) || 12,
        minStockLevel: Number(body.minStockLevel) || 10,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.medicine.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

