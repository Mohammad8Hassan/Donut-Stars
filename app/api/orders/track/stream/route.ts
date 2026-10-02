import { NextResponse } from "next/server";
import { fetchTrackedOrder } from "@/lib/orders";

// Force this route to always run dynamically per-request rather than being
// statically analyzed/cached by Next — a streaming response can't be cached
// like a normal JSON route, and every connection needs its own live loop.
export const dynamic = "force-dynamic";

// How often the loop below re-checks the order while a client is connected.
// Tighter than the old 15s client-side poll interval since this only runs
// while someone's actually watching (see the loop's exit conditions below),
// so there's no 24/7 cost to being more responsive.
const POLL_MS = 4000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// GET /api/orders/track/stream?orderId=&phone=
//
// SSE version of GET /api/orders/track. This is what replaces client-side
// polling AND the external cron worker for this order: as long as the
// connection is open, the loop below calls fetchTrackedOrder() (which
// itself sweeps every pending order's status via advanceOrders() before
// reading — see lib/orders.ts) every POLL_MS, and pushes a message only
// when the order actually changed.
//
// The loop — and with it, this request/invocation — ends itself as soon as
// there's nothing left to usefully watch:
//   - the order reaches a terminal status (completed/cancelled), or
//   - the lookup stops matching (shouldn't normally happen mid-stream, but
//     handled defensively), or
//   - the client disconnects (tab closed, navigated away, EventSource
//     torn down by React unmount on the other end).
//
// That self-termination is the whole point on a serverless deployment:
// nothing keeps this function warm once nobody could possibly be watching
// it anymore, instead of an external job hitting the app on a fixed
// schedule forever regardless of whether any order even exists.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = Number(searchParams.get("orderId"));
  const phone = (searchParams.get("phone") ?? "").trim();

  // Same validation as the one-shot route — fail fast with a normal JSON
  // 400 rather than opening a stream that can never produce anything useful.
  if (!Number.isInteger(orderId) || orderId <= 0 || !phone) {
    return NextResponse.json({ error: "Order number and phone are required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Flipped by the abort listener below when the client disconnects;
      // checked at the top of every loop iteration so we stop promptly
      // instead of running one more DB round trip after nobody's listening.
      let closed = false;
      req.signal.addEventListener("abort", () => {
        closed = true;
      });

      // Writes one SSE frame. `event` is omitted for ordinary data pushes
      // (the client's default `EventSource.onmessage` picks those up);
      // "not-found" is a named event so the client can tell it apart from
      // EventSource's own built-in connection-level "error" event.
      const send = (data: unknown, event?: string) => {
        const eventLine = event ? `event: ${event}\n` : "";
        controller.enqueue(encoder.encode(`${eventLine}data: ${JSON.stringify(data)}\n\n`));
      };

      // Only re-send when something actually changed, so a client sitting
      // on an unchanging "preparing" order doesn't get a message every 4s
      // for no reason — cheaper for the client and easier to reason about.
      let lastPayload = "";

      while (!closed) {
        const order = await fetchTrackedOrder(orderId, phone).catch((err) => {
          console.error("GET /api/orders/track/stream error:", err);
          return undefined;
        });

        if (order === undefined) {
          // fetchTrackedOrder threw (DB hiccup, etc). Tell the client and
          // stop — EventSource will auto-reconnect and try again fresh.
          send({ error: "Internal server error" }, "stream-error");
          break;
        }

        if (order === null) {
          // No longer matches id+phone. Shouldn't happen in practice (an
          // order's id/phone don't change once placed), but if it ever did,
          // there's nothing left to stream.
          send({ error: "No order found for that order number and phone" }, "not-found");
          break;
        }

        const payload = JSON.stringify(order);
        if (payload !== lastPayload) {
          send(order);
          lastPayload = payload;
        }

        if (order.status === "completed" || order.status === "cancelled") {
          // Terminal — the client already has this final snapshot from the
          // send() above. Nothing left to watch, so let the stream end
          // instead of continuing to poll a finished order forever.
          break;
        }

        await sleep(POLL_MS);
      }

      // Don't double-close if the client already disconnected (`closed`
      // true from the abort listener) — the controller may already be torn
      // down in that case and calling close() again would throw.
      if (!closed) {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      // SSE responses must never be cached or buffered by intermediaries —
      // each frame needs to reach the client as soon as it's enqueued.
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
