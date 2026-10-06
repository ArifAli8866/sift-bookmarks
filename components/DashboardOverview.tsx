"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Favicon } from "./Favicon";
import { BookmarkCard, BookmarkRow } from "./BookmarkCard";
import { EmptyState } from "./EmptyState";
import { Menu } from "./Menu";
import { SUGGESTED_BOOKMARKS } from "../lib/suggestions";
import {
  addBookmark,
  setScope,
  setQuery,
  type Bookmark,
  type Category,
  type LibraryState,
} from "../lib/store";
import { buildItemEntries, type ItemActions } from "./itemActions";
import { pushToast } from "../lib/toast";

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

  // Dynamic greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const userName = lib.user?.name ? lib.user.name.split(" ")[0] : "Developer";

  // Summary counts
  const totalCount = lib.bookmarks.length;
  const favCount = lib.bookmarks.filter((b) => b.favorite || b.isFavorite).length;
  const catCount = lib.categories.length;
  const recentCount = lib.bookmarks.filter((b) => {
    const ts = b.lastOpenedAt || b.addedAt;
    return Date.now() - ts < 1000 * 60 * 60 * 24 * 7;
  }).length;

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
    // Determine category ID if matched with user's custom categories
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

  return (
    <div className="dashboard-wrap">
      {/* 1. Header Greeting */}
      <section className="dashboard-greeting-bar">
        <div className="dashboard-greeting-text">
          <h2 className="dashboard-greeting-title">
            {greeting}, {userName} 👋
          </h2>
          <p className="dashboard-greeting-subtitle">Your personal developer toolbox.</p>
        </div>
        <div className="dashboard-greeting-actions">
          <button type="button" className="btn btn-quiet" onClick={onOpenPalette} title="Cmd+K">
            <Icon name="search" size={14} />
            <span>Search (⌘K)</span>
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
        >
          <div className="stat-card-icon-box stat-icon-blue">
            <Icon name="bookmark" size={18} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{totalCount}</div>
            <div className="stat-card-label">Total Bookmarks</div>
            <div className="stat-card-meta">Active in library</div>
          </div>
        </div>

        <div
          className="dashboard-stat-card"
          role="button"
          tabIndex={0}
          onClick={() => setScope({ kind: "favorites" })}
        >
          <div className="stat-card-icon-box stat-icon-amber">
            <Icon name="star" size={18} filled />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{favCount}</div>
            <div className="stat-card-label">Favourites</div>
            <div className="stat-card-meta">Pinned shortcuts</div>
          </div>
        </div>

        <div
          className="dashboard-stat-card"
          role="button"
          tabIndex={0}
          onClick={() => onNewCategory()}
        >
          <div className="stat-card-icon-box stat-icon-purple">
            <Icon name="folder" size={18} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{catCount}</div>
            <div className="stat-card-label">Categories</div>
            <div className="stat-card-meta">Custom stacks</div>
          </div>
        </div>

        <div
          className="dashboard-stat-card"
          role="button"
          tabIndex={0}
          onClick={() => setScope({ kind: "recent" })}
        >
          <div className="stat-card-icon-box stat-icon-emerald">
            <Icon name="clock" size={18} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{recentCount}</div>
            <div className="stat-card-label">Recent Links</div>
            <div className="stat-card-meta">Last 7 days</div>
          </div>
        </div>
      </section>

      {/* 3. Quick Actions Row */}
      <section className="dashboard-quick-actions" aria-label="Quick actions">
        <div className="quick-actions-label">
          <Icon name="sparkle" size={14} />
          <span>Quick actions</span>
        </div>
        <div className="quick-actions-btns">
          <button type="button" className="quick-action-btn" onClick={onNewBookmark}>
            <Icon name="plus" size={13} />
            <span>Add Bookmark</span>
          </button>
          <button type="button" className="quick-action-btn" onClick={onNewCategory}>
            <Icon name="folder" size={13} />
            <span>Create Category</span>
          </button>
          <button type="button" className="quick-action-btn" onClick={onOpenPalette}>
            <Icon name="command" size={13} />
            <span>Command Palette</span>
          </button>
        </div>
      </section>

      {/* 4. Bookmarks Section or Empty State */}
      <section className="dashboard-main-section">
        <div className="dashboard-section-header">
          <div className="dashboard-section-title">
            <span>Your bookmarks</span>
            <span className="count-badge t-num">{totalCount}</span>
          </div>
          <span className="spacer" />
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
                <Icon name="bookmark" size={24} />
              </span>
              <h3 className="dashboard-empty-title">Build your developer library</h3>
              <p className="dashboard-empty-subtitle">
                Save the websites you use every day and access them from one place.
              </p>
              <button type="button" className="btn btn-primary" onClick={onNewBookmark}>
                <Icon name="plus" size={14} />
                <span>Add your first bookmark</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid">
            {lib.bookmarks.slice(0, 8).map((bookmark, index) => {
              const cat = bookmark.categoryId ? categoryMap.get(bookmark.categoryId) : undefined;
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

      {/* 5. Curated Suggestions Section */}
      <section className="dashboard-suggestions-section">
        <div className="dashboard-section-header">
          <div>
            <h3 className="dashboard-section-title">
              <span>Popular suggestions</span>
            </h3>
            <p className="dashboard-section-desc">
              Curated developer tools you can instantly add to your personal library.
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
          {filteredSuggestions.slice(0, 9).map((sug) => {
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
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Icon name="plus" size={12} />
                        <span>Add</span>
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
            ? buildItemEntries(menu.bookmark, actions, lib.collections, false)
            : []
        }
        onClose={() => setMenu(null)}
      />
    </div>
  );
}
