import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  roleId: number;
  roleName: string;
};

type SessionRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role_id: number;
  role_name: string;
};

export type SessionData = {
  user: SessionUser;
};

export type AccessTokenPayload = {
  userId: number;
  roleId: number;
  roleName: string;
  iat: number;
  exp: number;
};

function normalizeUser(row: SessionRow): SessionUser {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    roleId: Number(row.role_id),
    roleName: row.role_name,
  };
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, "shhhhh") as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function isAdminUser(user: Pick<SessionUser, "roleName">) {
  return user.roleName === "admin";
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) return null;

  const payload = verifyAccessToken(accessToken);
  if (!payload) return null;

  const [rows] = await db.execute<SessionRow[]>(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role_id,
        r.name AS role_name
      FROM users u
      INNER JOIN roles r
        ON r.id = u.role_id
      WHERE u.id = ?
      LIMIT 1
    `,
    [payload.userId]
  );

  if (!rows.length) return null;

  return { user: normalizeUser(rows[0]) };
}

export async function requireAdmin(): Promise<
  { session: SessionData; response?: never } | { session?: never; response: NextResponse }
> {
  const session = await getSession();

  if (!session) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!isAdminUser(session.user)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session };
}
