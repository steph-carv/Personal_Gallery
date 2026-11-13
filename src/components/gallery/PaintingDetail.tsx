"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Placement, Room } from "@/lib/gallery/types";
import { LookCloser } from "./LookCloser";

const SOURCE_NAMES: Record<string, string> = {
  met: "The Met Collection API",
  aic: "the Art Institute of Chicago API",
  wikidata: "Wikidata",
  rijks: "the Rijksmuseum API",
  smithsonian: "Smithsonian Open Access",
  cleveland: "the Cleveland Museum of Art API",
  europeana: "Europeana",
};

interface PaintingDetailProps {
  room: Room;
  placement: Placement;
  /** 1-based position on the tour, and the number of works in the room. */
  index: number;
  total: number;
  /** Shown once the camera has arrived in front of the painting. */
  visible: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

/**
 * "Stepping closer": the 2D detail overlay (HANDOVER.md §2.2). The painting
 * large on the left in its frame, the cream catalogue card on the right, the
 * 3D room dimmed behind.
 */
export function PaintingDetail({
  room,
  placement,
  index,
  total,
  visible,
  onPrevious,
  onNext,
  onClose,
}: PaintingDetailProps) {
  const { artwork } = placement;
  const heading = useRef<HTMLHeadingElement>(null);
  const [lookingCloser, setLookingCloser] = useState(false);

  // Move keyboard and screen-reader focus to the title when a painting opens.
  useEffect(() => {
    if (visible) heading.current?.focus({ preventScroll: true });
  }, [visible, placement.id]);

  const meta = [artwork.artistMeta.nationality, artwork.artistMeta.lifeDates]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="painting-title"
      className={`bg-ink/75 fixed inset-0 z-30 overflow-y-auto backdrop-blur-[2px] transition-opacity duration-500 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="mx-auto grid min-h-full max-w-7xl gap-6 p-4 pt-16 sm:p-8 sm:pt-20 lg:grid-cols-[3fr_2fr] lg:items-center lg:gap-12">
        {/* Left: the painting */}
        <figure className="flex flex-col items-center gap-5">
          <button
            type="button"
            onClick={() => setLookingCloser(true)}
            className="group focus-visible:outline-gilt relative block cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-4"
            aria-label={`Look closer at ${artwork.title}`}
          >
            <GiltFrame>
              <Image
                key={artwork.id}
                src={artwork.imageUrl}
                alt={`${artwork.title} by ${artwork.artist}`}
                width={artwork.imageWidth}
                height={artwork.imageHeight}
                sizes="(min-width: 1024px) 55vw, 90vw"
                priority
                className="block h-auto max-h-[46vh] w-auto max-w-full lg:max-h-[64vh]"
              />
            </GiltFrame>
          </button>
          <figcaption className="sr-only">
            {artwork.title}, {artwork.artist}
          </figcaption>
          <nav aria-label="Previous and next painting" className="flex items-center gap-2 text-sm">
            <DetailButton onClick={onPrevious} label="Previous painting">
              ← Previous
            </DetailButton>
            <DetailButton onClick={() => setLookingCloser(true)}>Look closer</DetailButton>
            <DetailButton onClick={onNext} label="Next painting">
              Next →
            </DetailButton>
          </nav>
        </figure>

        {/* Right: the catalogue card */}
        <article className="bg-cream text-ink rounded-sm p-6 shadow-2xl sm:p-8">
          <p className="text-ink/60 text-xs tracking-widest uppercase">
            Room {room.number} · {room.name} · {index} of {total}
          </p>
          <h2
            id="painting-title"
            ref={heading}
            tabIndex={-1}
            className="mt-3 font-serif text-4xl leading-tight italic outline-none sm:text-5xl"
          >
            {artwork.title}
          </h2>
          <p className="mt-3 text-lg font-medium">{artwork.artist}</p>
          {meta && <p className="text-ink/70 text-sm">{meta}</p>}

          <dl className="border-ink/15 mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y py-4 text-sm">
            <Fact term="Date">{artwork.dateText}</Fact>
            <Fact term="Medium">{artwork.medium}</Fact>
            <Fact term="Dimensions">{artwork.dimensionsText}</Fact>
            <Fact term="Held by">{artwork.holder}</Fact>
          </dl>

          {artwork.description && (
            <section className="mt-6">
              <h3 className="font-serif text-xl">About the work</h3>
              <p className="text-ink/85 mt-2 text-sm leading-relaxed">{artwork.description}</p>
              {artwork.descriptionCredit && (
                <p className="text-ink/70 mt-1 text-xs">{artwork.descriptionCredit}</p>
              )}
            </section>
          )}

          {placement.personalNote && (
            <section className="mt-6">
              <h3 className="font-serif text-xl">Why it&apos;s in my collection</h3>
              <p className="text-ink/85 mt-2 text-sm leading-relaxed">{placement.personalNote}</p>
            </section>
          )}

          <div className="text-ink/70 mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span className="border-ink/20 rounded-full border px-3 py-1">
              Filled in automatically from {SOURCE_NAMES[artwork.source] ?? artwork.source}
            </span>
            <a
              href={artwork.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="decoration-ink/30 hover:decoration-ink underline underline-offset-2"
            >
              {artwork.attribution} ↗
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-ink text-cream hover:bg-oxblood focus-visible:outline-gilt mt-8 w-full rounded-sm px-4 py-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Back to the room <span className="text-cream/50">(Esc)</span>
          </button>
        </article>
      </div>

      {lookingCloser && (
        <LookCloser
          src={artwork.imageUrl}
          alt={`${artwork.title} by ${artwork.artist}`}
          width={artwork.imageWidth}
          height={artwork.imageHeight}
          onClose={() => setLookingCloser(false)}
        />
      )}
    </div>
  );
}

/** A CSS gilt frame for the 2D view, echoing the 3D frames. */
function GiltFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-[clamp(10px,2vmin,22px)] shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
      style={{
        background:
          "linear-gradient(135deg, #7d5e22 0%, #e4c271 22%, #a8803a 45%, #f1d68e 68%, #8a6a2a 100%)",
      }}
    >
      <div className="p-[3px] shadow-[inset_0_0_0_1px_rgba(255,240,200,0.5),inset_0_0_12px_rgba(40,25,5,0.8)]">
        {children}
      </div>
    </div>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-ink/60">{term}</dt>
      <dd>{children}</dd>
    </>
  );
}

function DetailButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="border-cream/30 text-cream/90 hover:border-cream hover:text-cream focus-visible:outline-gilt rounded-full border px-4 py-2 transition focus-visible:outline-2"
    >
      {children}
    </button>
  );
}
