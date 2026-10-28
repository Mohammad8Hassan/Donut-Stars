import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, verifyAccessToken } from "@/lib/session";
import { fetchOrderHistory } from "@/lib/orders";

export const dynamic = "force-dynamic";

const POLL_MS = 4000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);

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
