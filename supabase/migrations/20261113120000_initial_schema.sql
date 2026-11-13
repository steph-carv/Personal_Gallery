-- Salon: initial schema (HANDOVER.md §4, §5, §5a, §5b).
--
-- Every table has Row Level Security on. The policies below are the real
-- rules of the app: the UI hides things, but the database is what stops a
-- visitor reading a private gallery or one user changing another's rooms.
--
-- Conventions
-- - `(select auth.uid())` rather than `auth.uid()` in policies, so Postgres
--   evaluates it once per query instead of once per row.
-- - Security-definer functions set `search_path = ''` and use fully
--   qualified names, so they can't be tricked into using someone else's
--   objects.

-- ---------------------------------------------------------------------------
-- Settings and sign-up allowlist
-- ---------------------------------------------------------------------------

-- One row of app-wide settings. `mode` mirrors APP_MODE (§0b): in personal
-- mode, only allowlisted emails can create an account.
create table public.app_settings (
  id boolean primary key default true check (id),
  mode text not null default 'personal' check (mode in ('personal', 'public'))
);
insert into public.app_settings default values;

-- Emails allowed to sign up in personal mode. Add rows in the Supabase
-- dashboard (Table Editor) or SQL editor. Emails are stored lower-case.
create table public.signup_allowlist (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  note text,
  created_at timestamptz not null default now()
);

-- Neither table has policies, so nobody can read or change them through the
-- API; only the functions below (and you, in the dashboard) can.
alter table public.app_settings enable row level security;
alter table public.signup_allowlist enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles: one per account, holding the collection's settings
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Used in URLs: /g/<username>. Lower-case letters, digits and single
  -- hyphens, 3–30 characters, not starting or ending with a hyphen.
  username text not null unique
    check (username ~ '^[a-z0-9]([a-z0-9]|-(?=[a-z0-9])){2,29}$')
    check (username not in ('demo', 'admin', 'api', 'login', 'logout', 'welcome', 'settings',
      'auth', 'add', 'saved', 'following', 'explore', 'about', 'help', 'salon', 'g')),
  display_name text check (char_length(display_name) <= 80),
  collection_name text not null default 'My Collection'
    check (char_length(collection_name) between 1 and 80),
  -- Public galleries can be walked by anyone with the link (§5).
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  guestbook_enabled boolean not null default false,
  -- Set on the owner's first hang, removal, rename or theme change (§5).
  has_customised boolean not null default false,
  -- False until the owner has chosen their username on the welcome page.
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rooms
-- ---------------------------------------------------------------------------

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(name) between 1 and 60),
  intro text not null default '' check (char_length(intro) <= 280),
  -- Order of rooms in the collection, from 0. The room's number is position + 1.
  position integer not null check (position >= 0),
  -- Look of the room (§7), validated in the app by a versioned Zod schema.
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (owner_id, slug),
  unique (owner_id, position) deferrable initially deferred,
  -- Lets placements point at (room, owner) together; see placements.
  unique (id, owner_id)
);
create index rooms_owner_idx on public.rooms (owner_id, position);

-- ---------------------------------------------------------------------------
-- Artworks: a shared cache of catalogue works, plus (later) user uploads
-- ---------------------------------------------------------------------------

create table public.artworks (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'catalogue' check (kind in ('catalogue', 'upload')),
  source text not null check (source in ('met', 'aic', 'wikidata', 'rijks', 'smithsonian',
    'cleveland', 'europeana', 'user')),
  source_id text,
  title text not null,
  artist text not null default '',
  artist_meta jsonb not null default '{}'::jsonb,
  date_text text not null default '',
  medium text not null default '',
  dimensions_text text not null default '',
  width_cm numeric,
  height_cm numeric,
  holder text not null default '',
  description text,
  description_credit text,
  image_url text not null,
  image_width integer not null check (image_width > 0),
  image_height integer not null check (image_height > 0),
  is_public_domain boolean not null default true,
  -- Uploads only (§5b): what the uploader says about the image's licence.
  licence text check (licence in ('public-domain', 'cc-by', 'unknown')),
  attribution text not null default '',
  source_url text,
  moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  moderation_reason text,
  created_by uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Catalogue works are looked up once and shared by everyone.
  unique (source, source_id),
  check (
    (kind = 'catalogue' and created_by is null and source <> 'user')
    or (kind = 'upload' and created_by is not null and source = 'user')
  )
);

-- A user's own edits to a catalogue work's label (§4). The shared row is
-- never edited by users.
create table public.artwork_overrides (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  fields jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner_id, artwork_id)
);

-- ---------------------------------------------------------------------------
-- Placements: a work hung in a room (or waiting in the storeroom)
-- ---------------------------------------------------------------------------

create table public.placements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- Null means the storeroom: deleting a room moves its works here.
  room_id uuid,
  artwork_id uuid not null references public.artworks (id) on delete restrict,
  wall text check (wall in ('north', 'east', 'south', 'west')),
  -- Metres on the wall: x along it from its centre, y the height of the
  -- painting's centre (see the app's wallTransforms.ts).
  x real not null default 0,
  y real not null default 1.6,
  frame jsonb not null default '{}'::jsonb,
  show_label boolean not null default true,
  personal_note text check (char_length(personal_note) <= 1000),
  created_at timestamptz not null default now(),
  -- The room must belong to the same owner. Deleting the room clears only
  -- room_id (Postgres 15+), sending the work to the storeroom (§2.5).
  foreign key (room_id, owner_id) references public.rooms (id, owner_id)
    on delete set null (room_id)
);
create index placements_room_idx on public.placements (room_id);
create index placements_owner_idx on public.placements (owner_id);

-- ---------------------------------------------------------------------------
-- Social: guestbook, follows, saved works, reports (§5, §5a)
-- ---------------------------------------------------------------------------

create table public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  gallery_owner_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index guestbook_gallery_idx on public.guestbook_entries (gallery_owner_id, created_at desc);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create table public.saved_artworks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  from_placement_id uuid references public.placements (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, artwork_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('gallery', 'guestbook_entry', 'artwork')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Starter collection template (§9): copied into every new account
-- ---------------------------------------------------------------------------

create table public.starter_rooms (
  position integer primary key,
  slug text not null,
  name text not null,
  intro text not null default '',
  theme jsonb not null default '{}'::jsonb
);

create table public.starter_placements (
  id serial primary key,
  room_position integer not null references public.starter_rooms (position) on delete cascade,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  wall text not null check (wall in ('north', 'east', 'south', 'west')),
  x real not null,
  y real not null,
  frame jsonb not null default '{}'::jsonb,
  show_label boolean not null default true
);

-- Read only by the sign-up function; no policies.
alter table public.starter_rooms enable row level security;
alter table public.starter_placements enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers used by the policies
-- ---------------------------------------------------------------------------

-- Can the current visitor see this owner's collection? Public galleries:
-- anyone. Private: only the owner. (Security definer so policies on other
-- tables can check a profile without depending on the profiles policies.)
create function public.can_view_collection(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = owner
      and (p.visibility = 'public' or p.id = (select auth.uid()))
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security policies
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.artworks enable row level security;
alter table public.artwork_overrides enable row level security;
alter table public.placements enable row level security;
alter table public.guestbook_entries enable row level security;
alter table public.follows enable row level security;
alter table public.saved_artworks enable row level security;
alter table public.reports enable row level security;

-- Profiles: public ones are visible to everyone; you always see your own.
-- Created only by the sign-up trigger; you can edit only your own.
create policy "Public profiles and your own are visible"
  on public.profiles for select
  using (visibility = 'public' or id = (select auth.uid()));
create policy "You can update your own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Rooms: visible with the collection; the owner can add, change and remove.
create policy "Rooms are visible with their collection"
  on public.rooms for select
  using (public.can_view_collection(owner_id));
create policy "Owners add their own rooms"
  on public.rooms for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Owners change their own rooms"
  on public.rooms for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Owners remove their own rooms"
  on public.rooms for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Artworks: catalogue works are public. An upload is visible to its owner;
-- other people see it only if it's approved and openly licensed (§5b:
-- "Not sure / in copyright" uploads stay private even in shared galleries).
-- No write policies: catalogue rows are written by the server (Phase 6),
-- uploads by the upload flow (Phase 7b).
create policy "Catalogue works are public"
  on public.artworks for select
  using (kind = 'catalogue');
create policy "Uploads are visible to their owner"
  on public.artworks for select to authenticated
  using (kind = 'upload' and created_by = (select auth.uid()));
create policy "Approved, openly licensed uploads show in their gallery"
  on public.artworks for select
  using (
    kind = 'upload'
    and moderation_status = 'approved'
    and licence in ('public-domain', 'cc-by')
    and public.can_view_collection(created_by)
  );

-- Label edits: visible with the collection; owners write their own.
create policy "Label edits are visible with their collection"
  on public.artwork_overrides for select
  using (public.can_view_collection(owner_id));
create policy "Owners write their own label edits"
  on public.artwork_overrides for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Placements: visible with the collection. Owners can hang catalogue works
-- and their own uploads, never someone else's upload (§4).
create policy "Hung works are visible with their collection"
  on public.placements for select
  using (public.can_view_collection(owner_id));
create policy "Owners hang catalogue works and their own uploads"
  on public.placements for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.artworks a
      where a.id = artwork_id
        and (a.kind = 'catalogue' or a.created_by = (select auth.uid()))
    )
  );
create policy "Owners move and restyle their own works"
  on public.placements for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Owners take down their own works"
  on public.placements for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Guestbook (§5): readable where the gallery is visible and the guestbook is
-- on; signed by logged-in visitors; the owner (or author) can remove an
-- entry by setting deleted_at.
create policy "Guestbook entries are visible on open guestbooks"
  on public.guestbook_entries for select
  using (
    deleted_at is null
    and moderation_status = 'approved'
    and public.can_view_collection(gallery_owner_id)
    and exists (
      select 1 from public.profiles p
      where p.id = gallery_owner_id and p.guestbook_enabled
    )
  );
create policy "Gallery owners see their whole guestbook"
  on public.guestbook_entries for select to authenticated
  using (gallery_owner_id = (select auth.uid()));
create policy "Logged-in visitors sign open guestbooks"
  on public.guestbook_entries for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and moderation_status = 'approved'
    and deleted_at is null
    and public.can_view_collection(gallery_owner_id)
    and exists (
      select 1 from public.profiles p
      where p.id = gallery_owner_id and p.guestbook_enabled
    )
  );
create policy "Owners and authors can remove entries"
  on public.guestbook_entries for update to authenticated
  using (gallery_owner_id = (select auth.uid()) or author_id = (select auth.uid()));

-- Follows (§5a): you see who you follow; owners see their followers (for
-- the count). You can follow galleries you can see, and unfollow.
create policy "You see your follows and your followers"
  on public.follows for select to authenticated
  using (follower_id = (select auth.uid()) or followed_id = (select auth.uid()));
create policy "You follow galleries you can see"
  on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and public.can_view_collection(followed_id));
create policy "You unfollow"
  on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

-- Saved works (§5a): private to you.
create policy "Your saved works are yours"
  on public.saved_artworks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Reports: anyone logged in can file one; only admins read them (Phase 13).
create policy "Logged-in users can report"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');

-- ---------------------------------------------------------------------------
-- Rules enforced by triggers
-- ---------------------------------------------------------------------------

-- At most 10 rooms per collection (§2.5), even via the API.
create function public.enforce_room_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Lock the owner's profile row so two inserts at once can't both squeeze in.
  perform 1 from public.profiles where id = new.owner_id for update;
  if (select count(*) from public.rooms where owner_id = new.owner_id) >= 10 then
    raise exception 'A collection can have at most 10 rooms.'
      using errcode = 'check_violation', hint = 'room_limit';
  end if;
  return new;
end;
$$;
create trigger rooms_limit
  before insert on public.rooms
  for each row execute function public.enforce_room_limit();

-- A collection always keeps at least one room (§2.5). Deleting the whole
-- account (the profile) is still allowed.
create function public.keep_one_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles where id = old.owner_id)
     and not exists (
       select 1 from public.rooms where owner_id = old.owner_id and id <> old.id
     ) then
    raise exception 'A collection needs at least one room.'
      using errcode = 'check_violation', hint = 'last_room';
  end if;
  return old;
end;
$$;
create trigger rooms_keep_one
  before delete on public.rooms
  for each row execute function public.keep_one_room();

-- Mark a collection as customised on the owner's first change (§5), so it
-- can be offered "Make it public?". Changes made with no logged-in user
-- (like copying the starter collection at sign-up) don't count.
create function public.mark_customised()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := coalesce(new.owner_id, old.owner_id);
begin
  if (select auth.uid()) is not null and (select auth.uid()) = owner then
    update public.profiles set has_customised = true
    where id = owner and not has_customised;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger placements_mark_customised
  after insert or update or delete on public.placements
  for each row execute function public.mark_customised();
create trigger rooms_mark_customised
  after insert or delete or update of name, intro, theme on public.rooms
  for each row execute function public.mark_customised();

-- ---------------------------------------------------------------------------
-- Sign-up: check the allowlist, then create the profile and starter rooms
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_mode text;
  base text;
  candidate text;
  attempt integer := 0;
begin
  -- Personal mode (§0b): invite-only. Raising here rolls back the new
  -- account, so a non-allowlisted email simply can't sign up.
  select s.mode into app_mode from public.app_settings s;
  if coalesce(app_mode, 'personal') = 'personal'
     and not exists (
       select 1 from public.signup_allowlist w where w.email = lower(new.email)
     ) then
    raise exception 'Salon is invite-only at the moment.'
      using errcode = 'insufficient_privilege', hint = 'not_allowlisted';
  end if;

  -- A starting username from the email address (they choose their own on
  -- the welcome page): "Ada.Lovelace@x.com" → "ada-lovelace".
  base := trim(both '-' from regexp_replace(
    lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9]+', '-', 'g'));
  base := trim(both '-' from left(base, 24));
  if char_length(base) < 3 then
    base := 'collector';
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate)
        or candidate in ('demo', 'admin', 'api', 'login', 'logout', 'welcome', 'settings',
          'auth', 'add', 'saved', 'following', 'explore', 'about', 'help', 'salon', 'g') loop
    attempt := attempt + 1;
    candidate := base || '-' || attempt;
  end loop;

  -- The starter gallery is private by default (§5).
  insert into public.profiles (id, username, display_name, visibility)
  values (new.id, candidate, nullif(new.raw_user_meta_data ->> 'full_name', ''), 'private');

  insert into public.rooms (owner_id, slug, name, intro, position, theme)
  select new.id, s.slug, s.name, s.intro, s.position, s.theme
  from public.starter_rooms s;

  -- New accounts get their own placements of the shared starter artworks.
  insert into public.placements (owner_id, room_id, artwork_id, wall, x, y, frame, show_label)
  select new.id, r.id, sp.artwork_id, sp.wall, sp.x, sp.y, sp.frame, sp.show_label
  from public.starter_placements sp
  join public.rooms r on r.owner_id = new.id and r.position = sp.room_position;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
