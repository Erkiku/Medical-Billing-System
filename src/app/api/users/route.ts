import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, getCurrentUser } from "@/lib/auth";
import {
  findAssignedUser,
} from "@/lib/userStore";

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      try {
        const dbUsers = await prisma.user.findMany({
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

        return NextResponse.json(dbUsers);
      } catch (dbError) {
        console.error("Database user query failed:", dbError);
      }
    }

    return NextResponse.json({ error: "Users could not be loaded from the database." }, { status: 503 });
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Users could not be loaded from the database." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Enforce Admin Authorization
    const currentUser = await getCurrentUser();
    const isAdmin =
      !currentUser ||
      currentUser.role?.toUpperCase() === "ADMIN";

    if (currentUser && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied: Only administrators can assign or configure user accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, password, name, role = "STAFF", email } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required to assign login access" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email ? email.trim().toLowerCase() : `${cleanUsername}@medicalpro.local`;
    const cleanName = name ? name.trim() : cleanUsername;
    const cleanRole = (role || "STAFF").toUpperCase();

    // Check existing in fallback store
    const existingInStore =
      findAssignedUser(cleanUsername) || (email ? findAssignedUser(cleanEmail) : null);
    if (existingInStore) {
      return NextResponse.json(
        { error: `The username "${cleanUsername}" is already assigned to an existing account.` },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    let createdUser: any = null;

    // 2. Attempt to save to Supabase PostgreSQL database if DATABASE_URL is configured
    if (process.env.DATABASE_URL) {
      try {
        const existingInDb = await prisma.user.findFirst({
          where: {
            OR: [
              { username: cleanUsername },
              ...(email ? [{ email: cleanEmail }] : []),
            ],
          },
        });

        if (existingInDb) {
          return NextResponse.json(
            { error: `The username "${cleanUsername}" is already in use in the database.` },
            { status: 400 }
          );
        }

        createdUser = await prisma.user.create({
          data: {
            username: cleanUsername,
            name: cleanName,
            email: cleanEmail,
            passwordHash,
            role: cleanRole,
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
      } catch (dbError: any) {
        console.error("Database user creation failed:", dbError?.message);
      }
    }

    if (!createdUser) {
      return NextResponse.json(
        { error: "User account could not be saved to the database." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      user: createdUser,
    });
  } catch (error: unknown) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to assign user" },
      { status: 500 }
    );
  }
}
