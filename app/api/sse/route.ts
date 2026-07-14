import { getRealTimeService } from '@/lib/sse';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userIdStr = url.searchParams.get('userId');
  const userId = userIdStr ? parseInt(userIdStr, 10) : undefined;

  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const realTimeService = getRealTimeService();
      cleanup = realTimeService.addClient(controller, userId);
    },
    cancel() {
      if (cleanup) {
        cleanup();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
