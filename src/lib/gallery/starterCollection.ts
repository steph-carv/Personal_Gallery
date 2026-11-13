import type { Artwork, Collection, Room } from "./types";

/**
 * The starter collection (HANDOVER.md §9), hard-coded until Phase 5 moves it
 * into the database and copies it into each new account.
 *
 * Facts come from Wikidata, The Met and the Art Institute of Chicago APIs;
 * images are in public/art/starter (see CREDITS.md). "About the work" texts
 * are our own (§5d).
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
  description:
    "Sargent painted Virginie Amélie Avegno Gautreau, an American-born Parisian society beauty, in a black satin gown that sets off her powdered skin. Shown at the Paris Salon of 1884, it caused a scandal, partly because one jewelled strap had slipped from her shoulder; Sargent later repainted it in place. He kept the picture for over thirty years before selling it to the Met in 1916.",
  descriptionCredit: "Written for Salon",
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
  description:
    "Probably a portrait of Lisa Gherardini, wife of the Florentine merchant Francesco del Giocondo. Leonardo worked on it for years and never handed it over, taking it with him to France. Soft transitions of light and shade (sfumato) give the face and the hazy landscape behind it their famous ambiguity. Its theft from the Louvre in 1911 helped make it the most famous painting in the world.",
  descriptionCredit: "Written for Salon",
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
  description:
    "Not a commissioned portrait but a tronie: a Dutch study of a face, here a girl in an exotic turban turning to look over her shoulder. Nobody knows who modelled for it. Against a dark background, Vermeer builds her face out of soft light, with a single bright highlight on the large pearl.",
  descriptionCredit: "Written for Salon",
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
  description:
    "The title is a 19th-century invention: the sitter, 26 years old according to the inscription, is smiling rather than laughing. Hals shows off his quick, confident brushwork in the lace collar and the embroidered sleeve. The painting caused a bidding war in Paris in 1865 when it was bought by the 4th Marquess of Hertford, whose collection became the Wallace Collection.",
  descriptionCredit: "Written for Salon",
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
  description:
    "Painted in Paris, where Van Gogh made dozens of self-portraits because he couldn't afford to pay models. The short, separate strokes of colour show what he was learning from the Impressionists and Neo-Impressionists. To save money he painted it on the back of an earlier canvas, The Potato Peeler, from his dark Dutch period.",
  descriptionCredit: "Written for Salon",
};

const starryNight: Artwork = {
  id: "wikidata-Q45585",
  source: "wikidata",
  sourceId: "Q45585",
  title: "The Starry Night",
  artist: "Vincent van Gogh",
  artistMeta: { nationality: "Dutch", lifeDates: "1853–1890" },
  dateText: "1889",
  medium: "Oil on canvas",
  dimensionsText: "73.7 × 92.1 cm",
  widthCm: 92.1,
  heightCm: 73.7,
  holder: "The Museum of Modern Art, New York",
  imageUrl: "/art/starter/starry-night.jpg",
  imageWidth: 1600,
  imageHeight: 1267,
  attribution: "Image: Wikimedia Commons (Google Art Project), public domain",
  sourceUrl: "https://www.wikidata.org/wiki/Q45585",
  description:
    "Painted in June 1889 at the asylum in Saint-Rémy-de-Provence, where Van Gogh had admitted himself. The view is based on what he saw from his east-facing window before sunrise, but the village and its church spire came from his imagination. The flame-like cypress joins the earth to a sky full of swirling movement.",
  descriptionCredit: "Written for Salon",
};

const waterLilies: Artwork = {
  id: "aic-16568",
  source: "aic",
  sourceId: "16568",
  title: "Water Lilies",
  artist: "Claude Monet",
  artistMeta: { nationality: "French", lifeDates: "1840–1926" },
  dateText: "1906",
  medium: "Oil on canvas",
  dimensionsText: "89.9 × 94.1 cm",
  widthCm: 94.1,
  heightCm: 89.9,
  holder: "The Art Institute of Chicago",
  imageUrl: "/art/starter/water-lilies.jpg",
  imageWidth: 1600,
  imageHeight: 1536,
  attribution: "Image: The Art Institute of Chicago, CC0",
  sourceUrl: "https://www.artic.edu/artworks/16568",
  description:
    "From the late 1890s Monet painted the water garden at his home in Giverny again and again, eventually making around 250 pictures of it. Here there is no horizon and no bank, only the surface of the pond, so lily pads floating on the water mix with reflections of the sky and trees.",
  descriptionCredit: "Written for Salon",
};

const greatWave: Artwork = {
  id: "met-45434",
  source: "met",
  sourceId: "45434",
  title: "The Great Wave off Kanagawa",
  artist: "Katsushika Hokusai",
  artistMeta: { nationality: "Japanese", lifeDates: "1760–1849" },
  dateText: "c. 1830–32",
  medium: "Woodblock print; ink and colour on paper",
  dimensionsText: "25.7 × 37.9 cm",
  widthCm: 37.9,
  heightCm: 25.7,
  holder: "The Metropolitan Museum of Art, New York",
  imageUrl: "/art/starter/great-wave.jpg",
  imageWidth: 1600,
  imageHeight: 1076,
  attribution: "Image: The Metropolitan Museum of Art, CC0",
  sourceUrl: "https://www.metmuseum.org/art/collection/search/45434",
  description:
    "From the series Thirty-six Views of Mount Fuji. A huge wave curls over three boats of rowers while Mount Fuji sits small and still in the distance. As a woodblock print it was made in large numbers and sold cheaply; this is one of many surviving impressions. The design later fascinated European artists.",
  descriptionCredit: "Written for Salon",
};

const hayWain: Artwork = {
  id: "wikidata-Q2366825",
  source: "wikidata",
  sourceId: "Q2366825",
  title: "The Hay Wain",
  artist: "John Constable",
  artistMeta: { nationality: "English", lifeDates: "1776–1837" },
  dateText: "1821",
  medium: "Oil on canvas",
  dimensionsText: "130.2 × 185.4 cm",
  widthCm: 185.4,
  heightCm: 130.2,
  holder: "The National Gallery, London",
  imageUrl: "/art/starter/hay-wain.jpg",
  imageWidth: 1600,
  imageHeight: 1103,
  attribution: "Image: Wikimedia Commons, public domain",
  sourceUrl: "https://www.wikidata.org/wiki/Q2366825",
  description:
    "A horse-drawn hay cart crosses the River Stour near Flatford Mill in Suffolk, the countryside Constable grew up in. The cottage on the left belonged to a local farmer, Willy Lott. Little noticed when first shown in London, the painting won a gold medal at the Paris Salon of 1824.",
  descriptionCredit: "Written for Salon",
};

const fightingTemeraire: Artwork = {
  id: "wikidata-Q257580",
  source: "wikidata",
  sourceId: "Q257580",
  title: "The Fighting Temeraire",
  artist: "J. M. W. Turner",
  artistMeta: { nationality: "English", lifeDates: "1775–1851" },
  dateText: "1839",
  medium: "Oil on canvas",
  dimensionsText: "90.7 × 121.6 cm",
  widthCm: 121.6,
  heightCm: 90.7,
  holder: "The National Gallery, London",
  imageUrl: "/art/starter/fighting-temeraire.jpg",
  imageWidth: 1600,
  imageHeight: 1188,
  attribution: "Image: Wikimedia Commons, public domain",
  sourceUrl: "https://www.wikidata.org/wiki/Q257580",
  description:
    "The warship Temeraire, which fought at the Battle of Trafalgar in 1805, is towed up the Thames by a small steam tug to be broken up. Turner sets the pale old sailing ship against a blazing sunset, a farewell to the age of sail. He called it his 'darling' and would not sell it.",
  descriptionCredit: "Written for Salon",
};

const wanderer: Artwork = {
  id: "wikidata-Q311243",
  source: "wikidata",
  sourceId: "Q311243",
  title: "Wanderer above the Sea of Fog",
  artist: "Caspar David Friedrich",
  artistMeta: { nationality: "German", lifeDates: "1774–1840" },
  dateText: "c. 1818",
  medium: "Oil on canvas",
  dimensionsText: "94.8 × 74.8 cm",
  widthCm: 74.8,
  heightCm: 94.8,
  holder: "Hamburger Kunsthalle, Hamburg",
  imageUrl: "/art/starter/wanderer.jpg",
  imageWidth: 1256,
  imageHeight: 1600,
  attribution: "Image: Wikimedia Commons, public domain",
  sourceUrl: "https://www.wikidata.org/wiki/Q311243",
  description:
    "A man in a dark coat stands on a rocky outcrop with his back to us, looking out over a sea of fog and distant peaks. Because we see the view over his shoulder, we share his place. It has become an emblem of German Romanticism and its feeling for the vastness of nature.",
  descriptionCredit: "Written for Salon",
};

const ornate = { style: "ornate-gilt", width: "standard" } as const;
const simpleGilt = { style: "simple-gilt", width: "standard" } as const;
const oak = { style: "natural-oak", width: "slim" } as const;

/** Museum hanging height: the centre of most paintings sits around 1.6 m. */
const EYE_LINE = 1.6;

/** Room shells shared by the starter rooms: 12 × 9 m, 5 m ceilings. */
const SHELL = { width: 12, depth: 9, height: 5 } as const;
const COMMON_THEME = {
  trimColor: "#efe7d4",
  ceilingColor: "#e9e0cc",
  floor: "oak-planks",
  ceiling: "skylight",
  bench: "leather",
} as const;

/*
 * Rooms are joined by doorways in the middle of their north and south walls
 * (see layout.ts), so works on those walls hang either side of the centre.
 */

const portraits: Room = {
  id: "room-1",
  slug: "portraits-and-figures",
  number: 1,
  name: "Portraits & Figures",
  intro: "Faces that have looked back at visitors for centuries.",
  ...SHELL,
  theme: { ...COMMON_THEME, wallColor: "#5e1d20", lowerWallColor: "#3a1214" },
  placements: [
    // Left as you walk in: the Mona Lisa on her own, as at the Louvre.
    {
      id: "p2",
      artwork: monaLisa,
      wall: "west",
      x: 0,
      y: EYE_LINE,
      frame: ornate,
      showLabel: true,
    },
    // Far wall: two Dutch portraits either side of the doorway to Room 2.
    {
      id: "p3",
      artwork: laughingCavalier,
      wall: "north",
      x: -3.4,
      y: EYE_LINE,
      frame: ornate,
      showLabel: true,
    },
    {
      id: "p4",
      artwork: girlWithAPearlEarring,
      wall: "north",
      x: 3.4,
      y: EYE_LINE,
      frame: simpleGilt,
      showLabel: true,
    },
    // Right: the largest work, alone.
    { id: "p1", artwork: madameX, wall: "east", x: 0, y: 2.25, frame: ornate, showLabel: true },
    // Behind you as you come in.
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

const landscapes: Room = {
  id: "room-2",
  slug: "landscapes-and-the-sea",
  number: 2,
  name: "Landscapes & the Sea",
  intro: "Skies, water and weather, from Suffolk to Mount Fuji.",
  ...SHELL,
  theme: { ...COMMON_THEME, wallColor: "#213a2c", lowerWallColor: "#142219" },
  placements: [
    { id: "p6", artwork: hayWain, wall: "west", x: 0, y: 1.85, frame: ornate, showLabel: true },
    {
      id: "p7",
      artwork: wanderer,
      wall: "north",
      x: -3.4,
      y: 1.7,
      frame: simpleGilt,
      showLabel: true,
    },
    {
      id: "p8",
      artwork: waterLilies,
      wall: "north",
      x: 3.4,
      y: 1.7,
      frame: simpleGilt,
      showLabel: true,
    },
    {
      id: "p9",
      artwork: fightingTemeraire,
      wall: "east",
      x: -2.1,
      y: 1.7,
      frame: ornate,
      showLabel: true,
    },
    {
      id: "p10",
      artwork: starryNight,
      wall: "east",
      x: 2.1,
      y: 1.7,
      frame: simpleGilt,
      showLabel: true,
    },
    {
      id: "p11",
      artwork: greatWave,
      wall: "south",
      x: 3.4,
      y: EYE_LINE,
      frame: oak,
      showLabel: true,
    },
  ],
};

const yourPicks: Room = {
  id: "room-3",
  slug: "your-picks",
  number: 3,
  name: "Your Picks",
  intro:
    "An empty room for works you choose: famous pieces or artists you'd like more people to know.",
  ...SHELL,
  theme: { ...COMMON_THEME, wallColor: "#1d3145", lowerWallColor: "#111e2b" },
  placements: [],
};

export const starterCollection: Collection = {
  username: "demo",
  collectionName: "The Starter Collection",
  rooms: [portraits, landscapes, yourPicks],
};
