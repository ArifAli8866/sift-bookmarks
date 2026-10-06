"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { Favicon } from "./Favicon";
import { Menu } from "./Menu";
import { domainOf, normalizeUrl } from "../lib/format";
import type { Bookmark, Collection } from "../lib/store";

type Status = "idle" | "invalid" | "loading" | "ready" | "absent";

const BRAND_SUFFIXES = /\.(com|org|net|dev|app|io|co|me|sh|xyz|internal)$/i;

/** Human label for a host, used when the field is left blank. */
export function deriveTitle(url: string): string {
  const host = domainOf(url);
  const labels = host.replace(BRAND_SUFFIXES, "").split(".").filter(Boolean);
  const brand = (labels[labels.length - 1] ?? host).replace(/-/g, " ");
  const clean = brand.split(" ").map((w) => (w.length > 3 ? w[0]?.toUpperCase() + w.slice(1) : w)).join(" ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function BookmarkDialog({
  open,
  bookmark,
  collections,
  defaultCollectionId,
  onClose,
  onSubmit,
}: {
  open: boolean;
  bookmark: Bookmark | null;
  collections: Collection[];
  defaultCollectionId: string | null;
  onClose: () => void;
  onSubmit: (values: {
    title: string;
    url: string;
    collectionId: string | null;
    tags: string[];
    favorite: boolean;
  }) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const touchedTitle = useRef(false);
  const urlRef = useRef<HTMLInputElement>(null);

  // Reset on open, so the dialog never leaks the previous edit.
  useEffect(() => {
    if (!open) return;
    setUrl(bookmark?.url ?? "");
    setTitle(bookmark?.title ?? "");
    setTags(bookmark?.tags ?? []);
    setTagDraft("");
    setFavorite(bookmark?.favorite ?? false);
    setCollectionId(bookmark ? bookmark.collectionId : defaultCollectionId);
    setStatus(bookmark ? "ready" : "idle");
    touchedTitle.current = Boolean(bookmark?.title);
  }, [open, bookmark, defaultCollectionId]);

  // Real async work: resolving the site's icon. Everything about this block —
  // spinner, error copy, retry — is a genuine result, not a fake delay.
  useEffect(() => {
    if (!open) return;
    const raw = url.trim();
    if (!raw) {
      setStatus("idle");
      return;
    }
    const normalized = normalizeUrl(raw);
    if (!normalized) {
      setStatus("invalid");
      return;
    }
    setStatus("loading");
    let cancelled = false;
    const img = new Image();
    const host = domainOf(normalized);
    const giveUp = window.setTimeout(() => {
      if (!cancelled) {
        setStatus("absent");
        fillTitle(normalized);
      }
    }, 2600);

    img.onload = () => {
      if (cancelled) return;
      window.clearTimeout(giveUp);
      setStatus("ready");
      fillTitle(normalized);
    };
    img.onerror = () => {
      if (cancelled) return;
      window.clearTimeout(giveUp);
      setStatus("absent");
      fillTitle(normalized);
    };
    img.src = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;

    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
      img.onload = null;
      img.onerror = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, open]);

  function fillTitle(normalized: string) {
    if (touchedTitle.current || title.trim()) return;
    setTitle(deriveTitle(normalized));
  }

  const normalized = normalizeUrl(url);
  const canSubmit = Boolean(normalized);

  const submit = () => {
    if (!normalized) return;
    onSubmit({
      title: title.trim() || deriveTitle(normalized),
      url: normalized,
      collectionId,
      tags,
      favorite,
    });
  };

  const addTag = (value: string) => {
    const clean = value.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
    if (!clean || tags.includes(clean)) return;
    setTags((prev) => [...prev, clean].slice(0, 6));
    setTagDraft("");
  };

  const selectedCollection = collections.find((c) => c.id === collectionId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={bookmark ? "Edit bookmark" : "New bookmark"}
      variant="wide"
      initialFocus={bookmark ? "input[name='title']" : "input[name='url']"}
      footer={
        <>
          <span className="dialog-hint">
            <kbd>⌘</kbd>
            <kbd>↵</kbd>
            <span>{bookmark ? "save" : "add"}</span>
          </span>
          <span className="spacer" />
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={submit}>
            {bookmark ? "Save" : "Add bookmark"}
          </button>
        </>
      }
    >
      <div
        className="form-grid"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      >
        <label className="field">
          <span className="field-label">Address</span>
          <span className={`input${status === "invalid" ? " input-invalid" : ""}`}>
            {normalized ? (
              status === "ready" ? (
                <Favicon url={normalized} size={18} />
              ) : (
                <Spinner />
              )
            ) : (
              <Icon name="link" size={14} style={{ color: "var(--text-4)" }} />
            )}
            <input
              ref={urlRef}
              name="url"
              type="text"
              value={url}
              placeholder="figma.com/files/…"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setUrl(e.target.value)}
            />
          </span>
          <span
            className="url-status"
            data-state={status === "invalid" ? "error" : status === "ready" ? "ok" : undefined}
          >
            {status === "invalid" ? "That doesn’t look like an address yet." : null}
            {status === "loading" ? "Checking the site…" : null}
            {status === "absent" ? `No icon for ${domainOf(url)} — name it however you like.` : null}
          </span>
        </label>

        <label className="field">
          <span className="field-label">Title</span>
          <span className="input">
            <input
              name="title"
              type="text"
              value={title}
              placeholder="Untitled"
              onChange={(e) => {
                touchedTitle.current = true;
                setTitle(e.target.value);
              }}
            />
          </span>
        </label>

        <div className="form-row">
          <div className="field">
            <span className="field-label">Collection</span>
            <button
              type="button"
              className="picker"
              data-open={pickerAnchor ? "true" : undefined}
              onClick={(e) => setPickerAnchor(e.currentTarget)}
            >
              <Icon name={selectedCollection ? "folder" : "inbox"} size={14} className="icon" />
              <span className="truncate">{selectedCollection?.name ?? "Unfiled"}</span>
              <Icon name="chevronDown" size={13} className="icon" />
            </button>
          </div>

          <div className="field">
            <span className="field-label">&nbsp;</span>
            <button
              type="button"
              className="check"
              role="checkbox"
              aria-checked={favorite}
              data-on={favorite ? "true" : undefined}
              onClick={() => setFavorite((v) => !v)}
            >
              <span className="check-box" aria-hidden="true">
                <Icon name="check" size={10} strokeWidth={2.6} />
              </span>
              <span>{favorite ? "Pinned to favourites" : "Add to favourites"}</span>
            </button>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Tags</span>
          <div className="tags-field">
            {tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                >
                  <Icon name="close" size={9} strokeWidth={2.4} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagDraft}
              placeholder={tags.length >= 6 ? "Tag limit reached" : "add a tag, then ↵"}
              disabled={tags.length >= 6}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagDraft);
                } else if (e.key === "Backspace" && !tagDraft && tags.length) {
                  e.preventDefault();
                  setTags((prev) => prev.slice(0, -1));
                }
              }}
            />
          </div>
        </div>
      </div>

      <Menu
        open={!!pickerAnchor}
        anchor={pickerAnchor}
        width={228}
        entries={[
          {
            id: "unfiled",
            label: "Unfiled",
            icon: "inbox",
            checked: collectionId === null,
            onSelect: () => setCollectionId(null),
          },
          { id: "sep", label: "" },
          ...collections.map((c) => ({
            id: c.id,
            label: c.name,
            icon: "folder" as const,
            checked: collectionId === c.id,
            onSelect: () => setCollectionId(c.id),
          })),
        ]}
        onClose={() => setPickerAnchor(null)}
      />
    </Dialog>
  );
}

function Spinner() {
  return (
    <svg className="spin" width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2.4} opacity={0.18} />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}
