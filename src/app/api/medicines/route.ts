import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { genericName: { contains: search } },
        { saltComposition: { contains: search } },
        { company: { contains: search } },
        { barcode: { contains: search } },
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const medicines = await prisma.medicine.findMany({
      where,
      include: {
        category: true,
        batches: {
          orderBy: { expiryDate: "asc" }, // FEFO ordering
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const enriched = medicines.map((med) => {
      let totalStock = 0;
      let activeStock = 0;
      let expiredStock = 0;

      for (const b of med.batches) {
        totalStock += b.quantity;
        if (new Date(b.expiryDate).getTime() > now.getTime()) {
          activeStock += b.quantity;
        } else {
          expiredStock += b.quantity;
        }
      }

      return {
        ...med,
        totalStock,
        activeStock,
        expiredStock,
        isLowStock: activeStock <= med.minStockLevel,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    console.warn("Medicines query error, returning empty list:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      genericName,
      saltComposition,
      company,
      categoryId,
      barcode,
      packSize,
      hsnCode,
      purchasePrice,
      mrp,
      sellingPrice,
      gstRate,
      minStockLevel,
      batchNumber,
      expiryDate,
      quantity,
    } = body;

    if (!name || !company) {
      return NextResponse.json({ error: "Medicine name and company are required" }, { status: 400 });
    }

    // Create medicine and optional initial batch inside transaction
    const result = await prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.create({
        data: {
          name,
          genericName,
          saltComposition,
          company,
          categoryId: categoryId || null,
          barcode: barcode || null,
          packSize: packSize || "1x10",
          hsnCode: hsnCode || "3004",
          purchasePrice: Number(purchasePrice) || 0,
          mrp: Number(mrp) || 0,
          sellingPrice: Number(sellingPrice) || Number(mrp) || 0,
          gstRate: Number(gstRate) || 12,
          minStockLevel: Number(minStockLevel) || 10,
        },
      });

      if (batchNumber && expiryDate) {
        const batch = await tx.batch.create({
          data: {
            medicineId: medicine.id,
            batchNumber,
            expiryDate: new Date(expiryDate),
            quantity: Number(quantity) || 0,
            purchasePrice: Number(purchasePrice) || 0,
            mrp: Number(mrp) || 0,
          },
        });

        if (Number(quantity) > 0) {
          await tx.stockMovement.create({
            data: {
              medicineId: medicine.id,
              batchId: batch.id,
              type: "INITIAL",
              quantity: Number(quantity),
              reason: "Initial stock entry",
            },
          });
        }
      }

      return medicine;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

