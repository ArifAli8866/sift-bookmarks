"use client";

import { Icon, type IconName } from "./Icon";

export function EmptyState({
  icon,
  title,
  body,
  primary,
  secondary,
}: {
  icon: IconName;
  title: string;
  body: string;
  primary?: { label: string; onClick: () => void; kbd?: string };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="empty">
      <span className="empty-glyph" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <h2 className="empty-title">{title}</h2>
      <p className="empty-body">{body}</p>
      {primary || secondary ? (
        <div className="empty-actions">
          {primary ? (
            <button type="button" className="btn" onClick={primary.onClick}>
              {primary.label}
              {primary.kbd ? <kbd>{primary.kbd}</kbd> : null}
            </button>
          ) : null}
          {secondary ? (
            <button type="button" className="btn" onClick={secondary.onClick}>
              {secondary.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
