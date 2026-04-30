import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

export type WebhookEntry = {
  id: string;
  timestamp: string; // ISO with ms
  method: string;
  sourceIp: string;
  url: string;
  headers: Record<string, string>;
  bodyRaw: string;
  bodyParsed: JsonValue;
  contentType: string;
  respondedStatus: number | null; // null = connection dropped
  delayMs: number;
  dropped: boolean;
};

export type SimConfig = {
  statusCode: number;
  delaySeconds: number;
  dropConnection: boolean;
  allowedMethods: string[];
};

const DEFAULT_CONFIG: SimConfig = {
  statusCode: 200,
  delaySeconds: 0,
  dropConnection: false,
  allowedMethods: ["GET", "POST", "HEAD"],
};

export async function addEntry(e: WebhookEntry) {
  await redis.lpush("webhook:entries", e);
  await redis.ltrim("webhook:entries", 0, 199);
}

export async function getEntries(): Promise<WebhookEntry[]> {
  const entries = await redis.lrange<WebhookEntry>("webhook:entries", 0, 199);
  return entries || [];
}

export async function clearEntries() {
  await redis.del("webhook:entries");
}

export async function getConfig(): Promise<SimConfig> {
  const cfg = await redis.get<SimConfig>("webhook:config");
  if (!cfg) return DEFAULT_CONFIG;
  if (!cfg.allowedMethods) {
    cfg.allowedMethods = ["GET", "POST", "HEAD"];
  }
  return cfg;
}

export async function setConfig(patch: Partial<SimConfig>) {
  const current = await getConfig();
  const next = { ...current, ...patch };
  await redis.set("webhook:config", next);
  return next;
}
