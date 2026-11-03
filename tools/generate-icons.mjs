#!/usr/bin/env node
/**
 * Generates Sift brand favicon and app icon assets (SVG, PNG, ICO, Web Manifest).
 * Pure Node.js (zero external dependencies) using 4x supersampled signed-distance rasterization.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const APP_DIR = path.join(ROOT, "app");

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(APP_DIR, { recursive: true });

const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none">
  <defs>
    <linearGradient id="sift-bg" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1E1B4B" />
      <stop offset="55%" stop-color="#131424" />
      <stop offset="100%" stop-color="#090A10" />
    </linearGradient>
    <radialGradient id="sift-glow" cx="24" cy="14" r="34" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.38" />
      <stop offset="100%" stop-color="#6366F1" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="sift-top" x1="16" y1="13" x2="48" y2="33" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#E0E7FF" />
    </linearGradient>
    <linearGradient id="sift-mid" x1="14" y1="33" x2="50" y2="43" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#C7D2FE" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>
    <linearGradient id="sift-bot" x1="14" y1="42" x2="50" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#6366F1" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#sift-bg)" />
  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#sift-glow)" />
  <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="13.25" stroke="#818CF8" stroke-opacity="0.32" stroke-width="1.5" />
  <path d="M32 13.5 49.5 23.25 32 33 14.5 23.25 32 13.5Z" fill="url(#sift-top)" />
  <path d="M14.5 32.75 32 42.5 49.5 32.75" stroke="url(#sift-mid)" stroke-width="4.75" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M14.5 42.25 32 52 49.5 42.25" stroke="url(#sift-bot)" stroke-width="4.75" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;

// Signed distance to a rounded box centered at (0,0) with half-size (bx, by) and radius r
function sdRoundBox(px, py, bx, by, r) {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

// Distance from point P to line segment AB
function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - ax, py - ay);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - bx, py - by);
  const b = c1 / c2;
  return Math.hypot(px - (ax + b * vx), py - (ay + b * vy));
}

// Signed distance to convex polygon (vertices in clockwise order in screen coords)
function sdConvexPoly(px, py, verts) {
  let d = Infinity;
  let s = 1;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [ax, ay] = verts[j];
    const [bx, by] = verts[i];
    const segD = distToSegment(px, py, ax, ay, bx, by);
    if (segD < d) d = segD;
    const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    if (cross < 0) s = -1;
  }
  // If s === 1, point is inside all clockwise half-planes -> negative distance
  return s === 1 ? -d : d;
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function blendOver(dst, src) {
  const sa = src[3];
  if (sa <= 0) return dst;
  if (sa >= 1) return [src[0], src[1], src[2], 1];
  const da = dst[3];
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return [0, 0, 0, 0];
  return [
    (src[0] * sa + dst[0] * da * (1 - sa)) / outA,
    (src[1] * sa + dst[1] * da * (1 - sa)) / outA,
    (src[2] * sa + dst[2] * da * (1 - sa)) / outA,
    outA,
  ];
}

const TOP_DIAMOND = [
  [32, 13.2],
  [49.8, 23.25],
  [32, 33.3],
  [14.2, 23.25],
];

// Evaluate pixel color in 64x64 coordinate space with resolution-aware antialiasing width `aa`
function sampleSiftIcon(x, y, aa = 0.5) {
  let col = [0, 0, 0, 0];
  const halfAA = aa * 0.5;

  // 1. Rounded squircle background (center 32,32, half-size 30,30, radius 14)
  const dBox = sdRoundBox(x - 32, y - 32, 30, 30, 14);
  if (dBox < halfAA) {
    const cov = Math.max(0, Math.min(1, (halfAA - dBox) / aa));
    const tGrad = ((x - 8) * 48 + (y - 4) * 56) / (48 * 48 + 56 * 56);
    let r, g, b;
    if (tGrad < 0.55) {
      const t = tGrad / 0.55;
      r = lerp(0x1e, 0x13, t);
      g = lerp(0x1b, 0x14, t);
      b = lerp(0x4b, 0x24, t);
    } else {
      const t = (tGrad - 0.55) / 0.45;
      r = lerp(0x13, 0x09, t);
      g = lerp(0x14, 0x0a, t);
      b = lerp(0x24, 0x10, t);
    }

    // Radial glow at (24, 14), radius 34
    const dGlow = Math.hypot(x - 24, y - 14) / 34;
    if (dGlow < 1) {
      const ga = (1 - dGlow) * (1 - dGlow) * 0.38;
      r = lerp(r, 0x63, ga);
      g = lerp(g, 0x66, ga);
      b = lerp(b, 0xf1, ga);
    }

    col = blendOver(col, [r, g, b, cov]);

    // Subtle inner border ring around dBox in [-1.5, 0]
    const borderDist = Math.abs(dBox + 0.75) - 0.75;
    if (borderDist < halfAA) {
      const bCov = Math.max(0, Math.min(1, (halfAA - borderDist) / aa)) * 0.34 * cov;
      col = blendOver(col, [0x81, 0x8c, 0xf8, bCov]);
    }
  }

  // 2. Top diamond plane
  const dDiamond = sdConvexPoly(x, y, TOP_DIAMOND);
  if (dDiamond < halfAA) {
    const cov = Math.max(0, Math.min(1, (halfAA - dDiamond) / aa));
    const t = Math.max(0, Math.min(1, (y - 13.5) / 20));
    const r = lerp(0xff, 0xe0, t);
    const g = lerp(0xff, 0xe7, t);
    const b = lerp(0xff, 0xff, t);
    col = blendOver(col, [r, g, b, cov]);
  }

  // 3. Middle chevron: (14.5, 32.75) -> (32, 42.5) -> (49.5, 32.75), radius 2.4
  const dMid =
    Math.min(
      distToSegment(x, y, 14.5, 32.75, 32, 42.5),
      distToSegment(x, y, 32, 42.5, 49.5, 32.75)
    ) - 2.4;
  if (dMid < halfAA) {
    const cov = Math.max(0, Math.min(1, (halfAA - dMid) / aa));
    const t = Math.max(0, Math.min(1, (x - 14) / 36));
    const r = lerp(0xc7, 0x81, t);
    const g = lerp(0xd2, 0x8c, t);
    const b = lerp(0xfe, 0xf8, t);
    col = blendOver(col, [r, g, b, cov]);
  }

  // 4. Bottom chevron: (14.5, 42.25) -> (32, 52) -> (49.5, 42.25), radius 2.4
  const dBot =
    Math.min(
      distToSegment(x, y, 14.5, 42.25, 32, 52),
      distToSegment(x, y, 32, 52, 49.5, 42.25)
    ) - 2.4;
  if (dBot < halfAA) {
    const cov = Math.max(0, Math.min(1, (halfAA - dBot) / aa));
    const t = Math.max(0, Math.min(1, (x - 14) / 36));
    const r = lerp(0x81, 0x63, t);
    const g = lerp(0x8c, 0x66, t);
    const b = lerp(0xf8, 0xf1, t);
    col = blendOver(col, [r, g, b, cov]);
  }

  return col;
}

function renderRGBA(size) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = 64 / size;
  const samples = size <= 64 ? 4 : 2;
  const invSamples = 1 / (samples * samples);
  const aa = scale / samples;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;
      let aAcc = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const ux = (px + (sx + 0.5) / samples) * scale;
          const uy = (py + (sy + 0.5) / samples) * scale;
          const [r, g, b, a] = sampleSiftIcon(ux, uy, aa);
          rAcc += r * a;
          gAcc += g * a;
          bAcc += b * a;
          aAcc += a;
        }
      }
      const aFinal = aAcc * invSamples;
      const idx = (py * size + px) * 4;
      if (aFinal > 0.001) {
        buf[idx] = Math.round(Math.min(255, Math.max(0, rAcc * invSamples / aFinal)));
        buf[idx + 1] = Math.round(Math.min(255, Math.max(0, gAcc * invSamples / aFinal)));
        buf[idx + 2] = Math.round(Math.min(255, Math.max(0, bAcc * invSamples / aFinal)));
        buf[idx + 3] = Math.round(Math.min(255, Math.max(0, aFinal * 255)));
      }
    }
  }
  return buf;
}

// CRC32 table for PNG chunks
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(size, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter type None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeICO(entries) {
  // entries: [{ size, png }]
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(entries.length, 4);

  const dirEntries = [];
  let offset = 6 + entries.length * 16;

  for (const { size, png } of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = size >= 256 ? 0 : size;
    dir[1] = size >= 256 ? 0 : size;
    dir[2] = 0;
    dir[3] = 0;
    dir.writeUInt16LE(1, 4); // color planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(png.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map((e) => e.png)]);
}

// Write SVG icon
fs.writeFileSync(path.join(PUBLIC_DIR, "favicon.svg"), SVG_ICON, "utf8");
fs.writeFileSync(path.join(APP_DIR, "icon.svg"), SVG_ICON, "utf8");

// Render PNG sizes
const png16 = encodePNG(16, renderRGBA(16));
const png32 = encodePNG(32, renderRGBA(32));
const png180 = encodePNG(180, renderRGBA(180));
const png192 = encodePNG(192, renderRGBA(192));
const png512 = encodePNG(512, renderRGBA(512));

fs.writeFileSync(path.join(PUBLIC_DIR, "favicon-16x16.png"), png16);
fs.writeFileSync(path.join(PUBLIC_DIR, "favicon-32x32.png"), png32);
fs.writeFileSync(path.join(PUBLIC_DIR, "apple-touch-icon.png"), png180);
fs.writeFileSync(path.join(APP_DIR, "apple-icon.png"), png180);
fs.writeFileSync(path.join(PUBLIC_DIR, "icon-192.png"), png192);
fs.writeFileSync(path.join(PUBLIC_DIR, "icon-512.png"), png512);

// Write multi-resolution favicon.ico (16x16 + 32x32)
const ico = encodeICO([
  { size: 16, png: png16 },
  { size: 32, png: png32 },
]);
fs.writeFileSync(path.join(PUBLIC_DIR, "favicon.ico"), ico);
fs.writeFileSync(path.join(APP_DIR, "favicon.ico"), ico);

// Write Web App Manifest
const manifest = {
  name: "Sift — Bookmarks for Developers",
  short_name: "Sift",
  description: "A keyboard-first bookmark manager for links, docs, and developer tools.",
  start_url: "/",
  display: "standalone",
  background_color: "#090A10",
  theme_color: "#131424",
  icons: [
    {
      src: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
};
fs.writeFileSync(
  path.join(PUBLIC_DIR, "site.webmanifest"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8"
);

console.log("Generated Sift favicon and app icon assets successfully.");
