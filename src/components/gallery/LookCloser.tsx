"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 6;

interface LookCloserProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  onClose: () => void;
}

/**
 * Full-screen zoomable view of a painting: scroll or pinch to zoom, drag to
 * pan, double-click (or double-tap) to jump in or out, Esc to close.
 *
 * A simple version of "deep zoom". Once works come from sources with very
 * large IIIF images (Phase 6), this can switch to OpenSeadragon, which loads
 * tiles as you zoom instead of one big image.
 */
export function LookCloser({ src, alt, width, height, onClose }: LookCloserProps) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const container = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  // Latest scale, for the wheel listener (which is attached once).
  const scale = useRef(view.scale);
  useEffect(() => {
    scale.current = view.scale;
  }, [view.scale]);

  /** Zoom to `scale`, keeping the point under (cx, cy) where it is. */
  const zoomAt = useCallback((scale: number, cx: number, cy: number) => {
    setView((v) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      if (next === MIN_SCALE) return { scale: 1, x: 0, y: 0 };
      const rect = container.current!.getBoundingClientRect();
      // Point relative to the centre of the screen, where the image is anchored.
      const px = cx - rect.left - rect.width / 2;
      const py = cy - rect.top - rect.height / 2;
      const k = next / v.scale;
      return { scale: next, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, []);

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    // Capture phase, so Esc closes this before it reaches the detail view.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const el = container.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(scale.current * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(
        pinch.current.scale * (distance / pinch.current.distance),
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
      );
      return;
    }
    // One finger or the mouse: pan, if zoomed in.
    setView((v) =>
      v.scale === 1
        ? v
        : { ...v, x: v.x + e.clientX - previous.x, y: v.y + e.clientY - previous.y },
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Looking closer at ${alt}`}
      className="bg-ink fixed inset-0 z-50"
    >
      <div
        ref={container}
        className="absolute inset-0 touch-none overflow-hidden select-none"
        style={{ cursor: view.scale > 1 ? "grab" : "zoom-in" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => zoomAt(view.scale > 1 ? 1 : 2.5, e.clientX, e.clientY)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- full-resolution image, transformed by hand */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          draggable={false}
          className="absolute top-1/2 left-1/2 max-h-[92vh] max-w-[94vw] object-contain"
          style={{
            transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px)) scale(${view.scale})`,
          }}
        />
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <ViewerButton
          label="Zoom out"
          onClick={() => zoomAt(view.scale / 1.6, innerWidth / 2, innerHeight / 2)}
        >
          −
        </ViewerButton>
        <ViewerButton
          label="Zoom in"
          onClick={() => zoomAt(view.scale * 1.6, innerWidth / 2, innerHeight / 2)}
        >
          +
        </ViewerButton>
        <ViewerButton label="Close" onClick={onClose} buttonRef={closeButton}>
          ✕
        </ViewerButton>
      </div>
      <p className="text-cream/60 pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs tracking-wide">
        Scroll or pinch to zoom · drag to move · double-click to jump in
      </p>
    </div>
  );
}

function ViewerButton({
  label,
  onClick,
  children,
  buttonRef,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      onClick={onClick}
      className="bg-cream/10 text-cream hover:bg-cream/20 focus-visible:outline-gilt grid h-10 w-10 place-items-center rounded-full text-lg backdrop-blur transition focus-visible:outline-2"
    >
      {children}
    </button>
  );
}
