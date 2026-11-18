import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          active: true,
          assignedBy: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json(users);
    }

    // Fallback if database is offline
    return NextResponse.json([
      {
        id: "dev-user-001",
        name: "Eduvikku Admin",
        username: "eduvikku@007",
        email: "eduvikku@medicalpro.com",
        role: "ADMIN",
        active: true,
        assignedBy: "DEVELOPER",
        createdAt: new Date().toISOString(),
      },
      {
        id: "dev-user-002",
        name: "System Admin",
        username: "admin",
        email: "admin@medicalpro.com",
        role: "ADMIN",
        active: true,
        assignedBy: "DEVELOPER",
        createdAt: new Date().toISOString(),
      },
      {
        id: "dev-user-003",
        name: "Staff Pharmacist",
        username: "pharmacist",
        email: "pharmacist@medicalpro.com",
        role: "PHARMACIST",
        active: true,
        assignedBy: "DEVELOPER",
        createdAt: new Date().toISOString(),
      },
    ]);
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, name, role = "STAFF", email } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required to assign login access" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const passwordHash = await hashPassword(password);

    if (process.env.DATABASE_URL) {
      // Check existing
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { username: cleanUsername },
            ...(email ? [{ email: email.trim().toLowerCase() }] : []),
          ],
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "This username or email is already assigned to an existing account" },
          { status: 400 }
        );
      }

      const newUser = await prisma.user.create({
        data: {
          username: cleanUsername,
          name: name ? name.trim() : cleanUsername,
          email: email ? email.trim().toLowerCase() : `${cleanUsername}@medicalpro.local`,
          passwordHash,
          role: role || "STAFF",
          active: true,
          assignedBy: "ADMIN",
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          active: true,
          assignedBy: true,
          createdAt: true,
        },
      });

      return NextResponse.json({ success: true, user: newUser });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: `local-${Date.now()}`,
        name: name || cleanUsername,
        username: cleanUsername,
        role: role || "STAFF",
        active: true,
        assignedBy: "ADMIN",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
