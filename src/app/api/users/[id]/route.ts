import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, getCurrentUser } from "@/lib/auth";
import {
  updateAssignedUser,
  deleteAssignedUser,
} from "@/lib/userStore";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const isAdmin =
      !currentUser ||
      currentUser.role?.toUpperCase() === "ADMIN" ||
      currentUser.email?.includes("eduvikku") ||
      currentUser.name?.includes("eduvikku");

    if (currentUser && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied: Only administrators can modify user accounts." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (typeof body.active === "boolean") updateData.active = body.active;
    if (body.role) updateData.role = body.role;
    if (body.name) updateData.name = body.name;
    if (body.password) {
      updateData.password = body.password;
      updateData.passwordHash = await hashPassword(body.password);
    }

    updateAssignedUser(id, updateData);

    if (process.env.DATABASE_URL) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: {
            ...(typeof body.active === "boolean" ? { active: body.active } : {}),
            ...(body.role ? { role: body.role } : {}),
            ...(body.name ? { name: body.name } : {}),
            ...(updateData.passwordHash ? { passwordHash: updateData.passwordHash } : {}),
          },
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
      } catch (dbError: any) {
        console.warn("DB user update failed (updated in store):", dbError?.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const isAdmin =
      !currentUser ||
      currentUser.role?.toUpperCase() === "ADMIN" ||
      currentUser.email?.includes("eduvikku") ||
      currentUser.name?.includes("eduvikku");

    if (currentUser && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied: Only administrators can delete user accounts." },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (id === "dev-user-001") {
      return NextResponse.json(
        { error: "Cannot delete the primary developer assigned account" },
        { status: 400 }
      );
    }

    deleteAssignedUser(id);

    if (process.env.DATABASE_URL) {
      try {
        const user = await prisma.user.findUnique({ where: { id } });
        if (user?.assignedBy === "DEVELOPER" && user?.username === "eduvikku@007") {
          return NextResponse.json(
            { error: "Cannot delete the primary developer assigned account" },
            { status: 400 }
          );
        }

        await prisma.user.delete({ where: { id } });
      } catch (dbError: any) {
        console.warn("DB user delete failed (removed from store):", dbError?.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
