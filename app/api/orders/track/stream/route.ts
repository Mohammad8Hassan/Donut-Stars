import { NextResponse } from "next/server";
import { fetchTrackedOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

const POLL_MS = 4000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = Number(searchParams.get("orderId"));
  const phone = (searchParams.get("phone") ?? "").trim();

  if (!Number.isInteger(orderId) || orderId <= 0 || !phone) {
    return NextResponse.json({ error: "Order number and phone are required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      req.signal.addEventListener("abort", () => {
        closed = true;
      });

      const send = (data: unknown, event?: string) => {
        const eventLine = event ? `event: ${event}\n` : "";
        controller.enqueue(encoder.encode(`${eventLine}data: ${JSON.stringify(data)}\n\n`));
      };

      let lastPayload = "";

      while (!closed) {
        const order = await fetchTrackedOrder(orderId, phone).catch((err) => {
          console.error("GET /api/orders/track/stream error:", err);
          return undefined;
        });

        if (order === undefined) {
          send({ error: "Internal server error" }, "stream-error");
          break;
        }

        if (order === null) {
          send({ error: "No order found for that order number and phone" }, "not-found");
          break;
        }

        const payload = JSON.stringify(order);
        if (payload !== lastPayload) {
          send(order);
          lastPayload = payload;
        }

        if (order.status === "completed" || order.status === "cancelled") {
          break;
        }

        await sleep(POLL_MS);
      }

      if (!closed) {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
