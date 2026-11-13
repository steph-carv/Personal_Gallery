"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import GalleryScene from "@/components/three/GalleryScene";
import { tourOrder } from "@/lib/gallery/tour";
import type { Room } from "@/lib/gallery/types";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { PaintingDetail } from "./PaintingDetail";

/**
 * The walkable gallery page: the 3D scene full-screen, with the 2D interface
 * floating over it: top bar, welcome card, tour bar, and the detail view.
 *
 * Keyboard: WASD / arrows walk (handled by the camera rig), Q / E previous
 * and next painting, Enter steps closer, Esc goes back.
 */
export function GalleryExperience({ room }: { room: Room }) {
  const placements = useMemo(() => tourOrder(room.placements), [room.placements]);
  const detailId = useGalleryStore((s) => s.detailId);
  const detailReady = useGalleryStore((s) => s.detailReady);
  const mouseLook = useGalleryStore((s) => s.mouseLook);
  const hoveredId = useGalleryStore((s) => s.hoveredId);
  const cuts = useGalleryStore((s) => s.cuts);

  const detailIndex = placements.findIndex((p) => p.id === detailId);
  const detail = detailIndex >= 0 ? placements[detailIndex] : null;

  const stepDetail = (direction: 1 | -1) => {
    const next = placements[(detailIndex + direction + placements.length) % placements.length];
    useGalleryStore.getState().openDetail(next.id, { replace: true });
  };

  useKeyboardShortcuts(placements.map((p) => p.id));

  return (
    <main className="bg-ink relative h-dvh w-full overflow-hidden">
      <GalleryScene room={room} />

      {/* With reduced motion the camera cuts instead of gliding; soften each cut. */}
      {cuts > 0 && (
        <div
          key={cuts}
          aria-hidden
          className="bg-ink pointer-events-none absolute inset-0 z-10 animate-[cut-fade_400ms_ease-out_forwards]"
        />
      )}

      <header className="from-ink/80 pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b to-transparent px-4 py-3 sm:px-6">
        <span className="text-cream font-serif text-2xl tracking-wide">Salon</span>
        <span className="text-cream/70 text-xs tracking-widest uppercase">
          Room {room.number} · {room.name}
        </span>
      </header>

      <PaintingList placements={placements} />
      <LoadingIndicator />
      <Notice />

      {!detail && (
        <>
          <IntroCard room={room} />
          <TourBar placements={placements} />
        </>
      )}

      {mouseLook && !detail && (
        // Crosshair: grows into a ring when it's over a painting.
        <div
          aria-hidden
          className={`pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ${
            hoveredId ? "border-cream/80 h-6 w-6 border-2" : "bg-cream/70 h-1.5 w-1.5"
          }`}
        />
      )}

      {detail && (
        <PaintingDetail
          room={room}
          placement={detail}
          index={detailIndex + 1}
          total={placements.length}
          visible={detailReady}
          onPrevious={() => stepDetail(-1)}
          onNext={() => stepDetail(1)}
          onClose={() => useGalleryStore.getState().closeDetail()}
        />
      )}
    </main>
  );
}

/** Q / E for previous and next, Enter to step closer, Esc to go back. */
function useKeyboardShortcuts(order: string[]) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)
        return;
      const state = useGalleryStore.getState();
      const inDetail = Boolean(state.detailId);

      if (e.code === "KeyQ" || e.code === "KeyE") {
        const direction = e.code === "KeyE" ? 1 : -1;
        if (inDetail) {
          const index = order.indexOf(state.detailId!);
          state.openDetail(order[(index + direction + order.length) % order.length], {
            replace: true,
          });
        } else {
          state.camera.tourStep(direction);
        }
      } else if (e.key === "Escape" && inDetail) {
        state.closeDetail();
      } else if (e.key === "Enter" && !inDetail && state.focusedId) {
        // Leave Enter alone on buttons and links: it activates them.
        if (target.closest("button, a")) return;
        state.openDetail(state.focusedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order]);
}

function IntroCard({ room }: { room: Room }) {
  const dismissed = useGalleryStore((s) => s.introDismissed);
  const touch = useMediaQuery("(pointer: coarse)");
  if (dismissed) return null;

  const start = () => useGalleryStore.getState().camera.tourStart();
  const dismiss = () => useGalleryStore.setState({ introDismissed: true });

  return (
    // The wrapper lets clicks through, so you can start exploring straight away.
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center p-4 pb-28 sm:items-center sm:pb-4">
      <div className="bg-cream/95 text-ink pointer-events-auto max-w-sm rounded-sm p-6 shadow-2xl">
        <p className="text-ink/60 text-xs tracking-widest uppercase">Room {room.number}</p>
        <h1 className="mt-1 font-serif text-3xl leading-tight italic">{room.name}</h1>
        <p className="text-ink/80 mt-2 text-sm">{room.intro}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={start}
            className="bg-ink text-cream hover:bg-oxblood focus-visible:outline-gilt flex-1 rounded-sm px-4 py-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Start the tour
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="border-ink/25 hover:border-ink focus-visible:outline-gilt flex-1 rounded-sm border px-4 py-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Look around
          </button>
        </div>
        <p className="text-ink/65 mt-4 text-xs leading-relaxed">
          {touch ? (
            <>Drag to look around, tap the floor to walk there, tap a painting to step closer.</>
          ) : (
            <>
              Drag to look, click the floor to walk there, click a painting to step closer.{" "}
              <Kbd>W</Kbd>
              <Kbd>A</Kbd>
              <Kbd>S</Kbd>
              <Kbd>D</Kbd> or arrows to walk, <Kbd>Q</Kbd> <Kbd>E</Kbd> for the previous and next
              painting.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/** Previous / next painting: the easiest way round the room (HANDOVER.md §2.1). */
function TourBar({ placements }: { placements: Room["placements"] }) {
  const focusedId = useGalleryStore((s) => s.focusedId);
  const mouseLook = useGalleryStore((s) => s.mouseLook);
  const finePointer = useMediaQuery("(pointer: fine)");
  const index = placements.findIndex((p) => p.id === focusedId);
  const focused = index >= 0 ? placements[index] : null;
  // Read commands when clicked: the camera rig registers them after mounting.
  const camera = () => useGalleryStore.getState().camera;
  const openDetail = (id: string) => useGalleryStore.getState().openDetail(id);

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <nav
        aria-label="Tour the room"
        className="bg-ink/80 text-cream flex items-center gap-1 rounded-full p-1 shadow-xl backdrop-blur"
      >
        <BarButton label="Previous painting (Q)" onClick={() => camera().tourStep(-1)}>
          ‹
        </BarButton>
        {focused ? (
          <button
            type="button"
            onClick={() => openDetail(focused.id)}
            className="hover:bg-cream/10 focus-visible:outline-gilt max-w-[56vw] truncate rounded-full px-4 py-2 text-sm transition focus-visible:outline-2"
          >
            <span className="text-cream/60">
              {index + 1} of {placements.length} ·{" "}
            </span>
            <span className="font-serif text-base italic">{focused.artwork.title}</span>
            <span className="text-gilt ml-2 hidden text-xs sm:inline">Step closer ↵</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => camera().tourStep(1)}
            className="hover:bg-cream/10 focus-visible:outline-gilt rounded-full px-4 py-2 text-sm transition focus-visible:outline-2"
          >
            Tour the room
          </button>
        )}
        <BarButton label="Next painting (E)" onClick={() => camera().tourStep(1)}>
          ›
        </BarButton>
      </nav>
      {finePointer && (
        <button
          type="button"
          onClick={() => camera().startMouseLook()}
          disabled={mouseLook}
          className="text-cream/60 hover:text-cream focus-visible:outline-gilt disabled:hover:text-cream/60 rounded-full px-3 py-1 text-xs transition focus-visible:outline-2"
        >
          {mouseLook ? "Mouse look on · Esc to release the mouse" : "Mouse look (first-person)"}
        </button>
      )}
    </div>
  );
}

function BarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="hover:bg-cream/10 focus-visible:outline-gilt grid h-11 w-11 place-items-center rounded-full text-2xl leading-none transition focus-visible:outline-2"
    >
      {children}
    </button>
  );
}

/**
 * Every painting as a real button, so keyboard and screen-reader users can
 * reach them with Tab. Hidden until focused; focusing one walks the camera
 * to it, Enter steps closer. The full 2D room view arrives in Phase 4.
 */
function PaintingList({ placements }: { placements: Room["placements"] }) {
  return (
    <nav
      aria-label="Paintings in this room"
      className="sr-only z-30 focus-within:not-sr-only focus-within:absolute focus-within:top-14 focus-within:left-4"
    >
      <ul className="flex flex-col gap-1">
        {placements.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onFocus={() => useGalleryStore.getState().camera.tourTo(p.id)}
              onClick={() => useGalleryStore.getState().openDetail(p.id)}
              className="bg-cream text-ink focus-visible:outline-gilt rounded-sm px-3 py-2 text-left text-sm shadow focus-visible:outline-2"
            >
              Step closer to <i>{p.artwork.title}</i> by {p.artwork.artist}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border-ink/20 mr-0.5 rounded-sm border bg-white/60 px-1 font-sans text-[0.7rem]">
      {children}
    </kbd>
  );
}

/** Brief message at the top of the screen; clears itself after a few seconds. */
function Notice() {
  const notice = useGalleryStore((s) => s.notice);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => useGalleryStore.setState({ notice: null }), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  if (!notice) return null;
  return (
    <p
      role="status"
      className="bg-cream text-ink absolute top-14 left-1/2 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-sm whitespace-nowrap shadow-xl"
    >
      {notice}
    </p>
  );
}

function LoadingIndicator() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="text-cream/70 pointer-events-none absolute top-14 left-1/2 z-30 -translate-x-1/2 text-xs tracking-widest whitespace-nowrap uppercase">
      Hanging the paintings… {Math.round(progress)}%
    </div>
  );
}
