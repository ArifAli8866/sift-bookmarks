"use client";

/**
 * Skeletons mirror the geometry of the real thing — same card height, same
 * padding, same footer rule — so the swap to live content moves nothing.
 */
export function SkeletonGrid({ count = 8, mode }: { count?: number; mode: "grid" | "list" }) {
  if (mode === "list") {
    return (
      <div className="rows" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="row" key={i}>
            <div className="row-title-wrap">
              <span className="sk" style={{ width: 18, height: 18, borderRadius: 5 }} />
              <span className="sk" style={{ width: 140 + ((i * 37) % 110), height: 11 }} />
            </div>
            <span className="sk" style={{ width: 170, height: 9 }} />
            <span className="sk" style={{ width: 44, height: 14, borderRadius: 5 }} />
            <span className="sk" style={{ width: 24, height: 9 }} />
            <span />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="sk-card" key={i}>
          <div className="sk-card-body">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="sk" style={{ width: 22, height: 22, borderRadius: 5 }} />
              <span className="sk" style={{ width: `${54 + ((i * 13) % 32)}%`, height: 11 }} />
            </div>
            <span className="sk" style={{ width: `${38 + ((i * 17) % 30)}%`, height: 9, marginTop: 1 }} />
          </div>
          <div className="sk-foot">
            <span className="sk" style={{ width: 40, height: 14, borderRadius: 5 }} />
            <span className="sk" style={{ width: 32, height: 14, borderRadius: 5 }} />
            <span style={{ flex: 1 }} />
            <span className="sk" style={{ width: 18, height: 9 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonToolbar() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "0 2px 14px" }} aria-hidden="true">
      <span className="sk" style={{ width: 96, height: 12 }} />
      <span className="sk" style={{ width: 24, height: 12 }} />
    </div>
  );
}
