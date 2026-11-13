"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { roomPath } from "@/lib/gallery/collections";
import type { Collection } from "@/lib/gallery/types";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";

/**
 * Keeps the URL and the gallery in step, so every room and painting has a
 * link of its own and the browser's Back button works:
 *
 * - /g/[username]/work/[placementId] opens that painting's detail view;
 * - /g/[username]/[roomSlug] takes you to that room;
 * - walking into another room updates the address bar (without a page load);
 * - openDetail / closeDetail (registered here) change the URL. They update
 *   the store straight away too, so the camera moves without waiting for the
 *   navigation to finish.
 */
export function RouteSync({ collection, basePath }: { collection: Collection; basePath: string }) {
  const params = useParams<{ placementId?: string; roomSlug?: string }>();
  const router = useRouter();
  const placementId = params.placementId ?? null;
  const roomSlug = params.roomSlug ?? null;
  /** True if we opened the detail ourselves, so "back" can use history. */
  const openedFromRoom = useRef(false);

  // URL → gallery.
  useEffect(() => {
    const store = useGalleryStore.getState();
    const placements = collection.rooms.flatMap((r) => r.placements);
    if (placementId && !placements.some((p) => p.id === placementId)) {
      useGalleryStore.setState({
        detailId: null,
        notice: "That painting isn't hanging here any more.",
      });
      router.replace(basePath, { scroll: false });
      return;
    }
    const room = roomSlug ? collection.rooms.find((r) => r.slug === roomSlug) : collection.rooms[0];
    if (!room) {
      useGalleryStore.setState({ notice: "That room isn't in this gallery." });
      router.replace(basePath, { scroll: false });
      return;
    }
    useGalleryStore.setState({ detailId: placementId });
    if (!placementId) {
      openedFromRoom.current = false;
      // Only move if the URL names a different room from the one we're in
      // (when we walk into a room ourselves, the URL follows us instead).
      const here = store.currentRoomId ?? collection.rooms[0].id;
      if (room.id !== here) {
        useGalleryStore.setState({
          roomRequest: { roomId: room.id, seq: (store.roomRequest?.seq ?? 0) + 1 },
          currentRoomId: store.view === "2d" ? room.id : store.currentRoomId,
        });
      }
    }
  }, [placementId, roomSlug, collection, router, basePath]);

  // Gallery → URL: as you walk into another room, update the address bar.
  useEffect(
    () =>
      useGalleryStore.subscribe((state, prev) => {
        if (state.currentRoomId === prev.currentRoomId || !state.currentRoomId || state.detailId)
          return;
        const path = roomPath(basePath, collection, state.currentRoomId);
        if (window.location.pathname !== path) window.history.replaceState(null, "", path);
      }),
    [basePath, collection],
  );

  useEffect(() => {
    useGalleryStore.setState({
      openDetail: (id, options) => {
        useGalleryStore.setState({ detailId: id });
        const url = `${basePath}/work/${id}`;
        if (options?.replace) {
          router.replace(url, { scroll: false });
        } else {
          openedFromRoom.current = true;
          router.push(url, { scroll: false });
        }
      },
      closeDetail: () => {
        useGalleryStore.setState({ detailId: null });
        // Came from the room: go back, so history doesn't fill up. Opened
        // from a shared link: there's no room page behind us, so replace.
        if (openedFromRoom.current) {
          router.back();
        } else {
          const { currentRoomId } = useGalleryStore.getState();
          router.replace(roomPath(basePath, collection, currentRoomId ?? collection.rooms[0].id), {
            scroll: false,
          });
        }
        openedFromRoom.current = false;
      },
    });
  }, [router, basePath, collection]);

  return null;
}
