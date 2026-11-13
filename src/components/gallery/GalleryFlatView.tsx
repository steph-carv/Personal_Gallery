"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { roomPath } from "@/lib/gallery/collections";
import type { PlacedRoom } from "@/lib/gallery/layout";
import { tourOrder } from "@/lib/gallery/tour";
import type { Collection, Placement } from "@/lib/gallery/types";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";

/**
 * The flat 2D gallery (design mock-up, screen 1): one room at a time as a
 * salon wall: cornice, works in gilt frames with their labels, dado rail,
 * floor and bench.
 *
 * This is the accessible and low-power way in, so it holds everything the 3D
 * view does: every room (the tabs), every work and its label, and a link to
 * each painting's detail view. It's plain HTML: no WebGL, nothing animated.
 */
export function GalleryFlatView({
  collection,
  rooms,
  basePath,
}: {
  collection: Collection;
  rooms: PlacedRoom[];
  basePath: string;
}) {
  const router = useRouter();
  const currentRoomId = useGalleryStore((s) => s.currentRoomId);
  const room = rooms.find((r) => r.id === currentRoomId) ?? rooms[0];
  const works = tourOrder(room.placements);
  const next = rooms[room.index + 1];

  const goToRoom = (id: string) => {
    useGalleryStore.setState({ currentRoomId: id });
    router.push(roomPath(basePath, collection, id), { scroll: false });
    document.getElementById("flat-view")?.scrollTo({ top: 0 });
  };

  return (
    <div id="flat-view" className="absolute inset-0 overflow-y-auto pt-[60px]">
      <section
        aria-labelledby="room-title"
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0.3) 0, rgba(0,0,0,0) 200px), ${room.theme.wallColor}`,
        }}
      >
        {/* Cornice */}
        <div
          aria-hidden
          className="h-[30px] shadow-[0_6px_10px_rgba(0,0,0,0.35)]"
          style={{ background: "linear-gradient(180deg, #efe7d4 0%, #d8ccb0 55%, #b7a985 100%)" }}
        />
        <div
          aria-hidden
          className="h-2"
          style={{ background: "linear-gradient(180deg, #a8996f, #8a7c56)" }}
        />

        <div className="mx-auto flex max-w-[1320px] flex-col items-center gap-5 px-4 pt-10 sm:px-8">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-xs tracking-[0.32em] text-[#e8cf8f] uppercase">
              Room {room.number}
            </span>
            <h1
              id="room-title"
              className="text-cream font-serif text-5xl leading-none font-medium italic sm:text-[52px]"
            >
              {room.name}
            </h1>
            <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-[#e3d8c2]">{room.intro}</p>
          </div>

          <nav aria-label="Rooms" className="flex flex-wrap justify-center gap-2">
            {rooms.map((r) => {
              const active = r.id === room.id;
              return (
                <a
                  key={r.id}
                  href={roomPath(basePath, collection, r.id)}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    goToRoom(r.id);
                  }}
                  className={`focus-visible:outline-gilt inline-flex min-h-11 items-center rounded-full border px-[18px] text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    active
                      ? "border-cream bg-cream text-ink"
                      : "border-cream/40 bg-ink/35 text-cream hover:border-cream"
                  }`}
                >
                  Room {r.number} · {r.name}
                </a>
              );
            })}
          </nav>
        </div>

        {works.length > 0 ? (
          <ul className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-x-11 gap-y-7 px-4 pt-3 pb-16 sm:px-10">
            {works.map((placement, i) => (
              <FlatWork
                key={placement.id}
                placement={placement}
                basePath={basePath}
                eager={i < 3}
              />
            ))}
          </ul>
        ) : (
          <EmptyRoom />
        )}

        {next && (
          <div className="flex justify-center pb-10">
            <button
              type="button"
              onClick={() => goToRoom(next.id)}
              className="border-cream/40 text-cream hover:border-cream focus-visible:outline-gilt min-h-11 rounded-sm border px-5 text-sm transition focus-visible:outline-2"
            >
              Through the doorway: Room {next.number} · {next.name} →
            </button>
          </div>
        )}

        {/* Dado rail, lower wall, skirting */}
        <div
          aria-hidden
          className="h-3 border-t border-white/20"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0.25))",
          }}
        />
        <div aria-hidden className="h-16 bg-black/20" />
        <div aria-hidden className="h-3.5 bg-[#1a120c]" />
      </section>

      <Floor />
    </div>
  );
}

/** Display size in CSS px: roughly to scale, but never tiny or huge. */
function displaySize(placement: Placement) {
  const { artwork } = placement;
  const aspect = artwork.imageWidth / artwork.imageHeight;
  const longestCm = Math.max(artwork.widthCm, artwork.heightCm) || 80;
  const longest = Math.min(300, Math.max(150, longestCm * 2.4));
  return aspect >= 1
    ? { width: Math.round(longest), height: Math.round(longest / aspect) }
    : { width: Math.round(longest * aspect), height: Math.round(longest) };
}

function FlatWork({
  placement,
  basePath,
  eager,
}: {
  placement: Placement;
  basePath: string;
  /** Load straight away (the first row, visible without scrolling). */
  eager: boolean;
}) {
  const { artwork } = placement;
  const size = displaySize(placement);
  return (
    <li
      className="flex flex-col items-center gap-4 px-[18px] pt-10"
      // The spotlight's pool of light on the wall above the frame.
      style={{
        background:
          "radial-gradient(ellipse 75% 55% at 50% 0%, rgba(255,226,168,0.17), rgba(255,226,168,0) 72%)",
      }}
    >
      <a
        href={`${basePath}/work/${placement.id}`}
        onClick={(e) => {
          e.preventDefault();
          useGalleryStore.getState().openDetail(placement.id);
        }}
        aria-label={`Step closer to ${artwork.title} by ${artwork.artist}`}
        className="focus-visible:outline-gilt block p-3.5 shadow-[inset_0_0_0_2px_#4a3610,inset_0_0_0_7px_rgba(60,40,10,0.35),0_22px_34px_rgba(0,0,0,0.5)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{
          background:
            "linear-gradient(135deg, #7a5a1c 0%, #e6c35f 22%, #9c7428 45%, #f2d688 68%, #7f5e1f 100%)",
        }}
      >
        <Image
          src={artwork.imageUrl}
          alt=""
          width={size.width}
          height={size.height}
          sizes={`${size.width}px`}
          loading={eager ? "eager" : "lazy"}
          className="block h-auto max-w-[calc(100vw-96px)] shadow-[inset_0_0_0_2px_rgba(0,0,0,0.55)]"
          style={{ width: size.width, aspectRatio: `${size.width} / ${size.height}` }}
        />
      </a>
      {placement.showLabel && (
        <div className="w-[156px] bg-[#f6f2e9] px-2.5 py-2 leading-snug text-[#1d1a16] shadow-[0_2px_5px_rgba(0,0,0,0.35)]">
          <p className="font-serif text-[15px] font-semibold italic">{artwork.title}</p>
          <p className="text-[11px]">{artwork.artist}</p>
          <p className="text-[11px] text-[#4a443b]">{artwork.dateText}</p>
        </div>
      )}
    </li>
  );
}

function EmptyRoom() {
  return (
    <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-12 px-4 pt-6 pb-[72px] sm:px-10">
      <div aria-hidden className="border-cream/45 h-[230px] w-[180px] border-2 border-dashed" />
      <div className="flex max-w-xs flex-col items-center gap-3.5 text-center">
        <p className="text-cream font-serif text-3xl leading-tight italic">
          This room is waiting for your first piece.
        </p>
        <p className="text-sm leading-relaxed text-[#dfe6ee]">
          Find famous works, or discover lesser-known artists, and hang them here.
        </p>
        <p className="text-cream/70 text-xs">Adding works arrives in a later update.</p>
      </div>
      <div aria-hidden className="border-cream/45 h-[170px] w-[240px] border-2 border-dashed" />
    </div>
  );
}

/** Oak floor in perspective and the leather bench (decorative). */
function Floor() {
  return (
    <div className="relative h-[230px] overflow-hidden bg-[#3d2614]">
      <div
        aria-hidden
        className="absolute top-0 left-[-40%] h-[560px] w-[180%] origin-top"
        style={{
          transform: "perspective(520px) rotateX(62deg)",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0) 40%), repeating-linear-gradient(90deg, #6e4524 0 118px, #4b2e17 118px 121px, #7d5029 121px 236px, #4b2e17 236px 239px, #67401f 239px 352px, #4b2e17 352px 355px)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-[70px] left-1/2 flex w-[min(420px,80vw)] -translate-x-1/2 flex-col items-center"
      >
        <div
          className="h-[46px] w-full rounded-[10px] shadow-[0_18px_30px_rgba(0,0,0,0.55),inset_0_2px_0_rgba(255,255,255,0.08)]"
          style={{ background: "linear-gradient(180deg, #5a2f22, #3a1c14 70%, #2a130d)" }}
        />
        <div className="flex w-[90%] justify-between">
          <div className="h-9 w-3.5 bg-[#24120c]" />
          <div className="h-9 w-3.5 bg-[#24120c]" />
        </div>
      </div>
      <p className="absolute inset-x-0 bottom-[18px] text-center text-[13px] text-[#e8dcc4] [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">
        Choose any work to step closer · Use the room tabs to move between rooms
      </p>
    </div>
  );
}
