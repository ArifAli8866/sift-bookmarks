"use client";

import { useState } from "react";
import { domainOf, monogram } from "../lib/format";

/**
 * Favicons load over the network; the monogram is the fallback, not an
 * afterthought. Both states occupy the same 22px tile so the grid never
 * reflows, and the image fades in rather than popping.
 */
export function Favicon({ url, size = 22 }: { url: string; size?: number }) {
  const host = domainOf(url);
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const src = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;

  return (
    <span
      className={`tile${state === "ok" ? " is-ready" : ""}`}
      style={size === 22 ? undefined : { width: size, height: size, borderRadius: size < 20 ? 4 : undefined }}
    >
      {state !== "fail" ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className={state === "ok" ? "is-loaded" : undefined}
          onLoad={() => setState("ok")}
          onError={() => setState("fail")}
        />
      ) : null}
      <span>{monogram(host)}</span>
    </span>
  );
}
