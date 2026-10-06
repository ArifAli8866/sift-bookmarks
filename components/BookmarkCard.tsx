"use client";

import { useRef, useState } from "react";
import { Favicon } from "./Favicon";
import { Icon } from "./Icon";
import { splitUrl, shortRelative, fullDate } from "../lib/format";
import { markBookmarkOpened, type Bookmark } from "../lib/store";
import type { ItemActions } from "./itemActions";

export function BookmarkCard({
  bookmark,
  index,
  focused,
  actions,
  onFocus,
  onMenu,
  onTag,
  category,
}: {
  bookmark: Bookmark;
  index: number;
  focused: boolean;
  actions: ItemActions;
  onFocus: (id: string) => void;
  onMenu: (bookmark: Bookmark, anchor: HTMLElement) => void;
  onTag: (tag: string) => void;
  category?: { name: string; color?: string; icon?: string };
}) {
  const [ticking, setTicking] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const { host, path } = splitUrl(bookmark.url);
  const visibleTags = bookmark.tags.slice(0, 2);
  const overflow = bookmark.tags.length - visibleTags.length;

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.toggleFavorite(bookmark.id);
    setTicking(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTicking(false), 320);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    markBookmarkOpened(bookmark.id);
    onFocus(bookmark.id);
  };

  return (
    <article
      className="card"
      data-drag-id={bookmark.id}
      data-index={index}
      data-focused={focused ? "true" : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(bookmark, e.currentTarget.querySelector<HTMLElement>(".more-btn") ?? e.currentTarget);
      }}
    >
      <div className="card-head">
        <div className="card-icon-wrap">
          <Favicon url={bookmark.url} size={20} />
        </div>
        <div className="card-title-col truncate">
          <h3 className="card-title truncate">
            <a
              className="card-link"
              data-stretch=""
              href={bookmark.url}
              target="_blank"
              rel="noreferrer noopener"
              draggable={false}
              tabIndex={focused ? 0 : -1}
              onFocus={() => onFocus(bookmark.id)}
              onClick={handleLinkClick}
            >
              {bookmark.title}
            </a>
          </h3>
          <p className="card-url" title={bookmark.url}>
            <span className="card-url-host">{host}</span>
            <span className="card-url-path">{path}</span>
          </p>
        </div>
      </div>

      {bookmark.description ? (
        <p className="card-desc" title={bookmark.description}>
          {bookmark.description}
        </p>
      ) : null}

      <div className="card-foot">
        {category ? (
          <span className="card-cat-pill" title={`Category: ${category.name}`}>
            <span
              className="card-cat-dot"
              style={{ backgroundColor: category.color || "var(--accent)" }}
            />
            <span className="truncate">{category.name}</span>
          </span>
        ) : visibleTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="chip chip-btn"
            title={`Filter by #${tag}`}
            onClick={(e) => {
              e.stopPropagation();
              onTag(tag);
            }}
          >
            #{tag}
          </button>
        ))}

        {overflow > 0 && !category ? <span className="chip">+{overflow}</span> : null}

        <span className="spacer" />

        <span className="card-age" title={fullDate(bookmark.lastOpenedAt || bookmark.addedAt)}>
          {shortRelative(bookmark.lastOpenedAt || bookmark.addedAt)}
        </span>

        <span className="card-actions">
          <button
            type="button"
            className={`icon-btn fav-btn${ticking ? " is-ticked" : ""}`}
            aria-pressed={bookmark.favorite || bookmark.isFavorite}
            aria-label={bookmark.favorite || bookmark.isFavorite ? `Unfavourite ${bookmark.title}` : `Favourite ${bookmark.title}`}
            title={bookmark.favorite || bookmark.isFavorite ? "Remove favourite (F)" : "Add favourite (F)"}
            onClick={toggleFav}
          >
            <Icon name="star" size={13} filled={bookmark.favorite || bookmark.isFavorite} />
          </button>
          <button
            type="button"
            className="icon-btn more-btn"
            aria-label={`Actions for ${bookmark.title}`}
            title="Actions"
            onClick={(e) => {
              e.stopPropagation();
              onMenu(bookmark, e.currentTarget);
            }}
          >
            <Icon name="ellipsis" size={13} />
          </button>
        </span>
      </div>
    </article>
  );
}

export function BookmarkRow({
  bookmark,
  index,
  focused,
  actions,
  onFocus,
  onMenu,
  onTag,
  collectionName,
  categoryColor,
}: {
  bookmark: Bookmark;
  index: number;
  focused: boolean;
  actions: ItemActions;
  onFocus: (id: string) => void;
  onMenu: (bookmark: Bookmark, anchor: HTMLElement) => void;
  onTag: (tag: string) => void;
  collectionName?: string;
  categoryColor?: string;
}) {
  const { host, path } = splitUrl(bookmark.url);
  const tag = bookmark.tags[0];

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    markBookmarkOpened(bookmark.id);
    onFocus(bookmark.id);
  };

  return (
    <div
      className="row"
      data-drag-id={bookmark.id}
      data-index={index}
      data-focused={focused ? "true" : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(bookmark, e.currentTarget);
      }}
    >
      <div className="row-title-wrap">
        <Favicon url={bookmark.url} size={18} />
        <span className="row-title truncate">
          <a
            className="row-link"
            data-stretch=""
            href={bookmark.url}
            target="_blank"
            rel="noreferrer noopener"
            draggable={false}
            tabIndex={focused ? 0 : -1}
            onFocus={() => onFocus(bookmark.id)}
            onClick={handleLinkClick}
          >
            {bookmark.title}
          </a>
        </span>
      </div>

      <p className="row-url" title={bookmark.url}>
        <b>{host}</b>
        {path}
      </p>

      <div className="row-col row-col-tags" title={tag ? `#${tag}` : undefined}>
        {collectionName ? (
          <span className="card-cat-pill">
            <span
              className="card-cat-dot"
              style={{ backgroundColor: categoryColor || "var(--accent)" }}
            />
            <span className="truncate">{collectionName}</span>
          </span>
        ) : tag ? (
          <button type="button" className="chip" onClick={() => onTag(tag)}>
            #{tag}
          </button>
        ) : (
          <span className="truncate" style={{ color: "var(--text-4)" }}>Uncategorized</span>
        )}
      </div>

      <div className="row-col row-col-age" title={fullDate(bookmark.lastOpenedAt || bookmark.addedAt)}>
        {shortRelative(bookmark.lastOpenedAt || bookmark.addedAt)}
      </div>

      <div className="row-actions">
        <button
          type="button"
          className="icon-btn fav-btn"
          aria-pressed={bookmark.favorite || bookmark.isFavorite}
          aria-label={bookmark.favorite || bookmark.isFavorite ? "Unfavourite" : "Favourite"}
          onClick={(e) => {
            e.stopPropagation();
            actions.toggleFavorite(bookmark.id);
          }}
        >
          <Icon name="star" size={13} filled={bookmark.favorite || bookmark.isFavorite} />
        </button>
        <button
          type="button"
          className="icon-btn more-btn"
          aria-label={`Actions for ${bookmark.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onMenu(bookmark, e.currentTarget);
          }}
        >
          <Icon name="ellipsis" size={13} />
        </button>
      </div>
    </div>
  );
}
