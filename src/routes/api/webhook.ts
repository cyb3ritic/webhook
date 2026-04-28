import { createFileRoute } from "@tanstack/react-router";
import { addEntry, getConfig, type WebhookEntry } from "@/server/webhook-store";

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  408: "Request Timeout",
  418: "I'm a teapot",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

function nowIsoMs() {
  return new Date().toISOString();
}

function getClientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

async function handle(request: Request) {
  const cfg = await getConfig();
  const headersObj: Record<string, string> = {};
  request.headers.forEach((v, k) => {
    headersObj[k] = v;
  });
  const contentType = request.headers.get("content-type") || "";
  const sourceIp = getClientIp(request);
  const ts = nowIsoMs();

  let bodyRaw = "";
  let bodyParsed: import("@/server/webhook-store").JsonValue = null;
  try {
    bodyRaw = await request.text();
    if (bodyRaw) {
      if (contentType.includes("application/json")) {
        try {
          bodyParsed = JSON.parse(bodyRaw);
        } catch {
          bodyParsed = bodyRaw;
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(bodyRaw);
        const o: Record<string, string> = {};
        params.forEach((v, k) => {
          o[k] = v;
        });
        bodyParsed = o;
      } else {
        // try JSON anyway
        try {
          bodyParsed = JSON.parse(bodyRaw);
        } catch {
          bodyParsed = bodyRaw;
        }
      }
    }
  } catch {
    bodyRaw = "";
  }

  const delayHeadersMs = Math.max(0, Math.min(30, cfg.delayHeadersSeconds)) * 1000;
  const delayBodyMs = Math.max(0, Math.min(30, cfg.delayBodySeconds)) * 1000;

  const entry: WebhookEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: ts,
    method: request.method,
    sourceIp,
    url: request.url,
    headers: headersObj,
    bodyRaw,
    bodyParsed,
    contentType,
    respondedStatus: cfg.dropConnection ? null : cfg.statusCode,
    delayHeadersMs,
    delayBodyMs,
    dropped: cfg.dropConnection,
  };

  if ((cfg.allowedMethods || []).includes(request.method)) {
    await addEntry(entry);
  }

  if (delayHeadersMs > 0) {
    await new Promise((r) => setTimeout(r, delayHeadersMs));
  }

  if (cfg.dropConnection) {
    // Aggressively drop: return a stream we immediately error.
    const stream = new ReadableStream({
      start(controller) {
        controller.error(new Error("Connection dropped by simulator"));
      },
    });
    return new Response(stream, { status: 502 });
  }

  const status = cfg.statusCode;
  const statusText = STATUS_TEXT[status] || "";
  const bodyString =
    status === 204
      ? null
      : JSON.stringify({
          ok: status >= 200 && status < 300,
          status,
          message: statusText || "Response from webhook simulator",
          receivedAt: ts,
          id: entry.id,
        });

  if (delayBodyMs > 0 && bodyString !== null) {
    const stream = new ReadableStream({
      async start(controller) {
        await new Promise((r) => setTimeout(r, delayBodyMs));
        controller.enqueue(new TextEncoder().encode(bodyString));
        controller.close();
      },
    });
    return new Response(stream, {
      status,
      statusText,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(bodyString, {
    status,
    statusText,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      PUT: async ({ request }) => handle(request),
      PATCH: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
      DELETE: async ({ request }) => handle(request),
      HEAD: async ({ request }) => handle(request),
      OPTIONS: async ({ request }) => handle(request),
    },
  },
});
