import { NextResponse } from "next/server";
import { fetchMenu } from "@/lib/menu";

export async function GET() {
  // console.log("[GET /api/menu] Starting menu fetch from DB");

  try {
    const menu = await fetchMenu();

    // console.log(
    //   "[GET /api/menu] Menu payload prepared:",
    //   { donuts: menu.donuts.length, drinks: menu.drinks.length, boxes: menu.boxes.length }
    // );

    return NextResponse.json(menu);
  } catch (error) {
    console.error("GET /api/menu error:", error);
    return NextResponse.json(
      { error: "Failed to load menu" },
      { status: 500 }
    );
  }
}
