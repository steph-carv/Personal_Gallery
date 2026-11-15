"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import {
  hangFromCatalogue,
  hangFromStoreroom,
  hangSaved,
  removeFromStoreroom,
  type HangResult,
} from "@/app/add/actions";
import { CATALOGUE_SOURCES, SOURCE_LABELS, type CatalogueWork } from "@/lib/catalogue/types";

// The 3D preview pulls in three.js; load it only once a work is chosen.
const WorkPreview = dynamic(() => import("./WorkPreview"), { ssr: false });

export interface AddWorkRoom {
  id: string;
  label: string;
  wallColor: string;
  lowerWallColor: string;
  works: number;
}

/** A work already in the database (saved, or waiting in the storeroom). */
export interface ShelfItem {
  id: string;
  title: string;
  artist: string;
  dateText: string;
  holder: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
}

type Tab = "find" | "saved" | "storeroom";

/** What's selected for the preview and the Hang button. */
type Selection =
  { kind: "catalogue"; work: CatalogueWork } | { kind: "saved" | "storeroom"; item: ShelfItem };

/**
 * Add a work (HANDOVER.md §2.3, mock-up screen 3): search the museums, or
 * pick from your saved works or storeroom, preview it on the room's wall,
 * and hang it.
 */
export function AddWork({
  username,
  rooms,
  initialRoomId,
  initialTab,
  saved,
  storeroom,
}: {
  username: string;
  rooms: AddWorkRoom[];
  initialRoomId: string | undefined;
  initialTab: Tab;
  saved: ShelfItem[];
  storeroom: ShelfItem[];
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [roomId, setRoomId] = useState(initialRoomId ?? rooms[0]?.id);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [result, setResult] = useState<HangResult | null>(null);
  const [hanging, startHanging] = useTransition();
  const router = useRouter();
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];

  const hang = () => {
    if (!selection || !room) return;
    startHanging(async () => {
      const outcome =
        selection.kind === "catalogue"
          ? await hangFromCatalogue(selection.work.source, selection.work.sourceId, room.id)
          : selection.kind === "saved"
            ? await hangSaved(selection.item.id, room.id)
            : await hangFromStoreroom(selection.item.id, room.id);
      setResult(outcome);
      // Refresh the saved / storeroom lists and the room counts.
      if (outcome.ok) router.refresh();
    });
  };

  const remove = (item: ShelfItem) =>
    startHanging(async () => {
      setResult(await removeFromStoreroom(item.id));
      setSelection(null);
      router.refresh();
    });

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "find", label: "Find a work" },
    { id: "saved", label: "Saved", count: saved.length },
    { id: "storeroom", label: "Storeroom", count: storeroom.length },
  ];

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]">
      <section aria-labelledby="add-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 id="add-title" className="font-serif text-4xl italic">
              Add a work
            </h1>
            <p className="text-cream/70 mt-1 text-sm">
              Search open museum collections. Everything here is public domain or openly licensed,
              and fills in its own label.
            </p>
          </div>
          <Link href={`/g/${username}`} className="text-gilt text-sm underline underline-offset-2">
            Back to my gallery
          </Link>
        </div>

        <div
          role="tablist"
          aria-label="Where to find works"
          className="border-cream/15 mt-6 flex gap-1 border-b"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setSelection(null);
                setResult(null);
              }}
              className={`focus-visible:outline-gilt min-h-11 border-b-2 px-4 text-sm transition focus-visible:outline-2 ${
                tab === t.id
                  ? "border-gilt text-cream"
                  : "text-cream/60 hover:text-cream border-transparent"
              }`}
            >
              {t.label}
              {t.count ? <span className="text-cream/50 ml-1.5 text-xs">{t.count}</span> : null}
            </button>
          ))}
        </div>

        <div className="mt-6" role="tabpanel">
          {tab === "find" && (
            <FindTab
              selectedKey={selection?.kind === "catalogue" ? workKey(selection.work) : null}
              onSelect={(work) => {
                setSelection({ kind: "catalogue", work });
                setResult(null);
              }}
            />
          )}
          {tab === "saved" && (
            <Shelf
              items={saved}
              empty="Paintings you save from other galleries will appear here, ready to hang."
              selectedId={selection?.kind === "saved" ? selection.item.id : null}
              onSelect={(item) => {
                setSelection({ kind: "saved", item });
                setResult(null);
              }}
            />
          )}
          {tab === "storeroom" && (
            <Shelf
              items={storeroom}
              empty="Your storeroom is empty. Works from deleted rooms, or rooms with full walls, wait here."
              selectedId={selection?.kind === "storeroom" ? selection.item.id : null}
              onSelect={(item) => {
                setSelection({ kind: "storeroom", item });
                setResult(null);
              }}
              onRemove={remove}
            />
          )}
        </div>
      </section>

      <HangPanel
        rooms={rooms}
        room={room}
        onRoomChange={setRoomId}
        selection={selection}
        hanging={hanging}
        onHang={hang}
        result={result}
      />
    </div>
  );
}

const workKey = (w: CatalogueWork) => `${w.source}:${w.sourceId}`;

function FindTab({
  selectedKey,
  onSelect,
}: {
  selectedKey: string | null;
  onSelect: (work: CatalogueWork) => void;
}) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "done"; results: CatalogueWork[]; failed: string[]; query: string }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const ids = { query: useId(), source: useId() };

  const search = async (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setState({ status: "loading" });
    try {
      const params = new URLSearchParams({ q });
      if (source !== "all") params.set("source", source);
      const response = await fetch(`/api/catalogue/search?${params}`);
      const data = await response.json();
      if (!response.ok) setState({ status: "error", message: data.error ?? "Search failed." });
      else setState({ status: "done", results: data.results, failed: data.failed, query: q });
    } catch {
      setState({
        status: "error",
        message: "Couldn't reach the collections. Check your connection.",
      });
    }
  };

  return (
    <div>
      <form onSubmit={search} role="search" className="flex flex-wrap gap-2">
        <label htmlFor={ids.query} className="sr-only">
          Search for a work, artist or subject
        </label>
        <input
          id={ids.query}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try “water lilies”, “Vermeer” or “Hammershøi”"
          className="border-cream/30 placeholder:text-cream/40 focus-visible:border-gilt min-h-11 min-w-0 flex-1 rounded-sm border bg-transparent px-3 focus-visible:outline-none"
        />
        <label htmlFor={ids.source} className="sr-only">
          Museum
        </label>
        <select
          id={ids.source}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="border-cream/30 bg-ink focus-visible:border-gilt min-h-11 rounded-sm border px-3 text-sm focus-visible:outline-none"
        >
          <option value="all">All museums</option>
          {CATALOGUE_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-gilt text-ink focus-visible:outline-cream min-h-11 rounded-sm px-5 text-sm font-semibold transition hover:bg-[#e6c47a] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Search
        </button>
      </form>

      <div aria-live="polite" className="mt-6">
        {state.status === "loading" && (
          <p className="text-cream/60 text-sm">Searching the collections…</p>
        )}
        {state.status === "error" && <p className="text-sm text-[#f0a898]">{state.message}</p>}
        {state.status === "done" && (
          <>
            <p className="text-cream/60 text-sm">
              {state.results.length
                ? `${state.results.length} works for “${state.query}”.`
                : `Nothing found for “${state.query}”.`}
              {state.failed.length > 0 &&
                ` (${state.failed.map((s) => SOURCE_LABELS[s as keyof typeof SOURCE_LABELS] ?? s).join(", ")} didn't answer; try again in a moment.)`}
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {state.results.map((work) => (
                <li key={workKey(work)}>
                  <WorkCard
                    title={work.title}
                    artist={work.artist}
                    dateText={work.dateText}
                    detail={`${work.holder || "Unknown collection"} · ${SOURCE_LABELS[work.source]}`}
                    imageUrl={work.thumbnailUrl}
                    selected={selectedKey === workKey(work)}
                    onSelect={() => onSelect(work)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Shelf({
  items,
  empty,
  selectedId,
  onSelect,
  onRemove,
}: {
  items: ShelfItem[];
  empty: string;
  selectedId: string | null;
  onSelect: (item: ShelfItem) => void;
  onRemove?: (item: ShelfItem) => void;
}) {
  if (items.length === 0) return <p className="text-cream/70 max-w-md text-sm">{empty}</p>;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-2">
          <WorkCard
            title={item.title}
            artist={item.artist}
            dateText={item.dateText}
            detail={item.holder}
            imageUrl={item.imageUrl}
            selected={selectedId === item.id}
            onSelect={() => onSelect(item)}
          />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="text-cream/60 hover:text-cream self-start text-xs underline underline-offset-2"
            >
              Remove from storeroom
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A search result: a small framed thumbnail with its label. */
function WorkCard({
  title,
  artist,
  dateText,
  detail,
  imageUrl,
  selected,
  onSelect,
}: {
  title: string;
  artist: string;
  dateText: string;
  detail: string;
  imageUrl: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`focus-visible:outline-gilt flex h-full w-full flex-col gap-3 rounded-sm p-3 text-left transition focus-visible:outline-2 ${
        selected ? "bg-cream/15 ring-gilt ring-1" : "hover:bg-cream/5"
      }`}
    >
      <span
        className="relative block aspect-[4/5] w-full p-2"
        style={{
          background:
            "linear-gradient(135deg, #7a5a1c 0%, #e6c35f 22%, #9c7428 45%, #f2d688 68%, #7f5e1f 100%)",
        }}
      >
        <span className="relative block h-full w-full bg-[#1a1612]">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 15vw, (min-width: 640px) 25vw, 45vw"
            className="object-contain"
          />
        </span>
      </span>
      <span>
        <span className="block font-serif text-lg leading-tight italic">{title}</span>
        <span className="text-cream/80 mt-1 block text-xs">
          {artist}
          {dateText ? ` · ${dateText}` : ""}
        </span>
        <span className="text-cream/60 mt-0.5 block text-xs">{detail}</span>
      </span>
    </button>
  );
}

/** Right-hand panel: the preview, "Hang in [room]" and the Hang button. */
function HangPanel({
  rooms,
  room,
  onRoomChange,
  selection,
  hanging,
  onHang,
  result,
}: {
  rooms: AddWorkRoom[];
  room: AddWorkRoom | undefined;
  onRoomChange: (id: string) => void;
  selection: Selection | null;
  hanging: boolean;
  onHang: () => void;
  result: HangResult | null;
}) {
  const roomSelect = useId();
  const work = selection?.kind === "catalogue" ? selection.work : selection?.item;
  return (
    <aside aria-label="Hang the selected work" className="lg:sticky lg:top-6 lg:self-start">
      <div className="border-cream/15 overflow-hidden rounded-sm border">
        <div className="aspect-[4/3]" style={{ background: room?.wallColor ?? "#5e1d20" }}>
          {work && room ? (
            <WorkPreview
              imageUrl={work.imageUrl}
              imageWidth={work.imageWidth}
              imageHeight={work.imageHeight}
              widthCm={selection?.kind === "catalogue" ? selection.work.widthCm : 0}
              heightCm={selection?.kind === "catalogue" ? selection.work.heightCm : 0}
              wallColor={room.wallColor}
              lowerWallColor={room.lowerWallColor}
            />
          ) : (
            <p className="text-cream/80 grid h-full place-items-center p-6 text-center text-sm">
              Choose a work to see it on the wall.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 p-4">
          {work && (
            <p className="text-sm">
              <span className="font-serif text-lg italic">{work.title}</span>
              <span className="text-cream/70 block text-xs">{work.artist}</span>
            </p>
          )}
          <label htmlFor={roomSelect} className="text-cream/80 text-xs font-medium">
            Hang in
          </label>
          <select
            id={roomSelect}
            value={room?.id}
            onChange={(e) => onRoomChange(e.target.value)}
            className="border-cream/30 bg-ink focus-visible:border-gilt min-h-11 rounded-sm border px-3 text-sm focus-visible:outline-none"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} ({r.works} {r.works === 1 ? "work" : "works"})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onHang}
            disabled={!selection || hanging}
            className="bg-gilt text-ink focus-visible:outline-cream min-h-11 rounded-sm px-4 text-sm font-semibold transition hover:bg-[#e6c47a] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hanging ? "Hanging…" : "Hang"}
          </button>
          {result && (
            <p role="status" className={`text-sm ${result.ok ? "text-cream" : "text-[#f0a898]"}`}>
              {result.message}{" "}
              {result.ok && (
                <Link href={result.href} className="text-gilt underline underline-offset-2">
                  {result.href.startsWith("/add") ? "Open the storeroom" : "Go and see it"}
                </Link>
              )}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
