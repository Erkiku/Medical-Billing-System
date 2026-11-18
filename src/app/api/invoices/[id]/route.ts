import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getStoreSettings } from "@/lib/userStore";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let invoice: any = null;
    let store: any = null;

    if (process.env.DATABASE_URL) {
      try {
        invoice = await prisma.invoice.findFirst({
          where: {
            OR: [{ id }, { invoiceNumber: id }],
          },
          include: {
            customer: true,
            doctor: true,
            items: {
              include: {
                medicine: true,
                batch: true,
              },
            },
            payments: {
              orderBy: { paidAt: "asc" },
            },
          },
        });

        store = await prisma.storeSettings.findUnique({
          where: { id: "default" },
        });
      } catch (dbErr) {
        console.warn("Database invoice lookup warning:", dbErr);
      }
    }

    if (!store) {
      store = { ...getStoreSettings() };
    }

    // Prioritize active store name from cookies / session
    try {
      const cookieStore = await cookies();
      const rawCookie = cookieStore.get("medical_store_name")?.value;
      const cookieStoreName = rawCookie ? decodeURIComponent(rawCookie).trim() : null;
      const currentUser = await getCurrentUser();
      const activeStoreName = currentUser?.storeName?.trim() || cookieStoreName;

      if (activeStoreName) {
        store.storeName = activeStoreName;
      }
    } catch {}

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found", store }, { status: 404 });
    }

    return NextResponse.json({ invoice, store });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
