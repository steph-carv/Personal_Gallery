import { env } from "./env";

/**
 * APP_MODE switches Salon between a private, allowlisted personal project and
 * a public platform (HANDOVER.md §0b).
 *
 * - `personal` (default): allowlisted sign-up, museum-sourced uploads allowed.
 * - `public`: open sign-up plus the staged upload and moderation rules. Only
 *   switch to this after working through the "Before going public" checklist.
 *
 * Anything that *enforces* a rule must also check the mode on the server or in
 * the database. This value is public, so the browser can read it too, which is
 * only for deciding what to show.
 */
export type AppMode = "personal" | "public";

export const APP_MODE: AppMode = env.NEXT_PUBLIC_APP_MODE;

export const isPersonalMode = APP_MODE === "personal";
export const isPublicMode = APP_MODE === "public";
