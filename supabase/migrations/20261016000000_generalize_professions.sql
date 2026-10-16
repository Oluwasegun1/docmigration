-- Generalize the data model beyond doctors. ADDITIVE ONLY: no column or table
-- from 20261015000000_dashboard_core.sql is dropped, renamed or rewritten, and
-- existing rows are preserved.
--
--   1. professions reference table; pathways.profession becomes an FK to it.
--   2. pathways.track separates professional licensing from immigration/visa,
--      with pathway_links joining a licensing pathway to its visa pathway.
--   3. requirements (incl. document checklist) and pathway_costs, each
--      source-linked to a published resource and versioned by row.
--   4. plan_requirements: per-user progress on a requirement.
--   5. Row versioning + immutability of published regulatory content.
--
-- Reference content is written with the service role only (no write policies).
-- Existing profiles.medical_* columns are intentionally untouched.

-- ---------------------------------------------------------------------------
-- 1. Professions
-- ---------------------------------------------------------------------------

create table professions (
  code      text primary key check (code ~ '^[a-z][a-z_]{1,39}$'),
  name      text not null,
  is_active boolean not null default false
);

insert into professions (code, name, is_active) values
  ('doctor',  'Doctor',  true),
  ('nurse',   'Nurse',   false),
  ('midwife', 'Midwife', false);

-- Keep any pre-existing free-text value valid before adding the FK.
insert into professions (code, name)
select distinct p.profession, initcap(replace(p.profession, '_', ' '))
from pathways p
where p.profession ~ '^[a-z][a-z_]{1,39}$'
on conflict (code) do nothing;

alter table pathways
  add constraint pathways_profession_fk
  foreign key (profession) references professions (code);

alter table profiles add column profession text references professions (code);
-- Every existing profile was created by the doctor-only product.
update profiles set profession = 'doctor' where profession is null;

-- ---------------------------------------------------------------------------
-- 2. Licensing vs immigration
-- ---------------------------------------------------------------------------

create type pathway_track as enum ('licensing', 'immigration');

alter table pathways add column track pathway_track not null default 'licensing';

-- A licensing pathway (e.g. GMC registration) can be paired with the
-- immigration pathway (e.g. a work visa) that the same plan also needs.
create table pathway_links (
  licensing_pathway_id   uuid not null references pathways (id) on delete cascade,
  immigration_pathway_id uuid not null references pathways (id) on delete cascade,
  primary key (licensing_pathway_id, immigration_pathway_id),
  check (licensing_pathway_id <> immigration_pathway_id)
);

create function check_pathway_link_tracks() returns trigger
language plpgsql as $$
begin
  if (select track from pathways where id = new.licensing_pathway_id) <> 'licensing'
     or (select track from pathways where id = new.immigration_pathway_id) <> 'immigration' then
    raise exception 'pathway_links must join a licensing pathway to an immigration pathway';
  end if;
  return new;
end;
$$;

create trigger pathway_links_tracks
  before insert or update on pathway_links
  for each row execute function check_pathway_link_tracks();

-- ---------------------------------------------------------------------------
-- 3. Versioned, source-linked requirements and costs
-- ---------------------------------------------------------------------------
-- Versioning model: a published row is never edited. A change is a new row with
-- the same (pathway_id, key), version + 1 and supersedes_id pointing at the
-- previous row; the old row is then set to 'withdrawn'.

create type requirement_kind as enum
  ('eligibility', 'document', 'exam', 'language', 'other');

create table requirements (
  id            uuid primary key default gen_random_uuid(),
  pathway_id    uuid not null references pathways (id),
  key           text not null check (key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  version       int  not null default 1 check (version >= 1),
  supersedes_id uuid references requirements (id),
  kind          requirement_kind not null,
  title         text not null check (char_length(title) <= 200),
  description   text,
  is_mandatory  boolean not null default true,
  sort_order    int not null default 0,
  resource_id   uuid not null references resources (id),
  status        content_status not null default 'draft',
  created_at    timestamptz not null default now(),
  unique (pathway_id, key, version)
);
create index requirements_pathway_idx on requirements (pathway_id, status);

create table pathway_costs (
  id            uuid primary key default gen_random_uuid(),
  pathway_id    uuid not null references pathways (id),
  key           text not null check (key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  version       int  not null default 1 check (version >= 1),
  supersedes_id uuid references pathway_costs (id),
  title         text not null check (char_length(title) <= 200),
  amount        numeric(12, 2) not null check (amount >= 0),
  currency      char(3) not null check (currency ~ '^[A-Z]{3}$'),
  is_estimate   boolean not null default false,
  resource_id   uuid not null references resources (id),
  status        content_status not null default 'draft',
  created_at    timestamptz not null default now(),
  unique (pathway_id, key, version)
);
create index pathway_costs_pathway_idx on pathway_costs (pathway_id, status);

-- Resources get the same versioning columns.
alter table resources
  add column version int not null default 1 check (version >= 1),
  add column supersedes_id uuid references resources (id);

-- Publishing needs a published source.
create function require_published_source() returns trigger
language plpgsql as $$
begin
  if new.status = 'published' and not exists (
    select 1 from resources r where r.id = new.resource_id and r.status = 'published'
  ) then
    raise exception 'a published row must cite a published resource';
  end if;
  return new;
end;
$$;

create trigger requirements_source_published
  before insert or update on requirements
  for each row execute function require_published_source();
create trigger pathway_costs_source_published
  before insert or update on pathway_costs
  for each row execute function require_published_source();

-- Published content is immutable except for withdrawal. Resources may also be
-- re-verified (verified_date / review_due_date) without a new version.
create function guard_published_content() returns trigger
language plpgsql as $$
declare
  old_json jsonb := to_jsonb(old);
  new_json jsonb := to_jsonb(new);
  ignored  text[] := array['status'];
begin
  if old.status <> 'published' then
    return new;
  end if;
  if tg_table_name = 'resources' then
    ignored := ignored || array['verified_date', 'review_due_date'];
  end if;
  if new.status not in ('published', 'withdrawn')
     or (new_json - ignored) <> (old_json - ignored) then
    raise exception 'published content is immutable; create a new version instead';
  end if;
  return new;
end;
$$;

create trigger resources_immutable
  before update on resources
  for each row execute function guard_published_content();
create trigger requirements_immutable
  before update on requirements
  for each row execute function guard_published_content();
create trigger pathway_costs_immutable
  before update on pathway_costs
  for each row execute function guard_published_content();

-- ---------------------------------------------------------------------------
-- 4. Per-user requirement progress (document checklist, etc.)
-- ---------------------------------------------------------------------------

create type plan_requirement_status as enum
  ('not_started', 'in_progress', 'completed', 'not_applicable');

create table plan_requirements (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references plans (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  requirement_id uuid not null references requirements (id),
  status         plan_requirement_status not null default 'not_started',
  notes          text check (char_length(notes) <= 1000),
  updated_at     timestamptz not null default now(),
  unique (plan_id, requirement_id)
);
create index plan_requirements_user_idx on plan_requirements (user_id, plan_id);

create trigger plan_requirements_updated_at
  before update on plan_requirements
  for each row execute function set_updated_at();

-- Users may only change status and notes.
create function plan_requirements_guard() returns trigger
language plpgsql as $$
begin
  if new.id <> old.id or new.plan_id <> old.plan_id
     or new.user_id <> old.user_id or new.requirement_id <> old.requirement_id then
    raise exception 'only status and notes can be changed';
  end if;
  return new;
end;
$$;

create trigger plan_requirements_guard_trg
  before update on plan_requirements
  for each row execute function plan_requirements_guard();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table professions        enable row level security;
alter table pathway_links      enable row level security;
alter table requirements       enable row level security;
alter table pathway_costs      enable row level security;
alter table plan_requirements  enable row level security;

create policy professions_read on professions
  for select to anon, authenticated using (is_active);
create policy pathway_links_read on pathway_links
  for select to anon, authenticated using (true);
create policy requirements_read_published on requirements
  for select to anon, authenticated using (status = 'published');
create policy pathway_costs_read_published on pathway_costs
  for select to anon, authenticated using (status = 'published');

-- Like plans, rows are created server-side (plan creation is not built yet).
create policy plan_requirements_select_own on plan_requirements
  for select to authenticated using (user_id = (select auth.uid()));
create policy plan_requirements_update_own on plan_requirements
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
