"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";

/**
 * Connects the detail view to the URL, so every painting has a link of its
 * own (/work/[placementId]) and the browser's back button closes it.
 *
 * - Reads the placement id from the URL into the store.
 * - Registers openDetail / closeDetail, which change the URL. They update
 *   the store straight away too, so the camera starts moving without waiting
 *   for the navigation to finish.
 *
 * It reads route params, so it's rendered inside <Suspense> (see the layout).
 */
export function DetailRouteSync({
  basePath,
  placementIds,
}: {
  basePath: string;
  /** Ids of the works hanging in this room. */
  placementIds: string[];
}) {
  const params = useParams<{ placementId?: string }>();
  const router = useRouter();
  const placementId = params.placementId ?? null;
  /** True if we opened the detail ourselves, so "back" can use history. */
  const openedFromRoom = useRef(false);

  useEffect(() => {
    if (placementId && !placementIds.includes(placementId)) {
      // An old or mistyped link: go back to the room and say why.
      useGalleryStore.setState({
        detailId: null,
        notice: "That painting isn't hanging here any more.",
      });
      router.replace(basePath || "/", { scroll: false });
      return;
    }
    useGalleryStore.setState({ detailId: placementId });
    if (!placementId) openedFromRoom.current = false;
  }, [placementId, placementIds, router, basePath]);

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
        if (openedFromRoom.current) router.back();
        else router.replace(basePath || "/", { scroll: false });
        openedFromRoom.current = false;
      },
    });
  }, [router, basePath]);

  return null;
}
