import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { findAssignedUser, getStoreSettings, updateStoreSettings } from "@/lib/userStore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, username, password, storeName } = body;
    const identifier = String(username || email || "").trim().toLowerCase();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username and password are required to login." },
        { status: 400 }
      );
    }

    let authenticatedUser: any = null;

    // 1. Check live database "AllowedLogin" table (manually assigned by developer in Supabase)
    if (process.env.DATABASE_URL) {
      try {
        const allowed = await prisma.allowedLogin.findFirst({
          where: {
            username: { equals: identifier, mode: "insensitive" },
          },
        });

        if (allowed) {
          if (!allowed.active) {
            return NextResponse.json(
              { error: "Account deactivated: This login has been disabled in the database." },
              { status: 403 }
            );
          }

          // Support both plain text manual password and bcrypt hashed password
          let isValid = false;
          if (allowed.password === password) {
            isValid = true;
          } else {
            try {
              isValid = await verifyPassword(password, allowed.password);
            } catch {}
          }

          if (isValid) {
            authenticatedUser = {
              id: allowed.id,
              name: allowed.name || allowed.username,
              username: allowed.username,
              email: `${allowed.username}@medicalpro.local`,
              role: allowed.role || "ADMIN",
            };
          } else {
            return NextResponse.json({ error: "Incorrect password entered" }, { status: 401 });
          }
        }
      } catch (dbError: unknown) {
        console.warn("AllowedLogin lookup warning (checking secondary user sources):", dbError);
      }
    }

    // 2. Secondary check against live database "User" table
    if (!authenticatedUser && process.env.DATABASE_URL) {
      try {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: identifier, mode: "insensitive" } },
              { email: { equals: identifier, mode: "insensitive" } },
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

          let isValid = false;
          if (user.passwordHash === password) {
            isValid = true;
          } else {
            try {
              isValid = await verifyPassword(password, user.passwordHash);
            } catch {}
          }

          // Allow dev fallback password for eduvikku@007
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
          } else {
            return NextResponse.json({ error: "Incorrect password entered" }, { status: 401 });
          }
        }
      } catch (dbError: unknown) {
        console.warn("Database user lookup warning, checking fallback store:", dbError);
      }
    }

    // 3. Fallback accounts (eduvikku@007, admin, pharmacist)
    if (!authenticatedUser) {
      const assigned = findAssignedUser(identifier);
      if (assigned) {
        if (!assigned.active) {
          return NextResponse.json(
            { error: "Account deactivated: This login has been disabled." },
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
            "Access denied: This username is not registered in the AllowedLogin table. Only assigned accounts can sign in.",
        },
        { status: 401 }
      );
    }

    // 4. Update Store Name if provided (from Store Login page)
    const cleanStoreName =
      storeName && typeof storeName === "string" && storeName.trim()
        ? storeName.trim()
        : null;

    let currentStore = getStoreSettings();
    if (cleanStoreName) {
      currentStore = updateStoreSettings({ storeName: cleanStoreName });

      if (process.env.DATABASE_URL) {
        try {
          const dbUpdated = await prisma.storeSettings.upsert({
            where: { id: "default" },
            update: { storeName: cleanStoreName },
            create: { id: "default", storeName: cleanStoreName },
          });
          currentStore = { ...currentStore, ...dbUpdated, storeName: cleanStoreName };
        } catch (dbErr) {
          console.warn("Could not persist storeName to live database:", dbErr);
        }
      }
    }

    const finalStoreName = cleanStoreName || currentStore.storeName;

    const userWithStore = {
      ...authenticatedUser,
      storeName: finalStoreName,
    };

    // 5. Establish Session Cookie with storeName
    await setSessionCookie(userWithStore, finalStoreName);

    return NextResponse.json({
      success: true,
      user: userWithStore,
      store: {
        ...currentStore,
        storeName: finalStoreName,
      },
    });
  } catch (error: unknown) {
    const msg = (error as Error).message || "";
    return NextResponse.json(
      {
        error: msg.includes("DATABASE_URL")
          ? "Database connecting: Use assigned account eduvikku@007 / admin123."
          : msg,
      },
      { status: 500 }
    );
  }
}
