import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "ea_crm_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is not set (or too short). Set it in your .env file — see .env.example."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function verifyCredentials(email: string, password: string) {
  const expectedEmail = process.env.EA_LOGIN_EMAIL;
  const expectedHash = process.env.EA_LOGIN_PASSWORD_HASH;

  if (!expectedEmail || !expectedHash) {
    throw new Error(
      "EA_LOGIN_EMAIL / EA_LOGIN_PASSWORD_HASH are not configured. See .env.example and scripts/hash-password.js."
    );
  }

  if (email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) {
    return false;
  }

  return bcrypt.compare(password, expectedHash);
}

export async function createSession(email: string) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return { email: payload.email as string };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
