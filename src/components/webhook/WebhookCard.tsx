import { useState } from "react";
import { ChevronRight, Copy, Check, KeyRound, ServerCrash, Clock, Globe } from "lucide-react";
import type { WebhookEntry } from "@/server/webhook-store";
import { highlightJson } from "@/lib/json-highlight";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function statusTone(status: number | null) {
  if (status == null) return "bg-destructive/15 text-destructive border-destructive/40";
  if (status >= 500) return "bg-destructive/15 text-destructive border-destructive/40";
  if (status >= 400) return "bg-warning/15 text-warning border-warning/40";
  if (status >= 300) return "bg-info/15 text-info border-info/40";
  if (status >= 200) return "bg-success/15 text-success border-success/40";
  return "bg-muted text-muted-foreground border-border";
}

function formatTs(iso: string) {
  const d = new Date(iso);
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function dateLine(iso: string) {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").replace("Z", " UTC");
}

const SENSITIVE_HEADERS = ["authorization", "x-api-key", "x-auth-token", "cookie"];

export function WebhookCard({ entry }: { entry: WebhookEntry }) {
  const [copied, setCopied] = useState(false);

  const headerEntries = Object.entries(entry.headers).sort(([a], [b]) => {
    const aS = SENSITIVE_HEADERS.includes(a.toLowerCase()) ? 0 : 1;
    const bS = SENSITIVE_HEADERS.includes(b.toLowerCase()) ? 0 : 1;
    return aS - bS || a.localeCompare(b);
  });

  const isJsonLike =
    entry.contentType.includes("json") ||
    (typeof entry.bodyParsed === "object" && entry.bodyParsed !== null);

  const prettyBody = isJsonLike
    ? highlightJson(entry.bodyParsed)
    : escapeBody(entry.bodyRaw);

  const copyBody = async () => {
    const txt = isJsonLike
      ? JSON.stringify(entry.bodyParsed, null, 2)
      : entry.bodyRaw;
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="w-full rounded-lg border border-panel-border bg-panel overflow-hidden cursor-pointer hover:border-primary/40 transition-colors text-left group">
          {/* Header bar (Compact) */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-card/40">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                {entry.method}
              </span>
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded border ${statusTone(entry.respondedStatus)}`}
                title={entry.dropped ? "Connection dropped (no headers sent)" : "Simulated response"}
              >
                {entry.dropped ? (
                  <span className="inline-flex items-center gap-1">
                    <ServerCrash size={12} /> DROPPED
                  </span>
                ) : (
                  entry.respondedStatus
                )}
              </span>
              {entry.delayMs > 0 && (
                <span className="font-mono text-xs px-2 py-0.5 rounded border border-warning/40 text-warning bg-warning/10 inline-flex items-center gap-1">
                  <Clock size={12} /> +{(entry.delayMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono shrink-0">
              <span className="inline-flex items-center gap-1">
                <Globe size={12} /> {entry.sourceIp}
              </span>
              <span className="text-foreground">{formatTs(entry.timestamp)}</span>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </div>

          {/* Subline */}
          <div className="px-4 py-2 text-[11px] font-mono text-muted-foreground border-t border-panel-border/60 truncate bg-panel/50 flex items-center justify-between">
            <div>
              {dateLine(entry.timestamp)} · {entry.contentType || "(no content-type)"} · {entry.bodyRaw ? `${entry.bodyRaw.length} bytes` : "empty body"}
            </div>
            {headerEntries.some(([k]) => SENSITIVE_HEADERS.includes(k.toLowerCase())) && (
              <span className="inline-flex items-center gap-1 text-warning/80 shrink-0 ml-2">
                <KeyRound size={10} /> auth
              </span>
            )}
          </div>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[95vw] sm:max-w-xl md:max-w-2xl overflow-hidden p-0 flex flex-col gap-0 border-panel-border bg-background">
        <SheetHeader className="p-6 border-b border-panel-border bg-card/40 shrink-0 text-left space-y-0">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-sm px-2.5 py-1 rounded bg-secondary text-secondary-foreground font-medium">
              {entry.method}
            </span>
            <span
              className={`font-mono text-sm px-2.5 py-1 rounded border font-medium ${statusTone(entry.respondedStatus)}`}
            >
              {entry.dropped ? "DROPPED" : entry.respondedStatus}
            </span>
            <SheetTitle className="sr-only">Request Details</SheetTitle>
            <SheetDescription className="sr-only">Detailed inspection of the captured webhook request.</SheetDescription>
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground font-mono">
            <span className="text-foreground"><Globe size={13} className="inline mr-1 text-muted-foreground" /> {entry.sourceIp}</span>
            <span><Clock size={13} className="inline mr-1" /> {dateLine(entry.timestamp)}</span>
            <span>ID: {entry.id}</span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
          {/* Headers section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground tracking-tight flex items-center gap-2">
                Headers
                <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  {headerEntries.length}
                </span>
              </h3>
              {headerEntries.some(([k]) => SENSITIVE_HEADERS.includes(k.toLowerCase())) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning border border-warning/30 bg-warning/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <KeyRound size={10} /> Contains Auth
                </span>
              )}
            </div>
            <div className="font-mono text-xs rounded-md border border-panel-border bg-panel overflow-hidden divide-y divide-panel-border/60">
              {headerEntries.map(([k, v]) => {
                const sensitive = SENSITIVE_HEADERS.includes(k.toLowerCase());
                return (
                  <div key={k} className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-4 px-4 py-2 hover:bg-card/40 transition-colors">
                    <span className={sensitive ? "text-warning" : "text-accent"}>{k}</span>
                    <span className="text-foreground break-all">{v}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Body section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground tracking-tight flex items-center gap-2">
                Payload
                <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  {entry.bodyRaw ? `${entry.bodyRaw.length} bytes` : "Empty"}
                </span>
              </h3>
              {entry.bodyRaw && (
                <button
                  onClick={copyBody}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] uppercase tracking-wider font-medium text-foreground bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            
            <div className="rounded-md border border-panel-border bg-panel overflow-hidden">
              {entry.bodyRaw ? (
                <div className="p-4 overflow-auto scrollbar-thin">
                  <pre
                    className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: prettyBody }}
                  />
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground italic">
                  This request contained no body payload.
                </div>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function escapeBody(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
