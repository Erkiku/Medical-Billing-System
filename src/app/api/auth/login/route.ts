import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { getStoreSettings, updateStoreSettings } from "@/lib/userStore";

const GENERIC_AUTH_ERROR = "Authentication Access Denied";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, username, password, storeName } = body;
    const identifier = String(username || email || "").trim().toLowerCase();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: GENERIC_AUTH_ERROR },
        { status: 401 }
      );
    }

    let authenticatedUser: any = null;

    // 1. Strictly authenticate against live database "AllowedLogin" table (Supabase)
    if (process.env.DATABASE_URL) {
      try {
        const allowed = await prisma.allowedLogin.findFirst({
          where: {
            username: { equals: identifier, mode: "insensitive" },
          },
        });

        if (allowed) {
          // If deactivated in database, reject with generic denied error
          if (!allowed.active) {
            return NextResponse.json(
              { error: GENERIC_AUTH_ERROR },
              { status: 401 }
            );
          }

          // Support both direct plain text password and bcrypt hash
          let isValid = false;
          const cleanAllowedPass = String(allowed.password || "").trim();
          const cleanInputPass = String(password || "").trim();

          if (cleanAllowedPass === cleanInputPass || allowed.password === password) {
            isValid = true;
          } else {
            try {
              isValid = await verifyPassword(password, allowed.password);
            } catch {}
          }

          if (isValid) {
            const role = String(allowed.role || "ADMIN").trim();
            authenticatedUser = {
              id: allowed.id,
              name: allowed.name || allowed.username,
              username: allowed.username,
              email: `${allowed.username}@medicalpro.local`,
              role: role,
              storeName: allowed.storeName ? allowed.storeName.trim() : null,
            };
          } else {
            return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
          }
        }
      } catch (dbError: unknown) {
        console.error("AllowedLogin lookup error:", dbError);
        return NextResponse.json(
          { error: GENERIC_AUTH_ERROR },
          { status: 401 }
        );
      }
    } else {
      console.error("DATABASE_URL is missing in environment");
      return NextResponse.json(
        { error: GENERIC_AUTH_ERROR },
        { status: 401 }
      );
    }

    // If not found in AllowedLogin table or credentials did not match, deny access
    if (!authenticatedUser) {
      return NextResponse.json(
        { error: GENERIC_AUTH_ERROR },
        { status: 401 }
      );
    }

    // 2. Resolve Store Name (prefer input if given, otherwise use storeName from AllowedLogin table)
    const inputStoreName =
      storeName && typeof storeName === "string" && storeName.trim()
        ? storeName.trim()
        : null;

    const assignedStoreName = authenticatedUser.storeName || null;
    const finalTargetStore = inputStoreName || assignedStoreName;

    let currentStore = getStoreSettings();
    if (finalTargetStore) {
      currentStore = updateStoreSettings({ storeName: finalTargetStore });

      if (process.env.DATABASE_URL) {
        try {
          const dbUpdated = await prisma.storeSettings.upsert({
            where: { id: "default" },
            update: { storeName: finalTargetStore },
            create: { id: "default", storeName: finalTargetStore },
          });
          currentStore = { ...currentStore, ...dbUpdated, storeName: finalTargetStore };
        } catch (dbErr) {
          console.warn("Could not persist storeName to live database:", dbErr);
        }
      }
    }

    const finalStoreName = finalTargetStore || currentStore.storeName;

    const userWithStore = {
      ...authenticatedUser,
      storeName: finalStoreName,
    };

    // 3. Establish Session Cookie with storeName
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
    console.error("Login route internal error:", error);
    return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
  }
}
