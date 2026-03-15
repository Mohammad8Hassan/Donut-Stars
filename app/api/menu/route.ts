import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IBoxItem, IItem } from "@/types";

type MenuResponse = {
  donuts: IItem[];
  drinks: IItem[];
  boxes: IBoxItem[];
};

// Box items are identified in the DB by capacity (3/6/12) and menu category.
function isBoxCapacity(value: unknown): value is 3 | 6 | 12 {
  return value === 3 || value === 6 || value === 12;
}

export async function GET() {
  console.log("[GET /api/menu] Starting menu fetch from DB");

  try {
    const [rows]: any = await db.execute(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.image,
        p.tint,
        p.capacity,
        LOWER(TRIM(c.name)) AS category_name
      FROM products p
      INNER JOIN categories c
        ON c.id = p.category_id
      WHERE p.is_active = TRUE
      ORDER BY c.name ASC, p.name ASC
      `
    );

    // Ensure we always return the requested payload shape.
    const donuts: IItem[] = [];
    const drinks: IItem[] = [];
    const boxes: IBoxItem[] = [];

    console.log(`[GET /api/menu] DB returned ${rows?.length || 0} active product rows.`);

    // Classify each product row into menu buckets expected by the client.
    for (const row of rows as any[]) {
      const category = String(row.category_name || "").toLowerCase();
      const price = Number(row.price);
      const image = row.image ? String(row.image) : "";

      const baseItem: IItem = {
        id: String(row.id),
        name: String(row.name),
        image,
        price,
        discription: String(row.description || ""),
        tint: row.tint ? String(row.tint) : undefined,
      };

      console.log(
        `[GET /api/menu] Row -> id:${baseItem.id}, name:${baseItem.name}, category:${category}, capacity:${row.capacity}, price:${baseItem.price}`
      );

      if (category === "boxes" && isBoxCapacity(Number(row.capacity))) {
        boxes.push({
          ...baseItem,
          size: Number(row.capacity) as 3 | 6 | 12,
        });
        continue;
      }

      if (category === "drinks") {
        drinks.push(baseItem);
        continue;
      }

      donuts.push(baseItem);
    }

    const menu: MenuResponse = { donuts, drinks, boxes };

    console.log(
      "[GET /api/menu] Menu payload prepared:",
      { donuts: donuts.length, drinks: drinks.length, boxes: boxes.length }
    );

    return NextResponse.json(menu);
  } catch (error) {
    console.error("GET /api/menu error:", error);
    return NextResponse.json(
      { error: "Failed to load menu" },
      { status: 500 }
    );
  }
}
