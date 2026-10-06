"use client";

import { useId, type ReactNode } from "react";
import { Overlay } from "./Overlay";
import { Icon } from "./Icon";

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  variant = "default",
  initialFocus,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "default" | "wide" | "confirm";
  initialFocus?: string;
}) {
  const id = useId();
  const className = `dialog${variant === "wide" ? " dialog--wide" : ""}${
    variant === "confirm" ? " dialog--confirm" : ""
  }`;

  return (
    <Overlay
      open={open}
      onClose={onClose}
      className={className}
      labelledBy={id}
      initialFocus={initialFocus}
    >
      <div className="dialog-head">
        <h2 className="dialog-title" id={id}>
          {title}
        </h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={12} />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
      {footer ? <div className="dialog-foot">{footer}</div> : null}
    </Overlay>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      variant="confirm"
      initialFocus=".btn-danger"
      footer={
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="dialog-copy" style={{ padding: "14px 16px 12px" }}>
        {body}
      </p>
    </Dialog>
  );
}

const GROUPS: { label: string; rows: [string[], string][] }[] = [
  {
    label: "Everywhere",
    rows: [
      [["⌘", "K"], "Command palette"],
      [["⌘", "N"], "New bookmark"],
      [["⌘", "\\"], "Hide or show the sidebar"],
      [["⌘", "1"], "All items"],
      [["⌘", "2"], "Favourites"],
      [["⌘", "3"], "Recent"],
      [["/"], "Filter this view"],
      [["?"], "This sheet"],
      [["esc"], "Clear filter, close overlay"],
    ],
  },
  {
    label: "In the list",
    rows: [
      [["↑", "↓", "←", "→"], "Move between cards"],
      [["↵"], "Open the focused link"],
      [["F"], "Toggle favourite"],
      [["E"], "Edit focused link"],
      [["⌫"], "Delete focused link"],
      [["⌘", "↑"], "Move up (manual order)"],
      [["⌘", "↓"], "Move down (manual order)"],
      [["drag"], "Reorder: grab anywhere on a card"],
      [["right-click"], "Actions for a link or collection"],
    ],
  },
  {
    label: "In dialogs",
    rows: [
      [["⌘", "↵"], "Save"],
      [["↵"], "Add tag, or run palette row"],
      [["⇧", "↵"], "Palette: edit instead of open"],
      [["esc"], "Cancel"],
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" variant="wide">
      <div className="keys">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="menu-label" style={{ paddingLeft: 2, paddingBottom: 2 }}>
              {group.label}
            </div>
            {group.rows.map(([keys, description]) => (
              <div className="keys-row" key={description}>
                <span>{description}</span>
                <span className="kbd-set">
                  {keys.map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
