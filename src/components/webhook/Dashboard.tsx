import { useEffect, useState } from "react";
import { Activity, Pause, Play, Trash2, Zap, AlertTriangle, Copy, Check, Radio } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  getWebhookState,
  updateConfig,
  clearLogs,
} from "@/server/webhook-functions";
import type { SimConfig, WebhookEntry } from "@/server/webhook-store";
import { WebhookCard } from "@/components/webhook/WebhookCard";

const STATUS_OPTIONS = [
  { code: 200, label: "200 OK" },
  { code: 201, label: "201 Created" },
  { code: 202, label: "202 Accepted" },
  { code: 204, label: "204 No Content" },
  { code: 400, label: "400 Bad Request" },
  { code: 401, label: "401 Unauthorized" },
  { code: 403, label: "403 Forbidden" },
  { code: 404, label: "404 Not Found" },
  { code: 408, label: "408 Request Timeout" },
  { code: 418, label: "418 I'm a teapot" },
  { code: 429, label: "429 Too Many Requests" },
  { code: 500, label: "500 Internal Server Error" },
  { code: 502, label: "502 Bad Gateway" },
  { code: 503, label: "503 Service Unavailable" },
  { code: 504, label: "504 Gateway Timeout" },
];

export function Dashboard() {
  const getState = useServerFn(getWebhookState);
  const updateCfg = useServerFn(updateConfig);
  const clear = useServerFn(clearLogs);

  const [entries, setEntries] = useState<WebhookEntry[]>([]);
  const [config, setConfig] = useState<SimConfig>({
    statusCode: 200,
    delaySeconds: 0,
    dropConnection: false,
    allowedMethods: ["GET", "POST", "HEAD"],
  });
  const [polling, setPolling] = useState(true);
  const [endpoint, setEndpoint] = useState("/api/webhook");
  const [copied, setCopied] = useState(false);

  // Build full endpoint URL on the client
  useEffect(() => {
    if (typeof window !== "undefined") {
      setEndpoint(`${window.location.origin}/api/webhook`);
    }
  }, []);

  // Initial + polling fetch
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const s = await getState();
        if (cancelled) return;
        setEntries(s.entries);
        setConfig(s.config);
      } catch {
        // ignore
      }
      if (!cancelled && polling) {
        timer = setTimeout(tick, 1500);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [polling, getState]);

  const patchConfig = async (patch: Partial<SimConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next); // optimistic
    try {
      const saved = await updateCfg({ data: patch });
      setConfig(saved);
    } catch {
      // ignore
    }
  };

  const onClear = async () => {
    await clear();
    setEntries([]);
  };

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-panel-border bg-card/30 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/30 grid place-items-center">
              <Radio size={16} className="text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">
                Webhook Simulator
              </h1>
              <p className="text-[11px] text-muted-foreground font-mono">
                Mock ITSM endpoint · QA hostile-environment testing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-2xl">
            <div className="flex-1 flex items-center gap-2 rounded-md border border-panel-border bg-background/60 px-3 py-1.5 font-mono text-xs">
              <span className="text-success">POST</span>
              <span className="text-muted-foreground truncate">{endpoint}</span>
              <button
                onClick={copyEndpoint}
                className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                aria-label="Copy endpoint URL"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <button
              onClick={() => setPolling((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-md border border-panel-border bg-secondary/40 hover:bg-secondary px-3 py-1.5 text-xs font-mono text-foreground"
            >
              {polling ? <Pause size={12} /> : <Play size={12} />}
              {polling ? "Live" : "Paused"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Control Panel */}
        <aside className="space-y-4">
          <ControlPanel
            config={config}
            onChange={patchConfig}
            onClear={onClear}
            entryCount={entries.length}
          />
          <UsageHint endpoint={endpoint} />
        </aside>

        {/* Live feed */}
        <section className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Activity size={14} />
              Live request feed
              <span className="font-mono normal-case tracking-normal text-foreground ml-1">
                {entries.length}
              </span>
            </div>
            {polling && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-success">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                streaming
              </span>
            )}
          </div>

          {entries.length === 0 ? (
            <EmptyState endpoint={endpoint} />
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-1 scrollbar-thin">
              {entries.map((e) => (
                <WebhookCard key={e.id} entry={e} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ControlPanel({
  config,
  onChange,
  onClear,
  entryCount,
}: {
  config: SimConfig;
  onChange: (p: Partial<SimConfig>) => void;
  onClear: () => void;
  entryCount: number;
}) {
  return (
    <div className="rounded-lg border border-panel-border bg-panel">
      <div className="px-4 py-3 border-b border-panel-border flex items-center gap-2">
        <Zap size={14} className="text-warning" />
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          Hostile environment
        </h2>
      </div>

      <div className="p-4 space-y-5">
        {/* Allowed Methods */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
            Logged Methods
          </label>
          <div className="flex gap-4 items-center flex-wrap">
            {["GET", "POST", "HEAD"].map(method => (
              <label key={method} className="flex items-center gap-1.5 text-sm font-mono text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.allowedMethods?.includes(method) ?? true}
                  onChange={(e) => {
                    const current = config.allowedMethods || ["GET", "POST", "HEAD"];
                    const next = e.target.checked 
                      ? [...current, method] 
                      : current.filter(m => m !== method);
                    onChange({ allowedMethods: next });
                  }}
                  className="accent-primary h-3.5 w-3.5"
                />
                {method}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Only selected methods will be logged in the dashboard. Unselected methods are silently handled.
          </p>
        </div>

        {/* Status code */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
            HTTP Response Code
          </label>
          <select
            value={config.statusCode}
            onChange={(e) => onChange({ statusCode: Number(e.target.value) })}
            disabled={config.dropConnection}
            className="w-full rounded-md border border-panel-border bg-background/80 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground">
            Response returned to every incoming request.
          </p>
        </div>

        {/* Delay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
              Artificial delay
            </label>
            <span className="font-mono text-xs text-foreground">
              {config.delaySeconds}s
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={config.delaySeconds}
            onChange={(e) => onChange({ delaySeconds: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={30}
              value={config.delaySeconds}
              onChange={(e) =>
                onChange({
                  delaySeconds: Math.max(0, Math.min(30, Number(e.target.value) || 0)),
                })
              }
              className="w-20 rounded-md border border-panel-border bg-background/80 px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-[11px] text-muted-foreground">
              seconds (0–30) before responding
            </span>
          </div>
        </div>

        {/* Drop connection */}
        <div className="flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <AlertTriangle size={14} className="text-destructive" />
              Simulate connection drop
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Aggressively close the socket without sending HTTP headers.
            </p>
          </div>
          <Switch
            checked={config.dropConnection}
            onChange={(v) => onChange({ dropConnection: v })}
          />
        </div>

        {/* Clear */}
        <button
          onClick={onClear}
          disabled={entryCount === 0}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-panel-border bg-secondary/40 hover:bg-destructive/15 hover:border-destructive/40 hover:text-destructive transition-colors px-3 py-2 text-xs font-mono disabled:opacity-40 disabled:hover:bg-secondary/40 disabled:hover:text-current disabled:hover:border-panel-border"
        >
          <Trash2 size={14} />
          Clear all logs {entryCount > 0 && `(${entryCount})`}
        </button>
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors ${
        checked
          ? "bg-destructive/80 border-destructive"
          : "bg-secondary border-panel-border"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-foreground shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        } translate-y-[1px]`}
      />
    </button>
  );
}

function UsageHint({ endpoint }: { endpoint: string }) {
  return (
    <div className="rounded-lg border border-panel-border bg-panel p-4 space-y-2">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
        Quick test
      </h3>
      <pre className="font-mono text-[11px] leading-relaxed text-foreground bg-background/80 border border-panel-border rounded p-2 overflow-auto whitespace-pre-wrap break-all">
{`curl -X POST ${endpoint} \\
  -H "Authorization: Bearer test-token" \\
  -H "Content-Type: application/json" \\
  -d '{"alert":"disk_full","severity":"critical","host":"app-01","メッセージ":"テスト"}'`}
      </pre>
    </div>
  );
}

function EmptyState({ endpoint }: { endpoint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-panel-border bg-panel/40 p-12 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 border border-primary/30 grid place-items-center mb-4">
        <Radio size={20} className="text-primary" />
      </div>
      <h3 className="text-sm font-medium text-foreground">Awaiting webhooks…</h3>
      <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
        POST any payload to{" "}
        <span className="text-foreground">{endpoint}</span>
      </p>
    </div>
  );
}
