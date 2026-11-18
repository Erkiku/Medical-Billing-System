import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "daily";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    let startDate = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    let endDate = endDateParam ? new Date(endDateParam) : new Date();
    endDate.setHours(23, 59, 59, 999);

    if (type === "daily" || type === "monthly") {
      const invoices = await prisma.invoice.findMany({
        where: {
          invoiceDate: { gte: startDate, lte: endDate },
          isCancelled: false,
        },
        include: { customer: true },
        orderBy: { invoiceDate: "desc" },
      });

      const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const totalRemaining = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);

      return NextResponse.json({
        type,
        startDate,
        endDate,
        totalSales,
        totalPaid,
        totalRemaining,
        invoiceCount: invoices.length,
        invoices,
      });
    }

    if (type === "purchase") {
      const purchases = await prisma.purchase.findMany({
        where: {
          purchaseDate: { gte: startDate, lte: endDate },
        },
        include: { supplier: true, items: { include: { medicine: true } } },
        orderBy: { purchaseDate: "desc" },
      });

      const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalPaid = purchases.reduce((sum, p) => sum + p.paidAmount, 0);

      return NextResponse.json({
        type: "purchase",
        totalPurchases,
        totalPaid,
        purchases,
      });
    }

    if (type === "profit") {
      const invoiceItems = await prisma.invoiceItem.findMany({
        where: {
          invoice: {
            invoiceDate: { gte: startDate, lte: endDate },
            isCancelled: false,
          },
        },
        include: {
          medicine: true,
          batch: true,
          invoice: { select: { invoiceNumber: true, invoiceDate: true } },
        },
      });

      let totalRevenue = 0;
      let totalCost = 0;

      const itemsWithProfit = invoiceItems.map((item) => {
        const cost = item.quantity * item.batch.purchasePrice;
        const revenue = item.amount;
        const profit = revenue - cost;
        totalRevenue += revenue;
        totalCost += cost;

        return {
          id: item.id,
          invoiceNumber: item.invoice.invoiceNumber,
          date: item.invoice.invoiceDate,
          medicineName: item.medicine.name,
          quantity: item.quantity,
          purchasePrice: item.batch.purchasePrice,
          sellingPrice: item.unitPrice,
          totalCost: Math.round(cost * 100) / 100,
          totalRevenue: Math.round(revenue * 100) / 100,
          profit: Math.round(profit * 100) / 100,
        };
      });

      const grossProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      return NextResponse.json({
        type: "profit",
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 10) / 10,
        items: itemsWithProfit,
      });
    }

    if (type === "customer-dues") {
      const customers = await prisma.customer.findMany({
        where: { balanceDue: { gt: 0 } },
        orderBy: { balanceDue: "desc" },
      });
      const totalDues = customers.reduce((sum, c) => sum + c.balanceDue, 0);

      return NextResponse.json({
        type: "customer-dues",
        totalDues,
        customerCount: customers.length,
        customers,
      });
    }

    if (type === "expiry") {
      const batches = await prisma.batch.findMany({
        where: { quantity: { gt: 0 } },
        include: { medicine: true },
        orderBy: { expiryDate: "asc" },
      });

      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const expired = [];
      const expiringIn30 = [];
      const expiringIn90 = [];

      for (const b of batches) {
        const exp = new Date(b.expiryDate).getTime();
        const item = {
          id: b.id,
          medicineName: b.medicine.name,
          company: b.medicine.company,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          expiryDate: b.expiryDate,
          mrp: b.mrp,
          lossValue: b.quantity * b.purchasePrice,
        };

        if (exp <= now.getTime()) {
          expired.push(item);
        } else if (exp <= in30Days.getTime()) {
          expiringIn30.push(item);
        } else if (exp <= in90Days.getTime()) {
          expiringIn90.push(item);
        }
      }

      return NextResponse.json({
        type: "expiry",
        expired,
        expiringIn30,
        expiringIn90,
      });
    }

    if (type === "low-stock") {
      const medicines = await prisma.medicine.findMany({
        include: {
          batches: {
            where: { expiryDate: { gt: now } },
          },
        },
      });

      const lowStock = [];
      for (const med of medicines) {
        const currentQty = med.batches.reduce((sum, b) => sum + b.quantity, 0);
        if (currentQty <= med.minStockLevel) {
          lowStock.push({
            id: med.id,
            name: med.name,
            company: med.company,
            packSize: med.packSize,
            currentStock: currentQty,
            minStockLevel: med.minStockLevel,
            deficit: med.minStockLevel - currentQty,
          });
        }
      }

      return NextResponse.json({
        type: "low-stock",
        items: lowStock,
      });
    }

    if (type === "gst") {
      const invoices = await prisma.invoice.findMany({
        where: {
          invoiceDate: { gte: startDate, lte: endDate },
          isCancelled: false,
        },
        orderBy: { invoiceDate: "desc" },
      });

      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalGst = 0;

      for (const inv of invoices) {
        totalTaxable += inv.taxableAmount;
        totalCgst += inv.cgstAmount;
        totalSgst += inv.sgstAmount;
        totalGst += inv.totalGstAmount;
      }

      return NextResponse.json({
        type: "gst",
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        invoices,
      });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

