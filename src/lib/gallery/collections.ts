import { starterCollection } from "./starterCollection";
import type { Collection } from "./types";

/**
 * Look up a user's collection by username. Until Phase 5 adds accounts and
 * the database, the only gallery is the starter collection at /g/demo.
 */
export function getCollection(username: string): Collection | null {
  return username === starterCollection.username ? starterCollection : null;
}

/** Usernames to prebuild at deploy time. */
export function knownUsernames(): string[] {
  return [starterCollection.username];
}

/** URL of a room: the first room is the gallery's own address. */
export function roomPath(basePath: string, collection: Collection, roomId: string) {
  const index = collection.rooms.findIndex((r) => r.id === roomId);
  return index <= 0 ? basePath : `${basePath}/${collection.rooms[index].slug}`;
}
