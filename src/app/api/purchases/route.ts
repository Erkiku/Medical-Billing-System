import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: { purchaseDate: "desc" },
      include: {
        supplier: true,
        items: {
          include: { medicine: true },
        },
      },
    });
    return NextResponse.json(purchases);
  } catch (error: unknown) {
    console.error("Purchases query failed:", error);
    return NextResponse.json({ error: "Purchases could not be loaded from the database." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      invoiceNumber,
      supplierId,
      purchaseDate,
      paidAmount = 0,
      notes,
      items = [],
    } = body;

    if (!invoiceNumber || !supplierId || items.length === 0) {
      return NextResponse.json(
        { error: "Supplier, Invoice number, and at least one item are required" },
        { status: 400 }
      );
    }

    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    for (const item of items) {
      const itemQty = Number(item.quantity) || 0;
      const itemPrice = Number(item.purchasePrice) || 0;
      const gst = Number(item.gstRate) || 0;
      const lineSubtotal = itemQty * itemPrice;
      const lineTax = (lineSubtotal * gst) / 100;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;
      totalAmount += lineTotal;
    }

    const numPaid = Number(paidAmount) || 0;
    let paymentStatus = "UNPAID";
    if (numPaid >= totalAmount) {
      paymentStatus = "PAID";
    } else if (numPaid > 0) {
      paymentStatus = "PARTIAL";
    }

    // Atomic transaction: create purchase, create/update batch, increase stock, record movement
    const purchase = await prisma.$transaction(async (tx) => {
      const newPurchase = await tx.purchase.create({
        data: {
          invoiceNumber,
          supplierId,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          subtotal: Math.round(subtotal * 100) / 100,
          taxAmount: Math.round(taxAmount * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          paidAmount: numPaid,
          paymentStatus,
          notes,
        },
      });

      for (const item of items) {
        const itemQty = Number(item.quantity) || 0;
        const freeQty = Number(item.freeQuantity) || 0;
        const totalStockQty = itemQty + freeQty;
        const purchasePrice = Number(item.purchasePrice) || 0;
        const mrp = Number(item.mrp) || 0;
        const gstRate = Number(item.gstRate) || 12;
        const lineSubtotal = itemQty * purchasePrice;
        const lineTax = (lineSubtotal * gstRate) / 100;
        const lineTotal = lineSubtotal + lineTax;

        // 1. Create PurchaseItem record
        await tx.purchaseItem.create({
          data: {
            purchaseId: newPurchase.id,
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            expiryDate: new Date(item.expiryDate),
            mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
            quantity: itemQty,
            freeQuantity: freeQty,
            purchasePrice,
            mrp,
            gstRate,
            totalAmount: Math.round(lineTotal * 100) / 100,
          },
        });

        // 2. Find or create batch & increment quantity
        let batch = await tx.batch.findUnique({
          where: {
            medicineId_batchNumber: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
            },
          },
        });

        if (batch) {
          batch = await tx.batch.update({
            where: { id: batch.id },
            data: {
              quantity: { increment: totalStockQty },
              purchasePrice,
              mrp,
              expiryDate: new Date(item.expiryDate),
            },
          });
        } else {
          batch = await tx.batch.create({
            data: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
              expiryDate: new Date(item.expiryDate),
              quantity: totalStockQty,
              purchasePrice,
              mrp,
            },
          });
        }

        // 3. Record stock movement
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            batchId: batch.id,
            type: "PURCHASE",
            quantity: totalStockQty,
            reason: `Purchase bill #${invoiceNumber}`,
            referenceId: newPurchase.id,
          },
        });
      }

      return newPurchase;
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

