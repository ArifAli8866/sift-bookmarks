"use client";

import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { Icon, type IconName } from "./Icon";

const CHOICES: IconName[] = ["folder", "book", "wrench", "swatch", "briefcase", "bookmark", "code", "tag"];

export function CollectionDialog({
  open,
  name,
  icon,
  isNew,
  onClose,
  onSubmit,
}: {
  open: boolean;
  name: string;
  icon: string;
  isNew: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; icon: IconName }) => void;
}) {
  const [draft, setDraft] = useState("");
  const [glyph, setGlyph] = useState<IconName>("folder");

  useEffect(() => {
    if (!open) return;
    setDraft(name);
    setGlyph((icon as IconName) ?? "folder");
  }, [open, name, icon]);

  const submit = () => {
    if (!draft.trim()) return;
    onSubmit({ name: draft.trim(), icon: glyph });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? "New collection" : "Rename collection"}
      initialFocus="input[name='collection']"
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
          <button type="button" className="btn btn-primary" disabled={!draft.trim()} onClick={submit}>
            {isNew ? "Create" : "Save"}
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
          <span className="field-label">Name</span>
          <span className="input">
            <input
              name="collection"
              type="text"
              value={draft}
              placeholder="Docs & reference"
              spellCheck={false}
              onChange={(e) => setDraft(e.target.value)}
            />
          </span>
        </label>

        <div className="field">
          <span className="field-label">Symbol</span>
          <div className="glyph-row" role="radiogroup" aria-label="Collection symbol">
            {CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={glyph === choice}
                aria-label={choice}
                className="glyph"
                data-on={glyph === choice ? "true" : undefined}
                onClick={() => setGlyph(choice)}
              >
                <Icon name={choice} size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
