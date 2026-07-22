export async function register() {
  if (typeof globalThis.WebSocket === "undefined") {
    try {
      const ws = await import("ws");
      globalThis.WebSocket = (ws as any).default ?? ws;
    } catch {
      // ws not available; WebSocket may be natively present in Node 22+.
    }
  }
}

export const onRequestError = async (
  err: {
    digest?: string;
    message: string;
    stack?: string;
    source?: string;
    name: string;
  },
  request: {
    path: string;
    method: string;
    headers: { get: (k: string) => string | null };
  },
  context: { routerKind: string; routePath: string; routeType: string }
) => {
  console.error("[onRequestError]", {
    digest: err.digest,
    message: err.message,
    source: err.source,
    path: request.path,
    method: request.method,
    routeKind: context.routerKind,
    routePath: context.routePath,
  });
};
