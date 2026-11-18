import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import prisma from "./prisma";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "medical-pro-super-secret-key-2026"
);

const COOKIE_NAME = "medical_session";

export interface SessionUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: string;
  storeName?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    storeName: user.storeName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      name: payload.name as string,
      username: (payload.username as string) || undefined,
      email: payload.email as string,
      role: payload.role as string,
      storeName: (payload.storeName as string) || undefined,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser, storeName?: string) {
  const finalStoreName = storeName || user.storeName;
  const sessionUser: SessionUser = {
    ...user,
    storeName: finalStoreName,
  };

  const token = await createSessionToken(sessionUser);
  const cookieStore = await cookies();

  // 1. Session auth cookie
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // 2. Client & Server readable active store name cookie
  if (finalStoreName) {
    cookieStore.set("medical_store_name", encodeURIComponent(finalStoreName), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete("medical_store_name");
}
