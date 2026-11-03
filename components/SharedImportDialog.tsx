"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { Favicon } from "./Favicon";
import { domainOf, normalizeUrl } from "../lib/format";
import { pushToast } from "../lib/toast";
import { importSharedBookmarks, setScope } from "../lib/store";
import type { SharedBookmarkItem, SharedPackPayload } from "../lib/share";

interface EditableSharedItem extends SharedBookmarkItem {
  selected: boolean;
  removed: boolean;
}

export function SharedImportDialog({
  pack,
  existingUrls,
  onClose,
}: {
  pack: SharedPackPayload | null;
  existingUrls: Set<string>;
  onClose: () => void;
}) {
  const [items, setItems] = useState<EditableSharedItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    title: string;
    url: string;
    description: string;
    categoryName: string;
    tagsText: string;
    favorite: boolean;
  } | null>(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState({
    title: "",
    url: "",
    description: "",
    categoryName: "",
    tagsText: "",
  });

  useEffect(() => {
    if (pack) {
      setItems(
        pack.bookmarks.map((b) => ({
          ...b,
          selected: true,
          removed: false,
        }))
      );
      setEditingId(null);
      setEditDraft(null);
      setAddingCustom(false);
    }
  }, [pack]);

  const activeItems = useMemo(() => items.filter((i) => !i.removed), [items]);
  const removedCount = useMemo(() => items.filter((i) => i.removed).length, [items]);
  const selectedItems = useMemo(
    () => activeItems.filter((i) => i.selected),
    [activeItems]
  );

  if (!pack) return null;

  const startEditing = (item: EditableSharedItem) => {
    setEditingId(item.id);
    setEditDraft({
      title: item.title,
      url: item.url,
      description: item.description || "",
      categoryName: item.categoryName || "",
      tagsText: (item.tags || []).join(", "),
      favorite: item.favorite,
    });
  };

  const saveEdit = (id: string) => {
    if (!editDraft) return;
    const normalized = normalizeUrl(editDraft.url) || editDraft.url.trim();
    if (!normalized) {
      pushToast("Please enter a valid URL");
      return;
    }
    const parsedTags = editDraft.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              title: editDraft.title.trim() || domainOf(normalized),
              url: normalized,
              description: editDraft.description.trim(),
              categoryName: editDraft.categoryName.trim() || null,
              tags: parsedTags,
              favorite: editDraft.favorite,
            }
          : item
      )
    );
    setEditingId(null);
    setEditDraft(null);
    pushToast("Bookmark customized");
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, removed: true, selected: false } : item
      )
    );
    if (editingId === id) {
      setEditingId(null);
      setEditDraft(null);
    }
  };

  const handleRestoreRemoved = () => {
    setItems((prev) =>
      prev.map((item) => (item.removed ? { ...item, removed: false, selected: true } : item))
    );
  };

  const handleToggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleFav = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item))
    );
  };

  const handleToggleAll = () => {
    const allSelected = activeItems.length > 0 && activeItems.every((i) => i.selected);
    setItems((prev) =>
      prev.map((item) =>
        item.removed ? item : { ...item, selected: !allSelected }
      )
    );
  };

  const handleAddCustomItem = () => {
    const normalized = normalizeUrl(customDraft.url);
    if (!normalized) {
      pushToast("Please enter a valid URL (e.g. https://example.com)");
      return;
    }
    const newItem: EditableSharedItem = {
      id: `custom-${Date.now()}`,
      title: customDraft.title.trim() || domainOf(normalized),
      url: normalized,
      description: customDraft.description.trim(),
      categoryName: customDraft.categoryName.trim() || null,
      tags: customDraft.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      favorite: false,
      selected: true,
      removed: false,
    };
    setItems((prev) => [newItem, ...prev]);
    setCustomDraft({
      title: "",
      url: "",
      description: "",
      categoryName: "",
      tagsText: "",
    });
    setAddingCustom(false);
    pushToast(`Added “${newItem.title}” to import list`);
  };

  const handleAcceptAndImport = () => {
    if (selectedItems.length === 0) {
      pushToast("Select at least one bookmark to add");
      return;
    }
    const { addedCount, newCategoryCount } = importSharedBookmarks(selectedItems);
    setScope({ kind: "all" });
    onClose();
    pushToast(
      `Added ${addedCount} shared bookmark${addedCount === 1 ? "" : "s"}${
        newCategoryCount > 0
          ? ` across ${newCategoryCount} new collection${newCategoryCount === 1 ? "" : "s"}`
          : ""
      } to your library!`
    );
  };

  return (
    <Dialog
      open={!!pack}
      onClose={onClose}
      title="Shared Bookmarks — Permission Request"
      variant="wide"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Decline
          </button>
          <span className="spacer" />
          <button
            type="button"
            className="btn btn-primary"
            disabled={selectedItems.length === 0}
            onClick={handleAcceptAndImport}
          >
            <Icon name="check" size={14} />
            <span>
              Allow & Add {selectedItems.length} Bookmark{selectedItems.length === 1 ? "" : "s"}
            </span>
          </button>
        </>
      }
    >
      <div className="share-dialog-wrap">
        {/* Permission Banner */}
        <div className="share-permission-banner">
          <div className="share-permission-badge">
            <Icon name="share" size={18} />
          </div>
          <div className="share-permission-content">
            <h3 className="share-permission-title">
              <strong>{pack.senderName}</strong> shared{" "}
              <strong>{pack.bookmarks.length}</strong> bookmark
              {pack.bookmarks.length === 1 ? "" : "s"} with you ({pack.packTitle})
            </h3>
            <p className="share-permission-desc">
              Would you like to add these bookmarks to your library? You can review,{" "}
              <strong>edit</strong>, or <strong>remove</strong> any bookmark below to customize
              the list before adding.
            </p>
          </div>
        </div>

        {/* Customization Toolbar */}
        <div className="share-list-header">
          <div className="share-list-meta">
            <span className="share-list-count t-num">
              <strong>{selectedItems.length}</strong> of {activeItems.length} bookmarks ready to add
            </span>
            {removedCount > 0 ? (
              <button
                type="button"
                className="share-restore-btn"
                onClick={handleRestoreRemoved}
              >
                Restore {removedCount} removed
              </button>
            ) : null}
          </div>

          <div className="share-list-actions">
            <button
              type="button"
              className="btn btn-sm btn-quiet"
              onClick={() => setAddingCustom((v) => !v)}
            >
              <Icon name="plus" size={12} />
              <span>Add item</span>
            </button>
            {activeItems.length > 0 ? (
              <button
                type="button"
                className="share-select-toggle"
                onClick={handleToggleAll}
              >
                {activeItems.every((i) => i.selected) ? "Deselect all" : "Select all"}
              </button>
            ) : null}
          </div>
        </div>

        {/* Optional: Add custom bookmark inline before importing */}
        {addingCustom ? (
          <div className="share-inline-editor">
            <div className="share-inline-editor-head">
              <span>Add another bookmark to this import</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Cancel adding bookmark"
                onClick={() => setAddingCustom(false)}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
            <div className="share-fields-row">
              <div className="field">
                <label className="field-label">Title</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. GitHub Docs"
                  value={customDraft.title}
                  onChange={(e) => setCustomDraft({ ...customDraft, title: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">URL</label>
                <input
                  className="input"
                  type="text"
                  placeholder="https://docs.github.com"
                  value={customDraft.url}
                  onChange={(e) => setCustomDraft({ ...customDraft, url: e.target.value })}
                />
              </div>
            </div>
            <div className="share-fields-row">
              <div className="field">
                <label className="field-label">Collection</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Development"
                  value={customDraft.categoryName}
                  onChange={(e) =>
                    setCustomDraft({ ...customDraft, categoryName: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label className="field-label">Tags (comma separated)</label>
                <input
                  className="input"
                  type="text"
                  placeholder="docs, reference"
                  value={customDraft.tagsText}
                  onChange={(e) => setCustomDraft({ ...customDraft, tagsText: e.target.value })}
                />
              </div>
            </div>
            <div className="share-inline-editor-foot">
              <button type="button" className="btn btn-sm" onClick={() => setAddingCustom(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleAddCustomItem}
              >
                <Icon name="plus" size={12} />
                <span>Add to list</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Shared Bookmarks Customizable List */}
        <div className="share-import-list scroll">
          {activeItems.length === 0 ? (
            <div className="share-empty-state">
              <p>All bookmarks were removed from this import list.</p>
              {removedCount > 0 ? (
                <button type="button" className="btn btn-sm" onClick={handleRestoreRemoved}>
                  Restore {removedCount} bookmarks
                </button>
              ) : null}
            </div>
          ) : (
            activeItems.map((item) => {
              const isEditing = editingId === item.id;
              const alreadyExists = existingUrls.has(item.url.toLowerCase());

              if (isEditing && editDraft) {
                return (
                  <div key={item.id} className="share-inline-editor">
                    <div className="share-inline-editor-head">
                      <span>Customize Bookmark</span>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Cancel edit"
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft(null);
                        }}
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                    <div className="share-fields-row">
                      <div className="field">
                        <label className="field-label">Title</label>
                        <input
                          className="input"
                          type="text"
                          value={editDraft.title}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, title: e.target.value })
                          }
                        />
                      </div>
                      <div className="field">
                        <label className="field-label">URL</label>
                        <input
                          className="input"
                          type="text"
                          value={editDraft.url}
                          onChange={(e) => setEditDraft({ ...editDraft, url: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="share-fields-row">
                      <div className="field">
                        <label className="field-label">Collection / Category</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="Uncategorized"
                          value={editDraft.categoryName}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, categoryName: e.target.value })
                          }
                        />
                      </div>
                      <div className="field">
                        <label className="field-label">Tags (comma separated)</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="docs, dev"
                          value={editDraft.tagsText}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, tagsText: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label">Description</label>
                      <input
                        className="input"
                        type="text"
                        placeholder="Optional note or description"
                        value={editDraft.description}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, description: e.target.value })
                        }
                      />
                    </div>
                    <div className="share-inline-editor-foot">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => saveEdit(item.id)}
                      >
                        <Icon name="check" size={12} />
                        <span>Save changes</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className={`share-import-row ${item.selected ? "is-selected" : "is-unselected"}`}
                >
                  <button
                    type="button"
                    className={`table-checkbox ${item.selected ? "is-checked" : ""}`}
                    role="checkbox"
                    aria-checked={item.selected}
                    aria-label={`Include ${item.title}`}
                    onClick={() => handleToggleSelect(item.id)}
                  >
                    {item.selected ? <Icon name="check" size={10} strokeWidth={2.6} /> : null}
                  </button>

                  <Favicon url={item.url} size={20} />

                  <div
                    className="share-import-main truncate"
                    onClick={() => handleToggleSelect(item.id)}
                  >
                    <div className="share-import-title-line">
                      <span className="share-item-title truncate">{item.title}</span>
                      {alreadyExists ? (
                        <span className="share-duplicate-pill">In your library</span>
                      ) : null}
                    </div>
                    <div className="share-import-sub-line truncate">
                      <span className="share-item-domain">{domainOf(item.url)}</span>
                      {item.description ? (
                        <span className="share-item-desc truncate">· {item.description}</span>
                      ) : null}
                    </div>
                  </div>

                  {item.categoryName ? (
                    <span className="share-item-cat-pill">
                      <span
                        className="table-cat-dot"
                        style={{ backgroundColor: item.categoryColor || "var(--accent)" }}
                      />
                      <span>{item.categoryName}</span>
                    </span>
                  ) : null}

                  <div className="share-import-actions">
                    <button
                      type="button"
                      className="table-action-btn"
                      title={item.favorite ? "Unpin favourite" : "Mark as favourite"}
                      aria-label={item.favorite ? "Unpin favourite" : "Mark as favourite"}
                      onClick={() => handleToggleFav(item.id)}
                    >
                      <Icon
                        name="star"
                        size={13}
                        filled={item.favorite}
                        style={{ color: item.favorite ? "var(--fav)" : undefined }}
                      />
                    </button>
                    <button
                      type="button"
                      className="table-action-btn"
                      title="Edit bookmark before adding"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => startEditing(item)}
                    >
                      <Icon name="pencil" size={13} />
                    </button>
                    <button
                      type="button"
                      className="table-action-btn table-action-danger"
                      title="Remove from import"
                      aria-label={`Remove ${item.title}`}
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
}
