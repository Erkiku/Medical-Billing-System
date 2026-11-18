import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { medicineId, batchNumber, mfgDate, expiryDate, quantity, purchasePrice, mrp } = body;

    if (!medicineId || !batchNumber || !expiryDate) {
      return NextResponse.json({ error: "Medicine ID, Batch Number, and Expiry Date are required" }, { status: 400 });
    }

    const batch = await prisma.$transaction(async (tx) => {
      // Check if batch already exists for this medicine
      const existing = await tx.batch.findUnique({
        where: {
          medicineId_batchNumber: {
            medicineId,
            batchNumber,
          },
        },
      });

      if (existing) {
        const addedQty = Number(quantity) || 0;
        const updated = await tx.batch.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + addedQty,
            expiryDate: new Date(expiryDate),
            mfgDate: mfgDate ? new Date(mfgDate) : existing.mfgDate,
            purchasePrice: purchasePrice !== undefined && purchasePrice !== "" ? Number(purchasePrice) : existing.purchasePrice,
            mrp: mrp !== undefined && mrp !== "" ? Number(mrp) : existing.mrp,
          },
        });

        if (addedQty > 0) {
          await tx.stockMovement.create({
            data: {
              medicineId,
              batchId: existing.id,
              type: "ADJUSTMENT",
              quantity: addedQty,
              reason: "Stock increment to existing batch",
            },
          });
        }
        return updated;
      }

      const created = await tx.batch.create({
        data: {
          medicineId,
          batchNumber,
          mfgDate: mfgDate ? new Date(mfgDate) : null,
          expiryDate: new Date(expiryDate),
          quantity: Number(quantity) || 0,
          purchasePrice: Number(purchasePrice) || 0,
          mrp: Number(mrp) || 0,
        },
      });

      if (Number(quantity) > 0) {
        await tx.stockMovement.create({
          data: {
            medicineId,
            batchId: created.id,
            type: "MANUAL_ADD",
            quantity: Number(quantity),
            reason: "Manual batch creation",
          },
        });
      }

      return created;
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

