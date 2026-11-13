import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GalleryExperience } from "@/components/gallery/GalleryExperience";
import { RouteSync } from "@/components/gallery/RouteSync";
import { getCollection, knownUsernames } from "@/lib/gallery/collections";

/**
 * A user's gallery: /g/[username], /g/[username]/[roomSlug] and
 * /g/[username]/work/[placementId] all share this layout, so the 3D scene
 * stays mounted while the URL changes between rooms and paintings.
 */

export function generateStaticParams() {
  return knownUsernames().map((username) => ({ username }));
}

export default function GalleryLayout({ children, params }: LayoutProps<"/g/[username]">) {
  return (
    // Reading the username is request data, so it waits inside <Suspense>.
    <Suspense fallback={<OpeningGallery />}>
      <Gallery params={params} />
      {children}
    </Suspense>
  );
}

async function Gallery({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const collection = getCollection(username);
  if (!collection) notFound();
  const basePath = `/g/${username}`;
  return (
    <>
      <GalleryExperience collection={collection} basePath={basePath} />
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
