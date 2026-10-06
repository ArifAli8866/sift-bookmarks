"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { Favicon } from "./Favicon";
import { finishOnboarding } from "../lib/store";
import { SUGGESTED_BOOKMARKS, DEFAULT_ONBOARDING_CATEGORIES } from "../lib/suggestions";
import { pushToast } from "../lib/toast";

export function OnboardingModal({
  open,
  userName,
  onComplete,
}: {
  open: boolean;
  userName?: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Development",
    "AI",
    "Tools",
  ]);
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<string[]>([
    "sug_github",
    "sug_mdn",
    "sug_react",
    "sug_chatgpt",
  ]);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const toggleBookmark = (id: string) => {
    setSelectedBookmarkIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const relevantBookmarks = SUGGESTED_BOOKMARKS.filter(
    (b) =>
      selectedCategories.length === 0 ||
      selectedCategories.some((c) => c.toLowerCase() === b.category.toLowerCase())
  );

  const handleBuildLibrary = async () => {
    setLoading(true);
    try {
      const chosenBookmarks = SUGGESTED_BOOKMARKS.filter((b) =>
        selectedBookmarkIds.includes(b.id)
      ).map((b) => ({
        title: b.title,
        url: b.url,
        description: b.description,
        category: b.category,
        tags: b.tags,
      }));

      await finishOnboarding({
        categories: selectedCategories,
        bookmarks: chosenBookmarks,
        skipped: false,
      });

      pushToast("Your personal workspace is ready!");
      onComplete();
    } catch {
      pushToast("Error building workspace.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await finishOnboarding({ skipped: true });
      pushToast("Welcome to Sift!");
      onComplete();
    } catch {
      pushToast("Error skipping onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <div className="onboarding-card">
        {/* Step Indicator */}
        <div className="onboarding-steps">
          <span className={`onboarding-step-dot ${step >= 1 ? "is-active" : ""}`} />
          <span className={`onboarding-step-line ${step >= 2 ? "is-active" : ""}`} />
          <span className={`onboarding-step-dot ${step >= 2 ? "is-active" : ""}`} />
          <span className={`onboarding-step-line ${step >= 3 ? "is-active" : ""}`} />
          <span className={`onboarding-step-dot ${step >= 3 ? "is-active" : ""}`} />
        </div>

        {/* STEP 1: Welcome */}
        {step === 1 && (
          <div className="onboarding-content">
            <div className="onboarding-icon-banner">
              <span className="onboarding-sparkle-mark">👋</span>
            </div>
            <h2 className="onboarding-title">
              Welcome to Sift{userName ? `, ${userName}` : ""}
            </h2>
            <p className="onboarding-desc">
              Your personal developer toolbox for shortcuts, documentation, and tools you use
              every day. Everything is stored in your personal database.
            </p>

            <div className="onboarding-features-preview">
              <div className="onboarding-feature-item">
                <Icon name="bookmark" size={15} />
                <span>Personal & private database storage</span>
              </div>
              <div className="onboarding-feature-item">
                <Icon name="folder" size={15} />
                <span>Custom developer categories & colors</span>
              </div>
              <div className="onboarding-feature-item">
                <Icon name="command" size={15} />
                <span>Lightning-fast Cmd+K command palette</span>
              </div>
            </div>

            <div className="onboarding-foot">
              <button
                type="button"
                className="btn btn-quiet"
                onClick={handleSkip}
                disabled={loading}
              >
                Skip for now
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(2)}
              >
                Get started →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Choose categories */}
        {step === 2 && (
          <div className="onboarding-content">
            <h2 className="onboarding-title">What do you use?</h2>
            <p className="onboarding-desc">
              Select the categories that match your stack. You can always customize, rename, or
              add more later.
            </p>

            <div className="onboarding-category-grid">
              {DEFAULT_ONBOARDING_CATEGORIES.map((cat) => {
                const active = selectedCategories.includes(cat.name);
                return (
                  <button
                    key={cat.name}
                    type="button"
                    className={`onboarding-cat-pill ${active ? "is-selected" : ""}`}
                    onClick={() => toggleCategory(cat.name)}
                  >
                    <span
                      className="onboarding-cat-dot"
                      style={{ backgroundColor: cat.color }}
                    />
                    <Icon name={cat.icon as any} size={14} />
                    <span>{cat.name}</span>
                    <span className="onboarding-check-mark">
                      {active ? <Icon name="check" size={11} strokeWidth={2.8} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="onboarding-foot">
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(3)}
              >
                Next: Select bookmarks →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Recommended bookmarks */}
        {step === 3 && (
          <div className="onboarding-content">
            <h2 className="onboarding-title">Starter recommendations</h2>
            <p className="onboarding-desc">
              Select popular developer shortcuts to add to your library. You can uncheck any you
              don’t need.
            </p>

            <div className="onboarding-bookmarks-list scroll">
              {relevantBookmarks.slice(0, 10).map((b) => {
                const checked = selectedBookmarkIds.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className={`onboarding-bookmark-row ${checked ? "is-checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBookmark(b.id)}
                    />
                    <Favicon url={b.url} size={18} />
                    <div className="onboarding-bm-info truncate">
                      <div className="onboarding-bm-title">{b.title}</div>
                      <div className="onboarding-bm-desc truncate">{b.description}</div>
                    </div>
                    <span className="onboarding-bm-badge">{b.category}</span>
                  </label>
                );
              })}
            </div>

            <div className="onboarding-foot">
              <button
                type="button"
                className="btn btn-quiet"
                onClick={handleSkip}
                disabled={loading}
              >
                Skip for now
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBuildLibrary}
                disabled={loading}
              >
                {loading ? "Building library…" : `Build my library (${selectedBookmarkIds.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
