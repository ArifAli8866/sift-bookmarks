"use client";

import { Icon } from "./Icon";
import type { Scope } from "../lib/store";

interface MobileNavProps {
  currentScopeKind: string;
  onScope: (scope: Scope) => void;
  onNewBookmark: () => void;
  onOpenPalette: () => void;
  onToggleSidebar: () => void;
  favoritesCount?: number;
}

export function MobileNav({
  currentScopeKind,
  onScope,
  onNewBookmark,
  onOpenPalette,
  onToggleSidebar,
  favoritesCount,
}: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <div className="mobile-nav-inner">
        <button
          type="button"
          className="mobile-nav-item"
          data-active={currentScopeKind === "overview" ? "true" : undefined}
          onClick={() => onScope({ kind: "overview" })}
          aria-label="Overview"
        >
          <div className="mobile-nav-icon-wrap">
            <Icon name="layers" size={20} />
          </div>
          <span className="mobile-nav-label">Overview</span>
        </button>

        <button
          type="button"
          className="mobile-nav-item"
          data-active={currentScopeKind === "all" ? "true" : undefined}
          onClick={() => onScope({ kind: "all" })}
          aria-label="Library"
        >
          <div className="mobile-nav-icon-wrap">
            <Icon name="bookmark" size={20} />
          </div>
          <span className="mobile-nav-label">Library</span>
        </button>

        <div className="mobile-nav-center">
          <button
            type="button"
            className="mobile-nav-fab"
            onClick={onNewBookmark}
            aria-label="Add new bookmark"
            title="Add bookmark"
          >
            <Icon name="plus" size={22} />
          </button>
        </div>

        <button
          type="button"
          className="mobile-nav-item"
          data-active={currentScopeKind === "favorites" ? "true" : undefined}
          onClick={() => onScope({ kind: "favorites" })}
          aria-label="Favourites"
        >
          <div className="mobile-nav-icon-wrap">
            <Icon name="star" size={20} filled={currentScopeKind === "favorites"} />
            {favoritesCount && favoritesCount > 0 ? (
              <span className="mobile-nav-badge">{favoritesCount}</span>
            ) : null}
          </div>
          <span className="mobile-nav-label">Starred</span>
        </button>

        <button
          type="button"
          className="mobile-nav-item"
          onClick={onToggleSidebar}
          aria-label="More navigation"
        >
          <div className="mobile-nav-icon-wrap">
            <Icon name="sidebar" size={20} />
          </div>
          <span className="mobile-nav-label">More</span>
        </button>
      </div>
    </nav>
  );
}
