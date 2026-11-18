import prisma from "./prisma";

export interface SendMessageParams {
  channel: "SMS" | "WHATSAPP";
  recipient: string; // phone number e.g. "9876543210"
  message: string;
  customerId?: string;
  invoiceId?: string;
}

export function generateWhatsAppLink(phone: string, text: string): string {
  // Strip non-numeric chars
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  // Add 91 if 10-digit Indian phone
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}

export function formatReminderMessage(data: {
  customerName: string;
  invoiceNumber: string;
  totalBill: number;
  paidAmount: number;
  remainingBalance: number;
  storeName: string;
  upiId?: string;
}): string {
  let msg = `Dear ${data.customerName},\nThis is a gentle reminder from ${data.storeName}.\n\nInvoice: ${data.invoiceNumber}\nTotal Bill: ₹${data.totalBill.toFixed(2)}\nPaid: ₹${data.paidAmount.toFixed(2)}\nOutstanding Due: ₹${data.remainingBalance.toFixed(2)}`;
  if (data.upiId) {
    msg += `\n\nYou can pay via UPI to: ${data.upiId}`;
  }
  msg += `\nThank you for choosing ${data.storeName}!`;
  return msg;
}

export function formatPaymentConfirmationMessage(data: {
  customerName: string;
  invoiceNumber: string;
  amountReceived: number;
  remainingBalance: number;
  storeName: string;
}): string {
  return `Dear ${data.customerName},\nWe have received ₹${data.amountReceived.toFixed(2)} towards invoice ${data.invoiceNumber}.\nRemaining Due: ₹${data.remainingBalance.toFixed(2)}.\nThank you! - ${data.storeName}`;
}

export async function sendNotification(params: SendMessageParams) {
  const store = await prisma.storeSettings.findUnique({ where: { id: "default" } });
  const gateway = store?.smsGateway || "MOCK";

  let status = "MOCKED";
  let responseText = "Mock notification simulated successfully.";

  if (gateway === "MOCK") {
    console.log(`[MOCK ${params.channel}] To: ${params.recipient} | Msg: ${params.message}`);
    status = "MOCKED";
    responseText = "Sent via Mock Gateway";
  } else if (gateway === "MSG91" && store?.smsApiKey) {
    try {
      // MSG91 API call
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: store.smsApiKey,
        },
        body: JSON.stringify({
          mobiles: params.recipient,
          message: params.message,
        }),
      });
      responseText = await res.text();
      status = res.ok ? "SENT" : "FAILED";
    } catch (err: unknown) {
      status = "FAILED";
      responseText = (err as Error).message;
    }
  }

  // Record in database
  const notification = await prisma.notification.create({
    data: {
      customerId: params.customerId,
      invoiceId: params.invoiceId,
      channel: params.channel,
      recipient: params.recipient,
      message: params.message,
      status,
      response: responseText,
      sentAt: new Date(),
    },
  });

  return notification;
}

