// In-memory store for webhook requests + simulator config.
// Module-level singleton — survives across server function calls within
// the same worker instance. Intended for QA / dev usage.

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

type Store = {
  entries: WebhookEntry[];
  config: SimConfig;
};

const g = globalThis as unknown as { __webhookStore?: Store };

if (!g.__webhookStore) {
  g.__webhookStore = {
    entries: [],
    config: {
      statusCode: 200,
      delaySeconds: 0,
      dropConnection: false,
      allowedMethods: ["GET", "POST", "HEAD"],
    },
  };
} else if (!g.__webhookStore.config.allowedMethods) {
  g.__webhookStore.config.allowedMethods = ["GET", "POST", "HEAD"];
}

export const store = g.__webhookStore;

export function addEntry(e: WebhookEntry) {
  store.entries.unshift(e);
  if (store.entries.length > 200) store.entries.length = 200;
}

export function clearEntries() {
  store.entries.length = 0;
}

export function setConfig(patch: Partial<SimConfig>) {
  store.config = { ...store.config, ...patch };
}
