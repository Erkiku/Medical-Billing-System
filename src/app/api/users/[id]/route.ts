import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (typeof body.active === "boolean") updateData.active = body.active;
    if (body.role) updateData.role = body.role;
    if (body.name) updateData.name = body.name;
    if (body.password) {
      updateData.passwordHash = await hashPassword(body.password);
    }

    if (process.env.DATABASE_URL) {
      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          active: true,
          assignedBy: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({ success: true, user: updated });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (process.env.DATABASE_URL) {
      const user = await prisma.user.findUnique({ where: { id } });
      if (user?.assignedBy === "DEVELOPER" && user?.username === "eduvikku@007") {
        return NextResponse.json(
          { error: "Cannot delete the primary developer assigned account" },
          { status: 400 }
        );
      }

      await prisma.user.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
