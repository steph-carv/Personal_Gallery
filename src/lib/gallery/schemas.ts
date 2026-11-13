import { z } from "zod";

/**
 * Shapes for data people type in or that's stored as JSON, checked with Zod
 * at the edges (forms, database rows), so the rest of the app can trust it.
 */

/** Same rule as the database: 3–30 of a–z, 0–9 and single hyphens. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters.")
  .max(30, "At most 30 characters.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letters, numbers and single hyphens (not at the ends).")
  .refine((name) => !RESERVED_USERNAMES.has(name), "That name is reserved. Try another.");

/** Mirrors the list in the database migration. */
export const RESERVED_USERNAMES = new Set([
  "demo",
  "admin",
  "api",
  "login",
  "logout",
  "welcome",
  "settings",
  "auth",
  "add",
  "saved",
  "following",
  "explore",
  "about",
  "help",
  "salon",
  "g",
]);

export const collectionNameSchema = z
  .string()
  .trim()
  .min(1, "Give your collection a name.")
  .max(80, "At most 80 characters.");

const hexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/**
 * A room's look (HANDOVER.md §7), stored in rooms.theme. Versioned, and every
 * field falls back to a default, so old rooms keep working as options are
 * added and a bad value can't break the 3D scene.
 */
export const roomThemeSchema = z.object({
  version: z.literal(1).catch(1),
  wallColor: hexColour.catch("#5e1d20"),
  lowerWallColor: hexColour.catch("#3a1214"),
  trimColor: hexColour.catch("#efe7d4"),
  ceilingColor: hexColour.catch("#e9e0cc"),
  floor: z.enum(["oak-planks"]).catch("oak-planks"),
  ceiling: z.enum(["skylight"]).catch("skylight"),
  bench: z.enum(["leather", "none"]).catch("leather"),
});

/** A placement's frame (§7), stored in placements.frame. */
export const frameSchema = z.object({
  version: z.literal(1).catch(1),
  style: z
    .enum(["ornate-gilt", "simple-gilt", "ebony", "natural-oak", "silver", "float", "none"])
    .catch("simple-gilt"),
  width: z.enum(["slim", "standard", "wide"]).catch("standard"),
});
