import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

// Developer provisioned accounts (guaranteed to work in both live DB & offline fallback mode)
const DEVELOPER_ASSIGNED_USERS = [
  {
    id: "dev-user-001",
    name: "Eduvikku Admin",
    username: "eduvikku@007",
    email: "eduvikku@medicalpro.com",
    role: "ADMIN",
    passwords: ["admin123", "admin"],
  },
  {
    id: "dev-user-002",
    name: "System Admin",
    username: "admin",
    email: "admin@medicalpro.com",
    role: "ADMIN",
    passwords: ["admin123"],
  },
  {
    id: "dev-user-003",
    name: "Staff Pharmacist",
    username: "pharmacist",
    email: "pharmacist@medicalpro.com",
    role: "PHARMACIST",
    passwords: ["staff123", "admin123"],
  },
];

export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json();
    const identifier = String(username || email || "").trim().toLowerCase();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username or Email and password are required" },
        { status: 400 }
      );
    }

    // 1. If DATABASE_URL is configured, verify against live database User table
    if (process.env.DATABASE_URL) {
      try {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: identifier },
              { email: identifier },
            ],
          },
        });

        if (!user) {
          return NextResponse.json(
            {
              error:
                "Access denied: This username is not assigned in the system. Only selected accounts assigned by developer or admin can login.",
            },
            { status: 401 }
          );
        }

        if (!user.active) {
          return NextResponse.json(
            {
              error: "Account deactivated: This login has been disabled by the admin.",
            },
            { status: 403 }
          );
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (isValid) {
          const sessionUser = {
            id: user.id,
            name: user.name,
            email: user.email || `${user.username}@medicalpro.local`,
            role: user.role,
          };

          await setSessionCookie(sessionUser);

          try {
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "LOGIN",
                entity: "User",
                entityId: user.id,
                details: `User ${user.username || user.email} logged in successfully`,
              },
            });
          } catch {}

          return NextResponse.json({ success: true, user: sessionUser });
        } else {
          return NextResponse.json({ error: "Incorrect password entered" }, { status: 401 });
        }
      } catch (dbError: unknown) {
        console.warn("Database lookup error, checking developer provisioned list:", dbError);
      }
    }

    // 2. Developer provisioned fallback (works instantly even when DATABASE_URL is not yet connected on Vercel)
    const devUser = DEVELOPER_ASSIGNED_USERS.find(
      (u) =>
        u.username.toLowerCase() === identifier ||
        u.email.toLowerCase() === identifier
    );

    if (devUser && devUser.passwords.includes(password)) {
      const sessionUser = {
        id: devUser.id,
        name: devUser.name,
        email: devUser.email,
        role: devUser.role,
      };
      await setSessionCookie(sessionUser);
      return NextResponse.json({ success: true, user: sessionUser });
    }

    // If identifier is not in the assigned accounts:
    return NextResponse.json(
      {
        error:
          "Access denied: Only selected usernames provided by developer (e.g. eduvikku@007) or assigned by admin can login.",
      },
      { status: 401 }
    );
  } catch (error: unknown) {
    const msg = (error as Error).message || "";
    return NextResponse.json(
      {
        error: msg.includes("DATABASE_URL")
          ? "Database connecting: Use developer assigned account eduvikku@007 / admin123."
          : msg,
      },
      { status: 500 }
    );
  }
}

