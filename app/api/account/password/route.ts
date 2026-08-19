import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getUserWithRoleById } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";

// 5 attempts per 15 minutes per user — mirrors the login endpoint's limit,
// guarding against a hijacked/stolen session being used to brute-force the
// current password before setting a new one.
const PASSWORD_CHANGE_ATTEMPT_LIMIT = 5;
const PASSWORD_CHANGE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from your current password" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const rateLimitKey = `password-change:${userId}`;
    const rateLimit = checkRateLimit(rateLimitKey, PASSWORD_CHANGE_ATTEMPT_LIMIT, PASSWORD_CHANGE_WINDOW_MS);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const foundUser = await getUserWithRoleById(userId);

    if (!foundUser || !foundUser.password_hash) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const match = await bcrypt.compare(currentPassword, foundUser.password_hash);

    if (!match) {
      // 400, not 401 — this route is already session-authenticated, and
      // authFetch() treats any 401 as "access token expired" and silently
      // retries the request after refreshing. A 401 here would trigger that
      // retry for a wrong-password response, wasting a rate-limit attempt.
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Successful match — clear this key's failed-attempt count, same reasoning
    // as the login route (a few mistyped attempts shouldn't leave a cooldown).
    resetRateLimit(rateLimitKey);

    const newHash = await bcrypt.hash(newPassword, 10);

    // Null out refresh_token_hash alongside the password update, same as
    // /api/logout — this signs out any other session (or a stolen refresh
    // token) the next time it tries to silently refresh, without disrupting
    // the current tab until its short-lived access token naturally expires.
    await db.execute(
      "UPDATE users SET password_hash = ?, refresh_token_hash = NULL WHERE id = ?",
      [newHash, userId]
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("POST /api/account/password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
