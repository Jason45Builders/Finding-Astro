export function corsHeaders(origin: string | null): Record<string, string> {
  const corsOrigin = process.env.CORS_ORIGIN ?? "";
  const allowed = corsOrigin.split(",").map(o => o.trim()).filter(Boolean);
  if (!origin || process.env.NODE_ENV === "development") {
    return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" };
  }
  if (allowed.includes(origin)) {
    return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" };
  }
  return { "Access-Control-Allow-Origin": "" };
}

export function withCors<T>(handler: (req: NextRequest) => Promise<T>): (req: NextRequest) => Promise<T> {
  return async (req: NextRequest) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const result = await handler(req);
    if (result instanceof Response) {
      const headers = new Headers(result.headers);
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => headers.set(k, v));
      return new Response(result.body, { status: result.status, headers });
    }
    return result;
  };
}
