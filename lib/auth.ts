import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { SessionUser } from "@/lib/session";

export type UserWithRoleRow = {
  id: number | string;
  email: string;
  name: string;
  phone: string | null;
  password_hash?: string;
  role_id: number | string;
  role_name: string;
  refresh_token_hash?: string | null;
};

export function signAccessToken(user: Pick<SessionUser, "id" | "roleId" | "roleName">) {
  return jwt.sign(
    {
      userId: user.id,
      roleId: user.roleId,
      roleName: user.roleName,
    },
    "shhhhh",
    { expiresIn: "15m" }
  );
}

export function signRefreshToken(userId: number) {
  return jwt.sign({ userId }, "shhhhhawy", { expiresIn: "7d" });
}

export function sanitizeUser(row: UserWithRoleRow): SessionUser {
  return {
    id: Number(row.id),
    email: row.email,
    name: row.name,
    phone: row.phone ?? null,
    roleId: Number(row.role_id),
    roleName: row.role_name,
  };
}

export async function getUserWithRoleByEmail(email: string): Promise<UserWithRoleRow | null> {
  const [rows]: any = await db.query(
    `
    SELECT
      u.id,
      u.email,
      u.name,
      u.phone,
      u.password_hash,
      u.role_id,
      r.name AS role_name,
      u.refresh_token_hash
    FROM users u
    INNER JOIN roles r
      ON r.id = u.role_id
    WHERE u.email = ?
    LIMIT 1
    `,
    [email]
  );

  return rows.length ? (rows[0] as UserWithRoleRow) : null;
}

export async function getUserWithRoleById(userId: number): Promise<UserWithRoleRow | null> {
  const [rows]: any = await db.query(
    `
    SELECT
      u.id,
      u.email,
      u.name,
      u.phone,
      u.password_hash,
      u.role_id,
      r.name AS role_name,
      u.refresh_token_hash
    FROM users u
    INNER JOIN roles r
      ON r.id = u.role_id
    WHERE u.id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows.length ? (rows[0] as UserWithRoleRow) : null;
}
