import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  formatReminderMessage,
  generateWhatsAppLink,
  sendNotification,
} from "@/lib/notification-service";

export async function POST(req: Request) {
  try {
    const { invoiceId, channel = "WHATSAPP" } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const phone = invoice.patientMobile || invoice.customer?.mobile;
    if (!phone) {
      return NextResponse.json(
        { error: "Customer mobile number is missing for this invoice" },
        { status: 400 }
      );
    }

    const store = await prisma.storeSettings.findUnique({
      where: { id: "default" },
    });

    const message = formatReminderMessage({
      customerName: invoice.patientName,
      invoiceNumber: invoice.invoiceNumber,
      totalBill: invoice.grandTotal,
      paidAmount: invoice.paidAmount,
      remainingBalance: invoice.remainingAmount,
      storeName: store?.storeName || "Medical Store",
      upiId: store?.upiId || undefined,
    });

    const whatsappUrl = generateWhatsAppLink(phone, message);

    // Record notification log
    const log = await sendNotification({
      channel: channel as "SMS" | "WHATSAPP",
      recipient: phone,
      message,
      customerId: invoice.customerId || undefined,
      invoiceId: invoice.id,
    });

    return NextResponse.json({
      success: true,
      message,
      whatsappUrl,
      notification: log,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        customer: { select: { name: true, mobile: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    });
    return NextResponse.json(notifications);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

