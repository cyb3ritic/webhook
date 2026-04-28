import type { JsonValue } from "@/server/webhook-store";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Returns HTML string with span tokens for syntax coloring.
export function highlightJson(value: JsonValue, indent = 2): string {
  const json = JSON.stringify(value, null, indent) ?? "null";
  // Token regex: strings (incl. keys), numbers, booleans, null
  const re =
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g;
  return escapeHtml(json).replace(re, (match) => {
    let cls = "tok-num";
    if (/^"/.test(match)) {
      cls = /:$/.test(match) ? "tok-key" : "tok-str";
    } else if (/true|false/.test(match)) {
      cls = "tok-bool";
    } else if (/null/.test(match)) {
      cls = "tok-null";
    }
    return `<span class="${cls}">${match}</span>`;
  });
}
