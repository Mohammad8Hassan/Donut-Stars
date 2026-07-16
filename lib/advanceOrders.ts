import { db } from "@/lib/db";

export type AdvanceResult = {
  advancedToOutForDelivery: number;
  advancedToCompleted: number;
};

export async function advanceOrders(): Promise<AdvanceResult> {
  // Complete deliveries first so an order that is already out_for_delivery
  // gets completed before we advance any preparing orders this tick.
  // This prevents a single tick from skipping out_for_delivery entirely when
  // both ready_at and delivery_due_at have already passed (e.g. old orders).
  const [delivResult]: any = await db.query(`
    UPDATE orders
    SET
      status       = 'completed',
      completed_at = COALESCE(completed_at, NOW())
    WHERE status          = 'out_for_delivery'
      AND delivery_due_at IS NOT NULL
      AND delivery_due_at <= NOW()
  `);

  console.log(`[cron] advanced ${delivResult?.affectedRows ?? 0} orders to completed`);

  // Then move preparing orders to out_for_delivery. These will be eligible
  // for completion no earlier than the next cron tick.
  const [prepResult]: any = await db.query(`
    UPDATE orders
    SET
      status     = 'out_for_delivery',
      shipped_at = COALESCE(shipped_at, NOW())
    WHERE status   = 'preparing'
      AND ready_at IS NOT NULL
      AND ready_at <= NOW()
  `);

  console.log(`[cron] advanced ${prepResult?.affectedRows ?? 0} orders to out_for_delivery`);

  return {
    advancedToCompleted:      Number(delivResult?.affectedRows ?? 0),
    advancedToOutForDelivery: Number(prepResult?.affectedRows ?? 0),
  };
}
