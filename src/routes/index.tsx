import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/webhook/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Webhook Simulator — Mock ITSM Endpoint" },
      {
        name: "description",
        content:
          "QA dashboard to receive, log, and intentionally manipulate webhook responses (status codes, delays, dropped connections).",
      },
    ],
  }),
  component: Dashboard,
});
