import { createServerFn } from "@tanstack/react-start";
import {
  clearEntries,
  setConfig,
  getConfig,
  getEntries,
  type SimConfig,
  type WebhookEntry,
} from "./webhook-store";

export const getWebhookState = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ entries: WebhookEntry[]; config: SimConfig }> => {
    return { entries: await getEntries(), config: await getConfig() };
  },
);

export const updateConfig = createServerFn({ method: "POST" })
  .inputValidator((input: Partial<SimConfig>) => input)
  .handler(async ({ data }): Promise<SimConfig> => {
    return await setConfig(data);
  });

export const clearLogs = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    await clearEntries();
    return { ok: true };
  },
);
