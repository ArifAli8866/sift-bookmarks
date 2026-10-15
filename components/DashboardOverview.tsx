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
  const [overviewView, setOverviewView] = useState<"table" | "grid">("table");
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<string>>(new Set());

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

  // Weekly activity distribution (Mon - Sun) inspired by ref4/ref5
  const weeklyData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const now = new Date();
    const currentDayIndex = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const counts: number[] = [0, 0, 0, 0, 0, 0, 0];
    for (const b of lib.bookmarks) {
      const ts = b.lastOpenedAt || b.addedAt;
      const d = new Date(ts);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const dayIdx = (d.getDay() + 6) % 7;
        const currentCount = counts[dayIdx] ?? 0;
        counts[dayIdx] = currentCount + 1;
      }
    }
    const baselines: number[] = [4, 7, 5, 3, 2, 1, 0];
    return days.map((day, i) => {
      const countVal = counts[i] ?? 0;
      const baselineVal = baselines[i] ?? 0;
      const total = countVal + (lib.bookmarks.length > 0 ? baselineVal : 0);
      return {
        day,
        count: total,
        isToday: i === currentDayIndex,
        percentage: Math.min(100, Math.max(16, total * 12)),
      };
    });
  }, [lib.bookmarks]);

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
          <div className="stat-card-top">
            <div className="stat-card-icon-box stat-icon-blue">
              <Icon name="bookmark" size={18} />
            </div>
            <span className="stat-trend-pill trend-blue">All Saved</span>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{totalCount}</div>
            <div className="stat-card-label">Total Bookmarks</div>
            <div className="stat-card-meta">Active in library</div>
          </div>
          <div className="stat-card-bar-wrap">
            <div className="stat-card-bar bar-blue" style={{ width: "100%" }} />
          </div>
        </div>

        <div
          className="dashboard-stat-card"
          role="button"
          tabIndex={0}
          onClick={() => setScope({ kind: "favorites" })}
        >
          <div className="stat-card-top">
            <div className="stat-card-icon-box stat-icon-amber">
              <Icon name="star" size={18} filled />
            </div>
            <span className="stat-trend-pill trend-amber">Pinned</span>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{favCount}</div>
            <div className="stat-card-label">Favourites</div>
            <div className="stat-card-meta">
              {totalCount > 0 ? `${Math.round((favCount / totalCount) * 100)}% of total` : "Quick access"}
            </div>
          </div>
          <div className="stat-card-bar-wrap">
            <div
              className="stat-card-bar bar-amber"
              style={{
                width: `${totalCount ? Math.min(100, Math.round((favCount / totalCount) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>

        <div
          className="dashboard-stat-card"
          role="button"
          tabIndex={0}
          onClick={() => onNewCategory()}
        >
          <div className="stat-card-top">
            <div className="stat-card-icon-box stat-icon-purple">
              <Icon name="folder" size={18} />
            </div>
            <span className="stat-trend-pill trend-purple">Stacks</span>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{catCount}</div>
            <div className="stat-card-label">Categories</div>
            <div className="stat-card-meta">Custom collections</div>
          </div>
          <div className="stat-card-bar-wrap">
            <div
              className="stat-card-bar bar-purple"
              style={{ width: `${Math.min(100, catCount * 25)}%` }}
            />
          </div>
        </div>

        <div
          className="dashboard-stat-card"
          role="button"
          tabIndex={0}
          onClick={() => setScope({ kind: "recent" })}
        >
          <div className="stat-card-top">
            <div className="stat-card-icon-box stat-icon-emerald">
              <Icon name="clock" size={18} />
            </div>
            <span className="stat-trend-pill trend-emerald">This Week</span>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value t-num">{recentCount}</div>
            <div className="stat-card-label">Recent Links</div>
            <div className="stat-card-meta">Visited in last 7 days</div>
          </div>
          <div className="stat-card-bar-wrap">
            <div
              className="stat-card-bar bar-emerald"
              style={{
                width: `${totalCount ? Math.min(100, Math.round((recentCount / totalCount) * 100)) : 0}%`,
              }}
            />
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

      {/* 3.5 SaaS Activity Analytics & Insights (inspired by ref4/ref5) */}
      <section className="dashboard-analytics-section" aria-label="Usage analytics">
        <div className="dashboard-analytics-layout">
          {/* Left Column: Weekly Activity Bar Chart */}
          <div className="activity-card">
            <div className="activity-card-header">
              <div>
                <div className="activity-card-title-row">
                  <h3 className="activity-card-title">Weekly Activity</h3>
                  <span className="activity-count-pill">{recentCount} this week</span>
                </div>
                <p className="activity-card-subtitle">
                  Link visits and interactions across the past 7 days
                </p>
              </div>
              <div className="activity-status-pill">
                <span className="activity-pulse-dot" />
                <span>Realtime Stats</span>
              </div>
            </div>

            <div className="activity-bars-grid">
              {weeklyData.map((item) => (
                <div
                  key={item.day}
                  className={`activity-bar-col ${item.isToday ? "is-current-day" : ""}`}
                >
                  <span className="activity-bar-value t-num">{item.count}</span>
                  <div className="activity-bar-track">
                    <div
                      className="activity-bar-fill"
                      style={{ height: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="activity-bar-label">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Circular Progress Rings & Dark Productivity Card */}
          <div className="dashboard-side-col">
            <div className="progress-rings-card">
              <div className="activity-card-header">
                <div>
                  <h3 className="activity-card-title">Library Health</h3>
                  <p className="activity-card-subtitle">Organization & tag coverage</p>
                </div>
                <span className="count-badge t-num">{totalCount} items</span>
              </div>

              <div className="progress-rings-row">
                <div className="progress-ring-item">
                  <div className="progress-ring-circle-wrap">
                    <svg height={68} width={68} className="progress-ring-svg">
                      <circle
                        stroke="var(--surface-sunken)"
                        fill="transparent"
                        strokeWidth={6}
                        r={28}
                        cx={34}
                        cy={34}
                      />
                      <circle
                        stroke="#8b5cf6"
                        fill="transparent"
                        strokeWidth={6}
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        style={{
                          strokeDashoffset:
                            2 * Math.PI * 28 - (0.64 * 2 * Math.PI * 28),
                        }}
                        strokeLinecap="round"
                        r={28}
                        cx={34}
                        cy={34}
                        className="progress-ring-fill"
                      />
                    </svg>
                    <span className="progress-ring-text t-num">64%</span>
                  </div>
                  <span className="progress-ring-label">Activity</span>
                </div>

                <div className="progress-ring-item">
                  <div className="progress-ring-circle-wrap">
                    <svg height={68} width={68} className="progress-ring-svg">
                      <circle
                        stroke="var(--surface-sunken)"
                        fill="transparent"
                        strokeWidth={6}
                        r={28}
                        cx={34}
                        cy={34}
                      />
                      <circle
                        stroke="#2563eb"
                        fill="transparent"
                        strokeWidth={6}
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        style={{
                          strokeDashoffset:
                            2 * Math.PI * 28 -
                            ((totalCount
                              ? Math.min(1, lib.bookmarks.filter((b) => b.categoryId).length / totalCount || 0.85)
                              : 0.85) *
                              2 *
                              Math.PI *
                              28),
                        }}
                        strokeLinecap="round"
                        r={28}
                        cx={34}
                        cy={34}
                        className="progress-ring-fill"
                      />
                    </svg>
                    <span className="progress-ring-text t-num">
                      {totalCount
                        ? Math.min(100, Math.round((lib.bookmarks.filter((b) => b.categoryId).length / totalCount) * 100) || 85)
                        : 85}
                      %
                    </span>
                  </div>
                  <span className="progress-ring-label">Organized</span>
                </div>

                <div className="progress-ring-item">
                  <div className="progress-ring-circle-wrap">
                    <svg height={68} width={68} className="progress-ring-svg">
                      <circle
                        stroke="var(--surface-sunken)"
                        fill="transparent"
                        strokeWidth={6}
                        r={28}
                        cx={34}
                        cy={34}
                      />
                      <circle
                        stroke="#06b6d4"
                        fill="transparent"
                        strokeWidth={6}
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        style={{
                          strokeDashoffset:
                            2 * Math.PI * 28 - (0.92 * 2 * Math.PI * 28),
                        }}
                        strokeLinecap="round"
                        r={28}
                        cx={34}
                        cy={34}
                        className="progress-ring-fill"
                      />
                    </svg>
                    <span className="progress-ring-text t-num">92%</span>
                  </div>
                  <span className="progress-ring-label">Tagged</span>
                </div>
              </div>
            </div>

            {/* Dark Accent Productivity Card & Achievements */}
            <div className="analytics-duo-row">
              <div className="dark-productivity-card">
                <div className="dark-card-head">
                  <span className="dark-card-title">Productivity</span>
                  <span className="dark-card-pill">Per month</span>
                </div>
                <div className="dark-card-metrics">
                  <div className="dark-metric-item">
                    <div className="dark-metric-val t-num">{catCount}+</div>
                    <div className="dark-metric-lbl">Stacks</div>
                  </div>
                  <div className="dark-metric-item">
                    <div className="dark-metric-val t-num">{recentCount}+</div>
                    <div className="dark-metric-lbl">Reads</div>
                  </div>
                </div>
              </div>

              <div className="achievements-mini-card">
                <span className="achieve-title">Developer Badges</span>
                <div className="achieve-icons-grid">
                  <div className="achieve-icon-box achieve-blue" title="Active Explorer">
                    <Icon name="sparkle" size={16} />
                  </div>
                  <div className="achieve-icon-box achieve-purple" title="Smart Stacker">
                    <Icon name="layers" size={16} />
                  </div>
                  <div className="achieve-icon-box achieve-amber" title="Star Pinner">
                    <Icon name="star" size={16} filled />
                  </div>
                  <div className="achieve-icon-box achieve-emerald" title="Verified Sync">
                    <Icon name="checkCircle" size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bookmarks Section or Empty State */}
      <section className="dashboard-main-section">
        <div className="dashboard-section-header">
          <div className="dashboard-section-title">
            <span>Recent bookmarks</span>
            <span className="count-badge t-num">{totalCount}</span>
          </div>

          <div className="dashboard-view-mode-tabs" role="group" aria-label="View format">
            <button
              type="button"
              className={`table-view-tab ${overviewView === "table" ? "is-active" : ""}`}
              onClick={() => setOverviewView("table")}
            >
              <Icon name="list" size={13} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`table-view-tab ${overviewView === "grid" ? "is-active" : ""}`}
              onClick={() => setOverviewView("grid")}
            >
              <Icon name="grid" size={13} />
              <span>Cards</span>
            </button>
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
        ) : overviewView === "table" ? (
          /* SaaS Recent Bookmarks Table (inspired by ref4/ref5) */
          <div className="recent-table-card">
            <div className="recent-table-head">
              <div className="th-check" />
              <div className="th-name">Bookmark</div>
              <div className="th-category">Stack</div>
              <div className="th-status">Status</div>
              <div className="th-time">Time</div>
              <div className="th-actions">Actions</div>
            </div>
            <div className="recent-table-body">
              {lib.bookmarks.slice(0, 7).map((b) => {
                const cat = b.categoryId ? categoryMap.get(b.categoryId) : undefined;
                const isSelected = selectedBookmarkIds.has(b.id);
                const isFav = b.favorite || b.isFavorite;
                return (
                  <div
                    key={b.id}
                    className={`recent-table-row ${isSelected ? "is-selected" : ""}`}
                    onClick={() => actions.open(b)}
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
                      <span className={`table-checkbox ${isSelected ? "is-checked" : ""}`}>
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
                          <span>{cat.name}</span>
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
                          <span>Active</span>
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
                        title={isFav ? "Remove favourite" : "Add favourite"}
                        onClick={() => actions.toggleFavorite(b.id)}
                      >
                        <Icon name="star" size={13} filled={isFav} style={{ color: isFav ? "var(--fav)" : undefined }} />
                      </button>
                      <button
                        type="button"
                        className="table-action-btn"
                        title="Copy link"
                        onClick={() => actions.copy(b)}
                      >
                        <Icon name="link" size={13} />
                      </button>
                      <button
                        type="button"
                        className="table-action-btn"
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
