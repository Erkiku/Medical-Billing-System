import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      customerId,
      invoiceId,
      amount,
      paymentMethod = "CASH",
      transactionRef,
      notes,
    } = body;

    const paymentAmount = Number(amount);
    if (!customerId || !paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Valid customer ID and payment amount are required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch customer
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer) {
        throw new Error("Customer not found");
      }

      // 2. If specific invoice is targeted, update that invoice
      let targetInvoice = null;
      if (invoiceId) {
        targetInvoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
        });

        if (targetInvoice) {
          const newPaid = targetInvoice.paidAmount + paymentAmount;
          const newRemaining = Math.max(0, targetInvoice.grandTotal - newPaid);
          let newStatus = targetInvoice.paymentStatus;
          if (newRemaining <= 0) {
            newStatus = "PAID";
          } else if (newPaid > 0) {
            newStatus = "PARTIAL";
          }

          await tx.invoice.update({
            where: { id: targetInvoice.id },
            data: {
              paidAmount: newPaid,
              remainingAmount: newRemaining,
              paymentStatus: newStatus,
            },
          });
        }
      }

      // 3. Create Payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId: targetInvoice ? targetInvoice.id : null,
          customerId,
          amount: paymentAmount,
          paymentMethod,
          transactionRef,
          notes: notes || (targetInvoice ? `Payment for ${targetInvoice.invoiceNumber}` : "Ledger balance payment"),
        },
      });

      // 4. Update Customer balances
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          totalPaid: { increment: paymentAmount },
          balanceDue: { decrement: paymentAmount },
        },
      });

      // 5. Create Customer Ledger Entry
      await tx.customerLedger.create({
        data: {
          customerId,
          type: "PAYMENT",
          description: targetInvoice
            ? `Payment of ₹${paymentAmount} for ${targetInvoice.invoiceNumber} via ${paymentMethod}`
            : `Payment of ₹${paymentAmount} via ${paymentMethod}`,
          referenceId: payment.id,
          debit: 0,
          credit: paymentAmount,
          balance: updatedCustomer.balanceDue,
        },
      });

      return { payment, customer: updatedCustomer };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

