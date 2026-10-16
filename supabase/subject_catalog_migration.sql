-- ============ SUBJECT CATALOG ============
-- A simple admin-managed list of subject names, independent of any teacher account.
-- Lets the admin pre-create subjects (e.g. "Physics") before a teacher exists for them,
-- and lets the "Subject" field when creating a teacher pick from this list instead of free-typing.

create table if not exists public.subject_catalog (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);
alter table public.subject_catalog enable row level security;

drop trigger if exists trg_subject_catalog_school_id on public.subject_catalog;
create trigger trg_subject_catalog_school_id before insert on public.subject_catalog
  for each row execute function public.set_school_id();

-- readable by everyone in the school, writable by admin only
drop policy if exists "subject catalog select" on public.subject_catalog;
create policy "subject catalog select" on public.subject_catalog for select
using (school_id = public.my_school_id());

drop policy if exists "subject catalog write" on public.subject_catalog;
create policy "subject catalog write" on public.subject_catalog for all
using (public.is_admin())
with check (public.is_admin());

alter publication supabase_realtime add table public.subject_catalog;
