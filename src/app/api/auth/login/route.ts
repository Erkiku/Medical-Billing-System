import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { findAssignedUser, getStoreSettings, updateStoreSettings } from "@/lib/userStore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, username, password, storeName, isAdminLogin } = body;
    const identifier = String(username || email || "").trim().toLowerCase();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username and password are required to login." },
        { status: 400 }
      );
    }

    let authenticatedUser: any = null;

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

        if (user) {
          if (!user.active) {
            return NextResponse.json(
              { error: "Account deactivated: This login has been disabled by the admin." },
              { status: 403 }
            );
          }

          let isValid = await verifyPassword(password, user.passwordHash);
          // Allow dev fallback password for primary developer admin
          if (
            !isValid &&
            user.username === "eduvikku@007" &&
            (password === "admin123" || password === "admin")
          ) {
            isValid = true;
          }

          if (isValid) {
            authenticatedUser = {
              id: user.id,
              name: user.name,
              username: user.username,
              email: user.email || `${user.username}@medicalpro.local`,
              role: user.role,
            };

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
          } else {
            return NextResponse.json({ error: "Incorrect password entered" }, { status: 401 });
          }
        }
      } catch (dbError: unknown) {
        console.warn("Database lookup error, checking assigned users fallback:", dbError);
      }
    }

    // 2. Assigned accounts fallback (developer provisioned + admin-assigned accounts)
    if (!authenticatedUser) {
      const assigned = findAssignedUser(identifier);
      if (assigned) {
        if (!assigned.active) {
          return NextResponse.json(
            { error: "Account deactivated: This login has been disabled by the admin." },
            { status: 403 }
          );
        }

        let isValidPassword = false;
        if (
          assigned.password &&
          (assigned.password === password ||
            (assigned.username === "eduvikku@007" &&
              (password === "admin123" || password === "admin")) ||
            (assigned.username === "admin" &&
              (password === "admin123" || password === "admin")) ||
            (assigned.username === "pharmacist" &&
              (password === "staff123" ||
                password === "admin123" ||
                password === "admin")))
        ) {
          isValidPassword = true;
        } else if (assigned.passwordHash) {
          isValidPassword = await verifyPassword(password, assigned.passwordHash);
        }

        if (isValidPassword) {
          authenticatedUser = {
            id: assigned.id,
            name: assigned.name,
            username: assigned.username,
            email: assigned.email || `${assigned.username}@medicalpro.local`,
            role: assigned.role,
          };
        } else {
          return NextResponse.json({ error: "Incorrect password entered" }, { status: 401 });
        }
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          error:
            "Access denied: Only selected usernames provided by developer (e.g. eduvikku@007) or assigned by admin can login.",
        },
        { status: 401 }
      );
    }

    // 3. Admin Login Portal Gate: If logging in through Admin portal, enforce role === "ADMIN"
    const userIsAdmin =
      authenticatedUser.role?.toUpperCase() === "ADMIN" ||
      authenticatedUser.username === "eduvikku@007" ||
      authenticatedUser.username === "admin";

    if (isAdminLogin && !userIsAdmin) {
      return NextResponse.json(
        {
          error:
            "Access restricted: This portal is strictly for Administrators. Store staff and pharmacists please use the Store Login page.",
        },
        { status: 403 }
      );
    }

    // 4. Update Store Name if provided (from Store Login page)
    let currentStore = getStoreSettings();
    if (storeName && typeof storeName === "string" && storeName.trim()) {
      const cleanStoreName = storeName.trim();
      currentStore = updateStoreSettings({ storeName: cleanStoreName });

      if (process.env.DATABASE_URL) {
        try {
          const dbUpdated = await prisma.storeSettings.upsert({
            where: { id: "default" },
            update: { storeName: cleanStoreName },
            create: { id: "default", storeName: cleanStoreName },
          });
          currentStore = { ...currentStore, ...dbUpdated };
        } catch (dbErr) {
          console.warn("Could not persist storeName to live database:", dbErr);
        }
      }
    }

    // 5. Establish Session Cookie
    await setSessionCookie(authenticatedUser);

    return NextResponse.json({
      success: true,
      user: authenticatedUser,
      store: currentStore,
    });
  } catch (error: unknown) {
    const msg = (error as Error).message || "";
    return NextResponse.json(
      {
        error: msg.includes("DATABASE_URL")
          ? "Database connecting: Use developer assigned account eduvikku@007 / admin."
          : msg,
      },
      { status: 500 }
    );
  }
}
