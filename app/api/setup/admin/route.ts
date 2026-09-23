import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";

type ExistingAdminRow = {
  id: number | string;
};

export async function POST(req: Request) {
  const setupKey = process.env.ADMIN_SETUP_KEY;

  if (!setupKey) {
    return NextResponse.json(
      { error: "ADMIN_SETUP_KEY is not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const providedKey = String(body?.setupKey ?? "");
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const phone =
    typeof body?.phone === "string" && body.phone.trim()
      ? body.phone.trim()
      : null;

  if (providedKey !== setupKey) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  const [adminRows]: any = await db.query(
    `
    SELECT u.id
    FROM users u
    INNER JOIN roles r
      ON r.id = u.role_id
    WHERE r.name = 'admin'
    LIMIT 1
    `
  );

  if ((adminRows as ExistingAdminRow[]).length > 0) {
    return NextResponse.json(
      { error: "An admin account already exists" },
      { status: 409 }
    );
  }

  const [existingUsers]: any = await db.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (existingUsers.length > 0) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 }
    );
  }

  const [roleRows]: any = await db.query(
    "SELECT id FROM roles WHERE name = 'admin' LIMIT 1"
  );

  if (!roleRows.length) {
    return NextResponse.json(
      { error: "'admin' role is not seeded" },
      { status: 500 }
    );
  }

  const adminRoleId = Number((roleRows[0] as ExistingAdminRow).id);
  const passwordHash = await bcrypt.hash(password, 10);

  const [result]: any = await db.query(
    `
    INSERT INTO users (role_id, name, email, password_hash, phone)
    VALUES (?, ?, ?, ?, ?)
    `,
    [adminRoleId, name, email, passwordHash, phone]
  );

  return NextResponse.json(
    {
      success: true,
      user: {
        id: Number(result.insertId),
        name,
        email,
        phone,
        roleId: adminRoleId,
        roleName: "admin",
      },
    },
    { status: 201 }
  );
}
