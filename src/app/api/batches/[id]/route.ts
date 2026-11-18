import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: { medicine: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    return NextResponse.json(batch);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { quantity, expiryDate, mfgDate, mrp, purchasePrice, batchNumber, isAdditive } = body;

    const existing = await prisma.batch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    let newQuantity = existing.quantity;
    if (quantity !== undefined) {
      if (isAdditive) {
        newQuantity = existing.quantity + Number(quantity);
      } else {
        newQuantity = Number(quantity);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.batch.update({
        where: { id },
        data: {
          quantity: newQuantity,
          expiryDate: expiryDate ? new Date(expiryDate) : existing.expiryDate,
          mfgDate: mfgDate ? new Date(mfgDate) : existing.mfgDate,
          mrp: mrp !== undefined ? Number(mrp) : existing.mrp,
          purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : existing.purchasePrice,
          batchNumber: batchNumber || existing.batchNumber,
        },
      });

      const qtyDiff = newQuantity - existing.quantity;
      if (qtyDiff !== 0) {
        await tx.stockMovement.create({
          data: {
            medicineId: existing.medicineId,
            batchId: id,
            type: "ADJUSTMENT",
            quantity: qtyDiff,
            reason: "Admin manual stock update",
          },
        });
      }

      return b;
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

