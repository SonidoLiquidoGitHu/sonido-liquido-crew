import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

/**
 * Admin login endpoint.
 * Validates username/password credentials against the users table in the DB,
 * creates a session, and sets an HTTP-only cookie with the session token.
 *
 * Login is by USERNAME only (no email).
 * Password hashing uses SHA-256 with a salt (stored as part of the hash).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Auto-seed: Ensure the default admin user exists.
    // We check SPECIFICALLY for the SLC admin user (not just "any user").
    // This handles both fresh DBs and migration from old credentials.
    // Credentials come from ADMIN_USERNAME/ADMIN_PASSWORD env vars,
    // with defaults: SLC / lacremaynata
    try {
      const adminUsername = process.env.ADMIN_USERNAME || "SLC";
      const adminPassword = process.env.ADMIN_PASSWORD || "lacremaynata";

      // Check if the expected admin user exists by name
      const [existingAdmin] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.name, adminUsername))
        .limit(1);

      if (!existingAdmin) {
        console.log(`[Auth] Admin user "${adminUsername}" not found — creating default admin`);
        const salt = randomBytes(16).toString("hex");
        const hashedPassword = salt + ":" + createHash("sha256")
          .update(salt + adminPassword)
          .digest("hex");

        await db.insert(users).values({
          id: crypto.randomUUID(),
          email: `${adminUsername.toLowerCase()}@sonidoliquido.com`,
          passwordHash: hashedPassword,
          name: adminUsername,
          role: "admin",
          isActive: true,
        });
        console.log(`[Auth] Default admin user created: "${adminUsername}"`);
      }
    } catch (seedError) {
      console.warn("[Auth] Auto-seed failed (may be expected if users table doesn't exist yet):", seedError);
    }

    // Look up user by username (name field) only
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.name, username.trim()))
      .limit(1);

    if (!user) {
      console.log(`[Auth] Login failed: user "${username}" not found`);
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      console.log(`[Auth] Login failed: user "${user.name}" is inactive`);
      return NextResponse.json(
        { success: false, error: "Account is disabled" },
        { status: 403 }
      );
    }

    // Verify password
    const passwordMatch = verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      console.log(`[Auth] Login failed: wrong password for user "${user.name}"`);
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create session token
    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store session in DB
    await db.insert(sessions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      token: sessionToken,
      expiresAt,
    });

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    console.log(`[Auth] User "${user.name}" logged in successfully`);

    // Set HTTP-only cookie with session token
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Verify a password against a stored hash.
 * Supports:
 *   1. SHA-256 salted hash format: "salt:hash"
 *   2. Plain text (for initial setup / migration)
 */
function verifyPassword(password: string, storedHash: string): boolean {
  // If the stored hash contains a colon, it's a salted hash
  if (storedHash.includes(":")) {
    const [salt, hash] = storedHash.split(":");
    const computedHash = createHash("sha256")
      .update(salt + password)
      .digest("hex");
    return computedHash === hash;
  }

  // Plain text comparison (for initial setup)
  return password === storedHash;
}
