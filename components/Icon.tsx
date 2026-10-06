import type { SVGProps } from "react";

/**
 * A single, coherent icon set drawn on a 24px grid with a 1.6 stroke.
 * No emoji, no mixed weights, no filled blobs — everything shares one
 * optical size so rows and buttons stay aligned.
 */
export type IconName =
  | "star"
  | "plus"
  | "search"
  | "grid"
  | "list"
  | "sort"
  | "check"
  | "close"
  | "chevronDown"
  | "chevronRight"
  | "chevronUp"
  | "link"
  | "inbox"
  | "clock"
  | "book"
  | "wrench"
  | "briefcase"
  | "swatch"
  | "code"
  | "folder"
  | "grip"
  | "ellipsis"
  | "pencil"
  | "trash"
  | "external"
  | "sun"
  | "moon"
  | "auto"
  | "sidebar"
  | "keyboard"
  | "tag"
  | "arrowUp"
  | "arrowDown"
  | "command"
  | "bookmark"
  | "sparkle";

type Props = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Star is the one glyph that needs a filled variant. */
function Star({ filled, ...rest }: Props & { filled?: boolean }) {
  return (
    <Svg {...rest}>
      <path
        d="M12 3.6l2.5 5.06 5.58.8-4.04 3.94.95 5.56L12 16.36l-4.99 2.6.95-5.56L3.92 9.46l5.58-.8L12 3.6z"
        fill={filled ? "currentColor" : "none"}
        strokeWidth={filled ? 1.1 : 1.6}
      />
    </Svg>
  );
}

export function Icon({ name, filled, ...rest }: Props & { name: IconName; filled?: boolean }) {
  switch (name) {
    case "star":
      return <Star {...rest} filled={filled} />;
    case "plus":
      return (
        <Svg {...rest}>
          <path d="M12 5.5v13M5.5 12h13" />
        </Svg>
      );
    case "search":
      return (
        <Svg {...rest}>
          <circle cx="10.75" cy="10.75" r="6.25" />
          <path d="M15.4 15.4L20 20" />
        </Svg>
      );
    case "grid":
      return (
        <Svg {...rest}>
          <path d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z" />
        </Svg>
      );
    case "list":
      return (
        <Svg {...rest}>
          <path d="M4 6.5h16M4 12h16M4 17.5h16" />
        </Svg>
      );
    case "sort":
      return (
        <Svg {...rest}>
          <path d="M7 4.5v15M7 19.5l-3-3M7 19.5l3-3M17 19.5v-15M17 4.5l-3 3M17 4.5l3 3" />
        </Svg>
      );
    case "check":
      return (
        <Svg {...rest}>
          <path d="M4.75 12.5l4.5 4.5L19.25 7" />
        </Svg>
      );
    case "close":
      return (
        <Svg {...rest}>
          <path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8" />
        </Svg>
      );
    case "chevronDown":
      return (
        <Svg {...rest}>
          <path d="M6.5 9.5L12 15l5.5-5.5" />
        </Svg>
      );
    case "chevronUp":
      return (
        <Svg {...rest}>
          <path d="M6.5 14.5L12 9l5.5 5.5" />
        </Svg>
      );
    case "chevronRight":
      return (
        <Svg {...rest}>
          <path d="M9.5 5.5L15 11l-5.5 5.5" />
        </Svg>
      );
    case "link":
      return (
        <Svg {...rest}>
          <path d="M10 13.9a3.6 3.6 0 005.3.4l2.4-2.4a3.6 3.6 0 00-5.1-5.1l-1.2 1.2" />
          <path d="M13.9 10a3.6 3.6 0 00-5.3-.4L6.2 12a3.6 3.6 0 005.1 5.1l1.2-1.2" />
        </Svg>
      );
    case "inbox":
      return (
        <Svg {...rest}>
          <path d="M4 13.5L6 5.5h12l2 8v5H4v-5z" />
          <path d="M4 13.5h4.2l1 2.2h5.6l1-2.2H20" />
        </Svg>
      );
    case "clock":
      return (
        <Svg {...rest}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 7.8V12l3 1.9" />
        </Svg>
      );
    case "book":
      return (
        <Svg {...rest}>
          <path d="M4.5 5.5h6a2.5 2.5 0 012.5 2.5v10.5a2 2 0 00-2-2h-6.5z" />
          <path d="M19.5 5.5H13A2.5 2.5 0 0010.5 8v10.5a2 2 0 012-2h7z" />
        </Svg>
      );
    case "wrench":
      return (
        <Svg {...rest}>
          <path d="M14.5 6.5a3.6 3.6 0 014.9 4.5l1.6 1.6-2.6 2.6-1.6-1.6a3.6 3.6 0 01-4.5-4.9" />
          <path d="M12.3 10.7L4.8 18.2l1.6 1.6 7.5-7.5" />
        </Svg>
      );
    case "briefcase":
      return (
        <Svg {...rest}>
          <path d="M4.5 8.5h15v10.5h-15z" />
          <path d="M9 8.5V6.2h6v2.3M4.5 13.2h15" />
        </Svg>
      );
    case "swatch":
      return (
        <Svg {...rest}>
          <path d="M11 4.5l8.5 8.5-6.4 6.4a2 2 0 01-2.8 0L4.6 13.7a2 2 0 010-2.8z" />
          <path d="M8.2 8.2l1.6 1.6M11.4 11.4l1.6 1.6" />
        </Svg>
      );
    case "code":
      return (
        <Svg {...rest}>
          <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
        </Svg>
      );
    case "folder":
      return (
        <Svg {...rest}>
          <path d="M4.5 6.5h5l1.6 2h8.4v10.5h-15z" />
        </Svg>
      );
    case "grip":
      return (
        <Svg {...rest} strokeWidth={0} fill="currentColor">
          <circle cx="9.5" cy="6.5" r="1.35" />
          <circle cx="14.5" cy="6.5" r="1.35" />
          <circle cx="9.5" cy="12" r="1.35" />
          <circle cx="14.5" cy="12" r="1.35" />
          <circle cx="9.5" cy="17.5" r="1.35" />
          <circle cx="14.5" cy="17.5" r="1.35" />
        </Svg>
      );
    case "ellipsis":
      return (
        <Svg {...rest} strokeWidth={0} fill="currentColor">
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
        </Svg>
      );
    case "pencil":
      return (
        <Svg {...rest}>
          <path d="M4.8 19.2l.6-3.4 9.6-9.6 2.8 2.8-9.6 9.6z" />
          <path d="M13.6 7.4l2.8 2.8" />
        </Svg>
      );
    case "trash":
      return (
        <Svg {...rest}>
          <path d="M5.5 7.5h13M9.5 7.5V5.8h5v1.7M7 7.5l.9 11h8.2l.9-11" />
          <path d="M10.6 10.8v4.6M13.4 10.8v4.6" />
        </Svg>
      );
    case "external":
      return (
        <Svg {...rest}>
          <path d="M13.5 5.5H19v5.5M19 5.5l-7 7" />
          <path d="M17.2 13.2v5.3H6.5V7.5h5.3" />
        </Svg>
      );
    case "sun":
      return (
        <Svg {...rest}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" />
        </Svg>
      );
    case "moon":
      return (
        <Svg {...rest}>
          <path d="M19 14.2a7.6 7.6 0 01-9.4-9.4 7.5 7.5 0 109.4 9.4z" />
        </Svg>
      );
    case "auto":
      return (
        <Svg {...rest}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 4.5v15" />
          <path d="M12 4.5a7.5 7.5 0 010 15z" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "sidebar":
      return (
        <Svg {...rest}>
          <path d="M4.5 5.5h15v13h-15z" />
          <path d="M9.8 5.5v13" />
        </Svg>
      );
    case "keyboard":
      return (
        <Svg {...rest}>
          <path d="M3.5 7.5h17v9h-17z" />
          <path d="M6.4 10.6h.01M9.4 10.6h.01M12.4 10.6h.01M15.4 10.6h.01M17.6 10.6h.01M8 13.6h8" />
        </Svg>
      );
    case "tag":
      return (
        <Svg {...rest}>
          <path d="M11.2 4.5H19v7.8l-7.3 7.3a1.6 1.6 0 01-2.3 0l-5.5-5.5a1.6 1.6 0 010-2.3z" />
          <circle cx="15.4" cy="8.4" r="1.1" />
        </Svg>
      );
    case "arrowUp":
      return (
        <Svg {...rest}>
          <path d="M12 19V5M12 5l-5 5M12 5l5 5" />
        </Svg>
      );
    case "arrowDown":
      return (
        <Svg {...rest}>
          <path d="M12 5v14M12 19l-5-5M12 19l5-5" />
        </Svg>
      );
    case "command":
      return (
        <Svg {...rest}>
          <path d="M8.4 5.4a2.4 2.4 0 10-2.4 2.4h12a2.4 2.4 0 102.4-2.4v13.2a2.4 2.4 0 11-2.4-2.4H6a2.4 2.4 0 11-2.4 2.4V5.4" />
        </Svg>
      );
    case "bookmark":
      return (
        <Svg {...rest}>
          <path d="M6.5 4.8h11v14.4l-5.5-3.7-5.5 3.7z" />
        </Svg>
      );
    case "sparkle":
      return (
        <Svg {...rest}>
          <path d="M12 4.5l1.7 4.3 4.3 1.7-4.3 1.7L12 16.5l-1.7-4.3L6 10.5l4.3-1.7z" />
          <path d="M18.4 16.2l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" />
        </Svg>
      );
  }
}
