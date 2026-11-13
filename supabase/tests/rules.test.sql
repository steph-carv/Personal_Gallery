-- Tests for the schema's rules: sign-up, privacy, ownership, limits.
-- Run with scripts/test-db.sh. Each check raises an error if it fails.
\set ON_ERROR_STOP on
\set QUIET on
-- Only the notices ("ok - ...") matter; hide query results.
\o /dev/null

create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- Run a statement and report whether it raised an error.
create function pg_temp.fails(statement text) returns boolean language plpgsql as $$
begin
  execute statement;
  return false;
exception when others then
  return true;
end $$;

-- Who's asking: a user id, or null for a logged-out visitor.
create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', coalesce(json_build_object('sub', uid)::text, ''), false);
  if uid is null then execute 'set role anon'; else execute 'set role authenticated'; end if;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- ---------------------------------------------------------------- sign-up
select pg_temp.check(pg_temp.fails($$insert into auth.users (email) values ('stranger@example.com')$$),
  'personal mode: an email not on the allowlist cannot sign up');
insert into public.signup_allowlist (email) values ('ada.lovelace@example.com'), ('bob@example.com'), ('ada.lovelace@other.org');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'Ada.Lovelace@example.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000b', 'bob@example.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'ada.lovelace@other.org');
select pg_temp.check((select username from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'ada-lovelace',
  'username comes from the email address');
select pg_temp.check((select username from profiles where id = '00000000-0000-0000-0000-00000000000c') = 'ada-lovelace-1',
  'clashing usernames get a number');
select pg_temp.check((select visibility from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'private',
  'the starter gallery is private');
select pg_temp.check((select count(*) from rooms where owner_id = '00000000-0000-0000-0000-00000000000a') = 3,
  'new account gets 3 starter rooms');
select pg_temp.check((select count(*) from placements where owner_id = '00000000-0000-0000-0000-00000000000a') = 11,
  'new account gets the 11 starter placements');
select pg_temp.check((select count(*) from placements p join rooms r on r.id = p.room_id
  where p.owner_id = '00000000-0000-0000-0000-00000000000a' and r.position = 0) = 5,
  'Room 1 has five works');
select pg_temp.check(not (select has_customised from profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'copying the starter collection does not count as customising');

-- ---------------------------------------------------------------- privacy
select pg_temp.act_as(null);
select pg_temp.check((select count(*) from profiles) = 0, 'visitors cannot see private profiles');
select pg_temp.check((select count(*) from rooms) = 0, 'visitors cannot see private rooms');
select pg_temp.check((select count(*) from placements) = 0, 'visitors cannot see private placements');
select pg_temp.check((select count(*) from artworks) = 11, 'catalogue artworks are public');
select pg_temp.check((select count(*) from starter_rooms) = 0, 'the starter template is not readable through the API');
select pg_temp.check((select count(*) from signup_allowlist) = 0, 'the allowlist is not readable through the API');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from rooms where owner_id = '00000000-0000-0000-0000-00000000000a') = 0,
  'another user cannot see a private gallery');
select pg_temp.check((select count(*) from rooms) = 3, 'you see your own private rooms');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update profiles set visibility = 'public' where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.act_as(null);
select pg_temp.check((select count(*) from rooms) = 3 and (select count(*) from placements) = 11,
  'a public gallery is visible to logged-out visitors');

-- ---------------------------------------------------------------- ownership
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
update rooms set name = 'Mine now' where owner_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select count(*) from rooms where name = 'Mine now') = 0,
  'you cannot rename someone else''s room');
select pg_temp.check(pg_temp.fails($$insert into rooms (owner_id, slug, name, position)
  values ('00000000-0000-0000-0000-00000000000a', 'sneaky', 'Sneaky', 9)$$),
  'you cannot add a room to someone else''s collection');
update profiles set visibility = 'private' where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select visibility from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'public',
  'you cannot change someone else''s profile');
select pg_temp.check(pg_temp.fails($$insert into placements (owner_id, room_id, artwork_id)
  select '00000000-0000-0000-0000-00000000000b', r.id, (select id from artworks limit 1)
  from rooms r where r.owner_id = '00000000-0000-0000-0000-00000000000a' limit 1$$),
  'you cannot hang a work in someone else''s room');
select pg_temp.check(pg_temp.fails($$update profiles set username = 'demo'
  where id = '00000000-0000-0000-0000-00000000000b'$$), 'reserved usernames are refused');

-- ---------------------------------------------------------------- customising
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update rooms set name = 'My Portraits' where owner_id = '00000000-0000-0000-0000-00000000000a' and position = 0;
reset role;
select pg_temp.check((select has_customised from profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'renaming a room marks the collection as customised');
select pg_temp.check(not (select has_customised from profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'other collections are not marked');

-- ---------------------------------------------------------------- room limits
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into rooms (owner_id, slug, name, position)
select '00000000-0000-0000-0000-00000000000a', 'extra-' || n, 'Extra ' || n, 2 + n from generate_series(1, 7) n;
select pg_temp.check((select count(*) from rooms where owner_id = '00000000-0000-0000-0000-00000000000a') = 10,
  'you can have 10 rooms');
select pg_temp.check(pg_temp.fails($$insert into rooms (owner_id, slug, name, position)
  values ('00000000-0000-0000-0000-00000000000a', 'eleven', 'Eleven', 10)$$),
  'an 11th room is refused, even through the API');

delete from rooms where owner_id = '00000000-0000-0000-0000-00000000000a' and position = 1;
select pg_temp.check((select count(*) from placements where owner_id = '00000000-0000-0000-0000-00000000000a') = 11
  and (select count(*) from placements where owner_id = '00000000-0000-0000-0000-00000000000a' and room_id is null) = 6,
  'deleting a room moves its works to the storeroom');
delete from rooms where owner_id = '00000000-0000-0000-0000-00000000000a' and position > 0;
select pg_temp.check(pg_temp.fails($$delete from rooms where owner_id = '00000000-0000-0000-0000-00000000000a'$$),
  'the last room cannot be deleted');

-- ---------------------------------------------------------------- uploads
reset role;
insert into artworks (id, kind, source, title, image_url, image_width, image_height, licence, created_by)
values ('00000000-0000-0000-0000-0000000000f1', 'upload', 'user', 'Ada''s find', '/x.jpg', 10, 10, 'unknown',
  '00000000-0000-0000-0000-00000000000a');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from artworks where kind = 'upload') = 0,
  'an "in copyright / not sure" upload stays private in a public gallery');
select pg_temp.check(pg_temp.fails($$insert into placements (owner_id, artwork_id)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000f1')$$),
  'you cannot hang someone else''s upload');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into placements (owner_id, artwork_id) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000f1');
select pg_temp.check(true, 'you can hang your own upload (in the storeroom)');
reset role;
update artworks set licence = 'cc-by' where id = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.act_as(null);
select pg_temp.check((select count(*) from artworks where kind = 'upload') = 1,
  'an openly licensed upload is visible in a public gallery');

-- ---------------------------------------------------------------- guestbook and follows
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check(pg_temp.fails($$insert into guestbook_entries (gallery_owner_id, author_id, body)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'Lovely!')$$),
  'you cannot sign a guestbook that is switched off');
reset role;
update profiles set guestbook_enabled = true where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into guestbook_entries (gallery_owner_id, author_id, body)
values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'Lovely!');
select pg_temp.act_as(null);
select pg_temp.check((select count(*) from guestbook_entries) = 1, 'signed entries are visible on an open guestbook');
select pg_temp.check(pg_temp.fails($$insert into guestbook_entries (gallery_owner_id, author_id, body)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'Anon')$$),
  'logged-out visitors cannot sign');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into follows (follower_id, followed_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
select pg_temp.check(true, 'you can follow a public gallery');
select pg_temp.check(pg_temp.fails($$insert into follows (follower_id, followed_id)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c')$$),
  'you cannot follow a private gallery');
select pg_temp.act_as(null);
select pg_temp.check((select count(*) from follows) = 0, 'visitors cannot see who follows whom');

-- ---------------------------------------------------------------- account deletion and public mode
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select count(*) from profiles where id = '00000000-0000-0000-0000-00000000000a') = 0
  and (select count(*) from rooms where owner_id = '00000000-0000-0000-0000-00000000000a') = 0
  and (select count(*) from placements where owner_id = '00000000-0000-0000-0000-00000000000a') = 0,
  'deleting an account removes its profile, rooms and placements');
update app_settings set mode = 'public';
insert into auth.users (email) values ('stranger@example.com');
select pg_temp.check(true, 'public mode: anyone can sign up');
