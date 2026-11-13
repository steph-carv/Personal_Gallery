import HelloScene from "@/components/three/HelloScene";
import { APP_MODE } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/env";

export default function Home() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <HelloScene />

      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <span className="text-cream font-serif text-3xl tracking-wide">Salon</span>
        <span className="border-gilt/40 text-gilt rounded-full border px-3 py-1 text-xs tracking-widest uppercase">
          Phase 1 · Scaffold
        </span>
      </header>

      <section className="pointer-events-none relative z-10 mt-auto px-4 pb-10 sm:px-8">
        <div className="bg-cream/95 text-ink max-w-md rounded-sm p-6 shadow-2xl">
          <p className="text-ink/60 text-xs tracking-widest uppercase">
            Room 0 · Under construction
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight italic">
            A museum you curate yourself
          </h1>
          <p className="text-ink/80 mt-3 text-sm leading-relaxed">
            The walls are up and the first frame is hung. Rooms, paintings and your own collection
            arrive in the next phases.
          </p>
          <dl className="border-ink/15 mt-5 grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-4 text-xs">
            <dt className="text-ink/60">App mode</dt>
            <dd className="font-medium">{APP_MODE}</dd>
            <dt className="text-ink/60">Supabase</dt>
            <dd className="font-medium">{supabaseReady ? "configured" : "not configured yet"}</dd>
            <dt className="text-ink/60">3D</dt>
            <dd className="font-medium">three.js · React Three Fiber</dd>
          </dl>
        </div>
      </section>
    </main>
  );
}
