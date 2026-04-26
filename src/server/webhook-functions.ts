import { createServerFn } from "@tanstack/react-start";
import {
  clearEntries,
  setConfig,
  store,
  type SimConfig,
  type WebhookEntry,
} from "./webhook-store";

export const getWebhookState = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ entries: WebhookEntry[]; config: SimConfig }> => {
    return { entries: store.entries, config: store.config };
  },
);

export const updateConfig = createServerFn({ method: "POST" })
  .inputValidator((input: Partial<SimConfig>) => input)
  .handler(async ({ data }): Promise<SimConfig> => {
    setConfig(data);
    return store.config;
  });

export const clearLogs = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    clearEntries();
    return { ok: true };
  },
);
