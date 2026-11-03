"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { Favicon } from "./Favicon";
import { pushToast } from "../lib/toast";
import { domainOf } from "../lib/format";
import {
  buildSharePayload,
  buildShareUrl,
  type SharedPackPayload,
} from "../lib/share";
import type { LibraryState } from "../lib/store";

export function ShareDialog({
  open,
  lib,
  onClose,
  onPreviewPack,
}: {
  open: boolean;
  lib: LibraryState;
  onClose: () => void;
  onPreviewPack?: (pack: SharedPackPayload) => void;
}) {
  const defaultName = useMemo(() => {
    if (lib.user?.name && lib.user.name !== "Local Workspace") {
      return lib.user.name.split(" ")[0] || "Developer";
    }
    return "Developer";
  }, [lib.user?.name]);

  const [senderName, setSenderName] = useState(defaultName);
  const [packTitle, setPackTitle] = useState(`${defaultName}’s Bookmarks`);
  const [filterScope, setFilterScope] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setSenderName(defaultName);
      setPackTitle(`${defaultName}’s Bookmarks`);
      setFilterScope("all");
      setSelectedIds(new Set(lib.bookmarks.map((b) => b.id)));
      setCopied(false);
    }
  }, [open, defaultName, lib.bookmarks]);

  const filteredBookmarks = useMemo(() => {
    if (filterScope === "all") return lib.bookmarks;
    if (filterScope === "favorites") {
      return lib.bookmarks.filter((b) => b.favorite || b.isFavorite);
    }
    return lib.bookmarks.filter((b) => (b.categoryId || b.collectionId) === filterScope);
  }, [lib.bookmarks, filterScope]);

  const handleScopeFilterChange = (nextScope: string) => {
    setFilterScope(nextScope);
    if (nextScope === "all") {
      setSelectedIds(new Set(lib.bookmarks.map((b) => b.id)));
    } else if (nextScope === "favorites") {
      setSelectedIds(
        new Set(lib.bookmarks.filter((b) => b.favorite || b.isFavorite).map((b) => b.id))
      );
    } else {
      setSelectedIds(
        new Set(
          lib.bookmarks
            .filter((b) => (b.categoryId || b.collectionId) === nextScope)
            .map((b) => b.id)
        )
      );
    }
  };

  const chosenBookmarks = useMemo(
    () => lib.bookmarks.filter((b) => selectedIds.has(b.id)),
    [lib.bookmarks, selectedIds]
  );

  const sharePayload = useMemo(
    () =>
      buildSharePayload(
        chosenBookmarks,
        lib.categories,
        senderName || defaultName,
        packTitle || `${senderName || defaultName}’s Bookmarks`
      ),
    [chosenBookmarks, lib.categories, senderName, defaultName, packTitle]
  );

  const shareUrl = useMemo(() => {
    if (!chosenBookmarks.length) return "";
    return buildShareUrl(sharePayload);
  }, [chosenBookmarks.length, sharePayload]);

  const toggleBookmark = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCopied(false);
  };

  const toggleAllVisible = () => {
    const allVisibleSelected =
      filteredBookmarks.length > 0 && filteredBookmarks.every((b) => selectedIds.has(b.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const b of filteredBookmarks) next.delete(b.id);
      } else {
        for (const b of filteredBookmarks) next.add(b.id);
      }
      return next;
    });
    setCopied(false);
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      pushToast(`Share link copied (${chosenBookmarks.length} bookmarks)`);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      pushToast("Could not copy automatically — please copy the link from the box");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Share Bookmarks with Friends"
      variant="wide"
      footer={
        <>
          {onPreviewPack && chosenBookmarks.length > 0 ? (
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                onClose();
                onPreviewPack(sharePayload);
              }}
              title="Preview what your friend sees when opening this link"
            >
              <Icon name="external" size={13} />
              <span>Preview friend prompt</span>
            </button>
          ) : null}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={chosenBookmarks.length === 0}
            onClick={handleCopyLink}
          >
            <Icon name={copied ? "check" : "copy"} size={13.5} />
            <span>
              {copied
                ? "Link Copied!"
                : `Copy Share Link (${chosenBookmarks.length})`}
            </span>
          </button>
        </>
      }
    >
      <div className="share-dialog-wrap">
        <div className="share-hero-banner">
          <div className="share-hero-icon">
            <Icon name="share" size={18} />
          </div>
          <div className="share-hero-text">
            <div className="share-hero-title">Share your library via a single link</div>
            <div className="share-hero-sub">
              When your friend opens this link, Sift will ask their permission and let them review,
              edit, or remove any bookmark before adding them to their library.
            </div>
          </div>
        </div>

        {/* Sender & Pack Title */}
        <div className="share-fields-row">
          <div className="field">
            <label className="field-label" htmlFor="share-sender-name">
              Your name
            </label>
            <input
              id="share-sender-name"
              className="input"
              type="text"
              value={senderName}
              onChange={(e) => {
                setSenderName(e.target.value);
                setCopied(false);
              }}
              placeholder="e.g. Arif"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="share-pack-title">
              Shared collection title
            </label>
            <input
              id="share-pack-title"
              className="input"
              type="text"
              value={packTitle}
              onChange={(e) => {
                setPackTitle(e.target.value);
                setCopied(false);
              }}
              placeholder="e.g. Arif’s Developer Bookmarks"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="share-filter-bar">
          <div className="share-scope-pills" role="tablist" aria-label="Filter bookmarks to share">
            <button
              type="button"
              className={`sug-filter-chip ${filterScope === "all" ? "is-active" : ""}`}
              onClick={() => handleScopeFilterChange("all")}
            >
              All ({lib.bookmarks.length})
            </button>
            <button
              type="button"
              className={`sug-filter-chip ${filterScope === "favorites" ? "is-active" : ""}`}
              onClick={() => handleScopeFilterChange("favorites")}
            >
              Favourites ({lib.bookmarks.filter((b) => b.favorite || b.isFavorite).length})
            </button>
            {lib.categories.map((c) => {
              const count = lib.bookmarks.filter(
                (b) => (b.categoryId || b.collectionId) === c.id
              ).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`sug-filter-chip ${filterScope === c.id ? "is-active" : ""}`}
                  onClick={() => handleScopeFilterChange(c.id)}
                >
                  {c.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Selectable Bookmark List */}
        <div className="share-list-header">
          <span className="share-list-count t-num">
            <strong>{chosenBookmarks.length}</strong> of {lib.bookmarks.length} bookmarks selected
          </span>
          <button type="button" className="share-select-toggle" onClick={toggleAllVisible}>
            {filteredBookmarks.length > 0 && filteredBookmarks.every((b) => selectedIds.has(b.id))
              ? "Deselect visible"
              : "Select all visible"}
          </button>
        </div>

        <div className="share-bookmarks-list scroll">
          {filteredBookmarks.length === 0 ? (
            <div className="share-empty-state">No bookmarks in this filter.</div>
          ) : (
            filteredBookmarks.map((b) => {
              const checked = selectedIds.has(b.id);
              const cat = lib.categories.find((c) => c.id === (b.categoryId || b.collectionId));
              return (
                <label
                  key={b.id}
                  className={`share-item-row ${checked ? "is-selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="share-item-checkbox"
                    checked={checked}
                    onChange={() => toggleBookmark(b.id)}
                  />
                  <span className="share-item-check-ui" aria-hidden="true">
                    {checked ? <Icon name="check" size={11} strokeWidth={2.5} /> : null}
                  </span>
                  <Favicon url={b.url} size={18} />
                  <span className="share-item-info truncate">
                    <span className="share-item-title truncate">{b.title}</span>
                    <span className="share-item-domain truncate">{domainOf(b.url)}</span>
                  </span>
                  {cat ? (
                    <span className="share-item-cat-pill">
                      <span
                        className="table-cat-dot"
                        style={{ backgroundColor: cat.color || "var(--accent)" }}
                      />
                      <span>{cat.name}</span>
                    </span>
                  ) : null}
                </label>
              );
            })
          )}
        </div>

        {/* Share URL Box */}
        <div className="share-url-section">
          <label className="field-label" htmlFor="share-generated-url">
            Shareable Link
          </label>
          <div className="share-url-input-group">
            <input
              id="share-generated-url"
              className="input share-url-input"
              type="text"
              readOnly
              value={shareUrl || "Select at least one bookmark to generate a share link"}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className={`btn ${copied ? "btn-primary" : ""}`}
              disabled={!shareUrl}
              onClick={handleCopyLink}
            >
              <Icon name={copied ? "check" : "link"} size={13.5} />
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
