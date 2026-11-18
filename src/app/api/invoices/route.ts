import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { patientName: { contains: search } },
        { patientMobile: { contains: search } },
      ];
    }

    if (status && status !== "ALL") {
      where.paymentStatus = status;
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = end;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      include: {
        customer: true,
        doctor: true,
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json(invoices);
  } catch (error: unknown) {
    console.warn("Invoices query error, returning empty list:", error);
    return NextResponse.json([]);
  }
}

