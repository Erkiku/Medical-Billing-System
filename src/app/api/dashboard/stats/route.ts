import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 1. Today's sales
    const todayInvoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: startOfToday },
        isCancelled: false,
      },
      select: { grandTotal: true },
    });
    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

    // 2. Monthly sales
    const monthlyInvoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: startOfMonth },
        isCancelled: false,
      },
      select: { grandTotal: true },
    });
    const monthlySales = monthlyInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

    // 3. Total medicines
    const totalMedicines = await prisma.medicine.count();

    // 4. Batches & Stock value
    const batches = await prisma.batch.findMany({
      select: {
        quantity: true,
        purchasePrice: true,
        expiryDate: true,
      },
    });

    let totalStockValue = 0;
    let expiredCount = 0;
    let nearExpiryCount = 0;

    for (const b of batches) {
      totalStockValue += b.quantity * b.purchasePrice;
      const exp = new Date(b.expiryDate).getTime();
      if (exp <= now.getTime()) {
        expiredCount++;
      } else if (exp <= in90Days.getTime()) {
        nearExpiryCount++;
      }
    }

    // 5. Low stock medicines
    const medicinesWithBatches = await prisma.medicine.findMany({
      include: {
        batches: {
          select: { quantity: true, expiryDate: true },
        },
      },
    });

    let lowStockCount = 0;
    const lowStockList = [];

    for (const med of medicinesWithBatches) {
      const activeStock = med.batches
        .filter((b) => new Date(b.expiryDate).getTime() > now.getTime())
        .reduce((sum, b) => sum + b.quantity, 0);

      if (activeStock <= med.minStockLevel) {
        lowStockCount++;
        lowStockList.push({
          id: med.id,
          name: med.name,
          company: med.company,
          activeStock,
          minStockLevel: med.minStockLevel,
        });
      }
    }

    // 6. Total Customer Dues
    const customers = await prisma.customer.findMany({
      select: { balanceDue: true },
    });
    const totalCustomerDues = customers.reduce((sum, c) => sum + Math.max(0, c.balanceDue), 0);

    // 7. Recent Invoices
    const recentBills = await prisma.invoice.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, mobile: true } },
      },
    });

    // 8. Recent Payments
    const recentPayments = await prisma.payment.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    });

    // 9. Last 7 days sales trend
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - i);
      const startOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
      const endOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);

      const dayInvoices = await prisma.invoice.findMany({
        where: {
          invoiceDate: { gte: startOfDay, lte: endOfDay },
          isCancelled: false,
        },
        select: { grandTotal: true },
      });

      const dayTotal = dayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      salesTrend.push({
        day: dayDate.toLocaleDateString("en-IN", { weekday: "short" }),
        date: dayDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        amount: dayTotal,
      });
    }

    return NextResponse.json({
      todaySales,
      monthlySales,
      totalMedicines,
      totalStockValue,
      lowStockCount,
      nearExpiryCount,
      expiredCount,
      totalCustomerDues,
      recentBills,
      recentPayments,
      salesTrend,
      lowStockList: lowStockList.slice(0, 5),
    });
  } catch (error: unknown) {
    console.warn("Failed to load live dashboard stats, returning zeroed defaults:", error);
    return NextResponse.json({
      todaySales: 0,
      monthlySales: 0,
      totalMedicines: 0,
      totalStockValue: 0,
      lowStockCount: 0,
      nearExpiryCount: 0,
      expiredCount: 0,
      totalCustomerDues: 0,
      recentBills: [],
      recentPayments: [],
      salesTrend: [
        { day: "Mon", date: "", amount: 0 },
        { day: "Tue", date: "", amount: 0 },
        { day: "Wed", date: "", amount: 0 },
        { day: "Thu", date: "", amount: 0 },
        { day: "Fri", date: "", amount: 0 },
        { day: "Sat", date: "", amount: 0 },
        { day: "Sun", date: "", amount: 0 },
      ],
      lowStockList: [],
    });
  }
}

