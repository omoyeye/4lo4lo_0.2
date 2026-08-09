import { getRealTimeService } from "@/lib/sse";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/sse — per-user realtime notification stream.
 *
 * SECURITY: the subscriber id comes from the session, never from the query
 * string. Previously this route read `?userId=` with no authentication at all,
 * so anyone could open /api/sse?userId=<n> and receive another account's
 * private notifications. The query parameter is now ignored entirely.
 */
export async function GET(_request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ message: "Invalid session" }, { status: 401 });
  }

  let cleanup: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const realTimeService = getRealTimeService();
      cleanup = realTimeService.addClient(controller, userId);

      // Proxies drop idle connections; a comment frame every 25s keeps the
      // stream alive without the client having to reconnect in a loop.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
        } catch {
          // Controller already closed — cancel() will clean up.
        }
      }, 25_000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable proxy buffering (nginx) so events arrive immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
