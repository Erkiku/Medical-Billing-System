import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      patientName,
      patientMobile,
      patientAddress,
      doctorId,
      doctorName,
      items, // array of { medicineId, batchId, quantity, discount, unitPrice }
      discountPercent = 0,
      paidAmount = 0,
      paymentMethod = "CASH",
      notes,
    } = body;

    if (!patientName || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Patient name and at least one medicine item are required" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Run within a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate unique invoice number: INV-YYYYMM-XXXX
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const countThisMonth = await tx.invoice.count({
        where: {
          invoiceNumber: { startsWith: `INV-${yearMonth}` },
        },
      });
      const invoiceNumber = `INV-${yearMonth}-${String(countThisMonth + 1).padStart(4, "0")}`;

      // 2. Validate all batches, stock levels, and non-expired status
      const processedItems = [];
      let subtotal = 0;
      let totalGstAmount = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;

      for (const item of items) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) {
          throw new Error(`Invalid quantity ${qty} for item`);
        }

        const batch = await tx.batch.findUnique({
          where: { id: item.batchId },
          include: { medicine: true },
        });

        if (!batch) {
          throw new Error(`Batch not found for medicine`);
        }

        // Expired check
        if (new Date(batch.expiryDate).getTime() <= now.getTime()) {
          throw new Error(
            `Medicine "${batch.medicine.name}" (Batch ${batch.batchNumber}) is expired and cannot be sold!`
          );
        }

        // Stock check
        if (batch.quantity < qty) {
          throw new Error(
            `Insufficient stock for "${batch.medicine.name}". Available: ${batch.quantity}, Requested: ${qty}`
          );
        }

        const unitPrice = Number(item.unitPrice) || batch.medicine.sellingPrice || batch.mrp;
        const discountPct = Number(item.discount) || 0;
        const lineBeforeDiscount = qty * unitPrice;
        const lineDiscount = (lineBeforeDiscount * discountPct) / 100;
        const lineTaxable = lineBeforeDiscount - lineDiscount;

        const gstRate = batch.medicine.gstRate || 12;
        const lineGst = (lineTaxable * gstRate) / 100;
        const lineCgst = lineGst / 2;
        const lineSgst = lineGst / 2;
        const lineTotal = lineTaxable + lineGst;

        subtotal += lineTaxable;
        totalGstAmount += lineGst;
        cgstAmount += lineCgst;
        sgstAmount += lineSgst;

        processedItems.push({
          medicineId: batch.medicineId,
          batchId: batch.id,
          quantity: qty,
          pack: batch.medicine.packSize,
          expiryDate: batch.expiryDate,
          mrp: batch.mrp,
          unitPrice,
          discount: discountPct,
          gstRate,
          cgstAmount: Math.round(lineCgst * 100) / 100,
          sgstAmount: Math.round(lineSgst * 100) / 100,
          amount: Math.round(lineTotal * 100) / 100,
          batchQuantity: batch.quantity,
          medicineName: batch.medicine.name,
        });
      }

      // 3. Overall discount & totals
      const overallDiscountAmt = (subtotal * (Number(discountPercent) || 0)) / 100;
      const rawGrandTotal = subtotal - overallDiscountAmt + totalGstAmount;
      const grandTotal = Math.round(rawGrandTotal);
      const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

      const numPaid = Math.min(Number(paidAmount) || 0, grandTotal);
      const remainingAmount = Math.max(0, grandTotal - numPaid);

      let paymentStatus = "UNPAID";
      if (remainingAmount <= 0) {
        paymentStatus = "PAID";
      } else if (numPaid > 0) {
        paymentStatus = "PARTIAL";
      }

      // 4. Find or create Customer if mobile is provided
      let customer = null;
      if (patientMobile && patientMobile.trim()) {
        const cleanMobile = patientMobile.trim();
        customer = await tx.customer.findUnique({
          where: { mobile: cleanMobile },
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: patientName,
              mobile: cleanMobile,
              address: patientAddress || null,
              totalPurchases: grandTotal,
              totalPaid: numPaid,
              balanceDue: remainingAmount,
            },
          });
        } else {
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: {
              name: patientName || customer.name,
              address: patientAddress || customer.address,
              totalPurchases: { increment: grandTotal },
              totalPaid: { increment: numPaid },
              balanceDue: { increment: remainingAmount },
            },
          });
        }
      }

      // 5. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: customer ? customer.id : null,
          patientName,
          patientMobile: patientMobile || null,
          patientAddress: patientAddress || null,
          doctorId: doctorId || null,
          doctorName: doctorName || null,
          subtotal: Math.round(subtotal * 100) / 100,
          discountPercent: Number(discountPercent) || 0,
          discountAmount: Math.round(overallDiscountAmt * 100) / 100,
          taxableAmount: Math.round(subtotal * 100) / 100,
          cgstAmount: Math.round(cgstAmount * 100) / 100,
          sgstAmount: Math.round(sgstAmount * 100) / 100,
          totalGstAmount: Math.round(totalGstAmount * 100) / 100,
          roundOff,
          grandTotal,
          paidAmount: numPaid,
          remainingAmount,
          paymentStatus,
          paymentMethod,
          notes,
        },
      });

      // 6. Create Invoice Items and decrement batch stock
      for (const item of processedItems) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            medicineId: item.medicineId,
            batchId: item.batchId,
            quantity: item.quantity,
            pack: item.pack,
            expiryDate: item.expiryDate,
            mrp: item.mrp,
            unitPrice: item.unitPrice,
            discount: item.discount,
            gstRate: item.gstRate,
            cgstAmount: item.cgstAmount,
            sgstAmount: item.sgstAmount,
            amount: item.amount,
          },
        });

        // Decrement Batch stock
        await tx.batch.update({
          where: { id: item.batchId },
          data: {
            quantity: { decrement: item.quantity },
          },
        });

        // Record Stock Movement
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            batchId: item.batchId,
            type: "SALE",
            quantity: -item.quantity,
            reason: `Invoice #${invoiceNumber}`,
            referenceId: invoice.id,
          },
        });
      }

      // 7. If paid amount > 0, record Payment
      if (numPaid > 0 && customer) {
        const payment = await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            customerId: customer.id,
            amount: numPaid,
            paymentMethod,
            notes: `Initial bill payment for ${invoiceNumber}`,
          },
        });

        // Ledger entry for invoice debit
        await tx.customerLedger.create({
          data: {
            customerId: customer.id,
            type: "INVOICE",
            description: `Invoice #${invoiceNumber}`,
            referenceId: invoice.id,
            debit: grandTotal,
            credit: 0,
            balance: customer.balanceDue,
          },
        });

        // Ledger entry for payment credit
        await tx.customerLedger.create({
          data: {
            customerId: customer.id,
            type: "PAYMENT",
            description: `Payment for Invoice #${invoiceNumber} via ${paymentMethod}`,
            referenceId: payment.id,
            debit: 0,
            credit: numPaid,
            balance: customer.balanceDue,
          },
        });
      } else if (customer) {
        // Unpaid ledger entry
        await tx.customerLedger.create({
          data: {
            customerId: customer.id,
            type: "INVOICE",
            description: `Invoice #${invoiceNumber} (UNPAID)`,
            referenceId: invoice.id,
            debit: grandTotal,
            credit: 0,
            balance: customer.balanceDue,
          },
        });
      }

      return invoice;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

