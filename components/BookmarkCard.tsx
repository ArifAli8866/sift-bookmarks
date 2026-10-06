"use client";

import { useRef, useState } from "react";
import { Favicon } from "./Favicon";
import { Icon } from "./Icon";
import { splitUrl, shortRelative, fullDate } from "../lib/format";
import type { Bookmark } from "../lib/store";
import type { ItemActions } from "./itemActions";

export function BookmarkCard({
  bookmark,
  index,
  focused,
  actions,
  onFocus,
  onMenu,
  onTag,
}: {
  bookmark: Bookmark;
  index: number;
  focused: boolean;
  actions: ItemActions;
  onFocus: (id: string) => void;
  onMenu: (bookmark: Bookmark, anchor: HTMLElement) => void;
  onTag: (tag: string) => void;
}) {
  const [ticking, setTicking] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const { host, path } = splitUrl(bookmark.url);
  const visibleTags = bookmark.tags.slice(0, 2);
  const overflow = bookmark.tags.length - visibleTags.length;

  const toggleFav = () => {
    actions.toggleFavorite(bookmark.id);
    setTicking(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTicking(false), 320);
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
        <Favicon url={bookmark.url} />
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
            onClick={(e) => {
              e.stopPropagation();
              onFocus(bookmark.id);
            }}
          >
            {bookmark.title}
          </a>
        </h3>
      </div>

      <p className="card-url" title={bookmark.url}>
        <span className="card-url-host">{host}</span>
        <span className="card-url-path">{path}</span>
      </p>

      <div className="card-foot">
        {visibleTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="chip chip-btn"
            title={`Filter by #${tag}`}
            onClick={() => onTag(tag)}
          >
            {tag}
          </button>
        ))}
        {overflow > 0 ? <span className="chip">+{overflow}</span> : null}
        <span className="spacer" />
        <span className="card-age" title={fullDate(bookmark.addedAt)}>
          {shortRelative(bookmark.addedAt)}
        </span>
        <span className="card-actions">
          <button
            type="button"
            className={`icon-btn fav-btn${ticking ? " is-ticked" : ""}`}
            aria-pressed={bookmark.favorite}
            aria-label={bookmark.favorite ? `Unfavourite ${bookmark.title}` : `Favourite ${bookmark.title}`}
            title={bookmark.favorite ? "Remove favourite (F)" : "Add favourite (F)"}
            onClick={toggleFav}
          >
            <Icon name="star" size={13} filled={bookmark.favorite} />
          </button>
          <button
            type="button"
            className="icon-btn more-btn"
            aria-label={`Actions for ${bookmark.title}`}
            title="Actions"
            onClick={(e) => onMenu(bookmark, e.currentTarget)}
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
}: {
  bookmark: Bookmark;
  index: number;
  focused: boolean;
  actions: ItemActions;
  onFocus: (id: string) => void;
  onMenu: (bookmark: Bookmark, anchor: HTMLElement) => void;
  onTag: (tag: string) => void;
  collectionName?: string;
}) {
  const { host, path } = splitUrl(bookmark.url);
  const tag = bookmark.tags[0];

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
        {tag ? (
          <button type="button" className="chip" onClick={() => onTag(tag)}>
            {tag}
          </button>
        ) : (
          <span className="truncate">{collectionName ?? "Unfiled"}</span>
        )}
      </div>

      <div className="row-col row-col-age" title={fullDate(bookmark.addedAt)}>
        {shortRelative(bookmark.addedAt)}
      </div>

      <div className="row-actions">
        <button
          type="button"
          className="icon-btn fav-btn"
          aria-pressed={bookmark.favorite}
          aria-label={bookmark.favorite ? "Unfavourite" : "Favourite"}
          onClick={() => actions.toggleFavorite(bookmark.id)}
        >
          <Icon name="star" size={13} filled={bookmark.favorite} />
        </button>
        <button
          type="button"
          className="icon-btn more-btn"
          aria-label={`Actions for ${bookmark.title}`}
          onClick={(e) => onMenu(bookmark, e.currentTarget)}
        >
          <Icon name="ellipsis" size={13} />
        </button>
      </div>
    </div>
  );
}
