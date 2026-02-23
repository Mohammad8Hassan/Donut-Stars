import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { user, pwd } = await req.json();

  if (!user || !pwd) {
    return NextResponse.json({ message: "Fields are required." }, { status: 400 });
  }

  try {
    const hashedPwd = await bcrypt.hash(pwd, 10);
    const q = "INSERT INTO users (`username`, `password`) VALUES (?, ?)";

    await db.query(q, [user, hashedPwd]);

    return NextResponse.json({ message: "User registered successfully" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
