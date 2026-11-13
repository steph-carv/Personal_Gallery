import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GalleryExperience, type GalleryViewer } from "@/components/gallery/GalleryExperience";
import { GalleryStoreReset } from "@/components/gallery/GalleryStoreReset";
import { RouteSync } from "@/components/gallery/RouteSync";
import { getViewer } from "@/lib/auth";
import { DEMO_USERNAME, getCollection } from "@/lib/data/collections";

/**
 * A gallery: /g/[username], /g/[username]/[roomSlug] and
 * /g/[username]/work/[placementId] all share this layout, so the 3D scene
 * stays mounted while the URL changes between rooms and paintings.
 */

// The demo gallery is built ahead of time; everyone else's on request.
export function generateStaticParams() {
  return [{ username: DEMO_USERNAME }];
}

export default function GalleryLayout({ children, params }: LayoutProps<"/g/[username]">) {
  return (
    // Reading the username and the session is request data: it waits inside <Suspense>.
    <Suspense fallback={<OpeningGallery />}>
      <Gallery params={params} />
      {children}
    </Suspense>
  );
}

async function Gallery({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [collection, viewer] = await Promise.all([getCollection(username), getViewer()]);
  // Missing, or private and not yours: the database returned nothing either
  // way, and we don't say which.
  if (!collection) notFound();

  const basePath = `/g/${collection.username}`;
  const galleryViewer: GalleryViewer | null = viewer
    ? { username: viewer.username, isOwner: viewer.id === collection.ownerId }
    : null;
  return (
    <>
      <GalleryStoreReset galleryKey={collection.username} />
      <GalleryExperience collection={collection} basePath={basePath} viewer={galleryViewer} />
      <RouteSync collection={collection} basePath={basePath} />
    </>
  );
}

function OpeningGallery() {
  return (
    <main className="bg-ink text-cream/60 grid h-dvh place-items-center text-xs tracking-widest uppercase">
      Opening the gallery…
    </main>
  );
}
