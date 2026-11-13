import type { Collection } from "./types";

/** URL of a room: the first room is the gallery's own address. */
export function roomPath(basePath: string, collection: Collection, roomId: string) {
  const index = collection.rooms.findIndex((r) => r.id === roomId);
  return index <= 0 ? basePath : `${basePath}/${collection.rooms[index].slug}`;
}
