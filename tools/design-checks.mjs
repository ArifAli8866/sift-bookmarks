/**
 * Design + formatting contract checks. `npm run check`.
 *
 * Three groups, all cheap and all real:
 *   1. relative-time / url helpers (the strings that appear in every card)
 *   2. the fuzzy matcher behind ⌘K ranking
 *   3. a CSS token lint — every `var(--x)` used in app/*.css must be defined,
 *      because a typo'd custom property fails silently at paint time.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "node_modules", ".cache", "sift-checks");
mkdirSync(outDir, { recursive: true });

/** Transpile the pure helpers so node can run them without a loader. */
function loadTs(rel) {
  const src = readFileSync(join(root, rel), "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const file = join(outDir, rel.replace(/[\\/]/g, "_").replace(/\.ts$/, ".cjs"));
  writeFileSync(file, outputText);
  return require(file);
}

const f = loadTs("lib/format.ts");
const m = loadTs("lib/match.ts");

let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) console.log(`  ok   ${label}`);
  else {
    fail++;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
};
const eq = (label, got, want) => ok(`${label} = ${JSON.stringify(want)}`, got === want, `got ${JSON.stringify(got)}`);

/* ------------------------------- 1. time ------------------------------- */
console.log("\nformat — relative time (the age in every card footer)");
const now = Date.now();
const S = 1e3, M = 60 * S, H = 60 * M, D = 24 * H;
const times = [
  [now - 5 * S, "now"],
  [now - 44 * S, "now"],
  [now - 50 * S, "50s"],
  [now - 10 * M, "10m"],
  [now - 59 * M, "59m"],
  [now - 2 * H, "2h"],
  [now - 23 * H, "23h"],
  [now - 26 * H, "1d"],
  [now - 3 * D, "3d"],
  [now - 6 * D, "6d"],
  [now - 9 * D, "1w"],
  [now - 20 * D, "3w"],
  [now - 40 * D, "1mo"],
  [now - 200 * D, "7mo"],
  [now - 366 * D, "1y"],
  [now - 500 * D, "1y"],
];
for (const [ts_, want] of times) eq(`shortRelative(${Math.round((now - ts_) / D)}d)`, f.shortRelative(ts_, now), want);
ok("never returns a raw 'N days ago'", !times.some(([t]) => /\sago$|^in\s/.test(f.shortRelative(t, now))));

console.log("\nformat — addresses");
eq("splitUrl.host", f.splitUrl("https://developer.mozilla.org/en-US/docs/Web/CSS").host, "developer.mozilla.org");
eq("splitUrl.path", f.splitUrl("https://developer.mozilla.org/en-US/docs/Web/CSS").path, "/en-US/docs/Web/CSS");
eq("splitUrl drops the query", f.splitUrl("https://ex.com/a?b=1#c").path, "/a");
eq("normalizeUrl adds a scheme", f.normalizeUrl("figma.com/x"), "https://figma.com/x");
eq("normalizeUrl rejects junk", f.normalizeUrl("not a url"), null);
eq("normalizeUrl allows localhost", f.normalizeUrl("localhost:3000"), "https://localhost:3000");
eq("domainOf strips www", f.domainOf("https://www.figma.com/files"), "figma.com");
eq("monogram of a two-label host", f.monogram("developer.mozilla.org"), "DM");
eq("monogram of a single label", f.monogram("caniuse"), "CA");

/* ------------------------------ 2. matcher ----------------------------- */
console.log("\nmatch — palette ranking");
const score = (q, t) => m.fuzzy(q, t)?.score ?? null;
ok("non-subsequence is rejected", m.fuzzy("xyz", "MDN — CSS grid layout") === null);
ok("empty query matches everything", m.fuzzy("", "anything") !== null);
ok("prefix beats mid-word", score("css", "CSS grid layout") > score("css", "Mastering css basics"));
ok("typescript beats rust for 'ts'", score("ts", "TypeScript Handbook") > (score("ts", "Rust Book") ?? -1e9));
ok("camel humps are findable", (score("us", "useSyncExternalStore") ?? 0) > 0);
const hit = m.fuzzy("grid", "MDN — CSS grid layout");
ok("ranges point at the match", !!hit && hit.ranges[0]?.[0] === 10, JSON.stringify(hit?.ranges));
const segs = m.segments("MDN — CSS grid layout", hit?.ranges ?? []);
eq("segments preserve the hit text", segs.filter((s) => s.hit).map((s) => s.text).join(""), "grid");

/* -------------------------------- 3. css ------------------------------- */
console.log("\ncss — token contract");
const appDir = join(root, "app");
const cssFiles = readdirSync(appDir).filter((n) => n.endsWith(".css"));
const css = cssFiles.map((n) => [n, readFileSync(join(appDir, n), "utf8")]);
const defined = new Set(["--safe-area-top", "--safe-area-bottom", "--safe-area-left", "--safe-area-right"]);
for (const [, text] of css) {
  for (const d of text.matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(d[1]);
}
const used = new Map();
for (const [name, text] of css) {
  for (const u of text.matchAll(/var\((--[a-z0-9-]+)/g)) {
    if (!used.has(u[1])) used.set(u[1], new Set());
    used.get(u[1]).add(name);
  }
}
/* A custom property named in TS/TSX is one being set (style objects use
   casts like ["--pop-origin" as string]), so those count as definitions. */
for (const dir of ["components", "lib", "app"]) {
  for (const n of readdirSync(join(root, dir)).filter((x) => x.endsWith(".tsx") || x.endsWith(".ts"))) {
    const text = readFileSync(join(root, dir, n), "utf8");
    for (const u of text.matchAll(/--[a-z0-9-]+/g)) defined.add(u[0]);
  }
}
const missing = [...used.keys()].filter((k) => !defined.has(k));
ok(`every var() is defined (${used.size} used)`, missing.length === 0, `undefined: ${missing.join(", ")}`);
ok(
  "backdrop-filter always has its -webkit- twin",
  css.every(
    ([, t]) =>
      (t.match(/(^|[;{\s])backdrop-filter:/gm) ?? []).length ===
      (t.match(/-webkit-backdrop-filter:/g) ?? []).length,
  ),
);
ok(
  "every color-mix shadow keeps a plain fallback on the line above",
  css.every(([, t]) =>
    t
      .split("\n")
      .every((line, i) => !/(^|[;\s])box-shadow:[^;]*color-mix/.test(line) || /box-shadow:/.test(t.split("\n")[i - 1] ?? "")),
  ),
);
ok("no display:contents on a list role", !css.some(([, t]) => /display:\s*contents/.test(t) && /role="list"/.test(t)));

console.log(fail ? `\n${fail} failure(s)\n` : "\nall checks pass\n");
process.exit(fail ? 1 : 0);
