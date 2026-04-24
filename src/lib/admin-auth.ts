import { createHmac, timingSafeEqual } from "crypto";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "SLC";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "lacremaynata";
const SECRET_KEY = process.env.ADMIN_SECRET_KEY ?? "SLC_ADMIN_SECRET_2024";
const COOKIE_NAME = "slc_admin_token";
const TOKEN_EXPIRY_SECONDS = 86400; // 24 hours

interface TokenPayload {
  user: string;
  exp: number;
}

/**
 * Creates an HMAC signature for the given data using the secret key.
 */
function createSignature(data: string): string {
  return createHmac("sha256", SECRET_KEY).update(data).digest("hex");
}

/**
 * Generates a signed token: base64(payload) + "." + hmac_signature
 */
export function generateToken(username: string): string {
  const payload: TokenPayload = {
    user: username,
    exp: Date.now() + TOKEN_EXPIRY_SECONDS * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = createSignature(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies a signed token. Returns the payload if valid, null otherwise.
 */
export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  // Verify signature using timing-safe comparison
  const expectedSignature = createSignature(payloadB64);
  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  // Decode payload
  try {
    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadB64, "base64").toString("utf-8")
    );

    // Check expiration
    if (!payload.user || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Validates username and password against configured credentials.
 */
export function validateCredentials(
  username: string,
  password: string
): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

/**
 * Returns the cookie configuration for the admin token.
 */
export function getCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TOKEN_EXPIRY_SECONDS,
  };
}

export { COOKIE_NAME };
