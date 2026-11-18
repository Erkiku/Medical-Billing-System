import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    if (process.env.DATABASE_URL) {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get("search") || "";

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { hospitalOrClinic: { contains: search } },
          { registrationNumber: { contains: search } },
        ];
      }

      const doctors = await prisma.doctor.findMany({
        where,
        orderBy: { name: "asc" },
      });

      return NextResponse.json(doctors);
    }
    return NextResponse.json([]);
  } catch (error: unknown) {
    console.warn("Doctors query error, returning empty list:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, hospitalOrClinic, mobile, address, registrationNumber } = body;

    if (!name) {
      return NextResponse.json({ error: "Doctor name is required" }, { status: 400 });
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        hospitalOrClinic,
        mobile,
        address,
        registrationNumber,
      },
    });

    return NextResponse.json(doctor, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

