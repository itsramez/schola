-- ============ CLASSES: a subject taught by one teacher to a specific roster ============
-- Decouples "subject" from "teacher account" so one teacher login can hold several
-- independent classes (different subjects, or the same subject taught to different
-- rosters), each with its own enrollment. A class's roster is either every student in
-- a Section (roster_mode = 'section') or an explicit manual list (roster_mode = 'manual')
-- — never both, to keep the model and RLS simple.

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  teacher_id uuid not null references public.users(id) on delete cascade,
  subject_id uuid not null references public.subject_catalog(id) on delete cascade,
  roster_mode text not null check (roster_mode in ('section', 'manual')),
  section_id uuid references public.class_sections(id) on delete set null,
  name text,
  created_at timestamptz not null default now()
);
alter table public.classes enable row level security;

drop trigger if exists trg_classes_school_id on public.classes;
create trigger trg_classes_school_id before insert on public.classes
  for each row execute function public.set_school_id();

create table if not exists public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);
alter table public.class_enrollments enable row level security;

drop trigger if exists trg_class_enrollments_school_id on public.class_enrollments;
create trigger trg_class_enrollments_school_id before insert on public.class_enrollments
  for each row execute function public.set_school_id();

-- ---- classes: readable by the whole school (students need to resolve their own roster
-- membership and see teacher/subject names), admin-only write ----
drop policy if exists "classes select" on public.classes;
create policy "classes select" on public.classes for select
using (school_id = public.my_school_id());

drop policy if exists "classes write" on public.classes;
create policy "classes write" on public.classes for all
using (public.is_admin())
with check (public.is_admin());

-- ---- class_enrollments: admin, the class's own teacher, the enrolled student, or their parent can read; admin-only write ----
drop policy if exists "class enrollments select" on public.class_enrollments;
create policy "class enrollments select" on public.class_enrollments for select
using (
  public.is_admin()
  or student_id = auth.uid()
  or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
);

drop policy if exists "class enrollments write" on public.class_enrollments;
create policy "class enrollments write" on public.class_enrollments for all
using (public.is_admin())
with check (public.is_admin());

alter publication supabase_realtime add table public.classes;
alter publication supabase_realtime add table public.class_enrollments;

-- ============ BACKFILL: one manual-roster class per existing teacher, enrolled with every current student ============
-- Preserves today's "broadcast to everyone" visibility exactly, so nothing already-created
-- (assignments, quizzes, etc.) goes dark once those tables move to class_id-based RLS.
-- Idempotent — safe to re-run; skips teachers who already have a class.
--
-- set_school_id() unconditionally overwrites school_id from public.my_school_id() (the
-- current JWT's claims), which is null outside an authenticated session — this migration
-- runs with no session, so the trigger would null out every row and trip the NOT NULL
-- constraint. Disable it for the duration of the backfill and supply school_id explicitly.
alter table public.subject_catalog disable trigger trg_subject_catalog_school_id;
alter table public.classes disable trigger trg_classes_school_id;
alter table public.class_enrollments disable trigger trg_class_enrollments_school_id;

do $$
declare
  t record;
  s_id uuid;
  c_id uuid;
begin
  for t in select id, school_id, subject_name from public.users where role = 'teacher' loop
    if not exists (select 1 from public.classes where teacher_id = t.id) then
      select id into s_id from public.subject_catalog
        where school_id = t.school_id and lower(name) = lower(coalesce(nullif(trim(t.subject_name), ''), 'General'))
        limit 1;

      if s_id is null then
        insert into public.subject_catalog (school_id, name)
          values (t.school_id, coalesce(nullif(trim(t.subject_name), ''), 'General'))
          returning id into s_id;
      end if;

      insert into public.classes (school_id, teacher_id, subject_id, roster_mode)
        values (t.school_id, t.id, s_id, 'manual')
        returning id into c_id;

      insert into public.class_enrollments (school_id, class_id, student_id)
        select t.school_id, c_id, u.id from public.users u
        where u.role = 'student' and u.school_id = t.school_id
        on conflict do nothing;
    end if;
  end loop;
end $$;

alter table public.subject_catalog enable trigger trg_subject_catalog_school_id;
alter table public.classes enable trigger trg_classes_school_id;
alter table public.class_enrollments enable trigger trg_class_enrollments_school_id;
