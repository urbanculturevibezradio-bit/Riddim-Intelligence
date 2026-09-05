// lib/entities.mts — Caribbean Sound Archive entity store
// ⛔ HARD RULES (see B.md): NO ANTHROPIC. NO WIKIPEDIA. Archive-first; live web research fills gaps.
// Single source of truth for the Archive Ask Bot entity resolution.
// Pure ESM TypeScript with erasable-only syntax so Node can run it directly.

// Personal/community knowledge lives in PERSONAL-KNOWLEDGE.mts (repo root)
// for easy access. It is merged into this store automatically.
import { PERSONAL_ENTITIES } from "../PERSONAL-KNOWLEDGE.mts";

export interface ArchiveEntity {
  id: string;
  type:
    | "artist"
    | "producer"
    | "label"
    | "sound system"
    | "event"
    | "era"
    | "dance"
    | "venue"
    | "term"
    | "radio"
    | "personality"
    | "movement"
    | "place"
    | "other";
  name: string;
  realName?: string;
  aliases?: string[];
  born?: string;
  origin?: string;
  era?: string;
  role?: string;
  notableSongs?: string[];
  bio: string;
  related?: string[];
  verified?: boolean;
  /** Where the record came from: curated | oral-history | first-hand | personal */
  source?: string;
}

// ── CURATED CANON — verified dancehall/reggae archive records ─────────────
// Every entry below is a canonical archive record. This data ships with the
// app so the Archive Ask Bot can ALWAYS resolve major artists/entities even
// if MongoDB is unavailable. Never add Wikipedia or model-generated facts here.
export const ARCHIVE_ENTITIES: ArchiveEntity[] = [
  // ── ARTISTS ────────────────────────────────────────────────────────────
  {
    id: "ninjaman",
    type: "artist",
    name: "Ninjaman",
    realName: "Desmond John Ballentine",
    aliases: ["Ninja Man", "Don Gorgon", "Brother Desmond"],
    born: "24 January 1966",
    origin: "Kingston, Jamaica",
    era: "1980s–1990s dancehall",
    role: "Deejay",
    notableSongs: ["Murder Dem", "Border Clash", "My Weapon", "Artical Don"],
    bio: "Ninjaman is the stage name of Desmond John Ballentine, a major Jamaican dancehall deejay of the 1980s and 1990s, known for his stuttering, melodramatic delivery and hardcore gun-lyric style. He was a dominant figure in Jamaican sound-clash culture, especially at the annual Sting stage show, and is also known as Don Gorgon. In 2017 he was sentenced to life imprisonment for murder.",
    related: ["Bounty Killer", "Vybz Kartel", "Shabba Ranks", "Sting", "sound clash culture"],
    verified: true,
  },
  {
    id: "bounty-killer",
    type: "artist",
    name: "Bounty Killer",
    realName: "Rodney Basil Price",
    aliases: ["Rodney Price", "Warlord", "Five Star General"],
    born: "12 June 1972",
    origin: "Trenchtown, Kingston, Jamaica",
    era: "1990s dancehall",
    role: "Deejay",
    notableSongs: ["Copper Shot", "Down in the Ghetto", "Sufferer", "Benz and Bimma"],
    bio: "Bounty Killer is the stage name of Rodney Basil Price, one of the defining dancehall deejays of the 1990s. Known as the Warlord and Five Star General, he founded the Alliance, a collective of dancehall artists, and was a central figure in the era's lyrical battles, including his long rivalry with Beenie Man.",
    related: ["The Alliance", "Beenie Man", "Ninjaman", "Vybz Kartel"],
    verified: true,
  },
  {
    id: "beenie-man",
    type: "artist",
    name: "Beenie Man",
    realName: "Moses Anthony Davis",
    aliases: ["Moses Davis", "King of Dancehall"],
    born: "22 August 1973",
    origin: "Kingston, Jamaica",
    era: "1990s–2000s dancehall",
    role: "Deejay",
    notableSongs: ["Who Am I (Sim Simma)", "Romie", "Girls Dem Sugar", "Dude"],
    bio: "Beenie Man is the stage name of Moses Anthony Davis, a Jamaican dancehall deejay who began recording as a child and became one of the genre's biggest international stars. He won the Grammy Award for Best Reggae Album in 2000 and is known as the King of Dancehall. His rivalry with Bounty Killer defined much of 1990s dancehall.",
    related: ["Bounty Killer", "Dave Kelly", "Penthouse Records"],
    verified: true,
  },
  {
    id: "vybz-kartel",
    type: "artist",
    name: "Vybz Kartel",
    realName: "Adidja Palmer",
    aliases: ["Adidja Palmer", "Worl' Boss", "Teacha"],
    born: "7 January 1976",
    origin: "Kingston, Jamaica",
    era: "2000s–2010s dancehall",
    role: "Deejay",
    notableSongs: ["Clarks", "Fever", "Romping Shop", "Summertime"],
    bio: "Vybz Kartel is the stage name of Adidja Palmer, the most influential Jamaican dancehall artist of the 2000s and 2010s. Known as Worl' Boss and Teacha, he led the Portmore Empire/Gaza collective and modernized dancehall lyricism and slang. His onstage clash with Ninjaman at Sting 2003 is a landmark moment in dancehall history.",
    related: ["Ninjaman", "Sting", "Portmore Empire", "Mavado"],
    verified: true,
  },
  {
    id: "super-cat",
    type: "artist",
    name: "Super Cat",
    realName: "William Maragh",
    aliases: ["Wild Apache", "Don Dada"],
    born: "25 June 1963",
    origin: "Cockburn Pen, Kingston, Jamaica",
    era: "1980s–1990s dancehall",
    role: "Deejay",
    notableSongs: ["Don Dada", "Ghetto Red Hot", "Dolly My Baby"],
    bio: "Super Cat is the stage name of William Maragh, a Jamaican deejay known as the Wild Apache and Don Dada. He was one of the leading voices of late-1980s and 1990s dancehall and a key figure in bringing dancehall to international audiences.",
    related: ["Ninjaman", "King Jammy"],
    verified: true,
  },
  {
    id: "capleton",
    type: "artist",
    name: "Capleton",
    realName: "Clifton George Bailey III",
    aliases: ["Clifton Bailey", "The Prophet", "King Shango"],
    born: "13 April 1967",
    origin: "St. Mary, Jamaica",
    era: "1990s dancehall",
    role: "Deejay",
    notableSongs: ["Tour", "Jah Jah City", "Wings of the Morning"],
    bio: "Capleton is the stage name of Clifton George Bailey III, a Jamaican deejay known as The Prophet. A leading voice of 1990s dancehall, he later became a prominent Rastafarian artist blending dancehall with conscious roots reggae. He has credited Ninjaman with pushing him to take his dancehall career seriously.",
    related: ["Ninjaman", "Sizzla"],
    verified: true,
  },
  {
    id: "sizzla",
    type: "artist",
    name: "Sizzla",
    realName: "Miguel Orlando Collins",
    aliases: ["Miguel Collins"],
    born: "17 April 1976",
    origin: "Kingston, Jamaica",
    era: "1990s–2000s reggae/dancehall",
    role: "Deejay / singer",
    notableSongs: ["Praise Ye Jah", "Solid as a Rock", "Thank You Mama"],
    bio: "Sizzla is the stage name of Miguel Orlando Collins, a prolific Jamaican reggae and dancehall artist associated with the Bobo Ashanti branch of Rastafari. Emerging in the mid-1990s, he became one of the most recorded and influential conscious dancehall artists of his generation.",
    related: ["Capleton", "Bobo Ashanti"],
    verified: true,
  },
  {
    id: "shabba-ranks",
    type: "artist",
    name: "Shabba Ranks",
    realName: "Rexton Rawlston Fernando Gordon",
    aliases: ["Rexton Gordon"],
    born: "17 January 1966",
    origin: "St. Ann, Jamaica",
    era: "1980s–1990s dancehall",
    role: "Deejay",
    notableSongs: ["Mr. Loverman", "Ting-A-Ling", "Trailer Load a Girls"],
    bio: "Shabba Ranks is the stage name of Rexton Rawlston Fernando Gordon, a Jamaican dancehall deejay who dominated the late 1980s and early 1990s. He was one of the first dancehall artists to achieve major international crossover success, including Grammy Awards for his recordings.",
    related: ["Ninjaman", "Sting", "King Jammy"],
    verified: true,
  },
  {
    id: "buju-banton",
    type: "artist",
    name: "Buju Banton",
    realName: "Mark Anthony Myrie",
    aliases: ["Mark Myrie", "Gargamel"],
    born: "15 July 1973",
    origin: "Kingston, Jamaica",
    era: "1990s–2000s dancehall/reggae",
    role: "Deejay / singer",
    notableSongs: ["Boom Bye Bye", "Champion", "Untold Stories", "Murderer"],
    bio: "Buju Banton is the stage name of Mark Anthony Myrie, a Jamaican dancehall and reggae artist known as Gargamel. He rose to fame in the early 1990s and later became one of roots reggae's most respected voices, winning the Grammy Award for Best Reggae Album in 2010.",
    related: ["Penthouse Records", "Donovan Germain"],
    verified: true,
  },

  // ── PRODUCERS ──────────────────────────────────────────────────────────
  {
    id: "king-jammy",
    type: "producer",
    name: "King Jammy",
    realName: "Lloyd James",
    aliases: ["Prince Jammy", "King Jammy's"],
    born: "26 October 1947",
    origin: "Kingston, Jamaica",
    era: "1970s–1990s",
    role: "Producer / sound system operator",
    bio: "King Jammy (Lloyd James) is a legendary Jamaican producer and sound system operator. His 1985 release of Wayne Smith's 'Under Mi Sleng Teng' — the first fully digital dancehall riddim — launched the digital dancehall revolution and changed the sound of reggae and dancehall forever.",
    related: ["Sleng Teng", "King Tubby", "1980s digital dancehall"],
    verified: true,
  },
  {
    id: "king-tubby",
    type: "producer",
    name: "King Tubby",
    realName: "Osbourne Ruddock",
    aliases: [],
    born: "28 January 1941",
    origin: "Kingston, Jamaica",
    era: "1960s–1980s",
    role: "Producer / dub pioneer",
    bio: "King Tubby (Osbourne Ruddock) is the pioneering Jamaican engineer and producer credited as a founding father of dub music. Through his Firehouse imprint and studio work he shaped the sound of reggae and the early digital riddim era.",
    related: ["Firehouse", "King Jammy", "Tempo Riddim"],
    verified: true,
  },
  {
    id: "dave-kelly",
    type: "producer",
    name: "Dave Kelly",
    realName: "David Kelly",
    aliases: [],
    origin: "Kingston, Jamaica",
    era: "1990s–2000s",
    role: "Producer",
    bio: "Dave Kelly is a Jamaican producer who defined much of the 1990s dancehall sound through his Mad House label. His riddims, including the Bogle, Bookshelf, and Joyride riddims, powered hits for Beenie Man, Bounty Killer, and many others.",
    related: ["Mad House", "Beenie Man", "Bounty Killer"],
    verified: true,
  },
  {
    id: "steely-clevie",
    type: "producer",
    name: "Steely & Clevie",
    realName: "Wycliffe 'Steely' Johnson & Cleveland 'Clevie' Browne",
    aliases: ["Steely and Clevie"],
    era: "1980s–2000s",
    role: "Production duo",
    bio: "Steely & Clevie are a legendary Jamaican production duo who built the digital riddim sound of the late 1980s and 1990s. Their riddims, such as Poco Man Jam, are among the most versioned in dancehall history.",
    related: ["1980s digital dancehall", "1990s dancehall"],
    verified: true,
  },
  {
    id: "donovan-germain",
    type: "producer",
    name: "Donovan Germain",
    realName: "Donovan Germain",
    aliases: [],
    era: "1980s–2000s",
    role: "Producer",
    bio: "Donovan Germain is a Jamaican producer and founder of Penthouse Records, one of the most important dancehall labels of the 1990s. His Penthouse Tempo Riddim produced Buju Banton and Garnett Silk's classic 'Complaint'.",
    related: ["Penthouse Records", "Buju Banton", "Tempo Riddim"],
    verified: true,
  },
  {
    id: "bobby-digital",
    type: "producer",
    name: "Bobby Digital",
    realName: "Robert Dixon",
    aliases: [],
    era: "1980s–2000s",
    role: "Producer",
    bio: "Bobby Digital (Robert Dixon) is a Jamaican producer known for his Digital-B label and his long-running partnership with Shabba Ranks during the late 1980s and early 1990s dancehall explosion.",
    related: ["Shabba Ranks", "Digital-B"],
    verified: true,
  },

  // ── LABELS ─────────────────────────────────────────────────────────────
  {
    id: "penthouse-records",
    type: "label",
    name: "Penthouse Records",
    aliases: ["Penthouse"],
    era: "1990s",
    role: "Record label",
    bio: "Penthouse Records is the Kingston label founded by Donovan Germain. In the 1990s it was a defining force in dancehall, releasing landmark records by Buju Banton, Garnett Silk, Beres Hammond, and Wayne Wonder.",
    related: ["Donovan Germain", "Buju Banton", "Tempo Riddim"],
    verified: true,
  },
  {
    id: "firehouse",
    type: "label",
    name: "Firehouse",
    aliases: ["Firehouse Music"],
    era: "1980s",
    role: "Record label",
    bio: "Firehouse was King Tubby's record label and studio imprint. It released the original 1985 Tempo Riddim, one of the defining digital dancehall riddims of the mid-1980s.",
    related: ["King Tubby", "Tempo Riddim"],
    verified: true,
  },
  {
    id: "digital-b",
    type: "label",
    name: "Digital-B",
    aliases: ["Digital B"],
    era: "1980s–1990s",
    role: "Record label",
    bio: "Digital-B is the label of producer Bobby Digital, a key imprint of the late-1980s and 1990s digital dancehall era.",
    related: ["Bobby Digital", "Shabba Ranks"],
    verified: true,
  },
  {
    id: "mad-house",
    type: "label",
    name: "Mad House",
    aliases: ["Madhouse"],
    era: "1990s–2000s",
    role: "Record label",
    bio: "Mad House is Dave Kelly's label, home to many of the biggest dancehall riddims and hits of the 1990s and 2000s.",
    related: ["Dave Kelly", "Beenie Man", "Bounty Killer"],
    verified: true,
  },

  // ── SOUND SYSTEMS ──────────────────────────────────────────────────────
  {
    id: "stone-love",
    type: "sound system",
    name: "Stone Love Movement",
    aliases: ["Stone Love"],
    born: "Founded 1973",
    origin: "Kingston, Jamaica",
    era: "1970s–present",
    role: "Sound system",
    bio: "Stone Love Movement is a legendary Jamaican sound system founded by Winston 'Wee Pow' Powell in 1973. Known worldwide for its dubplate culture, marathon clashes, and the weekly Weddy Weddy street dance, Stone Love is one of the most celebrated sound systems in dancehall history.",
    related: ["sound clash culture", "Wee Pow", "Passa Passa"],
    verified: true,
  },
  {
    id: "killamanjaro",
    type: "sound system",
    name: "Killamanjaro",
    aliases: ["Kilimanjaro"],
    born: "Founded 1969",
    origin: "Kingston, Jamaica",
    era: "1960s–present",
    role: "Sound system",
    bio: "Killamanjaro is a pioneering Jamaican sound system founded in 1969. One of the great champion sounds, it played a central role in the development of sound clash culture and launched the careers of many selectors and artists.",
    related: ["sound clash culture", "Stone Love"],
    verified: true,
  },
  {
    id: "king-jammys-sound",
    type: "sound system",
    name: "King Jammy's",
    aliases: [],
    era: "1980s–present",
    role: "Sound system / studio",
    bio: "King Jammy's is both a legendary sound system and the studio where the 1985 Sleng Teng digital revolution began.",
    related: ["King Jammy", "Sleng Teng", "1980s digital dancehall"],
    verified: true,
  },

  // ── EVENTS ─────────────────────────────────────────────────────────────
  {
    id: "sting",
    type: "event",
    name: "Sting",
    aliases: ["Sting stage show"],
    born: "Founded 1984",
    origin: "Kingston, Jamaica",
    era: "1980s–2010s",
    role: "Annual stage show / clash",
    bio: "Sting is Jamaica's annual Boxing Day stage show, historically held in Kingston and famous for its onstage lyrical clashes between dancehall's biggest deejays. Landmark clashes include Ninjaman vs Shabba Ranks (1991) and Vybz Kartel vs Ninjaman (2003).",
    related: ["Ninjaman", "Shabba Ranks", "Vybz Kartel", "sound clash culture"],
    verified: true,
  },
  {
    id: "passa-passa",
    type: "event",
    name: "Passa Passa",
    aliases: [],
    born: "Early 2000s",
    origin: "Tivoli Gardens, Kingston, Jamaica",
    era: "2000s",
    role: "Street dance",
    bio: "Passa Passa was a weekly street dance held in Tivoli Gardens, Kingston, in the early 2000s. It became a global phenomenon that popularized dancehall street dances and launched dance moves and songs worldwide.",
    related: ["Stone Love", "2000s dancehall"],
    verified: true,
  },

  // ── ERAS ───────────────────────────────────────────────────────────────
  {
    id: "1980s-digital-dancehall",
    type: "era",
    name: "1980s digital dancehall",
    aliases: ["digital dancehall era", "digital era"],
    era: "1985–1989",
    role: "Era",
    bio: "The 1980s digital dancehall era began with the 1985 release of Wayne Smith's 'Under Mi Sleng Teng' on King Jammy's label — the first fully computerized riddim. It replaced live bands with digital rhythms and produced early digital stars such as King Kong, Pinchers, and Super Cat, and foundational riddims like Sleng Teng and Tempo.",
    related: ["King Jammy", "Sleng Teng", "Tempo Riddim", "Super Cat"],
    verified: true,
  },
  {
    id: "1990s-dancehall",
    type: "era",
    name: "1990s dancehall",
    aliases: ["90s dancehall", "1990s dancehall era"],
    era: "1990–1999",
    role: "Era",
    bio: "The 1990s dancehall era was the golden age of hardcore dancehall, dominated by deejays such as Bounty Killer, Beenie Man, Ninjaman, Buju Banton, Capleton, and Sizzla, and producers such as Dave Kelly, Steely & Clevie, and Donovan Germain. It was defined by lyrical rivalries, sound clashes, and riddims that became worldwide standards.",
    related: ["Bounty Killer", "Beenie Man", "Ninjaman", "Buju Banton", "Dave Kelly"],
    verified: true,
  },
  ...PERSONAL_ENTITIES,
];

// ── NORMALIZATION ────────────────────────────────────────────────────────

const QUESTION_PREFIX =
  /^(who won|who is|who was|who are|what is|what are|what was|what were|history of|origin of|when did|when was|where is|where was|how did|how is|tell me about|explain|describe|what era|which era|which artists were important in|who are some major)\s+/;

/** Lowercase, strip punctuation, collapse spaces, expand 80s/90s. */
export function normalizeEntityText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-?.,!;:'"“”‘’()]/g, " ")
    .replace(/\b80s\b/g, "1980s")
    .replace(/\b90s\b/g, "1990s")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove question phrasing to expose the raw topic. */
export function bareTopic(query: string): string {
  return normalizeEntityText(query).replace(QUESTION_PREFIX, "").replace(/\?+$/, "").trim();
}

/** Resolve a user query to a canonical archive entity (or null). */
export function resolveEntity(query: string): ArchiveEntity | null {
  const norm = normalizeEntityText(query);
  const bare = bareTopic(query);

  let best: ArchiveEntity | null = null;
  let bestScore = 0;

  for (const entity of ARCHIVE_ENTITIES) {
    const names = [entity.name, entity.realName, ...(entity.aliases ?? [])]
      .filter((n): n is string => Boolean(n))
      .map((n) => normalizeEntityText(n));

    for (const n of names) {
      let score = 0;
      if (bare === n) score = 100;
      else if (bare.startsWith(n + " ") || bare.endsWith(" " + n)) score = 90;
      else if (norm.includes(n)) score = 80;
      else if (bare.includes(n)) score = 75;
      else {
        // Token-overlap matching for real-name variants such as
        // "Desmond Ballentine" vs "Desmond John Ballentine".
        const bareWords = bare.split(" ").filter(Boolean);
        const nameWords = n.split(" ").filter(Boolean);
        if (bareWords.length >= 2 && nameWords.length >= 2) {
          const bareCoverage =
            bareWords.filter((w) => nameWords.includes(w)).length / bareWords.length;
          const nameCoverage =
            nameWords.filter((w) => bareWords.includes(w)).length / nameWords.length;
          const overlap = Math.max(bareCoverage, nameCoverage);
          if (overlap >= 0.75) score = 85;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        best = entity;
      }
    }
  }

  return best;
}

const ENTITY_STOPWORDS = new Set([
  "who", "what", "when", "where", "how", "why", "the", "are", "was",
  "were", "did", "does", "about", "tell", "some",
]);

function queryWords(query: string): string[] {
  return normalizeEntityText(query)
    .split(" ")
    .filter((w) => w.length > 2 && !ENTITY_STOPWORDS.has(w));
}

function entityScore(entity: ArchiveEntity, bare: string, words: string[]): number {
  const hay = normalizeEntityText(
    [
      entity.name,
      entity.realName,
      entity.type,
      entity.era,
      entity.role,
      entity.bio,
      ...(entity.aliases ?? []),
      ...(entity.notableSongs ?? []),
      ...(entity.related ?? []),
    ]
      .filter(Boolean)
      .join(" ")
  );

  let score = 0;
  if (hay.includes(bare)) score += 10;
  for (const w of words) {
    if (hay.includes(w)) score += 1;
  }
  return score;
}

/**
 * Top keyword-match score for a query. High scores mean the Archive genuinely
 * covers the topic (broad questions); low scores (1) are usually keyword noise
 * like "roots" in a bio — those should fall through to live web research.
 */
export function topEntityScore(query: string): number {
  const bare = bareTopic(query);
  const words = queryWords(query);
  let best = 0;
  for (const entity of ARCHIVE_ENTITIES) {
    const s = entityScore(entity, bare, words);
    if (s > best) best = s;
  }
  return best;
}

/** Keyword search across all entity fields for broader archive questions. */
export function searchEntities(query: string, max = 6): ArchiveEntity[] {
  const bare = bareTopic(query);
  const words = queryWords(query);

  const scored = ARCHIVE_ENTITIES.map((entity) => ({
    entity,
    score: entityScore(entity, bare, words),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.entity);

  return scored;
}

function formatEntity(entity: ArchiveEntity): string {
  const head = [
    entity.name,
    entity.realName ? `real name: ${entity.realName}` : "",
    entity.type,
    entity.era ?? "",
    entity.role ?? "",
  ]
    .filter(Boolean)
    .join(" · ");

  const lines = [`- ${head}`];
  if (entity.born) lines.push(`  Born/Founded: ${entity.born}${entity.origin ? `, ${entity.origin}` : ""}`);
  if (entity.notableSongs && entity.notableSongs.length) lines.push(`  Notable recordings: ${entity.notableSongs.join(", ")}`);
  if (entity.related && entity.related.length) lines.push(`  Associated with: ${entity.related.join(", ")}`);
  lines.push(`  ${entity.bio}`);
  return lines.join("\n");
}

/** Build grounding context for the Archive Ask Bot from the entity store. */
export function buildEntityContext(
  query: string,
  max = 6
): { context: string; labels: string[]; resolved: ArchiveEntity | null } {
  const resolved = resolveEntity(query);
  const list = resolved
    ? [resolved, ...searchEntities(query, max).filter((e) => e.id !== resolved.id)]
    : searchEntities(query, max);

  if (!list.length) return { context: "", labels: [], resolved };

  return {
    context: `[Caribbean Sound Archive — verified entity records]\n${list.map(formatEntity).join("\n")}`,
    labels: list.map((e) => e.name),
    resolved,
  };
}
