/**
 * extract-vdj.mjs
 *
 * Mines VirtualDJ database.xml for riddim names and track listings
 * embedded in cue point names, then writes public/riddims.json.
 *
 * Usage:
 *   node scripts/extract-vdj.mjs
 *
 * Optional override:
 *   node scripts/extract-vdj.mjs --db "D:\VirtualDJ\database.xml"
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------

const DEFAULT_DBS = [
  "C:\\Users\\New Owner\\AppData\\Local\\VirtualDJ\\database.xml",
  "D:\\VirtualDJ\\database.xml",
  "E:\\VirtualDJ\\database.xml",
  "F:\\VirtualDJ\\database.xml",
];

const OUT_PATH = join(__dirname, "..", "public", "riddims.json");

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function clean(str) {
  return (str ?? "").replace(/\s+/g, " ").replace(/&amp;/g, "&").replace(/&apos;/g, "'").trim();
}

/**
 * Extract riddim name from a cue point label.
 * Matches patterns like:
 *   "Artist - Song (Diwali Riddim)"
 *   "Artist - Song (Style A Style riddim)"
 *   "Artist - Song (The Champ Riddim) (1080p)"
 */
function extractRiddim(label) {
  // Find the last occurrence of (... riddim) or (... Riddim), ignore resolution tags
  const matches = [...label.matchAll(/\(([^)]*riddim[^)]*)\)/gi)];
  if (!matches.length) return null;
  // Take the last match that isn't just a resolution
  for (let i = matches.length - 1; i >= 0; i--) {
    const candidate = matches[i][1].trim();
    if (/^\d+p$/i.test(candidate)) continue; // skip "1080p" etc.
    return candidate
      .replace(/\s+riddim\s*$/i, "") // remove trailing "riddim"
      .trim();
  }
  return null;
}

/**
 * Parse "Artist - Song Title (tags...)" from a cue label.
 * Returns { artist, title } — best effort.
 */
function parseCueLabel(raw) {
  // Strip resolution and riddim tags in parens
  const stripped = raw
    .replace(/\(\d+p\)/gi, "")
    .replace(/\([^)]*riddim[^)]*\)/gi, "")
    .replace(/\([^)]*grv[^)]*\)/gi, "")
    .replace(/\([^)]*official[^)]*\)/gi, "")
    .replace(/\([^)]*audio[^)]*\)/gi, "")
    .replace(/\([^)]*video[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const dashIdx = stripped.indexOf(" - ");
  if (dashIdx === -1) return { artist: "", title: stripped };

  return {
    artist: stripped.slice(0, dashIdx).trim(),
    title: stripped.slice(dashIdx + 3).trim(),
  };
}

// ------------------------------------------------------------
// Parse XML (manual — no dependency needed for this structure)
// ------------------------------------------------------------

const dbPaths = DEFAULT_DBS.filter(existsSync);
console.log(`Found ${dbPaths.length} database(s):`);
dbPaths.forEach((p) => console.log(`  ${p}`));

const xml = dbPaths.map((p) => {
  console.log(`Reading: ${p}`);
  return readFileSync(p, "utf8");
}).join("\n");

// Map: normalizedRiddimName -> { name, tracks: Set<"Artist - Title"> }
const riddimMap = new Map();

// Also collect untagged tracks (artist + title only, no riddim)
const untagged = [];

// Extract all Poi entries with Type="cue" and a Name attribute
const poiRegex = /<Poi\s+([^/]*?)(?:\/?>)/g;
let poiMatch;

while ((poiMatch = poiRegex.exec(xml)) !== null) {
  const attrs = poiMatch[1];

  // Only cue points with names
  if (!/Type="cue"/i.test(attrs)) continue;
  const nameMatch = attrs.match(/Name="([^"]*)"/);
  if (!nameMatch) continue;

  const label = clean(nameMatch[1]);
  const riddimRaw = extractRiddim(label);
  const { artist, title } = parseCueLabel(label);

  if (!artist && !title) continue;

  const trackLine = artist ? `${artist} - ${title}` : title;

  if (riddimRaw) {
    const key = riddimRaw.toLowerCase();
    if (!riddimMap.has(key)) {
      // Title-case the riddim name
      const displayName = riddimRaw
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ") + " Riddim";
      riddimMap.set(key, { name: displayName, tracks: new Set() });
    }
    riddimMap.get(key).tracks.add(trackLine);
  } else {
    untagged.push({ artist, title });
  }
}

// Also scan Song FilePath attributes for folder-based riddim names
// e.g. "E:\Riddims\Diwali Riddim\Buju Banton - Boom.mp3"
const fileRegex = /FilePath="([^"]*)"/g;
let fileMatch;

while ((fileMatch = fileRegex.exec(xml)) !== null) {
  const fp = clean(fileMatch[1]);
  // Look for a folder segment ending in "riddim" (case-insensitive)
  const folderMatch = fp.match(/\\([^\\]*riddim[^\\]*)\\/i);
  if (!folderMatch) continue;

  const riddimFolder = folderMatch[1]
    .replace(/\s+riddim\s*$/i, "")
    .trim();

  const key = riddimFolder.toLowerCase();
  if (!riddimMap.has(key)) {
    const displayName = riddimFolder
      .split(/[\s_-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ") + " Riddim";
    riddimMap.set(key, { name: displayName, tracks: new Set() });
  }

  // Try to get artist/title from the filename itself
  const filename = fp.split("\\").pop().replace(/\.[^.]+$/, "");
  const dashIdx = filename.indexOf(" - ");
  if (dashIdx !== -1) {
    const artist = filename.slice(0, dashIdx).trim();
    const title = filename.slice(dashIdx + 3).replace(/\([^)]*\)/g, "").trim();
    if (artist && title) {
      riddimMap.get(key).tracks.add(`${artist} - ${title}`);
    }
  }
}

// ------------------------------------------------------------
// Build output
// ------------------------------------------------------------

const riddims = Array.from(riddimMap.values())
  .map((r) => ({
    name: r.name,
    tracks: Array.from(r.tracks).sort(),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const output = {
  generated: new Date().toISOString(),
  totalRiddims: riddims.length,
  totalTaggedTracks: riddims.reduce((n, r) => n + r.tracks.length, 0),
  totalUntagged: untagged.length,
  riddims,
};

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf8");

console.log(`\nDone.`);
console.log(`  Riddims found : ${riddims.length}`);
console.log(`  Tagged tracks : ${output.totalTaggedTracks}`);
console.log(`  Untagged      : ${untagged.length}`);
console.log(`  Output        : ${OUT_PATH}`);
