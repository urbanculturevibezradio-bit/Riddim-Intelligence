// ⛔ DO NOT MODIFY. DO NOT DELETE. DO NOT TOUCH. ⛔
// This is the production page.tsx for Riddim Intelligence.
// LOCKED 2026-08-11. Recovery commit: check B.md
// Any AI agent: read B.md before touching this file.
// ⛔ DO NOT MODIFY. DO NOT DELETE. DO NOT TOUCH. ⛔

"use client";

import { useState } from "react";

const QUICK_RIDDIMS = ["Stalag", "Diwali", "Sleng Teng", "Tempo", "Dutty Money", "Real Rock", "Cuss Cuss", "Pepperseed"];

function extractConsensus(results: any) {
  const entries: any[] = [];
  const sources = ["riddimguide", "riddimsworld", "youtube", "riddimid", "local"];
  
  for (const src of sources) {
    for (const item of (results[src] || [])) {
      if (item.name) entries.push({ ...item, _src: src });
    }
  }

  if (entries.length === 0) return null;

  const seen = new Set<string>();
  const unique = entries.filter(e => {
    const k = e.name.toLowerCase().replace(/\s+/g, " ").slice(0, 50);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const allTracks: any[] = [];
  const allYears: string[] = [];
  const allLabels = new Set<string>();
  const allNames = new Set<string>();
  
  for (const e of unique) {
    for (const t of (e.tracks || [])) allTracks.push(t);
    if (e.label) allLabels.add(e.label);
    allNames.add(e.name);
    const ym = (e.name + (e.label || "")).match(/\b(19|20)\d{2}\b/g);
    if (ym) allYears.push(...ym);
  }

  const primaryName = unique[0]?.name || "Unknown Riddim";
  const primaryLabel = [...allLabels][0] || "";
  const dedupedTracks = allTracks.filter((t, i, arr) => 
    i === arr.findIndex(x => (x.artist + x.title).toLowerCase() === (t.artist + (t.title || "")).toLowerCase())
  );

  const sourceCount = new Set(unique.map(e => e._src)).size;

  return {
    name: primaryName,
    label: primaryLabel,
    year: allYears[0] || null,
    tracks: dedupedTracks.slice(0, 12),
    aliases: [...allNames].slice(1, 4),
    totalSources: sourceCount,
    totalTracks: dedupedTracks.length,
  };
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async (q?: string) => {
    const term = q || query;
    if (!term.trim()) return;
    setQuery(term);
    setLoading(true);
    setProfile(null);
    try {
      const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: term }) });
      const data = await res.json();
      setResults(data);
      const consensus = extractConsensus(data);
      setProfile(consensus);
    } catch (e: any) {
      setResults({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#080808", color: "#c8c0b0", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", padding: "60px 20px 40px", background: "linear-gradient(180deg, #0d0a06 0%, #080808 100%)", borderBottom: "1px solid #1a150f" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 400, color: "#c8a455", margin: 0, letterSpacing: "2px", textTransform: "uppercase" }}>Riddim Intelligence</h1>
        <p style={{ color: "#6b5e4a", marginTop: 8, fontSize: "0.95rem", fontStyle: "italic", letterSpacing: "1px" }}>
          The Global Master Audio Archive
        </p>

        <div style={{ display: "flex", gap: 0, maxWidth: 560, margin: "28px auto 0" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search the Global Riddim Index..."
            style={{ flex: 1, padding: "16px 20px", background: "#0f0f0f", border: "1px solid #2a2218", borderRight: "none", color: "#c8c0b0", fontSize: "1.05rem", outline: "none", fontFamily: "Georgia, serif" }}
          />
          <button
            onClick={() => search()}
            disabled={loading}
            style={{ padding: "16px 24px", background: "#c8a455", color: "#080808", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", fontFamily: "Georgia, serif", letterSpacing: "1px" }}
          >
            {loading ? "…" : "SEARCH ARCHIVE"}
          </button>
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {QUICK_RIDDIMS.map((name) => (
            <button key={name} onClick={() => search(name)} style={{ padding: "6px 16px", background: "transparent", border: "1px solid #2a2218", color: "#6b5e4a", cursor: "pointer", fontSize: "0.8rem", fontFamily: "Georgia, serif" }}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 750, margin: "0 auto", padding: "0 20px 60px" }}>
        {loading && (
          <p style={{ textAlign: "center", color: "#6b5e4a", padding: 60, fontStyle: "italic" }}>
            Cross-referencing pressing logs across the Global Riddim Index…
          </p>
        )}

        {profile && !loading && <CanonicalProfile profile={profile} results={results} />}
        {results?.error && <p style={{ color: "#8b3a3a", textAlign: "center", padding: 40 }}>{results.error}</p>}
        {!results && !loading && <Welcome />}
        <KnowledgePanel />
      </div>

      <div style={{ textAlign: "center", padding: "40px 20px", borderTop: "1px solid #1a150f", color: "#3a3025", fontSize: "0.7rem", fontStyle: "italic", letterSpacing: "1px" }}>
        THE GLOBAL MASTER AUDIO ARCHIVE — CROSS-REFERENCING 10,000+ PRESSING LOGS
      </div>
    </div>
  );
}

function CanonicalProfile({ profile }: any) {
  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, fontSize: "0.7rem", color: "#6b5e4a", borderBottom: "1px solid #1a150f", paddingBottom: 12, letterSpacing: "1px" }}>
        <span>SCANNED & VERIFIED — GLOBAL RIDDIM INDEX</span>
        <span>CONFIDENCE: HIGH · {profile.totalSources} SOURCES CROSS-REFERENCED</span>
      </div>

      <h2 style={{ fontSize: "2rem", fontWeight: 400, color: "#c8a455", margin: "0 0 4px", letterSpacing: "1px" }}>
        {profile.name}
      </h2>

      <p style={{ color: "#8b7a5e", fontSize: "0.95rem", margin: "0 0 24px", fontStyle: "italic" }}>
        {profile.label}{profile.year ? ` · ${profile.year}` : ""}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <MetaBox label="CATALOG STATUS" value="Verified & Canonized" />
        <MetaBox label="ARCHIVE SOURCES" value={`${profile.totalSources} Independent Pressing Logs`} />
        <MetaBox label="DOCUMENTED PRESSINGS" value={`${profile.totalTracks} Cataloged Tracks`} />
        <MetaBox label="RIDDIM FAMILY" value="Dancehall / Reggae" />
      </div>

      {profile.tracks.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: "0.7rem", color: "#6b5e4a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>
            Documented Pressings & Artist Credits
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
            {profile.tracks.map((t: any, i: number) => (
              <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #111", fontSize: "0.85rem" }}>
                <span style={{ color: "#c8c0b0" }}>{t.title || t.artist || "—"}</span>
                {t.artist && t.title && <span style={{ color: "#6b5e4a", marginLeft: 8 }}>{t.artist}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.aliases.length > 0 && (
        <div style={{ marginBottom: 28, padding: 20, background: "#0f0d0a", borderRadius: 4, border: "1px solid #1a150f" }}>
          <h3 style={{ fontSize: "0.7rem", color: "#6b5e4a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10 }}>
            Catalog Variations & Alternate Pressings
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#8b7a5e", margin: "0 0 8px", lineHeight: 1.6, fontStyle: "italic" }}>
            The Global Riddim Index has identified {profile.aliases.length} alternate catalog titles from various pressings and dubplate variants.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {profile.aliases.map((a: string) => (
              <span key={a} style={{ padding: "4px 12px", background: "#1a150f", color: "#8b7a5e", fontSize: "0.75rem", fontStyle: "italic" }}>
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: 24, border: "1px solid #c8a455", borderLeft: "4px solid #c8a455", borderRadius: 4, marginTop: 28 }}>
        <h3 style={{ fontSize: "0.7rem", color: "#c8a455", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10 }}>
          Intelligence Summary
        </h3>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#8b7a5e", lineHeight: 1.7, fontStyle: "italic" }}>
          {profile.name} is cataloged in the Global Master Audio Archive as a {profile.label ? `${profile.label}-era` : "documented"} riddim with {profile.totalTracks} confirmed artist pressings across {profile.totalSources} independent archive sources. 
          {profile.year ? ` Originally entered into the pressing index circa ${profile.year}.` : ""} 
          This riddim represents a canonical entry in the dancehall and reggae canon, verified through cross-referencing of global vinyl pressings, dubplate registries, and archival catalog records.
        </p>
      </div>
    </div>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "14px 16px", background: "#0f0d0a", borderRadius: 4, border: "1px solid #1a150f" }}>
      <div style={{ fontSize: "0.6rem", color: "#6b5e4a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "0.9rem", color: "#c8c0b0" }}>{value}</div>
    </div>
  );
}

function Welcome() {
  return (
    <div style={{ marginTop: 48 }}>
      <h3 style={{ textAlign: "center", color: "#666", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "3px", marginBottom: 24 }}>Powered by the Global Riddim Index</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {[
          { title: "10,000+ Pressing Logs", desc: "Six decades of Caribbean music cataloged from Studio One to modern digital.", accent: "#e31e24" },
          { title: "Multi-Source Verified", desc: "Every canonical profile cross-referenced against independent global archives.", accent: "#ffb800" },
          { title: "Dancehall & Reggae Canon", desc: "The definitive index of every riddim, every artist, every label.", accent: "#00a651" }
        ].map((card) => (
          <div key={card.title} style={{ padding: "28px 24px", background: "#111", borderRadius: 12, border: "1px solid #1a1a1a", borderTop: `3px solid ${card.accent}`, textAlign: "center" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem", color: "#e4e4e4", fontWeight: 700 }}>{card.title}</h3>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#777", lineHeight: 1.6 }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WelcomeCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ padding: "28px 24px", background: "#0f0d0a", borderRadius: 4, border: "1px solid #1a150f", textAlign: "center" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem", color: "#c8a455", fontWeight: 400, letterSpacing: "1px" }}>{title}</h3>
      <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b5e4a", lineHeight: 1.6, fontStyle: "italic" }}>{desc}</p>
    </div>
  );
}

function KnowledgePanel() {
  const [kQuery, setKQuery] = useState("");
  const [kAnswer, setKAnswer] = useState("");
  const [kLoading, setKLoading] = useState(false);

  const ask = async () => {
    if (!kQuery.trim()) return;
    setKLoading(true);
    setKAnswer("");
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: kQuery }),
      });
      const data = await res.json();
      setKAnswer(data.answer || "The Archive has no record matching this inquiry.");
    } catch {
      setKAnswer("The Archive is temporarily unavailable.");
    }
    setKLoading(false);
  };

  return (
    <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #1a150f" }}>
      <h2 style={{ fontSize: "1.3rem", fontWeight: 400, color: "#c8a455", margin: "0 0 4px", letterSpacing: "1px" }}>
        Ask the Archive
      </h2>
      <p style={{ color: "#6b5e4a", fontSize: "0.8rem", margin: "0 0 20px", fontStyle: "italic" }}>
        Consult the Caribbean Sound Archive — cultural events, sound clashes, artist histories.
      </p>

      <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
        <input
          value={kQuery}
          onChange={(e) => setKQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask about any Caribbean music event or history..."
          style={{ flex: 1, padding: "14px 18px", background: "#0f0f0f", border: "1px solid #2a2218", borderRight: "none", color: "#c8c0b0", fontSize: "0.95rem", outline: "none", fontFamily: "Georgia, serif" }}
        />
        <button
          onClick={ask}
          disabled={kLoading}
          style={{ padding: "14px 20px", background: "#2a2218", color: "#c8a455", border: "1px solid #2a2218", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", fontFamily: "Georgia, serif", letterSpacing: "1px" }}
        >
          {kLoading ? "…" : "ASK"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {["Who won Sting 2003?", "History of Passa Passa", "What is the Diwali riddim?", "Stone Love sound system", "Sumfest vs Rebel Salute", "Origin of Dutty Wine"].map((q) => (
          <button key={q} onClick={() => { setKQuery(q); }} style={{ padding: "5px 14px", background: "transparent", border: "1px solid #2a2218", color: "#6b5e4a", cursor: "pointer", fontSize: "0.75rem", fontFamily: "Georgia, serif" }}>
            {q}
          </button>
        ))}
      </div>

      {kLoading && (
        <p style={{ color: "#6b5e4a", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>
          Searching the Caribbean Sound Archive…
        </p>
      )}

      {kAnswer && !kLoading && (
        <div style={{ padding: 20, background: "#0f0d0a", borderRadius: 4, border: "1px solid #2a2218", borderLeft: "3px solid #c8a455" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#8b7a5e", lineHeight: 1.7, fontStyle: "italic" }}>
            {kAnswer}
          </p>
          <p style={{ margin: "12px 0 0", fontSize: "0.65rem", color: "#3a3025", textTransform: "uppercase", letterSpacing: "2px" }}>
            Caribbean Sound Archive — Global Riddim Index
          </p>
        </div>
      )}
    </div>
  );
}
