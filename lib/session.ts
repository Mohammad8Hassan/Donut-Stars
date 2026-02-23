import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

type AccessTokenPayload = {
  userId: number;
  iat: number;
  exp: number;
};

export async function getSession() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  console.log("Access Token:", accessToken);

  if (!accessToken) return null;

  console.log("Verifying access token...");

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(accessToken, "shhhhh") as AccessTokenPayload;
  } catch {
    return null;
  }

  console.log("Access token valid, fetching user...");

  const [rows] = await db.execute<RowDataPacket[]>(
    `
      SELECT id, name, email, phone
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [payload.userId]
  );

  if (!rows.length) return null;

  return { user: rows[0] };
}
