import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getViewer, homeFor } from "@/lib/auth";

/**
 * The home page. Signed in: straight to your gallery (or the welcome step).
 * Otherwise a short introduction with the way in.
 */
export default function Home() {
  return (
    <main className="bg-ink text-cream grid min-h-dvh place-items-center px-4 py-12">
      <Suspense fallback={null}>
        <SendSignedInVisitorsHome />
      </Suspense>
      <div className="max-w-lg text-center">
        <p className="font-serif text-4xl font-semibold tracking-[0.22em]">SALON</p>
        <h1 className="mt-6 font-serif text-5xl leading-tight italic">
          A museum you curate yourself
        </h1>
        <p className="text-cream/75 mt-4">
          Walk through your own gallery, hang works from the world&apos;s open museum collections,
          and step closer to read about each one.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/g/demo"
            className="bg-gilt text-ink focus-visible:outline-cream inline-flex min-h-11 items-center rounded-sm px-5 text-sm font-semibold transition hover:bg-[#e6c47a] focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Walk the demo gallery
          </Link>
          <Link
            href="/login"
            className="border-cream/30 hover:border-cream focus-visible:outline-gilt inline-flex min-h-11 items-center rounded-sm border px-5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

async function SendSignedInVisitorsHome() {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer));
  return null;
}
