import { NextResponse } from "next/server";
import { fetchMenu } from "@/lib/menu";

// Same reasoning as app/page.tsx's `dynamic` export: without this, Next
// treats this route as static (no build-time-unfriendly APIs used) and
// tries to cache its response at build time, which both fails builds on
// hosts without DB access during the build step and — if it didn't fail —
// would freeze the menu API to a stale snapshot forever.
export const dynamic = "force-dynamic";

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
