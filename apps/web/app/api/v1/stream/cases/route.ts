import { NextRequest } from "next/server";
import { authMiddleware } from "@/lib/auth-middleware";
import { CaseStreamEvent, getSubscribers, broadcastCaseEvent, heartbeatIntervalMs } from "@/lib/case-stream";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const userId = authResult.user.id;
  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");
  const types = url.searchParams.get("types")?.split(",").filter(Boolean) ?? [];

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) => controller.enqueue(encoder.encode(data));

      send("event: connected\ndata: {}\n\n");

      const subscribers = getSubscribers(userId);
      const handler = (event: CaseStreamEvent) => {
        if (caseId && event.caseId !== caseId) return;
        if (types.length > 0 && !types.includes(event.type)) return;
        send(`event: case\ndata: ${JSON.stringify(event)}\n\n`);
      };
      subscribers.add(handler);

      const heartbeat = setInterval(() => send(": heartbeat\n\n"), heartbeatIntervalMs);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        subscribers.delete(handler);
        if (subscribers.size === 0) {
          subscribers.delete(handler);
        }
        controller.close();
      });
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
