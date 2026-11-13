"use client";

import { useProgress } from "@react-three/drei";
import type { Room } from "@/lib/gallery/types";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";
import GalleryScene from "@/components/three/GalleryScene";

/**
 * The walkable gallery page: the 3D scene full-screen, with a slim top bar
 * and an "enter" card floating over it.
 */
export function GalleryExperience({ room }: { room: Room }) {
  const walking = useGalleryStore((s) => s.walking);
  const startWalking = useGalleryStore((s) => s.startWalking);

  return (
    <main className="bg-ink relative h-dvh w-full overflow-hidden">
      <GalleryScene room={room} />

      <header className="from-ink/80 pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b to-transparent px-4 py-3 sm:px-6">
        <span className="text-cream font-serif text-2xl tracking-wide">Salon</span>
        <span className="text-cream/70 text-xs tracking-widest uppercase">
          Room {room.number} · {room.name}
        </span>
      </header>

      <LoadingIndicator />

      {!walking && (
        <div className="absolute inset-0 z-20 flex items-end justify-center p-4 pb-10 sm:items-center sm:pb-4">
          <div className="bg-cream/95 text-ink max-w-sm rounded-sm p-6 shadow-2xl">
            <p className="text-ink/60 text-xs tracking-widest uppercase">Room {room.number}</p>
            <h1 className="mt-1 font-serif text-3xl leading-tight italic">{room.name}</h1>
            <p className="text-ink/80 mt-2 text-sm">{room.intro}</p>
            <button
              type="button"
              onClick={startWalking}
              className="bg-ink text-cream hover:bg-oxblood focus-visible:ring-gilt mt-5 w-full rounded-sm px-4 py-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:outline-none"
            >
              Walk in
            </button>
            <p className="text-ink/60 mt-4 text-xs leading-relaxed">
              Move with <Kbd>W</Kbd> <Kbd>A</Kbd> <Kbd>S</Kbd> <Kbd>D</Kbd> or the arrow keys, look
              with the mouse, hold <Kbd>Shift</Kbd> to walk faster. <Kbd>Esc</Kbd> to stop.
              <span className="mt-2 block">
                Touch controls for phones arrive in the next phase.
              </span>
            </p>
          </div>
        </div>
      )}

      {walking && (
        // A tiny dot in the middle so you know where you're looking.
        <div className="bg-cream/70 pointer-events-none absolute top-1/2 left-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      )}

      {/* Screen-reader summary of what's on the walls until the full 2D view (Phase 4). */}
      <section className="sr-only">
        <h2>Works in this room</h2>
        <ul>
          {room.placements.map((p) => (
            <li key={p.id}>
              {p.artwork.title}, {p.artwork.artist}, {p.artwork.dateText}. {p.artwork.medium}.{" "}
              {p.artwork.holder}.
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border-ink/20 rounded-sm border bg-white/60 px-1 font-sans text-[0.7rem]">
      {children}
    </kbd>
  );
}

function LoadingIndicator() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="text-cream/70 pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 text-xs tracking-widest uppercase">
      Hanging the paintings… {Math.round(progress)}%
    </div>
  );
}
