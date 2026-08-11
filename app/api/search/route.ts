import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

// Load local DBs at module init (cached across invocations)
let localDB: any[] = [];
try {
  const publicDir = path.join(process.cwd(), "public");
  const files = ["riddims_enriched.json", "riddims_scanned.json", "riddims_vdj_bpm.json", "riddims.json"];
  for (const file of files) {
    const p = path.join(publicDir, file);
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf-8"));
      if (Array.isArray(data)) localDB.push(...data);
      else if (typeof data === "object") {
        for (const v of Object.values(data)) {
          if (Array.isArray(v)) localDB.push(...v);
          else if (v && typeof v === "object") localDB.push(v);
        }
      }
    }
  }
} catch {}

async function fetchURL(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
  return res.text();
}

// ── YouTube ────────────────────────────────────────

async function searchYouTube(query: string) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " riddim")}`;
    const html = await fetchURL(url);
    const titles = [...html.matchAll(/"title":\s*\{"runs":\s*\[[^\]]*"text":\s*"([^"]+)"/g)];
    const seen = new Set<string>();
    return titles
      .map((m) => m[1].trim())
      .filter((t) => t.length > 5 && !seen.has(t) && seen.add(t))
      .slice(0, 15)
      .map((title) => {
        const dash = title.indexOf(" - ");
        return {
          name: title,
          artist: dash > 0 ? title.slice(0, dash).trim() : "",
          source: "youtube",
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title.slice(0, 80))}`,
        };
      });
  } catch {
    return [];
  }
}

// ── RiddimGuide ────────────────────────────────────

async function searchRiddimGuide(query: string) {
  try {
    const html = await fetchURL(`https://www.riddimguide.com/tunes?q=${encodeURIComponent(query)}&c=`);
    const rows = [...html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)];
    const groups = new Map<string, any>();

    for (const row of rows) {
      const cells = [...row[1].matchAll(/<td[^>]*>(.*?)<\/td>/gs)];
      if (cells.length < 3) continue;

      const song = (cells[0][1].match(/<a[^>]*>([^<]+)<\/a>/) || [])[1]?.trim() || "";
      const artist = (cells[1][1].match(/<a[^>]*>([^<]+)<\/a>/) || [])[1]?.trim() || "";
      const ridM = cells[2][1].match(/<a[^>]*href="(\/tunedb\/riddim_[^"]*)"[^>]*>([^<]+)<\/a>/);
      if (!ridM || !song) continue;

      const name = ridM[2].trim();
      if (!groups.has(name)) groups.set(name, { name, source: "riddimguide", url: `https://www.riddimguide.com${ridM[1]}`, tracks: [] });
      groups.get(name)!.tracks.push({ artist, title: song });
    }

    return [...groups.values()].slice(0, 15);
  } catch {
    return [];
  }
}

// ── Riddims World ──────────────────────────────────

async function searchRiddimsWorld(query: string) {
  try {
    const html = await fetchURL(`https://riddimsworld.com/?s=${encodeURIComponent(query)}`);
    const links = [...html.matchAll(/<a[^>]*href="(https:\/\/riddimsworld\.com\/[^"]*)"[^>]*>([^<]+)<\/a>/g)];
    const seen = new Set<string>();
    const skip = new Set(["latest", "collections", "dancehall", "reggae", "home", "search", "contact", "about", "privacy", "2026 riddims"]);

    return links
      .map(([, href, text]) => ({ href, text: text.replace(/\s+/g, " ").trim() }))
      .filter(({ text, href }) => {
        if (text.length < 8 || skip.has(text.toLowerCase())) return false;
        if (/\/author\/|\/category\/|\/tag\/|\/page\//.test(href)) return false;
        if (!text.toLowerCase().includes(query.toLowerCase())) return false;
        const key = text.slice(0, 60).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 15)
      .map(({ href, text }) => {
        const m = text.match(/[-–—]\s*(.+)/);
        return { name: text, label: m ? m[1].trim() : "", source: "riddimsworld", url: href, tracks: [] };
      });
  } catch {
    return [];
  }
}

// ── Riddim-ID ──────────────────────────────────────

async function searchRiddimID(query: string) {
  try {
    const html = await fetchURL(`https://www.riddim-id.org/search?q=${encodeURIComponent(query)}`);
    const names = [...html.matchAll(/<h[23][^>]*>\s*<a[^>]*>([^<]+)<\/a>\s*<\/h[23]>/g)];
    return names.slice(0, 10).map((m) => ({
      name: m[1].trim(),
      source: "riddimid",
      url: `https://www.riddim-id.org/search?q=${encodeURIComponent(m[1].trim())}`,
      tracks: [],
    }));
  } catch {
    return [];
  }
}

// ── POST handler ───────────────────────────────────

function searchLocal(query: string) {
  if (!localDB.length) return [];
  const q = query.toLowerCase();
  const seen = new Set<string>();
  const results: any[] = [];
  for (const entry of localDB) {
    const name = String(entry.name || entry.riddim_name || entry.title || "");
    if (!name || seen.has(name.toLowerCase().slice(0, 40))) continue;
    if (name.toLowerCase().includes(q)) {
      seen.add(name.toLowerCase().slice(0, 40));
      results.push({ name, label: entry.label || entry.producer || "", bpm: entry.bpm || null, key: entry.key || null, tracks: entry.tracks || entry.versions || [], source: "local", url: "" });
    }
  }
  return results.slice(0, 15);
}

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query) return NextResponse.json({ error: "No query" }, { status: 400 });

  const [youtube, riddimguide, riddimsworld, riddimid, local] = await Promise.all([
    searchYouTube(query),
    searchRiddimGuide(query),
    searchRiddimsWorld(query),
    searchRiddimID(query),
    Promise.resolve(searchLocal(query)),
  ]);

  return NextResponse.json({
    query,
    sources: {
      youtube: youtube.length,
      riddimguide: riddimguide.length,
      riddimsworld: riddimsworld.length,
      riddimid: riddimid.length,
      local: local.length,
    },
    youtube,
    riddimguide,
    riddimsworld,
    riddimid,
    local,
    total: youtube.length + riddimguide.length + riddimsworld.length + riddimid.length + local.length,
  });
}
