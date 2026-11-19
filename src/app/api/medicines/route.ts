import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const schedule = searchParams.get("schedule") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { genericName: { contains: search, mode: "insensitive" } },
        { saltComposition: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search } },
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (schedule) {
      where.schedule = schedule;
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
    console.error("Medicines query failed:", error);
    return NextResponse.json({ error: "Could not load medicines from the database." }, { status: 500 });
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
      schedule = "NONE",
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
          packSize: packSize || "1×10",
          hsnCode: hsnCode || "3004",
          schedule: schedule || "NONE",
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
    console.error("POST /api/medicines error:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to save medicine to the database." }, { status: 500 });
  }
}

