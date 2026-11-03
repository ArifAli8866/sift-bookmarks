"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { Favicon } from "./Favicon";
import { BookmarkCard } from "./BookmarkCard";
import { Menu } from "./Menu";
import { SUGGESTED_BOOKMARKS } from "../lib/suggestions";
import {
  addBookmark,
  countFor,
  deleteBookmarks,
  loadStarterBookmarks,
  markBookmarkOpened,
  restoreBookmarks,
  setScope,
  type Bookmark,
  type Category,
  type LibraryState,
} from "../lib/store";
import { buildItemEntries, type ItemActions } from "./itemActions";
import { pushToast } from "../lib/toast";
import { domainOf, shortRelative } from "../lib/format";

export function DashboardOverview({
  lib,
  actions,
  onNewBookmark,
  onNewCategory,
  onOpenPalette,
  onTag,
}: {
  lib: LibraryState;
  actions: ItemActions;
  onNewBookmark: () => void;
  onNewCategory: () => void;
  onOpenPalette: () => void;
  onTag: (tag: string) => void;
}) {
  const [selectedSugCategory, setSelectedSugCategory] = useState<string>("All");
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; bookmark: Bookmark } | null>(null);
  const [overviewView, setOverviewView] = useState<"grid" | "table">("grid");
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<string>>(new Set());

  // Dynamic greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const userName = lib.user?.name ? lib.user.name.split(" ")[0] : "Developer";

  // Real library summary metrics (zero fake numbers)
  const totalCount = lib.bookmarks.length;
  const favBookmarks = useMemo(
    () => lib.bookmarks.filter((b) => b.favorite || b.isFavorite),
    [lib.bookmarks]
  );
  const favCount = favBookmarks.length;
  const catCount = lib.categories.length;
  const categorizedCount = useMemo(
    () => lib.bookmarks.filter((b) => Boolean(b.categoryId || b.collectionId)).length,
    [lib.bookmarks]
  );
  const recentCount = useMemo(
    () =>
      lib.bookmarks.filter((b) => {
        const ts = b.lastOpenedAt || b.addedAt;
        return Date.now() - ts < 1000 * 60 * 60 * 24 * 7;
      }).length,
    [lib.bookmarks]
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of lib.categories) map.set(c.id, c);
    return map;
  }, [lib.categories]);

  // Suggestions filtered by active category tab
  const filteredSuggestions = useMemo(() => {
    if (selectedSugCategory === "All") return SUGGESTED_BOOKMARKS;
    return SUGGESTED_BOOKMARKS.filter(
      (s) => s.category.toLowerCase() === selectedSugCategory.toLowerCase()
    );
  }, [selectedSugCategory]);

  const handleAddSuggestion = (sug: (typeof SUGGESTED_BOOKMARKS)[0]) => {
    const matchingCat = lib.categories.find(
      (c) => c.name.toLowerCase() === sug.category.toLowerCase()
    );

    addBookmark({
      title: sug.title,
      url: sug.url,
      description: sug.description,
      categoryId: matchingCat?.id || null,
      tags: sug.tags,
      favorite: false,
    });

    setAddedSuggestions((prev) => new Set([...prev, sug.id]));
    pushToast(`Added “${sug.title}” to your library`);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedBookmarkIds);
    if (!ids.length) return;
    const removed = deleteBookmarks(ids);
    setSelectedBookmarkIds(new Set());
    if (removed.length) {
      pushToast(`Deleted ${removed.length} bookmark${removed.length === 1 ? "" : "s"}`, {
        action: {
          label: "Undo",
          onClick: () => {
            restoreBookmarks(removed);
            pushToast("Restored bookmarks");
          },
        },
      });
    }
  };

  return (
    <div className="dashboard-wrap">
      {/* 1. Compact Header Greeting */}
      <section className="dashboard-greeting-bar">
        <div className="dashboard-greeting-text">
          <h2 className="dashboard-greeting-title">
            {greeting}, {userName}
          </h2>
          <p className="dashboard-greeting-subtitle">
            {totalCount > 0
              ? `${totalCount} saved link${totalCount === 1 ? "" : "s"} across ${catCount} collection${catCount === 1 ? "" : "s"}`
              : "Your keyboard-first developer bookmark library."}
          </p>
        </div>
        <div className="dashboard-greeting-actions">
          <button type="button" className="btn" onClick={onOpenPalette} title="Command Palette (⌘K)">
            <Icon name="search" size={13.5} />
            <span>Jump to…</span>
            <kbd>⌘K</kbd>
          </button>
          <button type="button" className="btn" onClick={onNewCategory}>
            <Icon name="folder" size={13.5} />
            <span>New collection</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={onNewBookmark}>
            <Icon name="plus" size={14} />
            <span>Add bookmark</span>
          </button>
        </div>
      </section>

      {/* 2. Summary Metric Cards */}
      <section className="dashboard-stats-grid" aria-label="Library statistics">
        <div
          className="dashboard-stat-card"
          role="button"
          tabIndex={0}
          onClick={() => setScope({ kind: "all" })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setScope({ kind: "all" });
            }
          }}
        >
          <div className="stat-card-top">
            <div className="stat-card-icon-box stat-icon-blue">
              <Icon name="inbox" size={16} />
            </div>
            <span className="stat-trend-pill trend-blue">All Items</span>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{totalCount}</div>
            <div className="stat-card-label">Total Bookmarks</div>
            <div className="stat-card-meta">
              {totalCount > 0 ? `${categorizedCount} organized in collections` : "No bookmarks yet"}
            </div>
          </div>
        </div>

        <div
          className="dashboard-stat-card"
          role="button"
          tabIndex={0}
          onClick={() => setScope({ kind: "favorites" })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setScope({ kind: "favorites" });
            }
          }}
        >
          <div className="stat-card-top">
            <div className="stat-card-icon-box stat-icon-amber">
              <Icon name="star" size={16} filled />
            </div>
            <span className="stat-trend-pill trend-amber">Pinned</span>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{favCount}</div>
            <div className="stat-card-label">Favourites</div>
            <div className="stat-card-meta">
              {totalCount > 0 ? `${Math.round((favCount / totalCount) * 100)}% of library` : "Star links for quick access"}
            </div>
          </div>
        </div>

        <div
          className="dashboard-stat-card"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (lib.categories[0]) {
              setScope({ kind: "category", id: lib.categories[0].id });
            } else {
              onNewCategory();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (lib.categories[0]) setScope({ kind: "category", id: lib.categories[0].id });
              else onNewCategory();
            }
          }}
        >
          <div className="stat-card-top">
            <div className="stat-card-icon-box stat-icon-purple">
              <Icon name="folder" size={16} />
            </div>
            <span className="stat-trend-pill trend-purple">Collections</span>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{catCount}</div>
            <div className="stat-card-label">Collections</div>
            <div className="stat-card-meta">
              {catCount > 0 ? "Click to browse collections" : "Create your first collection"}
            </div>
          </div>
        </div>

        <div
          className="dashboard-stat-card"
          role="button"
          tabIndex={0}
          onClick={() => setScope({ kind: "recent" })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setScope({ kind: "recent" });
            }
          }}
        >
          <div className="stat-card-top">
            <div className="stat-card-icon-box stat-icon-emerald">
              <Icon name="clock" size={16} />
            </div>
            <span className="stat-trend-pill trend-emerald">7 Days</span>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{recentCount}</div>
            <div className="stat-card-label">Recent Activity</div>
            <div className="stat-card-meta">Added or opened this week</div>
          </div>
        </div>
      </section>

      {/* 3. Collections Strip (when user has collections) */}
      {lib.categories.length > 0 ? (
        <section className="dashboard-collections-section" aria-label="Collections">
          <div className="dashboard-section-header">
            <div className="dashboard-section-title">
              <span>Collections</span>
              <span className="count-badge t-num">{lib.categories.length}</span>
            </div>
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-quiet" onClick={onNewCategory}>
              <Icon name="plus" size={12} />
              <span>New collection</span>
            </button>
          </div>
          <div className="dashboard-collections-grid">
            {lib.categories.map((cat) => {
              const count = countFor(lib, { kind: "category", id: cat.id });
              return (
                <button
                  key={cat.id}
                  type="button"
                  className="dashboard-collection-card"
                  onClick={() => setScope({ kind: "category", id: cat.id })}
                >
                  <span
                    className="dashboard-collection-icon"
                    style={{
                      backgroundColor: cat.color ? `${cat.color}18` : "var(--accent-soft)",
                      color: cat.color || "var(--accent)",
                    }}
                  >
                    <Icon name={(cat.icon as IconName) || "folder"} size={15} />
                  </span>
                  <span className="dashboard-collection-info truncate">
                    <span className="dashboard-collection-name truncate">{cat.name}</span>
                    <span className="dashboard-collection-count t-num">
                      {count} {count === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={13} className="dashboard-collection-arrow" />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* 4. Recent / Saved Bookmarks Section */}
      <section className="dashboard-main-section">
        <div className="dashboard-section-header">
          <div className="dashboard-section-title">
            <span>Recent bookmarks</span>
            <span className="count-badge t-num">{totalCount}</span>
          </div>

          {totalCount > 0 ? (
            <div className="dashboard-view-mode-tabs" role="group" aria-label="View format">
              <button
                type="button"
                className={`table-view-tab ${overviewView === "grid" ? "is-active" : ""}`}
                onClick={() => setOverviewView("grid")}
              >
                <Icon name="grid" size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`table-view-tab ${overviewView === "table" ? "is-active" : ""}`}
                onClick={() => setOverviewView("table")}
              >
                <Icon name="list" size={13} />
                <span>Table</span>
              </button>
            </div>
          ) : null}

          <span className="spacer" />

          {selectedBookmarkIds.size > 0 && overviewView === "table" ? (
            <div className="dashboard-bulk-bar">
              <span className="t-meta t-num">{selectedBookmarkIds.size} selected</span>
              <button type="button" className="btn btn-sm btn-danger" onClick={handleBulkDelete}>
                <Icon name="trash" size={12} />
                <span>Delete</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-quiet"
                onClick={() => setSelectedBookmarkIds(new Set())}
              >
                Clear
              </button>
            </div>
          ) : null}

          {totalCount > 0 ? (
            <button
              type="button"
              className="dashboard-view-all-btn"
              onClick={() => setScope({ kind: "all" })}
            >
              <span>View all ({totalCount})</span>
              <Icon name="chevronRight" size={13} />
            </button>
          ) : null}
        </div>

        {totalCount === 0 ? (
          <div className="dashboard-empty-card">
            <div className="dashboard-empty-hero">
              <span className="dashboard-empty-icon">
                <Icon name="sift" size={24} />
              </span>
              <h3 className="dashboard-empty-title">Start your developer library</h3>
              <p className="dashboard-empty-subtitle">
                Save documentation, GitHub repos, tools, and dashboards in one fast workspace.
              </p>
              <div className="dashboard-empty-actions">
                <button type="button" className="btn btn-primary" onClick={onNewBookmark}>
                  <Icon name="plus" size={14} />
                  <span>Add bookmark</span>
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    loadStarterBookmarks();
                    pushToast("Loaded starter developer bookmarks");
                  }}
                >
                  <Icon name="sparkle" size={13.5} />
                  <span>Load starter library</span>
                </button>
              </div>
            </div>
          </div>
        ) : overviewView === "table" ? (
          <div className="recent-table-card">
            <div className="recent-table-head">
              <div className="th-check" />
              <div className="th-name">Bookmark</div>
              <div className="th-category">Collection</div>
              <div className="th-status">Pinned</div>
              <div className="th-time">Updated</div>
              <div className="th-actions">Actions</div>
            </div>
            <div className="recent-table-body">
              {lib.bookmarks.slice(0, 8).map((b) => {
                const catId = b.categoryId || b.collectionId;
                const cat = catId ? categoryMap.get(catId) : undefined;
                const isSelected = selectedBookmarkIds.has(b.id);
                const isFav = b.favorite || b.isFavorite;
                return (
                  <div
                    key={b.id}
                    className={`recent-table-row ${isSelected ? "is-selected" : ""}`}
                    onClick={() => {
                      markBookmarkOpened(b.id);
                      actions.open(b);
                    }}
                  >
                    <div
                      className="td-check"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBookmarkIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(b.id)) next.delete(b.id);
                          else next.add(b.id);
                          return next;
                        });
                      }}
                    >
                      <span
                        className={`table-checkbox ${isSelected ? "is-checked" : ""}`}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        aria-label={`Select ${b.title}`}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedBookmarkIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(b.id)) next.delete(b.id);
                              else next.add(b.id);
                              return next;
                            });
                          }
                        }}
                      >
                        {isSelected ? <Icon name="check" size={10} strokeWidth={2.6} /> : null}
                      </span>
                    </div>

                    <div className="td-name">
                      <div className="table-favicon-box">
                        <Favicon url={b.url} size={18} />
                      </div>
                      <div className="table-title-col truncate">
                        <span className="table-title-txt truncate">{b.title}</span>
                        <span className="table-url-sub truncate">{domainOf(b.url)}</span>
                      </div>
                    </div>

                    <div className="td-category">
                      {cat ? (
                        <span className="table-cat-pill">
                          <span
                            className="table-cat-dot"
                            style={{ backgroundColor: cat.color || "var(--accent)" }}
                          />
                          <span className="truncate">{cat.name}</span>
                        </span>
                      ) : (
                        <span className="table-cat-pill is-unfiled">
                          <span>Uncategorized</span>
                        </span>
                      )}
                    </div>

                    <div className="td-status">
                      {isFav ? (
                        <span className="table-status-pill status-pinned">
                          <Icon name="star" size={10} filled />
                          <span>Pinned</span>
                        </span>
                      ) : (
                        <span className="table-status-pill status-active">
                          <span className="status-dot" />
                          <span>Saved</span>
                        </span>
                      )}
                    </div>

                    <div className="td-time t-num">
                      {shortRelative(b.lastOpenedAt || b.addedAt)}
                    </div>

                    <div className="td-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="table-action-btn"
                        aria-label={isFav ? `Remove ${b.title} from favourites` : `Add ${b.title} to favourites`}
                        title={isFav ? "Remove favourite" : "Add favourite"}
                        onClick={() => actions.toggleFavorite(b.id)}
                      >
                        <Icon name="star" size={13} filled={isFav} style={{ color: isFav ? "var(--fav)" : undefined }} />
                      </button>
                      <button
                        type="button"
                        className="table-action-btn"
                        aria-label={`Copy URL for ${b.title}`}
                        title="Copy URL"
                        onClick={() => actions.copy(b)}
                      >
                        <Icon name="copy" size={12.5} />
                      </button>
                      <button
                        type="button"
                        className="table-action-btn"
                        aria-label={`More options for ${b.title}`}
                        title="More options"
                        onClick={(e) => setMenu({ bookmark: b, anchor: e.currentTarget })}
                      >
                        <Icon name="ellipsis" size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid">
            {lib.bookmarks.slice(0, 8).map((bookmark, index) => {
              const catId = bookmark.categoryId || bookmark.collectionId;
              const cat = catId ? categoryMap.get(catId) : undefined;
              return (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  index={index}
                  focused={bookmark.id === focusedId}
                  actions={actions}
                  onFocus={setFocusedId}
                  onMenu={(b, anchor) => setMenu({ bookmark: b, anchor })}
                  onTag={onTag}
                  category={cat ? { name: cat.name, color: cat.color, icon: cat.icon } : undefined}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Curated Developer Suggestions */}
      <section className="dashboard-suggestions-section">
        <div className="dashboard-section-header">
          <div>
            <h3 className="dashboard-section-title">
              <span>Developer directory</span>
            </h3>
            <p className="dashboard-section-desc">
              Essential documentation, tools, and platforms you can add in one click.
            </p>
          </div>
          <span className="spacer" />
          <div className="suggestions-category-filter">
            {["All", "Development", "AI", "Database", "Deployment", "Tools"].map((cName) => (
              <button
                key={cName}
                type="button"
                className={`sug-filter-chip ${selectedSugCategory === cName ? "is-active" : ""}`}
                onClick={() => setSelectedSugCategory(cName)}
              >
                {cName}
              </button>
            ))}
          </div>
        </div>

        <div className="suggestions-grid">
          {filteredSuggestions.slice(0, 6).map((sug) => {
            const alreadyInLibrary =
              addedSuggestions.has(sug.id) ||
              lib.bookmarks.some((b) => b.url.toLowerCase() === sug.url.toLowerCase());

            return (
              <div className="suggestion-card" key={sug.id}>
                <div className="sug-card-head">
                  <div className="sug-card-icon-box">
                    <Favicon url={sug.url} size={20} />
                  </div>
                  <div className="sug-card-title-col truncate">
                    <h4 className="sug-card-title truncate">{sug.title}</h4>
                    <span className="sug-card-cat">{sug.category}</span>
                  </div>
                </div>

                <p className="sug-card-desc truncate-2">{sug.description}</p>

                <div className="sug-card-foot">
                  <span className="sug-card-domain">
                    {sug.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                  <span className="spacer" />
                  <button
                    type="button"
                    className={`sug-add-btn ${alreadyInLibrary ? "is-added" : ""}`}
                    disabled={alreadyInLibrary}
                    onClick={() => handleAddSuggestion(sug)}
                  >
                    {alreadyInLibrary ? (
                      <>
                        <Icon name="check" size={12} strokeWidth={2.4} />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Icon name="plus" size={12} />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Context Menu */}
      <Menu
        open={!!menu}
        anchor={menu?.anchor ?? null}
        width={220}
        entries={
          menu
            ? buildItemEntries(menu.bookmark, actions, lib.categories, false)
            : []
        }
        onClose={() => setMenu(null)}
      />
    </div>
  );
}
