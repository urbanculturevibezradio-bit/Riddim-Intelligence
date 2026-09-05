// PERSONAL-KNOWLEDGE.mts — YOUR DANCEHALL KNOWLEDGE FILE (repo root, easy access)
// ⛔ HARD RULES (see B.md): NO ANTHROPIC. NO WIKIPEDIA. Archive-first; live web research fills gaps.
//
// WHAT THIS IS:
//   Everything YOU know about dancehall/reggae culture — artists, producers,
//   labels, sound systems, clashes, dances, venues, radio, eras, terms,
//   street dances, oral history, first-hand accounts — goes here.
//
//   This file is automatically merged into the Archive Ask Bot's entity store
//   (lib/entities.mts) AND into the MongoDB `artists` collection when you run:
//
//       npm run seed:archive
//
//   So: add an entry below → run that one command → the bot knows it.
//   The entries also ship inside the app code, so they work even if Mongo is down.
//
// ── HOW TO ADD AN ENTRY ────────────────────────────────────────────────
// 1. Copy the TEMPLATE block below.
// 2. Paste it inside the [ ... ] array at the bottom of this file.
// 3. Fill in the fields (only `id`, `type`, `name`, and `bio` are required).
// 4. Run:  npm run seed:archive
//
// ── TEMPLATE (copy this) ───────────────────────────────────────────────
// {
//   id: "unique-id-here",              // lowercase, dashes, no spaces, never reuse
//   type: "artist",                    // artist | producer | label | sound system |
//                                      // event | era | dance | venue | term | radio |
//                                      // personality | movement | place | other
//   name: "Display Name",
//   realName: "Real name (optional)",
//   aliases: ["Other name 1", "Other name 2"],
//   born: "24 January 1966",           // or "Founded 1973"
//   origin: "Kingston, Jamaica",
//   era: "1980s–1990s dancehall",
//   role: "Deejay / Selector / Producer / etc.",
//   notableSongs: ["Song 1", "Song 2"],
//   bio: "Write this the way you want the bot to say it. 2-4 sentences. "
//      + "If it is first-hand knowledge, say 'Oral history:' at the start.",
//   related: ["Related name 1", "Related name 2"],
//   source: "oral-history",            // oral-history | first-hand | personal | curated
//   verified: true,
// },
//
// ── WORKED EXAMPLE (delete or replace with your own) ───────────────────
// {
//   id: "weddy-weddy",
//   type: "event",
//   name: "Weddy Weddy Wednesday",
//   aliases: ["Weddy Weddy"],
//   born: "Early 2000s",
//   origin: "Kingston, Jamaica",
//   era: "2000s–present",
//   role: "Weekly street dance",
//   bio: "Oral history: Weddy Weddy is the legendary weekly street dance "
//      + "run by Stone Love Movement in Kingston. It became the proving ground "
//      + "for new dancehall songs and dance moves every Wednesday night.",
//   related: ["Stone Love Movement", "Passa Passa"],
//   source: "oral-history",
//   verified: true,
// },

import type { ArchiveEntity } from "./lib/entities.mts";

// ── YOUR ENTRIES GO INSIDE THIS ARRAY ──────────────────────────────────
export const PERSONAL_ENTITIES: ArchiveEntity[] = [
  // Paste filled-in entries here, one after another.
];
