# Handover: Salon — a museum you curate yourself

> Working name: **Salon** (after salon-style hanging).
> Design concept: https://claude.ai/artifact/R48ydCrso2ZbsacF27WzTo
> Owner: Steph (steph-carv). This doc is the brief; the design is a visual reference only.

---

## 0. Read this first: the design is a 2D mock-up, the product is 3D

The linked design was made in Claude Design, which can only do flat, 2D screens. Use it for **look and content**: the colour palette, gilt frames, cream wall labels, cornice and dado rail, spotlights, wooden floor, the bench, the detail-page layout and the add-a-work flow. (The mock-up's "Upload your own" tab is **not** in the launch version; see §5b.)

**The end product is a 3D museum you walk through.** Don't build the 2D wall as the main experience. The 2D layouts are still used in three places:
1. **Painting detail page**: a 2D overlay on top of the 3D scene (painting left, info right).
2. **Wall planner** in curate mode: a flat view of each wall for arranging works precisely (see §2.4).
3. **Accessible / low-power fallback**: a 2D room view for screen readers, keyboard-only users, old phones and `prefers-reduced-motion`.

---

## 0b. Current mode: personal project

For now Salon is a **personal/portfolio project**, not a public platform. Build everything behind an `APP_MODE` setting with two values:

- **`personal` (now, default)**
  - Sign-up limited to an email allowlist (Steph, plus anyone she adds). No open registration.
  - **Museum-sourced uploads are allowed** (§5b, "Personal mode"): Steph can upload image files she got from museum websites, or paste a museum object page URL, as long as a source link is given.
  - Automatic image screening, hash checking, the moderation admin page and the Online Safety Act steps are **not needed yet**.
  - Galleries can still be shared by link, with the copyright rule in §5b applied to what visitors see.
- **`public` (only if Steph decides to launch publicly)**
  - Open sign-up, the staged upload rules, screening, and everything in the **Before going public** checklist (§15).

Keep the code paths for public mode in mind (columns, flags, clean boundaries) but don't build the public-only parts until Steph says so.

---

## 1. What we're building

A web app where every user gets **their own 3D virtual museum**. They walk through rooms, hang paintings on the walls, style each room and frame the way they like, and click any painting to step closer and read about it. Every work comes from open-access museum collections and fills in its own details automatically. That covers the famous pieces and hundreds of thousands of works by lesser-known artists. In personal mode (now), images taken from museum websites can also be uploaded with a source link (§5b). If Salon ever goes public, it launches without user uploads and adds them in stages (§5b, §15).

It should **feel alive and physical**, like being in a real gallery, not like scrolling a grid.

### Requirements

| # | Requirement | What it means in practice |
|---|---|---|
| 1 | Customise each painting on the wall; famous placeholders to start | Every frame on a wall is a slot the user can fill, swap, move or empty. New users get a starter collection of famous public-domain works. |
| 2 | Art lovers build their own collection; every gallery is different | Multi-user. Each user owns a collection → rooms → hung works. Public URL per collection (`/g/<username>`). |
| 3 | Click a painting → painting left, info right. Famous works auto-filled; lesser-known works too | Camera moves to the painting, then a 2D detail overlay. Works come from several open-access museum APIs (§8); owners can edit any label. Museum-sourced uploads in personal mode (§5b). |
| 4 | Feel like you're in a museum | Real 3D rooms, lighting, materials, motion and sound. See §6. |
| 5 | 3D and lively | First-person walkthrough built with three.js. Signs of life: light, dust in the spotlights, ambient sound, other visitors present. See §6. |
| 6 | Users customise the look | Wall colour and finish, frames, floor, lighting, bench, labels and more, per room and per work. See §7. |
| 7 | Privacy and guestbook | Public by default and view-only. Owners can make galleries private and switch on a gallery guestbook. The starter gallery is private by default. See §5. |
| 8 | Manage rooms | Owners can add, delete and rename their rooms (and edit the intro line). **Max 10 rooms.** |
| 9 | Follow and save | Visitors can follow galleries and save paintings they might add to their own collection later. See §5a. |
| 10 | Safe by design | No user image uploads at launch. Uploads are added later in stages: owner-only first, public only for trusted accounts, with screening and a no-nudity rule. See §5b and §5c. |

---

## 2. Experiences (screens)

### 2.1 Walking the gallery — `/g/[username]` and `/g/[username]/[roomSlug]`
- Full-screen 3D scene. A slim top bar floats over it: wordmark, collection name, **Curate**, **Add a work**, **Share**, sound toggle, and a "2D view" switch.
- **Movement**:
  - Desktop: WASD/arrow keys + mouse look (pointer lock), or click a spot on the floor to walk there.
  - Mobile: tap the floor to walk there, drag to look around. No virtual joystick needed for v1.
  - "Next painting / previous painting" buttons and keys glide the camera along the wall, painting to painting. Make this the easiest way to tour a room.
- **Rooms** connect through doorways. Each doorway has the room's name above it (the plaque from the mock-up). Walking through loads the next room.
- **Paintings**: textured planes inside real frame geometry, at true aspect ratio and a believable scale (use the artwork's real dimensions where known; clamp very small and very large works). Each has a spotlight and a cream wall label beside it, readable when you're close.
- **Bench** in the centre of each room (Steph specifically likes this; keep it). Sitting on it could be a stretch-goal "rest view" that slowly pans across the room.
- Hover a painting → slightly brighter light + cursor change. Click → §2.2.

### 2.2 Stepping closer (painting detail) — `/g/[username]/work/[placementId]`
- Clicking a painting smoothly moves the camera to face it, then fades in a 2D overlay. The 3D room stays visible, dimmed, behind it.
- **Left (~60%)**: the painting, large, in its frame. Below: ← previous · **Look closer** (deep zoom) · next →.
- **Right (~40%)**: the cream catalogue card from the mock-up:
  - Eyebrow: `Room 1 · Portraits & Figures · 2 of 5`
  - Title (large italic serif), artist, nationality + life dates
  - Facts grid: Date, Medium, Dimensions, Held by
  - **About the work**
  - Source chip: "Filled in automatically from [source] · Edit details" (and, once uploads exist, "Added by you")
  - **Why it's in my collection**: owner's personal note
  - Visitors (logged in): **Save** button (heart/bookmark icon) to add the painting to their Saved list (§5a)
  - Owner only: "Hanging in" room select, frame style, **Take off the wall**
- Esc or "Back to the room" returns the camera to where you were standing.
- The URL works on its own (shareable link straight to a painting).

### 2.3 Add a work — `/add` (2D page, matches mock-up screen 3)
- **Find a work** (launch): search across all museum sources (§8) → results with framed thumbnail, title, artist · date, museum · source, "Hang in [room]" + **Hang**. Filters: famous / lesser-known (rough popularity signal, e.g. Wikidata sitelink count), period, medium, museum. Add a **"Discover"** strip of random lesser-known works so people find artists they don't already know.
- **Saved** (launch): paintings the user saved from other galleries (§5a), each with **Hang**. This is where saving turns into collecting.
- **Upload** (on in personal mode): paste a museum page URL or upload an image from a museum website, with source link and licence (§5b). In public mode, hidden at launch and governed by the stage rules.
- Live preview on the right: a small 3D preview of the work on a patch of wall using the room's actual wall colour, frame and light.

### 2.4 Curate mode (owner only)
- Toggle from the top bar. In 3D: click a painting to select it, then drag it along the wall (snapped to the wall plane, kept above the dado rail and below the cornice). Empty hooks appear as glowing dashed outlines.
- **Wall planner** side panel: the 2D elevation of the current wall (basically mock-up screen 1). Drag to arrange precisely, with snap guides and an "auto salon hang" button that packs works neatly.
- **Customise panel** for room and frame settings (§7), with changes visible live in 3D.
- Rename the room and edit its intro line inline on the doorway plaque.
- Exiting curate mode saves. Add undo/redo for the session.

### 2.5 Collection settings — `/settings/collection`
- Visibility (Public / Private), Guestbook (Off / On), collection name.
- **Rooms**: add, delete, rename, reorder. Max **10 rooms** per collection: the Add button is disabled at 10 with a short explanation, and the limit is enforced in the database too. Deleting a room asks for confirmation and moves its paintings to the storeroom (never deletes them). A collection must keep at least one room.

### 2.6 Guestbook — `/g/[username]/guestbook`
- Only exists when the owner has switched it on. In 3D, it's a physical guestbook on a lectern near the entrance of the first room; clicking it opens a 2D overlay styled like a cream paper book.
- Logged-in visitors sign it with a short message. Entries show name, date and message, newest first.

### 2.7 Following and Saved — `/following`, `/saved`
- **Following**: galleries you follow, with a "new works hung" indicator since your last visit.
- **Saved**: paintings you've saved from any gallery, with **Hang in my gallery** and **Remove**. At launch everything is a museum work, so anything saved can be hung.

---

## 3. Suggested stack

Steph is a 2nd-year AI student, comfortable with Python and some React/TypeScript. Pick well-documented tools:

- **Next.js (App Router) + TypeScript + Tailwind CSS** for pages, routing and 2D UI
- **three.js via React Three Fiber** + **@react-three/drei** (controls, text, loaders, helpers)
- **@react-three/rapier** (optional) for simple collisions so you can't walk through walls or the bench; a hand-rolled bounds check is fine for v1
- **Zustand** for scene/UI state (current room, selected painting, curate mode)
- **Supabase**: Postgres, Auth (magic link + Google), Storage (uploads), Row Level Security, Realtime (presence, guestbook)
- **Zod** for validating API responses and forms
- **dnd-kit** for the 2D wall planner
- **OpenSeadragon** for deep zoom on the detail page (AIC serves IIIF)
- 3D assets: bench and any ornate mouldings as compressed **glTF/GLB** (Draco/Meshopt), textures as **KTX2**. Frames are generated in code (§6) so they fit any aspect ratio.
- Deploy on **Vercel**

If you'd recommend something different, explain why before switching.

---

## 4. Data model (first pass)

```
profiles        id (= auth.uid), username (unique), display_name, collection_name,
                visibility ('public' | 'private'), guestbook_enabled (bool, default false),
                has_customised (bool, default false), created_at
rooms           id, owner_id → profiles, slug, number, name, intro, position,
                theme jsonb (see §7), created_at
artworks        id, kind ('catalogue' | 'upload'), source ('met' | 'aic' | 'wikidata' | 'rijks' |
                'smithsonian' | 'cleveland' | 'europeana' | 'user'),
                source_id, title, artist, artist_meta jsonb, date_text, medium,
                dimensions_text, width_cm, height_cm, holder, description,
                image_url, image_width, image_height, is_public_domain, attribution,
                moderation_status ('pending' | 'approved' | 'rejected'; catalogue = 'approved'),
                moderation_reason, created_by → profiles (null for catalogue), created_at
artwork_overrides  owner_id, artwork_id, fields jsonb       -- a user's edits to a catalogue entry
placements      id, owner_id, room_id → rooms (null = storeroom), artwork_id → artworks,
                wall ('north' | 'east' | 'south' | 'west'), x, y (metres on the wall plane),
                frame jsonb (see §7), show_label (bool), personal_note, created_at
guestbook_entries  id, gallery_owner_id → profiles, author_id → profiles, body,
                   moderation_status, created_at, deleted_at
follows         follower_id → profiles, followed_id → profiles, created_at   (PK on both)
saved_artworks  user_id → profiles, artwork_id → artworks, from_placement_id (nullable),
                created_at   (PK on user_id + artwork_id)
reports         id, reporter_id, target_type ('gallery' | 'guestbook_entry' | 'artwork'),
                target_id, reason, status ('open' | 'resolved'), created_at
```

Design the `kind = 'upload'` and `moderation_*` columns in from the start (cheap now, painful to add later), but nothing writes uploads until the stage 2 phase in §10.

- **Room limit**: enforce max 10 rooms per owner with a database trigger or check in the insert policy, not just in the UI.
- Deleting a room sets its placements' `room_id` to null (storeroom), never cascades a delete.
- Saving a painting stores the **artwork**, so a saved painting survives even if the original owner later takes it down. Once uploads exist, other people's uploads can never be saved or hung by someone else, only viewed.

- `catalogue` artworks are a **shared cache** of API lookups (unique on `source + source_id`). Users never edit them directly; their edits go in `artwork_overrides`.
- (Later) uploads go in a **private** Supabase Storage bucket at `uploads/<user_id>/...`, served via short-lived signed URLs, never public URLs. Generate a resized texture (e.g. 2048px longest side) plus a thumbnail on upload.
- Store `width_cm`/`height_cm` when known so paintings hang at real size in 3D.
- **RLS**: anyone can read a collection where `visibility = 'public'`; only the owner can read a private one; only the owner can write their rows; visitors only ever see uploads with `moderation_status = 'approved'`; guestbook entries are insertable only by logged-in users when the owner has `guestbook_enabled`.

---

## 5. Visibility and guestbook (Steph's rules)

- **Default for a collection: public, view-only.** Anyone with the link can walk it; no guestbook.
- **Owners can:** make it **private** (only they can see it) and/or switch the **guestbook on**. Both live in collection settings.
- **The starter gallery is private by default.** Every new user starts with the same famous-works rooms, so making those public would fill the site with identical galleries. Once the user has made it their own, prompt them to go public with one click ("Your gallery is ready to show. Make it public?"). Set `has_customised = true` on their first hang, removal, rename or theme change. Don't auto-publish without asking.
- Any "explore" or "random gallery" listing only shows public collections where `has_customised = true`.
- **Guestbook** (when on): one per gallery, not per painting. Logged-in users only, plain text ≤ 500 characters, max a few entries per user per gallery per day. Entries go through text screening (§5b) before showing. The owner can delete any entry. Guestbook switched off later → hidden, not deleted.

## 5a. Following and saving

- Logged-in visitors can **follow** a public gallery (button in the top bar while walking it). Following list at `/following` with a "new works" indicator. No notifications by email in v1.
- **Save** a painting from its detail page. Saved paintings live at `/saved` and in the **Saved** tab of Add a work, ready to hang later. This is how "liking" works: saving is the like.
- Show counts to the owner only (e.g. "12 followers", "Saved by 4 people" on a painting's detail card). Visitors don't see counts in v1, to keep it about the art rather than popularity.

## 5b. User uploads

### Personal mode (now): museum-sourced uploads

While `APP_MODE = personal`, the **Upload** tab is on, for images sourced from museum websites:

- **Two ways in:**
  1. **Paste a museum object page URL** (e.g. a Met, AIC, Rijksmuseum or National Gallery page). If the site is one of our API sources, look the work up through the API and fill everything in. Otherwise read what we can (page title, Open Graph/JSON-LD metadata) and pre-fill the form for Steph to check.
  2. **Upload an image file** she downloaded from a museum website, with a **required source URL** and the form fields from the mock-up (title, artist, date, medium, dimensions, museum, wall label text).
- **Licence field** on every upload: Public domain / CC0, CC BY (with credit), or "Not sure / in copyright". Default to "Not sure".
- **Copyright rule for sharing:** works marked "Not sure / in copyright" can hang in the owner's own view, but are **hidden from visitors** when a gallery is shared. Visitors only see uploads marked public domain / CC0 / CC BY. This keeps link-sharing safe even in personal mode.
- Show the source as a credit on the detail page ("Image: [Museum], via [link]").
- Basic hygiene still applies: images only (check the real file type), max 20 MB, strip EXIF, private storage with signed URLs.
- No automatic screening needed in this mode (only allowlisted users can upload).

### Public mode (later, only if Steph launches publicly): staged rollout

Everything below applies **only when `APP_MODE = public`**. In public mode, museum-sourced uploads follow these rules too.

**Why staged:** an open upload box with public share links is the main way a site like this gets abused. Automatic screening can't reliably tell artistic nudity from explicit content, so it would need a person reviewing borderline cases, and Steph is the only reviewer. Image uploads that others can see also put the site firmly in scope of the UK Online Safety Act (§5c). So uploads arrive in stages, each one only after the previous is stable.

**Stage 1 — Public launch: no image uploads.**
- All works come from museum API sources (§8). They're trusted: never screened, and classical nudes from museums are fine.
- The Upload tab is hidden for everyone except admins.
- Room 3 of the starter gallery is **"Your Picks"** (empty, with a "Find a work" prompt) instead of "My Own Work".

**Stage 2 — Owner-only uploads.**
- Users can upload their own art to hang in **their own view only**. Uploaded works are never shown to visitors, in any gallery, public or private. Visitors see an empty hook with nothing on it, or the owner can choose to hide that spot.
- Still screened (below), because a private upload box can still be misused to store illegal material.
- Rate limits: e.g. 20 uploads per user per day, 200 total. Max 20 MB per file, images only (check the actual file type, not just the extension), strip EXIF/location data.

**Stage 3 — Public uploads for trusted accounts only (optional, decide later).**
- Only accounts that pass a trust bar can make uploads public: e.g. verified email, account older than 30 days, a gallery that's been public and unreported. Exact bar to be decided with Steph.
- Each account's first few public uploads go to manual review before they appear, even if screening passes.

**Rules for every upload, at every stage:**
1. **No nudity in uploads, full stop.** Simple to explain and to enforce. It will occasionally block something harmless; that's accepted. Museum works are exempt.
2. Store the file privately and create the artwork with `moderation_status = 'pending'`.
3. A server function sends it to an image-moderation service (nudity/sexual content, graphic violence, hate symbols). Options to compare (**check current pricing, limits and docs before choosing**): Google Cloud Vision SafeSearch, AWS Rekognition content moderation, Sightengine. Because the rule is "no nudity", the threshold can be strict.
4. Also check uploads against known illegal-image hash lists, using a service that offers this (research what's available to a small service and what Ofcom's codes expect before stage 2 ships).
5. Pass → `approved` (visible to the owner; at stage 3 also eligible to go public). Fail → `rejected`, owner sees "This image can't be used in Salon", file deleted. Unsure → stays `pending` for review.
6. **Fail closed**: if the screening service is down, uploads stay `pending`, never auto-approved.
7. Simple admin page (`/admin/moderation`, admin role only): pending items, reports, Approve / Reject / Delete, and a way to suspend an account.

**Text screening (from launch)**: guestbook entries, room names, intros, wall labels, personal notes on public galleries and usernames go through a text-moderation API, or a profanity/slur list as a minimum.

**Report button (from launch)** on every public gallery and guestbook entry; later on public uploads too.

## 5c. Legal: UK Online Safety Act (public mode only; logged in §15)

Because users can share content that others see (galleries, labels, guestbook), Salon is very likely a "user-to-user service" under the UK Online Safety Act, even with no image uploads. Ofcom says in-scope services must carry out an illegal content risk assessment, put protections in place, and keep records. Small services have lighter, proportionate duties, but not zero.

Before going public:
- Read Ofcom's guidance for small user-to-user services and complete the illegal content risk assessment (Ofcom provides templates). Keep the written record.
- Name Steph as the person responsible for online safety.
- Publish simple terms of service and a content policy (no nudity in uploads, no hate, no harassment, no illegal content) and say how to report things.
- Make sure reports are actually looked at, with a target response time.
- Redo the risk assessment before each upload stage, since uploads change the risk.

This is guidance for the build, not legal advice; check Ofcom's current guidance directly.

## 5d. Other legal things (the art rules apply now; the rest is for public mode, logged in §15)

**Art and images**
- **Only show works that are out of copyright.** In the UK and EU, copyright lasts 70 years after the artist's death, so many 20th-century works (e.g. Picasso, Kahlo, Hopper) are still protected even if a museum displays them. Trust each source's public-domain / CC0 flag; if a work has no clear licence, don't show it. Never scrape images from sources without an explicit open licence.
- Store and show each image's licence and credit line ("Image: The Metropolitan Museum of Art, CC0"; Commons images need the author and licence they list).
- Follow each API's terms: rate limits, attribution, required headers, and no suggestion that the museum endorses Salon. Don't use museum logos.
- Museum-written descriptions may be copyrighted even when the image isn't. Show short factual data (title, date, medium) freely; for longer description text, only use it if the source licenses it (e.g. CC0/CC BY), otherwise link to the source or write our own.
- 3D assets, textures, fonts and sounds: CC0 or properly licensed only (e.g. Poly Haven, Google Fonts). Keep a `CREDITS.md`.

**Personal data (UK GDPR)**
- Privacy policy: what's collected (email, username, galleries, follows, saves, guestbook posts), why, where it's stored (Supabase region), who processes it (Supabase, Vercel, any moderation/text-screening service), how long it's kept.
- Account deletion that actually deletes the user's data, and a data export.
- No analytics or non-essential cookies without consent; prefer cookieless analytics.
- Minimum age 13 in the terms. Galleries default to safe settings; don't collect anything we don't need.

**Name**
- "Salon" is a working name. Salon is also an existing media brand, so check the UK IPO trade mark register before promoting under that name, and check the domain.

---

## 6. Making it feel like a real, lively museum

Steph's reference images: a salon hang on an oxblood wall with gilt frames and cream wall labels; the National Gallery's red rooms with a painted, coffered ceiling, skylights and leather benches; a red-damask gallery with arches and a marble sculpture.

**Architecture** (built in code, parameterised so the room theme can change it):
- Rooms roughly 12 × 9 m, ceiling about 5 m. Cornice at the top of the walls, dado rail about 0.9 m up, darker lower wall below it, dark skirting.
- Ceiling: coffered or plain with a skylight band (theme option).
- Doorways with architraves between rooms; the room name sits above each doorway.
- Wooden floor with PBR textures (oak planks, herringbone, marble, polished concrete as theme options). Subtle reflections are welcome if performance allows.
- The **bench**: tufted leather, centre of the room, as in the references.

**Frames**: generated procedurally. Sweep a 2D profile (moulding cross-section) around the painting rectangle so a frame fits any size. Ship 4–5 profiles (ornate gilt, simple gilt, ebony, natural oak, thin gallery/float) with PBR materials (gold with roughness variation, painted black, wood grain).

**Light**:
- Warm ambient light from the ceiling/skylight, plus a spotlight per painting. Use a few real shadow-casting lights and fake the rest (light cookies/decals on the wall, baked or lightmapped room lighting) to keep the frame rate up.
- Soft light falloff on the wall around each painting, matching the mock-up's glow.
- Lighting moods as a theme option: Daylight, Evening (warmer, dimmer, paintings brighter than the room), Closing time (very low light, just the spotlights).

**What makes it lively**:
- Floating dust in the spotlight beams (very subtle particles).
- Optional ambient room sound (footsteps echo, distant murmur), **off by default**, toggle in the top bar.
- **Other visitors**: when several people are in the same public gallery, show them as simple soft silhouettes or glowing markers, via Supabase Realtime presence. Stretch goal, but it's what will make the space feel alive.
- Small touches: a gentle head-bob when walking (off under reduced motion), labels that become readable as you approach, a short sound when you enter a new room.

**Motion and comfort**: smooth camera easing everywhere; never snap. Respect `prefers-reduced-motion` (no head-bob or dust; fades instead of camera flights). Field of view around 60–70°. Keep walking speed comfortable.

**Performance budget**: 60 fps on a recent laptop, 30+ fps on a mid-range phone. Load only the current room plus neighbours; lazy-load painting textures by distance; KTX2 textures; cap device pixel ratio at about 1.5 on mobile; have a quality setting (Low/Medium/High). If WebGL fails or the device is weak, fall back to the 2D room view automatically.

**Accessibility**: the 2D view (mock-up screen 1) is the accessible path and must contain everything: all rooms, all works, labels and links to detail pages. In 3D, every painting is reachable with Tab and next/prev, and has an accessible name ("Step closer to *Title* by *Artist*"). Text contrast ≥ 4.5:1 on every wall colour. Warn the owner in the customise panel if their wall colour makes labels hard to read.

**Type and palette** (from the mock-up): Cormorant Garamond for titles (italic for artwork names), Inter for UI and label text. Default walls: oxblood `#5e1d20`, forest `#213a2c`, navy `#1d3145`. Cream mouldings `#efe7d4`, gilt accents around `#d9b25c`, near-black UI chrome `#0e0c0a`.

---

## 7. Customisation (owner, in curate mode)

Everything previews live in 3D. Settings save per room (`rooms.theme`) or per work (`placements.frame`).

**Per room (`theme`)**
- **Wall colour**: preset swatches (oxblood, damask red, forest, navy, sage, dove grey, gallery white, charcoal) + a free colour picker
- **Wall finish**: matte paint, silk damask pattern, linen fabric, plaster
- **Moulding/trim colour**: cream, white, gold, match wall
- **Floor**: oak planks, herringbone, marble, polished concrete
- **Ceiling**: coffered, plain, skylight
- **Lighting mood**: Daylight, Evening, Closing time, plus a warmth slider
- **Bench**: leather (default), wood, none
- **Wall label style**: cream card (default), black card, none
- Room name and intro line

**Per work (`frame`)**
- **Frame style**: ornate gilt, simple gilt, ebony, natural oak, silver, thin float frame, no frame
- **Frame width**: slim / standard / wide
- **Mat (passe-partout)**: none, ivory, black; mat width
- **Spotlight**: on/off, brightness
- **Label**: show/hide
- **Size on wall**: real size (default when known) or a custom scale

**Collection-wide defaults**: a default theme and frame that new rooms and new works inherit, so users don't have to style every piece one by one. Add a "Reset to default" on every setting.

Store themes as JSON validated by a Zod schema with a version number, so new options can be added without breaking old galleries.

---

## 8. Where the art comes from (famous and lesser-known)

At launch this is the **only** source of works, so breadth matters: it's how "lesser-known artists" is covered without uploads.

A server route `/api/catalogue/search?q=` searches these sources, converts results into the `artworks` shape, removes duplicates and returns them.

**Phase A (core, first):**
1. **The Met Collection API** (no key). Only use objects where `isPublicDomain` is true and there's a primary image.
2. **Art Institute of Chicago API** (no key). Images via their IIIF server using `image_id`; filter on `is_public_domain`. They ask clients to send an identifying `AIC-User-Agent` header.
3. **Wikidata + Wikimedia Commons**: for famous works at museums without open APIs (Louvre, Mauritshuis, National Gallery London, MoMA). SPARQL for title, creator, date, material, dimensions and collection; Commons for the image. Only use public-domain or CC images and store the attribution.

**Phase B (breadth, for lesser-known work):** add these one at a time, each behind the same normalised interface:
4. **Rijksmuseum** open data
5. **Smithsonian Open Access**
6. **Cleveland Museum of Art Open Access**
7. **Europeana** (aggregates many smaller European museums; good for regional and lesser-known artists)

Check each one's current access rules (some need a free API key), licence terms and rate limits before building it. Only use works marked public domain / CC0, or CC licences with attribution stored and shown.

Rules:
- **Check current endpoint URLs and field names against each API's docs before coding**; don't rely on this doc's memory of them.
- Cache results; respect rate limits; serve images through our own cache/CDN rather than hot-linking museum servers.
- Always show the data source on the detail page.
- If a lookup fails, the detail page says "This label couldn't be fetched. Fill it in yourself." with editable fields.

---

## 9. Starter collection (placeholders for new users)

Seed for every new account. **Private by default** (§5). All public domain; check each image's licence at import.

**Room 1 · Portraits & Figures** (oxblood)
- *Mona Lisa*, Leonardo da Vinci, c. 1503–19 (Louvre → Wikidata/Commons)
- *Girl with a Pearl Earring*, Johannes Vermeer, c. 1665 (Mauritshuis → Wikidata/Commons)
- *Madame X (Madame Pierre Gautreau)*, John Singer Sargent, 1883–84 (The Met)
- *The Laughing Cavalier*, Frans Hals, 1624 (Wallace Collection → Wikidata/Commons)
- *Self-Portrait with a Straw Hat*, Vincent van Gogh, 1887 (The Met)

**Room 2 · Landscapes & the Sea** (forest green)
- *The Starry Night*, Vincent van Gogh, 1889 (MoMA → Wikidata/Commons)
- *Water Lilies*, Claude Monet, 1906 (Art Institute of Chicago)
- *The Great Wave off Kanagawa*, Katsushika Hokusai, c. 1831 (The Met has an impression)
- *The Hay Wain*, John Constable, 1821 (National Gallery → Wikidata/Commons)
- *The Fighting Temeraire*, J. M. W. Turner, 1839 (National Gallery → Wikidata/Commons)
- *Wanderer above the Sea of Fog*, Caspar David Friedrich, c. 1818 (Hamburger Kunsthalle → Wikidata/Commons)

**Room 3 · Your Picks** (navy): created empty, with an empty-state sign on the wall and a "Find a work" prompt (and a "Discover a lesser-known artist" button). Once owner-only uploads arrive, users can rename it "My Own Work" or add a new room for their art.

Write `scripts/seed-catalogue.ts` to look each one up via §8 and store it as a catalogue artwork. New-user onboarding copies placements, not artworks.

---

## 10. Build order

Do these in order. **Stop at the end of each phase, show me what changed, and wait for my OK.**

1. **Scaffold**: Next.js + TS + Tailwind + R3F + Supabase client, env setup, lint/format, deploy a hello-world to Vercel.
2. **One 3D room, hard-coded**: walls, cornice, dado rail, floor, ceiling, bench, lighting, and five hard-coded paintings in procedural gilt frames with labels. Desktop movement only. Get the look and feel right before anything else.
3. **Navigation and detail**: next/prev painting camera glide, click-to-walk, mobile touch controls, click painting → camera move → 2D detail overlay → back.
4. **Multiple rooms**: doorways, room plaques, loading neighbouring rooms, 2D fallback view.
5. **Auth + data model**: Supabase schema + RLS; sign-up creates profile + 3 rooms + private starter placements.
6. **Catalogue search + hanging**: `/api/catalogue/search` across Met, AIC and Wikidata (§8 phase A) with caching; the Add a work page (Find + Saved tabs); Hang flow; storeroom.
7. **More sources**: Rijksmuseum, Smithsonian, Cleveland, Europeana (§8 phase B); famous/lesser-known filter; Discover strip.
7b. **Museum-sourced uploads (personal mode)**: paste-a-URL import, image upload with required source link and licence field, private storage, credits on the detail page, visitors only see public-domain/CC uploads (§5b, personal mode).
8. **Curate mode + rooms**: select/drag on the wall in 3D, wall planner panel, empty hooks, undo/redo; add/delete/rename/reorder rooms with the 10-room limit.
9. **Customisation**: room themes and per-work frames (§7), collection defaults, contrast warning.
10. **Visibility and sharing**: public/private, "make it public?" prompt, share links, OG image of the room.
11. **Social**: follow galleries, save paintings, guestbook (lectern in 3D + overlay). In personal mode these work between allowlisted users only.
12. **Lively and polish**: dust, sound, lighting moods, quality settings, reduced-motion pass, accessibility pass, performance pass, `CREDITS.md`.

**Personal project is complete here.**

**Public mode (only if Steph decides to go public; work through §15 first):**
13. **Public foundations**: open sign-up, text screening, report buttons, admin moderation page, privacy policy, terms and content policy, account deletion and export, cookie consent if any analytics (§5c, §5d).
14. **Public launch, stage 1**: uploads hidden for non-admins; Online Safety Act risk assessment done and recorded.
15. **Stage 2 uploads (owner-only)**: image screening + hash checking, rate limits, fail-closed pending state (§5b). Screening ships in the same phase as public uploads, never after.
16. **Stage 3 uploads (optional)**: trust bar, manual review of early public uploads.

Stretch: other-visitor presence, bench "rest view", deep zoom, sculpture plinths for 3D objects, VR mode via WebXR, "visit a random gallery".

---

## 11. Acceptance checks

- A new user signs up, lands in a 3D Room 1 with five framed famous works and correct labels, and their gallery is private.
- They can walk the room with keyboard/mouse on desktop and with taps on a phone, and glide painting to painting.
- Clicking a painting moves the camera to it and shows the detail overlay with the image left and auto-filled info right, with its source.
- Searching "water lilies" returns results from at least two sources; hanging one puts it on the wall immediately.
- Searching for a lesser-known artist (e.g. a regional Dutch or Scandinavian painter) returns works from the phase B sources; the Discover strip shows works that aren't in the famous set.
- Personal mode: an allowlisted user can paste a Met or AIC object URL and get a fully filled-in work; can upload an image with a source link; an upload marked "Not sure / in copyright" is visible to its owner but not to a visitor on a shared link; a non-allowlisted email can't sign up.
- The owner can rename a room, change its wall colour, floor and lighting, and change a painting's frame, all live, and the changes persist after refresh.
- After their first change, the owner is offered "Make it public?". A public gallery is viewable logged-out with no guestbook; switching the guestbook on lets logged-in visitors sign it; going private hides it from everyone else.
- An owner can add rooms up to 10 and no more (also rejected if attempted via the API directly); deleting a room moves its paintings to the storeroom.
- A visitor can follow a gallery and save a painting, then hang that saved painting (if it's a catalogue work) from the Saved tab.
- Public mode only: every item in §15 is ticked; a test report reaches the admin page; at stage 1 there's no way for a non-admin to upload, including via the API; at stage 2 an uploaded image is never visible to anyone but its owner, an image with nudity is rejected, and uploads stay pending if the screening service is unreachable.
- 60 fps on a recent laptop, usable on a mid-range phone, automatic 2D fallback when WebGL isn't available.
- Lighthouse accessibility ≥ 95 on the 2D view and detail pages.

---

## 12. How to work with me

- I'm a student and want to understand the codebase, not just receive it. At the end of each phase, explain the key decisions in a few lines and point me to the files that matter, especially the 3D parts (scene structure, lighting, frame generation).
- Numbered steps for anything I need to do myself (Supabase project, env vars, Vercel).
- Ask before adding a dependency not listed in §3.
- Keep commits small, one concern each.

---

## 13. Decided

- Name: Salon (for now; check the trade mark before promoting, §5d).
- Galleries: public and view-only by default; owner can make private and/or turn on a guestbook.
- Starter gallery: private by default.
- Rooms: owners can add, delete and rename them; max 10 per collection.
- Visitor interaction: a guestbook per gallery (no per-painting comments).
- Following galleries and saving paintings (saving = liking; saved works can be hung later).
- **Now: personal project.** Allowlisted sign-up; uploads allowed for images sourced from museum websites, with source link and licence; only public-domain/CC uploads shown to visitors.
- **If it goes public:** no user uploads at public launch; then owner-only uploads; public uploads only for trusted accounts, if at all. No nudity in uploads; museum works exempt. Everything in §15 done first.
- End product: 3D and lively; the design is a 2D mock-up for look and layout only.
- The bench stays.

## 14. Still open

Nothing blocking. If something comes up during a phase, ask Steph rather than guessing.

---

## 15. Before going public (log; not needed while it's a personal project)

Work through this only if Steph decides to open Salon to the public or promote it. Tick each one before switching `APP_MODE` to `public`. None of this is legal advice; check the official guidance at the time.

**Online Safety Act (§5c)**
- [ ] Read Ofcom's current guidance for small user-to-user services.
- [ ] Complete and save the illegal content risk assessment (Ofcom template). Redo it before each upload stage.
- [ ] Name Steph as the person responsible for online safety.
- [ ] Check whether the children's risk assessment applies (likely, if under-18s can sign up) and do it if so.
- [ ] Report buttons live; reports reviewed within a set time.

**Uploads (§5b)**
- [ ] Switch to stage 1 (no uploads for non-admins) at public launch.
- [ ] Decide whether to do stage 2/3 at all. If yes: screening service chosen and tested, hash checking researched and in place, no-nudity rule in the content policy, fail-closed tested.
- [ ] Re-check every museum-sourced upload made in personal mode: anything not clearly public domain/CC stays private.

**Copyright and credits (§5d)**
- [ ] Only public-domain/CC0/CC BY works visible to visitors; credits and licences shown.
- [ ] Museum description text only used where licensed; otherwise linked or rewritten.
- [ ] Each API's terms re-read (attribution, rate limits, commercial use, no implied endorsement).
- [ ] `CREDITS.md` complete for 3D assets, textures, fonts and sounds.

**Personal data (UK GDPR)**
- [ ] Privacy policy (what's collected, why, where, which processors, retention).
- [ ] Account deletion and data export working.
- [ ] Cookie consent if any non-essential cookies or analytics (or use cookieless analytics).
- [ ] Run the ICO data protection fee self-assessment; pay the fee or record the exemption.
- [ ] Minimum age (13+) in the terms.

**Name and brand**
- [ ] Trade mark search for the final name (Salon is an existing media brand); domain secured.

**Terms**
- [ ] Terms of service and content policy published, with a contact address.
