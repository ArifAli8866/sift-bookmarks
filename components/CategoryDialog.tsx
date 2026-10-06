"use client";

import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { Icon, type IconName } from "./Icon";

export interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
}

const ICONS: { id: IconName; label: string }[] = [
  { id: "folder", label: "Folder" },
  { id: "code", label: "Code" },
  { id: "bot", label: "AI / Bot" },
  { id: "database", label: "Database" },
  { id: "cloud", label: "Cloud / Infra" },
  { id: "wrench", label: "Tools" },
  { id: "swatch", label: "Design" },
  { id: "book", label: "Docs" },
  { id: "terminal", label: "Terminal" },
  { id: "globe", label: "Web" },
  { id: "bookmark", label: "Bookmark" },
  { id: "sparkle", label: "Sparkle" },
];

const COLORS = [
  { hex: "#0a7aff", name: "Blue" },
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#8b5cf6", name: "Purple" },
  { hex: "#10b981", name: "Emerald" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#f43f5e", name: "Rose" },
];

export function CategoryDialog({
  open,
  name,
  icon,
  color,
  isNew,
  onClose,
  onSubmit,
}: {
  open: boolean;
  name: string;
  icon?: string;
  color?: string;
  isNew: boolean;
  onClose: () => void;
  onSubmit: (values: CategoryFormData) => void;
}) {
  const [draftName, setDraftName] = useState("");
  const [glyph, setGlyph] = useState<IconName>("folder");
  const [accentColor, setAccentColor] = useState("#0a7aff");

  useEffect(() => {
    if (!open) return;
    setDraftName(name || "");
    setGlyph(((icon as IconName) || "folder"));
    setAccentColor(color || "#0a7aff");
  }, [open, name, icon, color]);

  const submit = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    onSubmit({
      name: trimmed,
      icon: glyph,
      color: accentColor,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? "Create Category" : "Edit Category"}
      initialFocus="input[name='categoryName']"
      footer={
        <>
          <span className="dialog-hint">
            <kbd>⌘</kbd>
            <kbd>↵</kbd>
            <span>{isNew ? "create" : "save"}</span>
          </span>
          <span className="spacer" />
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!draftName.trim()}
            onClick={submit}
          >
            {isNew ? "Create category" : "Save changes"}
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
        {/* Name input */}
        <label className="field">
          <span className="field-label">Category Name</span>
          <span className="input">
            <input
              name="categoryName"
              type="text"
              value={draftName}
              placeholder="e.g. AI Tools, Database, Design"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setDraftName(e.target.value)}
            />
          </span>
        </label>

        {/* Icon picker */}
        <div className="field">
          <span className="field-label">Icon</span>
          <div className="glyph-row" role="radiogroup" aria-label="Category icon">
            {ICONS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={glyph === item.id}
                aria-label={item.label}
                title={item.label}
                className="glyph"
                data-on={glyph === item.id ? "true" : undefined}
                onClick={() => setGlyph(item.id)}
              >
                <Icon name={item.id} size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div className="field">
          <span className="field-label">Color accent</span>
          <div className="color-swatch-row" role="radiogroup" aria-label="Category color">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={accentColor === c.hex}
                aria-label={c.name}
                title={c.name}
                className="color-swatch-btn"
                data-selected={accentColor === c.hex ? "true" : undefined}
                style={{ backgroundColor: c.hex }}
                onClick={() => setAccentColor(c.hex)}
              >
                {accentColor === c.hex ? (
                  <span className="color-swatch-check">✓</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview */}
        <div className="field">
          <span className="field-label">Preview in sidebar</span>
          <div className="category-preview-pill">
            <span
              className="card-cat-dot"
              style={{ backgroundColor: accentColor }}
            />
            <Icon name={glyph} size={14} />
            <span className="category-preview-name">
              {draftName.trim() || "Category name"}
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
