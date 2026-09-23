import { db } from "@/lib/db";
import { IBoxItem, IItem } from "@/types";

export type MenuResponse = {
  donuts: IItem[];
  drinks: IItem[];
  boxes: IBoxItem[];
};

function isBoxCapacity(value: unknown): value is 3 | 6 | 12 {
  return value === 3 || value === 6 || value === 12;
}

export async function fetchMenu(): Promise<MenuResponse> {
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
      COALESCE(
        GROUP_CONCAT(DISTINCT LOWER(TRIM(t.name)) ORDER BY t.name SEPARATOR ','),
        ''
      ) AS tag_names,
      LOWER(TRIM(c.name)) AS category_name
    FROM products p
    INNER JOIN categories c
      ON c.id = p.category_id
    LEFT JOIN product_tags pt
      ON pt.product_id = p.id
    LEFT JOIN tags t
      ON t.id = pt.tag_id
    WHERE p.is_active = TRUE
    GROUP BY
      p.id,
      p.name,
      p.description,
      p.price,
      p.image,
      p.tint,
      p.capacity,
      c.name
    ORDER BY c.name ASC, p.name ASC
    `
  );

  const donuts: IItem[] = [];
  const drinks: IItem[] = [];
  const boxes: IBoxItem[] = [];

  for (const row of rows as any[]) {
    const category = String(row.category_name || "").toLowerCase();
    const price = Number(row.price);
    const image = row.image ? String(row.image) : "";
    const tags = String(row.tag_names || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const baseItem: IItem = {
      id: String(row.id),
      name: String(row.name),
      image,
      price,
      discription: String(row.description || ""),
      tint: row.tint ? String(row.tint) : undefined,
      tags,
    };

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

  return { donuts, drinks, boxes };
}
