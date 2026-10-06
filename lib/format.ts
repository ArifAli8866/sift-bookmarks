/** Tiny formatting helpers — all pure, all unit-testable. */

export function domainOf(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  }
}

/** `developer.mozilla.org` + `/en-US/docs/Web/CSS` — shown in two tones. */
export function splitUrl(url: string): { host: string; path: string } {
  const host = domainOf(url);
  const idx = url.indexOf(host) + host.length;
  const path = idx > 0 ? url.slice(idx) : "";
  return { host, path: path.replace(/[?#].*$/, "") };
}

export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const u = new URL(candidate);
    if (!u.hostname.includes(".") && !/^localhost/.test(u.hostname)) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Each entry is the divisor to reach the *next* unit. */
const DIVISIONS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.34524, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
];

let rtf: Intl.RelativeTimeFormat | undefined;
function formatter(): Intl.RelativeTimeFormat {
  return (rtf ??= new Intl.RelativeTimeFormat("en", { numeric: "auto" }));
}

/** Compact relative time: `now`, `12m`, `3d`, `4mo` — never `1 day ago`. */
export function shortRelative(ts: number, now = Date.now()): string {
  const elapsed = (now - ts) / 1000;
  if (elapsed < 45) return "now";
  if (elapsed < 0) return "now";
  let value = -elapsed;
  for (const [divisor, unit] of DIVISIONS) {
    if (Math.abs(value) < divisor) {
      return compactRelative(formatter().format(Math.round(value), unit));
    }
    value /= divisor;
  }
  return "—";
}

const UNITS: [RegExp, string][] = [
  [/ second/, "s"],
  [/ minute/, "m"],
  [/ hour/, "h"],
  [/ day/, "d"],
  [/ week/, "w"],
  [/ month/, "mo"],
  [/ year/, "y"],
];

const SUFFIX: Record<string, string> = {
  second: "s",
  minute: "m",
  hour: "h",
  day: "d",
  week: "w",
  month: "mo",
  year: "y",
};

/** `yesterday` → `1d`, `in 3 days` → `3d`, `last week` → `1w`. */
export function compactRelative(text: string): string {
  const cleaned = text
    .replace(/^in\s+/i, "")
    .replace(/\s+ago$/i, "")
    .replace(/^(?:last|next)\s+/i, "")
    .trim();
  if (/^(?:yesterday|tomorrow)$/i.test(cleaned)) return "1d";
  const parts = /^(\d+)?\s*(second|minute|hour|day|week|month|year)s?$/i.exec(cleaned);
  if (!parts) return cleaned;
  const [, count, unit] = parts;
  return `${count ?? "1"}${SUFFIX[unit!.toLowerCase()] ?? ""}`;
}

let df: Intl.DateTimeFormat | undefined;
export function shortDate(ts: number): string {
  return (df ??= new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })).format(
    new Date(ts),
  );
}

/** Long, human date for tooltips and dialogs. */
export function fullDate(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}

export function uid(prefix = "b"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

/** Two-letter monogram used as a favicon fallback — deterministic per domain. */
export function monogram(host: string): string {
  const clean = host.replace(/^www\./, "");
  const parts = clean.split(/[.\-_]/).filter(Boolean);
  if (parts.length === 1) return (parts[0] ?? "?").slice(0, 2).toUpperCase();
  return ((parts[0] ?? "")[0] ?? "?").toUpperCase() + ((parts[1] ?? "")[0] ?? "").toUpperCase();
}
