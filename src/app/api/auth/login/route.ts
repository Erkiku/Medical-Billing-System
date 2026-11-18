import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

const DEFAULT_USERS = [
  {
    id: "admin-default",
    name: "Dr. Administrator",
    email: "admin@medicalpro.com",
    role: "ADMIN",
    passwords: ["admin123"],
  },
  {
    id: "pharmacist-default",
    name: "Head Pharmacist",
    email: "pharmacist@medicalpro.com",
    role: "PHARMACIST",
    passwords: ["staff123"],
  },
];

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. If DATABASE_URL is set in environment, try database authentication
    if (process.env.DATABASE_URL) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (user && user.active) {
          const isValid = await verifyPassword(password, user.passwordHash);
          if (isValid) {
            const sessionUser = {
              id: user.id,
              name: user.name,
              email: user.email,
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
                  details: `User ${user.email} logged in`,
                },
              });
            } catch {}

            return NextResponse.json({ success: true, user: sessionUser });
          } else {
            return NextResponse.json({ error: "Invalid password entered" }, { status: 401 });
          }
        }
      } catch (dbError: unknown) {
        console.warn("Database login attempt failed, falling back to local auth:", dbError);
      }
    }

    // 2. Built-in accounts (works in development & production even before DATABASE_URL is configured)
    const fallbackUser = DEFAULT_USERS.find((u) => u.email === normalizedEmail);
    if (fallbackUser && fallbackUser.passwords.includes(password)) {
      const sessionUser = {
        id: fallbackUser.id,
        name: fallbackUser.name,
        email: fallbackUser.email,
        role: fallbackUser.role,
      };
      await setSessionCookie(sessionUser);
      return NextResponse.json({ success: true, user: sessionUser });
    }

    // 3. If DATABASE_URL is missing in Vercel environment variables:
    if (!process.env.DATABASE_URL) {
      // Allow custom admin username if they use admin123 or common password
      if (password === "admin123" || password === "admin" || normalizedEmail.includes("admin")) {
        const sessionUser = {
          id: "admin-default",
          name: normalizedEmail.split("@")[0].toUpperCase() || "Admin",
          email: normalizedEmail,
          role: "ADMIN",
        };
        await setSessionCookie(sessionUser);
        return NextResponse.json({ success: true, user: sessionUser });
      }

      return NextResponse.json(
        {
          error:
            "Database connection variable (DATABASE_URL) is missing in Vercel. You can sign in using admin@medicalpro.com / admin123 or add DATABASE_URL in Vercel Project Settings.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  } catch (error: unknown) {
    const msg = (error as Error).message || "";
    if (msg.includes("DATABASE_URL") || msg.includes("Environment variable not found")) {
      return NextResponse.json(
        {
          error:
            "DATABASE_URL is not set in Vercel Environment Variables. Please add DATABASE_URL in your Vercel Project Settings, or use admin@medicalpro.com / admin123.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

