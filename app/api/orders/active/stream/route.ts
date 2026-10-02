import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, verifyAccessToken } from "@/lib/session";
import { fetchOrderHistory } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Same cadence as the track stream (app/api/orders/track/stream/route.ts) —
// see that file's comment for why this can be tighter than the old 15s
// client poll despite running more often.
const POLL_MS = 4000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// GET /api/orders/active/stream
//
// Session-gated SSE counterpart to GET /api/orders/active. Same self-
// terminating loop pattern as the track stream — see that file for the full
// rationale — except the exit condition here is "the active list is empty"
// rather than "a single order went terminal", since fetchOrderHistory's
// activeOnly filter already keeps a just-finished order in the list for
// TERMINAL_STATUS_GRACE_SECONDS (lib/orderStatus.ts) before dropping it, so
// the client still gets to render the terminal state before this closes.
//
// One extra wrinkle versus the guest track stream: this endpoint is
// session-gated, and this connection can plausibly stay open longer than
// the 15-minute access token's lifetime (baseQueryWithReauth in
// app/store/orderApi.ts exists for exactly this reason on the polling
// side). EventSource can't send custom Authorization headers, so there's no
// way to "refresh the header" on an open connection — instead, the loop
// re-verifies the access token cookie on every tick, and if it's expired,
// sends a "reauth" event and closes. The client (orderApi.ts) listens for
// that, calls POST /api/refresh to get a new access token cookie, and opens
// a fresh EventSource — see openOrderStream's "reauth" handling.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);

  // Captured once, up front, rather than calling cookies()/getSession()
  // again inside the async loop below — next/headers' cookies() is scoped
  // to the request's AsyncLocalStorage context, and it's not worth relying
  // on that context still being valid many seconds/minutes into a streaming
  // response. verifyAccessToken() is a pure function (just jwt.verify on
  // the token string), so re-checking expiry from this captured value has
  // no such dependency.
  const accessToken = cookies().get("accessToken")?.value ?? "";

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
        // Check token expiry before doing any work this tick — no point
        // querying the DB for a session that's no longer valid.
        if (!verifyAccessToken(accessToken)) {
          send({}, "reauth");
          break;
        }

        const orders = await fetchOrderHistory(userId, { activeOnly: true }).catch((err) => {
          console.error("GET /api/orders/active/stream error:", err);
          return undefined;
        });

        if (orders === undefined) {
          send({ error: "Internal server error" }, "stream-error");
          break;
        }

        const payload = JSON.stringify(orders);
        if (payload !== lastPayload) {
          send(orders);
          lastPayload = payload;
        }

        if (orders.length === 0) {
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
