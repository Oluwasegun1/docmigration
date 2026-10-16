-- Dashboard core schema (subset of docs/data-model.md).
-- Plan creation from reviewed templates is NOT implemented yet, so users get
-- no INSERT policy on plans/plan_tasks. They can read their own rows and
-- update task progress only.
--
-- Deviations from data-model.md (update that doc when merging):
--   * profiles.*_country columns are plain ISO codes without FK to countries
--     (countries only holds destinations that have published content).
--   * plans.status, pathways.profession, and the resources table are new.

create type internship_status as enum
  ('not_started', 'in_progress', 'completed', 'not_applicable', 'unknown');
create type language_test_status as enum
  ('unknown', 'not_required', 'not_started', 'booked', 'passed', 'expired', 'exempt');
create type timeline_window as enum
  ('within_6_months', '6_12_months', '1_2_years', 'exploring', 'unknown');
create type plan_task_status as enum
  ('not_started', 'in_progress', 'waiting', 'blocked', 'completed');
create type task_priority as enum ('low', 'medium', 'high');
create type content_status as enum ('draft', 'published', 'withdrawn');
create type resource_type as enum
  ('regulator_guidance', 'application_portal', 'examination', 'language_test',
   'immigration', 'fees', 'other');

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reference content (platform-owned, read-only to users)
-- ---------------------------------------------------------------------------

create table countries (
  code char(2) primary key check (code ~ '^[A-Z]{2}$'),
  name text not null
);

create table regulators (
  id         uuid primary key default gen_random_uuid(),
  country    char(2) not null references countries (code),
  name       text not null,
  short_name text not null,
  unique (country, short_name)
);

create table regulator_domains (
  regulator_id uuid not null references regulators (id),
  domain       text not null,
  primary key (regulator_id, domain)
);

create table pathways (
  id           uuid primary key default gen_random_uuid(),
  country      char(2) not null references countries (code),
  regulator_id uuid not null references regulators (id),
  slug         text not null unique,
  name         text not null,
  profession   text not null default 'doctor',
  is_active    boolean not null default true
);

create table resources (
  id              uuid primary key default gen_random_uuid(),
  regulator_id    uuid not null references regulators (id),
  country         char(2) not null references countries (code),
  pathway_id      uuid references pathways (id),
  title           text not null,
  resource_type   resource_type not null,
  source_url      text not null check (source_url ~* '^https://'),
  verified_date   date,
  review_due_date date,
  status          content_status not null default 'draft',
  created_at      timestamptz not null default now(),
  constraint published_resource_is_verified
    check (status <> 'published'
           or (verified_date is not null
               and review_due_date is not null
               and review_due_date > verified_date))
);

-- A published resource must link to its regulator's allow-listed domain.
create function check_resource_source_domain() returns trigger
language plpgsql as $$
declare
  host text := lower(substring(new.source_url from '^https://([^/:?#]+)'));
begin
  if new.status = 'published' and not exists (
    select 1 from regulator_domains d
    where d.regulator_id = new.regulator_id
      and (host = lower(d.domain) or host like '%.' || lower(d.domain))
  ) then
    raise exception 'source_url host is not on the regulator domain allow-list';
  end if;
  return new;
end;
$$;

create trigger resources_source_domain
  before insert or update on resources
  for each row execute function check_resource_source_domain();

-- ---------------------------------------------------------------------------
-- User-owned data
-- ---------------------------------------------------------------------------

create table profiles (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  preferred_name         text check (char_length(preferred_name) <= 80),
  residence_country      char(2) check (residence_country ~ '^[A-Z]{2}$'),
  medical_school         text check (char_length(medical_school) <= 200),
  medical_school_country char(2) check (medical_school_country ~ '^[A-Z]{2}$'),
  graduation_year        int check (graduation_year between 1950 and 2100),
  internship_status      internship_status not null default 'unknown',
  specialty              text check (char_length(specialty) <= 100),
  language_test_status   language_test_status not null default 'unknown',
  timeline               timeline_window not null default 'unknown',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create table destination_goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  country    char(2) not null references countries (code),
  pathway_id uuid references pathways (id),
  priority   smallint not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, country, pathway_id)
);

create table plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  pathway_id uuid not null references pathways (id),
  status     text not null default 'active'
             check (status in ('active', 'paused', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  unique (user_id, pathway_id)
);

create table plan_tasks (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references plans (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  pathway_id        uuid not null references pathways (id),
  title             text not null,
  description       text,
  priority          task_priority not null default 'medium',
  status            plan_task_status not null default 'not_started',
  sort_order        int not null,
  due_date          date,
  status_updated_at timestamptz not null default now(),
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  constraint completed_has_timestamp
    check ((status = 'completed') = (completed_at is not null))
);

create index plan_tasks_user_idx on plan_tasks (user_id, plan_id);

create table plan_task_dependencies (
  task_id            uuid not null references plan_tasks (id) on delete cascade,
  depends_on_task_id uuid not null references plan_tasks (id) on delete cascade,
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

-- Users may only change progress fields. Completion requires all dependencies
-- to be completed. Timestamps are set by the database, not the client.
create function plan_tasks_guard() returns trigger
language plpgsql as $$
begin
  if new.id <> old.id or new.plan_id <> old.plan_id or new.user_id <> old.user_id
     or new.pathway_id <> old.pathway_id or new.title <> old.title
     or new.description is distinct from old.description
     or new.sort_order <> old.sort_order or new.created_at <> old.created_at then
    raise exception 'only task progress fields can be changed';
  end if;

  if new.status = 'completed' and old.status <> 'completed' then
    if exists (
      select 1
      from plan_task_dependencies d
      join plan_tasks p on p.id = d.depends_on_task_id
      where d.task_id = new.id and p.status <> 'completed'
    ) then
      raise exception 'dependencies_incomplete';
    end if;
  end if;

  if new.status is distinct from old.status then
    new.status_updated_at = now();
  end if;
  new.completed_at = case when new.status = 'completed'
                          then coalesce(old.completed_at, now()) else null end;
  return new;
end;
$$;

create trigger plan_tasks_guard_trg
  before update on plan_tasks
  for each row execute function plan_tasks_guard();

-- ---------------------------------------------------------------------------
-- Row Level Security: default deny, explicit policies
-- ---------------------------------------------------------------------------

alter table countries              enable row level security;
alter table regulators             enable row level security;
alter table regulator_domains      enable row level security;
alter table pathways               enable row level security;
alter table resources              enable row level security;
alter table profiles               enable row level security;
alter table destination_goals      enable row level security;
alter table plans                  enable row level security;
alter table plan_tasks             enable row level security;
alter table plan_task_dependencies enable row level security;

create policy countries_read  on countries  for select to anon, authenticated using (true);
create policy regulators_read on regulators for select to anon, authenticated using (true);
create policy pathways_read   on pathways   for select to anon, authenticated using (is_active);
-- regulator_domains: no policies (server/admin only via service role).
create policy resources_read_published on resources
  for select to anon, authenticated using (status = 'published');

create policy profiles_select_own on profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_insert_own on profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_update_own on profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy profiles_delete_own on profiles
  for delete to authenticated using (user_id = (select auth.uid()));

create policy goals_all_own on destination_goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy plans_select_own on plans
  for select to authenticated using (user_id = (select auth.uid()));

create policy plan_tasks_select_own on plan_tasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy plan_tasks_update_own on plan_tasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy plan_task_deps_select_own on plan_task_dependencies
  for select to authenticated
  using (exists (
    select 1 from plan_tasks t
    where t.id = task_id and t.user_id = (select auth.uid())
  ));
