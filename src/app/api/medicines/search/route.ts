import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json([]);
    }

    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { genericName: { contains: q } },
          { saltComposition: { contains: q } },
          { company: { contains: q } },
          { barcode: { contains: q } },
        ],
      },
      include: {
        batches: {
          orderBy: { expiryDate: "asc" }, // FEFO: First Expiry First Out
        },
      },
      take: 15,
    });

    const now = new Date();

    const results = medicines.map((med) => {
      // Sort and annotate batches
      const annotatedBatches = med.batches.map((b) => {
        const isExp = new Date(b.expiryDate).getTime() <= now.getTime();
        return {
          ...b,
          isExpired: isExp,
        };
      });

      // Valid batches for billing (not expired, qty > 0)
      const validBatches = annotatedBatches.filter((b) => !b.isExpired && b.quantity > 0);
      const totalAvailableQty = validBatches.reduce((acc, b) => acc + b.quantity, 0);

      // Best batch recommendation by FEFO
      const recommendedBatch = validBatches.length > 0 ? validBatches[0] : null;

      return {
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        saltComposition: med.saltComposition,
        company: med.company,
        barcode: med.barcode,
        packSize: med.packSize,
        hsnCode: med.hsnCode,
        mrp: med.mrp,
        sellingPrice: med.sellingPrice,
        gstRate: med.gstRate,
        totalAvailableQty,
        batches: annotatedBatches,
        recommendedBatch,
      };
    });

    return NextResponse.json(results);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

