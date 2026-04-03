export interface RiddimEntry {
  // Core identification
  name: string;                    // "Tempo Riddim"
  aliases?: string[];              // Alternative names it's known by
  year: number;                    // Year produced
  producer: string;                // Producer name
  label?: string;                  // Record label
  
  // Classification
  era: string;                     // "Roots" | "Digital" | "Dancehall" | "Riddim Era" | "Modern"
  bpm?: number;                    // Tempo
  key?: string;                    // Musical key
  
  // Songs on this riddim
  songs: {
    artist: string;
    title: string;
    year?: number;
    notable?: boolean;             // Is this a standout cut?
  }[];
  
  // Cultural knowledge
  culturalSignificance?: string;   // The story behind the riddim
  clashHistory?: string;           // Any sound clash connections
  crossoverMoments?: string;       // Did it cross into mainstream?
  riddimStory?: string;            // Benny's oral history entry
  
  // Data quality
  verifiedByBenny: boolean;        // True = Benny confirmed this is correct
  source?: string;                 // Where the data came from
  notes?: string;                  // Anything else worth knowing
  
  // Duplicates and rebirths
  duplicates?: string[];           // Other riddims that copy this one
  rebirths?: string[];             // Later versions of this riddim
  similarRiddims?: string[];       // Riddims with similar energy/vibe
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}