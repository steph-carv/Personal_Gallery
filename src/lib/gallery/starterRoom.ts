import type { Artwork, Room } from "./types";

/**
 * Room 1 of the starter collection (HANDOVER.md §9), hard-coded for Phase 2.
 * From Phase 5 these come from the database instead.
 *
 * Facts come from Wikidata and The Met's collection API; images are in
 * public/art/starter (see CREDITS.md).
 */

const madameX: Artwork = {
  id: "met-12127",
  source: "met",
  sourceId: "12127",
  title: "Madame X (Madame Pierre Gautreau)",
  artist: "John Singer Sargent",
  artistMeta: { nationality: "American", lifeDates: "1856–1925" },
  dateText: "1883–84",
  medium: "Oil on canvas",
  dimensionsText: "208.6 × 109.9 cm",
  widthCm: 109.9,
  heightCm: 208.6,
  holder: "The Metropolitan Museum of Art, New York",
  imageUrl: "/art/starter/madame-x.jpg",
  imageWidth: 840,
  imageHeight: 1600,
  attribution: "Image: The Metropolitan Museum of Art, CC0",
  sourceUrl: "https://www.metmuseum.org/art/collection/search/12127",
};

const monaLisa: Artwork = {
  id: "wikidata-Q12418",
  source: "wikidata",
  sourceId: "Q12418",
  title: "Mona Lisa",
  artist: "Leonardo da Vinci",
  artistMeta: { nationality: "Italian", lifeDates: "1452–1519" },
  dateText: "c. 1503–19",
  medium: "Oil on poplar panel",
  dimensionsText: "79.4 × 53.4 cm",
  widthCm: 53.4,
  heightCm: 79.4,
  holder: "Musée du Louvre, Paris",
  imageUrl: "/art/starter/mona-lisa.jpg",
  imageWidth: 1074,
  imageHeight: 1600,
  attribution: "Image: Wikimedia Commons (C2RMF), public domain",
  sourceUrl: "https://www.wikidata.org/wiki/Q12418",
};

const girlWithAPearlEarring: Artwork = {
  id: "wikidata-Q185372",
  source: "wikidata",
  sourceId: "Q185372",
  title: "Girl with a Pearl Earring",
  artist: "Johannes Vermeer",
  artistMeta: { nationality: "Dutch", lifeDates: "1632–1675" },
  dateText: "c. 1665",
  medium: "Oil on canvas",
  dimensionsText: "44.5 × 39 cm",
  widthCm: 39,
  heightCm: 44.5,
  holder: "Mauritshuis, The Hague",
  imageUrl: "/art/starter/girl-pearl-earring.jpg",
  imageWidth: 1351,
  imageHeight: 1600,
  attribution: "Image: Wikimedia Commons, public domain",
  sourceUrl: "https://www.wikidata.org/wiki/Q185372",
};

const laughingCavalier: Artwork = {
  id: "wikidata-Q965124",
  source: "wikidata",
  sourceId: "Q965124",
  title: "The Laughing Cavalier",
  artist: "Frans Hals",
  artistMeta: { nationality: "Dutch", lifeDates: "c. 1582–1666" },
  dateText: "1624",
  medium: "Oil on canvas",
  dimensionsText: "83 × 67.3 cm",
  widthCm: 67.3,
  heightCm: 83,
  holder: "The Wallace Collection, London",
  imageUrl: "/art/starter/laughing-cavalier.jpg",
  imageWidth: 1311,
  imageHeight: 1600,
  attribution: "Image: Wikimedia Commons, public domain",
  sourceUrl: "https://www.wikidata.org/wiki/Q965124",
};

const strawHat: Artwork = {
  id: "met-436532",
  source: "met",
  sourceId: "436532",
  title: "Self-Portrait with a Straw Hat",
  artist: "Vincent van Gogh",
  artistMeta: { nationality: "Dutch", lifeDates: "1853–1890" },
  dateText: "1887",
  medium: "Oil on canvas",
  dimensionsText: "40.6 × 31.8 cm",
  widthCm: 31.8,
  heightCm: 40.6,
  holder: "The Metropolitan Museum of Art, New York",
  imageUrl: "/art/starter/van-gogh-straw-hat.jpg",
  imageWidth: 1280,
  imageHeight: 1600,
  attribution: "Image: The Metropolitan Museum of Art, CC0",
  sourceUrl: "https://www.metmuseum.org/art/collection/search/436532",
};

const gilt = { style: "ornate-gilt", width: "standard" } as const;
const simpleGilt = { style: "simple-gilt", width: "standard" } as const;

/** Museum hanging height: the centre of most paintings sits around 1.6 m. */
const EYE_LINE = 1.6;

export const starterRoom: Room = {
  id: "room-1",
  number: 1,
  name: "Portraits & Figures",
  intro: "Faces that have looked back at visitors for centuries.",
  width: 12,
  depth: 9,
  height: 5,
  theme: {
    wallColor: "#5e1d20",
    lowerWallColor: "#3a1214",
    trimColor: "#efe7d4",
    ceilingColor: "#e9e0cc",
    floor: "oak-planks",
    ceiling: "skylight",
    bench: "leather",
  },
  placements: [
    // Far wall, facing you as you enter: the largest work, alone.
    { id: "p1", artwork: madameX, wall: "north", x: 0, y: 2.25, frame: gilt, showLabel: true },
    // Left wall: the Mona Lisa on her own, as at the Louvre.
    { id: "p2", artwork: monaLisa, wall: "west", x: 0, y: EYE_LINE, frame: gilt, showLabel: true },
    // Right wall: two Dutch portraits as a pair.
    {
      id: "p3",
      artwork: laughingCavalier,
      wall: "east",
      x: -1.7,
      y: EYE_LINE,
      frame: gilt,
      showLabel: true,
    },
    {
      id: "p4",
      artwork: girlWithAPearlEarring,
      wall: "east",
      x: 1.7,
      y: EYE_LINE,
      frame: simpleGilt,
      showLabel: true,
    },
    // Entrance wall, behind you as you come in.
    {
      id: "p5",
      artwork: strawHat,
      wall: "south",
      x: 0,
      y: EYE_LINE,
      frame: simpleGilt,
      showLabel: true,
    },
  ],
};
