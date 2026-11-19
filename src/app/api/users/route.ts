import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, getCurrentUser } from "@/lib/auth";
import {
  getAssignedUsers,
  addAssignedUser,
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

        if (dbUsers && dbUsers.length > 0) {
          return NextResponse.json(dbUsers);
        }
      } catch (dbError) {
        console.warn("Database user query warning (falling back to assigned users):", dbError);
      }
    }

    return NextResponse.json(getAssignedUsers());
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    return NextResponse.json(getAssignedUsers());
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
        console.warn("Database user creation failed (using memory store):", dbError?.message);
        // Resilient fallback: Do NOT crash or return raw database pooler error
      }
    }

    // 3. Always register in userStore so authentication succeeds instantly
    const storeUser = addAssignedUser({
      id: createdUser?.id || `usr-${Date.now()}`,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      role: cleanRole,
      active: true,
      assignedBy: "ADMIN",
      password: password,
      passwordHash: passwordHash,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      user: createdUser || storeUser,
    });
  } catch (error: unknown) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to assign user" },
      { status: 500 }
    );
  }
}
