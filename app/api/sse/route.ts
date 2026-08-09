import { getRealTimeService } from "@/lib/sse";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/*
 * Deployment reality: this app runs on Vercel serverless functions, where an
 * open SSE stream pins a function invocation for its entire lifetime. Left
 * unbounded, each connection ran until the platform killed it, and
 * "Vercel Runtime Timeout Error: Task timed out after 300 seconds" is the most
 * frequent runtime error on this project.
 *
 * Two costs to that: every connected user burned a 300-second invocation
 * continuously, and each held-open invocation keeps a serverless instance (and
 * therefore its MySQL connection pool) alive, multiplying database connections.
 *
 * So the stream now closes itself well before the limit and asks the client to
 * reconnect. A planned 45-second cycle is cheap, predictable, and turns a hard
 * platform timeout into a normal reconnect.
 *
 * If realtime becomes central, move it off serverless functions to a hosted
 * pub/sub service (Ably, Pusher, Supabase Realtime) rather than raising this.
 */
export const maxDuration = 60;

/** How long a single stream lives before asking the client to reconnect. */
const STREAM_LIFETIME_MS = 45_000;

/**
 * GET /api/sse, per-user realtime notification stream.
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
  let lifetime: ReturnType<typeof setTimeout> | undefined;

  const release = () => {
    if (heartbeat) clearInterval(heartbeat);
    if (lifetime) clearTimeout(lifetime);
    if (cleanup) cleanup();
    heartbeat = undefined;
    lifetime = undefined;
    cleanup = undefined;
  };

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const realTimeService = getRealTimeService();
      cleanup = realTimeService.addClient(controller, userId);

      // Proxies drop idle connections; a comment frame keeps the stream alive
      // for the short time it is open.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          // Controller already closed, cancel() will clean up.
        }
      }, 15_000);

      // Close on our own terms, before the platform does it for us.
      lifetime = setTimeout(() => {
        try {
          // Tell the client this is a planned cycle, not a failure, so it can
          // reconnect immediately instead of backing off as if it were an error.
          controller.enqueue(
            encoder.encode(
              `event: reconnect\ndata: ${JSON.stringify({
                reason: "stream-lifetime",
              })}\n\n`
            )
          );
          controller.close();
        } catch {
          // Already closed.
        } finally {
          release();
        }
      }, STREAM_LIFETIME_MS);
    },
    cancel() {
      release();
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
