import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "studio_form_owner";
const durationSeconds = 8 * 60 * 60;

function password() {
  const value = process.env.OWNER_PASSWORD;
  return value && value.length >= 24 ? value : undefined;
}

export function ownerEnabled() {
  return Boolean(password() && process.env.DATABASE_URL);
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function sign(expiry: string, secret: string) {
  return createHmac("sha256", secret).update(`studio-form-owner:${expiry}`).digest("hex");
}

export async function isOwner() {
  const secret = password();
  const token = (await cookies()).get(cookieName)?.value;
  if (!secret || !token) return false;
  const match = /^(\d+)\.([0-9a-f]{64})$/.exec(token);
  if (!match || Number(match[1]) <= Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(Buffer.from(match[2], "hex"), Buffer.from(sign(match[1], secret), "hex"));
}

export async function signIn(candidate: string) {
  const secret = password();
  if (!secret || !timingSafeEqual(digest(candidate), digest(secret))) return false;
  const expiry = String(Math.floor(Date.now() / 1000) + durationSeconds);
  (await cookies()).set(cookieName, `${expiry}.${sign(expiry, secret)}`, {
    httpOnly: true,
    sameSite: "strict",
    path: "/owner",
    secure: process.env.NODE_ENV === "production" && !process.env.APP_URL?.startsWith("http://"),
    maxAge: durationSeconds,
  });
  return true;
}

export async function signOut() {
  (await cookies()).set(cookieName, "", { path: "/owner", maxAge: 0 });
}
