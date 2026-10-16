-- ============ OWNER (platform-level, above admin — sees every school) ============
create table if not exists public.owners (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.owners enable row level security;

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.owners where id = auth.uid());
$$;

drop policy if exists "owners select self" on public.owners;
create policy "owners select self" on public.owners for select to authenticated
using (id = auth.uid());

-- Owner can see every school and every school's users (admins, for the per-school dashboard).
drop policy if exists "schools select own" on public.schools;
create policy "schools select own" on public.schools for select to authenticated
using (id = public.my_school_id() or public.is_owner());

drop policy if exists "users select own school" on public.users;
create policy "users select own school" on public.users for select to authenticated
using (school_id = public.my_school_id() or public.is_owner());

-- ============ SCHOOL FEATURE FLAGS (owner toggles per school) ============
create table if not exists public.school_features (
  school_id uuid not null references public.schools(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (school_id, feature_key)
);
alter table public.school_features enable row level security;

drop policy if exists "school_features select" on public.school_features;
create policy "school_features select" on public.school_features for select to authenticated
using (school_id = public.my_school_id() or public.is_owner());

drop policy if exists "school_features write" on public.school_features;
create policy "school_features write" on public.school_features for all to authenticated
using (public.is_owner())
with check (public.is_owner());

-- ============ CLASS SECTIONS (homeroom groupings an admin pre-builds) ============
create table if not exists public.class_sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  grade int,
  created_at timestamptz not null default now()
);
alter table public.class_sections enable row level security;

drop trigger if exists trg_class_sections_school_id on public.class_sections;
create trigger trg_class_sections_school_id before insert on public.class_sections
  for each row execute function public.set_school_id();

drop policy if exists "class_sections select" on public.class_sections;
create policy "class_sections select" on public.class_sections for select to authenticated
using (school_id = public.my_school_id());

drop policy if exists "class_sections write" on public.class_sections;
create policy "class_sections write" on public.class_sections for all to authenticated
using (public.is_admin() and school_id = public.my_school_id())
with check (public.is_admin());

-- ============ CLASS SECTION PERIODS (the weekly schedule for a section) ============
create table if not exists public.class_section_periods (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.class_sections(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  day int not null check (day between 0 and 6),
  start_time time not null,
  end_time time not null,
  subject_label text not null,
  teacher_id uuid references public.users(id) on delete set null,
  room text,
  created_at timestamptz not null default now()
);
alter table public.class_section_periods enable row level security;

drop trigger if exists trg_class_section_periods_school_id on public.class_section_periods;
create trigger trg_class_section_periods_school_id before insert on public.class_section_periods
  for each row execute function public.set_school_id();

drop policy if exists "class_section_periods select" on public.class_section_periods;
create policy "class_section_periods select" on public.class_section_periods for select to authenticated
using (school_id = public.my_school_id());

drop policy if exists "class_section_periods write" on public.class_section_periods;
create policy "class_section_periods write" on public.class_section_periods for all to authenticated
using (public.is_admin() and school_id = public.my_school_id())
with check (public.is_admin());

-- ============ STUDENTS belong to a section ============
alter table public.users add column if not exists section_id uuid references public.class_sections(id) on delete set null;

alter publication supabase_realtime add table public.class_sections;
alter publication supabase_realtime add table public.class_section_periods;
alter publication supabase_realtime add table public.school_features;
