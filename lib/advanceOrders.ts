import { db } from "@/lib/db";

export type AdvanceResult = {
  advancedToOutForDelivery: number;
  advancedToCompleted: number;
};

export async function advanceOrders(): Promise<AdvanceResult> {
  // Move preparing orders to out_for_delivery once ready_at has passed.
  const [prepResult]: any = await db.query(`
    UPDATE orders
    SET
      status     = 'out_for_delivery',
      shipped_at = COALESCE(shipped_at, NOW())
    WHERE status   = 'preparing'
      AND ready_at IS NOT NULL
      AND ready_at <= NOW()
  `);

  // Move out_for_delivery orders to completed once delivery_due_at has passed.
  const [delivResult]: any = await db.query(`
    UPDATE orders
    SET
      status       = 'completed',
      completed_at = COALESCE(completed_at, NOW())
    WHERE status          = 'out_for_delivery'
      AND delivery_due_at IS NOT NULL
      AND delivery_due_at <= NOW()
  `);

  return {
    advancedToOutForDelivery: Number(prepResult?.affectedRows ?? 0),
    advancedToCompleted:      Number(delivResult?.affectedRows ?? 0),
  };
}
