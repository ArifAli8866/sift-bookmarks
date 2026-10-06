"use client";

import type { MenuEntry } from "./Menu";
import type { Bookmark, Collection } from "../lib/store";

export interface ItemActions {
  edit: (id: string) => void;
  remove: (id: string) => void;
  toggleFavorite: (id: string) => void;
  open: (bookmark: Bookmark) => void;
  copy: (bookmark: Bookmark) => void;
  assign: (id: string, collectionId: string | null) => void;
  move: (id: string, direction: -1 | 1) => void;
}

/**
 * One source of truth for what can be done to a link, so the row menu, the
 * right-click menu and the palette can never drift apart.
 */
export function buildItemEntries(
  bookmark: Bookmark,
  actions: ItemActions,
  collections: Collection[],
  canReorder: boolean,
): MenuEntry[] {
  const movable = collections.filter((c) => c.id !== bookmark.collectionId);
  const entries: MenuEntry[] = [
    { id: "open", label: "Open link", icon: "external", kbd: "↵", onSelect: () => actions.open(bookmark) },
    { id: "edit", label: "Edit…", icon: "pencil", kbd: "E", onSelect: () => actions.edit(bookmark.id) },
    {
      id: "fav",
      label: bookmark.favorite ? "Remove favourite" : "Add favourite",
      icon: "star",
      kbd: "F",
      onSelect: () => actions.toggleFavorite(bookmark.id),
    },
    { id: "copy", label: "Copy URL", icon: "link", onSelect: () => actions.copy(bookmark) },
    { id: "sep1", label: "" },
    {
      id: "unfiled",
      label: "Unfiled",
      icon: "inbox",
      header: "Move to",
      disabled: bookmark.collectionId === null,
      onSelect: () => actions.assign(bookmark.id, null),
    },
  ];

  for (const c of movable) {
    entries.push({ id: `move-${c.id}`, label: c.name, icon: "folder", onSelect: () => actions.assign(bookmark.id, c.id) });
  }

  if (canReorder) {
    entries.push(
      { id: "sep2", label: "" },
      { id: "up", label: "Move up", icon: "arrowUp", kbd: "⌘↑", onSelect: () => actions.move(bookmark.id, -1) },
      { id: "down", label: "Move down", icon: "arrowDown", kbd: "⌘↓", onSelect: () => actions.move(bookmark.id, 1) },
    );
  }

  entries.push(
    { id: "sep3", label: "" },
    {
      id: "delete",
      label: "Delete",
      icon: "trash",
      danger: true,
      kbd: "⌫",
      onSelect: () => actions.remove(bookmark.id),
    },
  );

  return entries;
}
