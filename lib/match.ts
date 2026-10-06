/**
 * Subsequence fuzzy matcher, in the spirit of the ones inside Spotlight and
 * VS Code's quick-open: match every character in order, then rank by how
 * tightly and how "start-like" those matches are. No scoring magic, no
 * external dependency — the behaviour is easy to reason about and tune.
 */

export type Range = [start: number, end: number];

export interface MatchResult {
  score: number;
  ranges: Range[];
}

const BOUNDARY_BONUS = 26;
const START_BONUS = 34;
const SEQUENTIAL_BONUS = 12;
const CAMEL_BONUS = 8;
const GAP_PENALTY = 1.4;

function isBoundary(text: string, i: number): boolean {
  if (i === 0) return true;
  const prev = text[i - 1] ?? "";
  const cur = text[i] ?? "";
  if (/[\s\-_./:]/.test(prev)) return true;
  // camelCase / PascalCase hump
  return /[a-z0-9]/.test(prev) && /[A-Z]/.test(cur);
}

export function fuzzy(rawQuery: string, text: string): MatchResult | null {
  const query = rawQuery.trim();
  if (!query) return { score: 0, ranges: [] };
  if (!text) return null;

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();

  // Fast reject: not a subsequence at all.
  let scan = -1;
  for (const ch of needle) {
    scan = haystack.indexOf(ch, scan + 1);
    if (scan === -1) return null;
  }

  // Greedy-with-lookahead pass: prefer the earliest boundary match, otherwise
  // the earliest match, then let the following characters settle sequentially.
  const indices: number[] = [];
  let cursor = 0;
  for (let q = 0; q < needle.length; q += 1) {
    const ch = needle[q] as string;
    let found = -1;
    for (let i = cursor; i < haystack.length; i += 1) {
      if (haystack[i] === ch) {
        found = i;
        if (isBoundary(haystack, i) && (q === 0 || (indices[indices.length - 1] ?? -2) === i - 1)) {
          break;
        }
        if (q === 0 && i === 0) break;
        // A run of consecutive matches beats a later boundary start.
        if (q > 0 && i === cursor) break;
      }
    }
    if (found === -1) return null;
    indices.push(found);
    cursor = found + 1;
  }

  let score = 0;
  for (let i = 0; i < indices.length; i += 1) {
    const at = indices[i] as number;
    if (i === 0) {
      score += at === 0 ? START_BONUS : isBoundary(haystack, at) ? BOUNDARY_BONUS : 0;
      score += Math.max(0, 8 - at * 0.5); // earlier is better
    } else {
      const prev = indices[i - 1] as number;
      if (at === prev + 1) {
        score += SEQUENTIAL_BONUS;
        if (isBoundary(haystack, at)) score += CAMEL_BONUS;
      } else {
        score -= (at - prev - 1) * GAP_PENALTY;
      }
      if (isBoundary(haystack, at)) score += BOUNDARY_BONUS * 0.5;
    }
  }

  // Exact substring gets a decisive lead — typing the whole word should win.
  if (haystack.includes(needle)) score += 45;
  if (haystack === needle) score += 80;
  // Shorter targets read as better matches at equal score.
  score -= Math.min(24, haystack.length / 12);

  return { score, ranges: rangesFrom(indices) };
}

export function rangesFrom(indices: number[]): Range[] {
  const ranges: Range[] = [];
  for (const at of indices) {
    const last = ranges[ranges.length - 1];
    if (last && at === last[1]) last[1] = at + 1;
    else ranges.push([at, at + 1]);
  }
  return ranges;
}

export type Segment = { text: string; hit: boolean };

export function segments(text: string, ranges: Range[]): Segment[] {
  if (!ranges.length) return [{ text, hit: false }];
  const out: Segment[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) out.push({ text: text.slice(at, start), hit: false });
    out.push({ text: text.slice(start, end), hit: true });
    at = end;
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false });
  return out;
}
