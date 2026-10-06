"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Overlay } from "./Overlay";
import { Icon, type IconName } from "./Icon";
import { Favicon } from "./Favicon";
import { fuzzy, segments, type Range } from "../lib/match";
import { domainOf } from "../lib/format";
import { setPrefs, syncToCloud, type Bookmark, type LibraryState, type Scope } from "../lib/store";
import { pushToast } from "../lib/toast";

type RowKind = "bookmark" | "collection" | "tag" | "action";

interface Row {
  id: string;
  group: string;
  kind: RowKind;
  label: string;
  sub?: string;
  icon?: IconName;
  url?: string;
  action?: string;
  run: (shift: boolean) => void;
  score: number;
  ranges: Range[];
  labelRanges: Range[];
}

const GROUP_ORDER: Record<string, number> = { Bookmarks: 0, Collections: 1, Tags: 2, Actions: 3 };
const EMPTY_ORDER: Record<string, number> = { Recent: 0, "Jump to": 1, Actions: 2 };

export function CommandPalette({
  open,
  lib,
  onClose,
  onScope,
  onNewBookmark,
  onNewCollection,
  onEditBookmark,
  onCycleTheme,
  onShowShortcuts,
}: {
  open: boolean;
  lib: LibraryState;
  onClose: () => void;
  onScope: (scope: Scope) => void;
  onNewBookmark: () => void;
  onNewCollection: () => void;
  onEditBookmark: (id: string) => void;
  onCycleTheme: () => void;
  onShowShortcuts: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim();
    const out: Row[] = [];

    const openLink = (b: Bookmark) => () => window.open(b.url, "_blank", "noopener,noreferrer");

    const scoreBookmark = (b: Bookmark) => {
      const host = domainOf(b.url);
      const byTitle = fuzzy(q, b.title);
      const byHost = fuzzy(q, host);
      const byTag = b.tags.reduce<{ score: number; ranges: Range[] } | null>((best, tag) => {
        const found = fuzzy(q, tag);
        return found && (!best || found.score > best.score) ? { score: found.score - 6, ranges: found.ranges } : best;
      }, null);
      const candidates: { score: number; ranges: Range[]; onTitle: boolean }[] = [];
      if (byTitle) candidates.push({ ...byTitle, onTitle: true });
      if (byHost) candidates.push({ score: byHost.score * 0.7 + 3, ranges: byHost.ranges, onTitle: false });
      if (byTag) candidates.push({ ...byTag, onTitle: false });
      if (!candidates.length) return null;
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0]!;
      return {
        score: best.score + (b.favorite ? 7 : 0),
        ranges: best.onTitle ? [] : best.ranges,
        labelRanges: best.onTitle ? best.ranges : [],
      };
    };

    if (q) {
      for (const b of lib.bookmarks) {
        const hit = scoreBookmark(b);
        if (!hit) continue;
        out.push({
          id: b.id,
          group: "Bookmarks",
          kind: "bookmark",
          label: b.title,
          sub: domainOf(b.url),
          url: b.url,
          action: "↵ open",
          run: (shift) => (shift ? onEditBookmark(b.id) : openLink(b)()),
          score: hit.score,
          ranges: hit.ranges,
          labelRanges: hit.labelRanges,
        });
      }
    } else {
      const recents = [...lib.bookmarks].sort((a, b) => b.addedAt - a.addedAt).slice(0, 5);
      for (const b of recents) {
        out.push({
          id: b.id,
          group: "Recent",
          kind: "bookmark",
          label: b.title,
          sub: domainOf(b.url),
          url: b.url,
          action: "↵ open",
          run: (shift) => (shift ? onEditBookmark(b.id) : openLink(b)()),
          score: 0,
          ranges: [],
          labelRanges: [],
        });
      }
    }

    const scoreCollection = (name: string) => (q ? fuzzy(q, name) : { score: 0, ranges: [] as Range[] });
    if (q ? out.length < 10 : true) {
      for (const c of lib.collections) {
        const hit = scoreCollection(c.name);
        if (q && !hit) continue;
        const count = lib.bookmarks.filter((b) => b.collectionId === c.id).length;
        out.push({
          id: `col-${c.id}`,
          group: q ? "Collections" : "Jump to",
          kind: "collection",
          label: c.name,
          sub: `${count}`,
          icon: (c.icon as IconName) ?? "folder",
          action: "→ go",
          run: () => onScope({ kind: "collection", id: c.id }),
          score: (hit?.score ?? 0) * 0.94,
          ranges: hit?.ranges ?? [],
          labelRanges: hit?.ranges ?? [],
        });
      }
    }

    if (q) {
      const seen = new Set<string>();
      for (const b of lib.bookmarks) {
        for (const t of b.tags) {
          if (seen.has(t)) continue;
          seen.add(t);
          const hit = fuzzy(q, t);
          if (!hit) continue;
          out.push({
            id: `tag-${t}`,
            group: "Tags",
            kind: "tag",
            label: `#${t}`,
            sub: `${lib.bookmarks.filter((x) => x.tags.includes(t)).length}`,
            icon: "tag",
            action: "→ go",
            run: () => onScope({ kind: "tag", id: t }),
            score: hit.score * 0.8,
            ranges: [],
            labelRanges: hit.ranges,
          });
        }
      }
    }

    const actions: { id: string; label: string; icon: IconName; kbd: string; run: () => void }[] = [
      { id: "a-new", label: "New bookmark", icon: "plus", kbd: "⌘N", run: onNewBookmark },
      { id: "a-collection", label: "New collection", icon: "folder", kbd: "", run: onNewCollection },
      { id: "a-fav", label: "Show favourites", icon: "star", kbd: "⌘2", run: () => onScope({ kind: "favorites" }) },
      { id: "a-recent", label: "Show recent", icon: "clock", kbd: "⌘3", run: () => onScope({ kind: "recent" }) },
      {
        id: "a-view",
        label: lib.prefs.viewMode === "grid" ? "Switch to list view" : "Switch to grid view",
        icon: lib.prefs.viewMode === "grid" ? "list" : "grid",
        kbd: "",
        run: () => setPrefs({ viewMode: lib.prefs.viewMode === "grid" ? "list" : "grid" }),
      },
      { id: "a-theme", label: "Change appearance", icon: "auto", kbd: "", run: onCycleTheme },
      {
        id: "a-sync",
        label: "Sync with Neon PostgreSQL",
        icon: "sparkle",
        kbd: "",
        run: async () => {
          pushToast("Syncing with Neon database…");
          const ok = await syncToCloud();
          if (ok) pushToast("Synced with Neon PostgreSQL");
          else pushToast("Database not configured (local storage active)");
        },
      },
      { id: "a-keys", label: "Keyboard shortcuts", icon: "keyboard", kbd: "?", run: onShowShortcuts },
    ];

    for (const a of actions) {
      const hit = q ? fuzzy(q, a.label) : { score: -30 + (GROUP_ORDER.Actions ?? 3), ranges: [] as Range[] };
      if (q && !hit) continue;
      out.push({
        id: a.id,
        group: "Actions",
        kind: "action",
        label: a.label,
        icon: a.icon,
        action: a.kbd || undefined,
        run: () => a.run(),
        score: (hit?.score ?? 0) + (GROUP_ORDER.Actions ?? 3),
        ranges: [],
        labelRanges: hit?.ranges ?? [],
      });
    }

    if (!q) {
      // No query: a stable, scannable order instead of a score nobody sees.
      const order = EMPTY_ORDER;
      return out.sort((a, b) => (order[a.group] ?? 9) - (order[b.group] ?? 9));
    }

    // With a query, rank purely by score first (top hits only), then lay the
    // survivors out grouped — never interleaved, which reads as noise.
    const top = out.sort((a, b) => b.score - a.score).slice(0, 18);
    return top.sort(
      (a, b) => (GROUP_ORDER[a.group] ?? 9) - (GROUP_ORDER[b.group] ?? 9) || b.score - a.score,
    );
  }, [
    query,
    lib.bookmarks,
    lib.collections,
    lib.prefs.viewMode,
    onEditBookmark,
    onNewBookmark,
    onNewCollection,
    onScope,
    onShowShortcuts,
    onCycleTheme,
  ]);

  useEffect(() => {
    setActive((current) => {
      if (!rows.length) return 0;
      return Math.min(current, rows.length - 1);
    });
  }, [rows.length]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-row-index="${active}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const grouped: { label: string; rows: { row: Row; index: number }[] }[] = [];
  rows.forEach((row, index) => {
    const label = row.group;
    const bucket = grouped[grouped.length - 1];
    if (bucket && bucket.label === label) bucket.rows.push({ row, index });
    else grouped.push({ label, rows: [{ row, index }] });
  });

  const commit = (index: number, shift: boolean) => {
    const row = rows[index];
    if (!row) return;
    row.run(shift);
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} align="top" className="palette" initialFocus="input">
      <div className="palette-input-row">
        <Icon name="search" size={16} />
        <input
          ref={inputRef}
          className="palette-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-label="Search bookmarks and actions"
          placeholder="Search links, collections and actions"
          spellCheck={false}
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (rows.length ? (i + 1) % rows.length : 0));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
            } else if (e.key === "Home") {
              e.preventDefault();
              setActive(0);
            } else if (e.key === "End") {
              e.preventDefault();
              setActive(Math.max(0, rows.length - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              commit(active, e.shiftKey);
            } else if (e.key === "Escape" && query) {
              // First Escape clears, second closes — the Finder convention.
              e.preventDefault();
              e.stopPropagation();
              setQuery("");
            }
          }}
        />
        {query ? <kbd aria-hidden="true">esc</kbd> : null}
      </div>

      <div className="palette-list scroll" id="palette-list" ref={listRef} role="listbox" aria-label="Results">
        {rows.length === 0 ? (
          <div className="palette-empty">
            <Icon name="search" size={15} />
            <span>
              Nothing matches “{query.trim()}”.
            </span>
          </div>
        ) : (
          grouped.map((group) => (
            <div className="palette-group" role="group" aria-label={group.label} key={group.label}>
              <div className="menu-label">{group.label}</div>
              {group.rows.map(({ row, index }) => (
                <button
                  type="button"
                  key={row.id}
                  data-row-index={index}
                  data-active={index === active ? "true" : undefined}
                  className="p-row"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => commit(index, false)}
                >
                  {row.kind === "bookmark" && row.url ? (
                    <Favicon url={row.url} size={18} />
                  ) : (
                    <span className="tile">
                      <Icon name={row.icon ?? "sparkle"} size={12} />
                    </span>
                  )}
                  <span className="p-row-title truncate">{renderLabel(row)}</span>
                  {row.sub ? <span className="p-row-sub t-num">{row.sub}</span> : null}
                  {row.action && index === active ? (
                    <span className="p-row-hint">{row.action}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="palette-foot">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> navigate
        </span>
        <span>
          <kbd>↵</kbd> open
        </span>
        <span>
          <kbd>⇧</kbd>
          <kbd>↵</kbd> edit
        </span>
        <span className="spacer" />
        <span className="t-mono" style={{ fontSize: 10 }}>
          {rows.length} result{rows.length === 1 ? "" : "s"}
        </span>
      </div>
    </Overlay>
  );
}

function renderLabel(row: Row) {
  const parts = segments(row.label, row.labelRanges.length ? row.labelRanges : row.ranges);
  if (parts.length === 1) return row.label;
  return parts.map((part, i) =>
    part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>,
  );
}
