-- ============ EXAMS ============
-- Teacher-scheduled exam/midterm/final dates. Shown on the student calendar and notified like
-- assignments/quizzes. Mirrors the quizzes table's targeting + RLS shape.
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  subject_label text not null,
  kind text not null default 'exam' check (kind in ('quiz', 'midterm', 'final', 'exam')),
  date date not null,
  detail text,
  assigned_student_ids uuid[],
  school_id uuid not null references public.schools(id),
  created_at timestamptz not null default now()
);
alter table public.exams enable row level security;

drop trigger if exists trg_exams_school_id on public.exams;
create trigger trg_exams_school_id before insert on public.exams
  for each row execute function public.set_school_id();

drop policy if exists "exams select" on public.exams;
create policy "exams select" on public.exams for select to authenticated
using (
  school_id = public.my_school_id()
  and (
    assigned_student_ids is null
    or teacher_id = auth.uid()
    or public.is_admin()
    or auth.uid() = any(assigned_student_ids)
  )
);

drop policy if exists "exams insert" on public.exams;
create policy "exams insert" on public.exams for insert
with check (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "exams delete" on public.exams;
create policy "exams delete" on public.exams for delete
using (teacher_id = auth.uid() or public.is_admin());

alter publication supabase_realtime add table public.exams;
