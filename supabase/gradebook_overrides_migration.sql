-- ============ GRADEBOOK: edit weights, grading defaults, per-student overrides ============

-- 1. Let a teacher edit the weight of a quiz/exam after creating it.
drop policy if exists "quizzes update" on public.quizzes;
create policy "quizzes update" on public.quizzes for update
using (teacher_id = auth.uid() or public.is_admin())
with check (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "exams update" on public.exams;
create policy "exams update" on public.exams for update
using (teacher_id = auth.uid() or public.is_admin())
with check (teacher_id = auth.uid() or public.is_admin());

-- 2. Per-teacher default weight, used to prefill new quizzes/exams (still overridable per item).
create table if not exists public.teacher_grading_defaults (
  teacher_id uuid primary key references public.users(id) on delete cascade,
  quiz_weight numeric,
  exam_weight numeric,
  school_id uuid references public.schools(id),
  updated_at timestamptz not null default now()
);
alter table public.teacher_grading_defaults enable row level security;

drop trigger if exists trg_teacher_grading_defaults_school_id on public.teacher_grading_defaults;
create trigger trg_teacher_grading_defaults_school_id before insert on public.teacher_grading_defaults
  for each row execute function public.set_school_id();

drop policy if exists "grading defaults select" on public.teacher_grading_defaults;
create policy "grading defaults select" on public.teacher_grading_defaults for select
using (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "grading defaults insert" on public.teacher_grading_defaults;
create policy "grading defaults insert" on public.teacher_grading_defaults for insert
with check (teacher_id = auth.uid());

drop policy if exists "grading defaults update" on public.teacher_grading_defaults;
create policy "grading defaults update" on public.teacher_grading_defaults for update
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

-- 3. Per-student weight overrides -- e.g. a student on a modified plan weighs an item differently.
create table if not exists public.quiz_weight_overrides (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  weight_percent numeric not null,
  school_id uuid references public.schools(id),
  created_at timestamptz not null default now(),
  unique (quiz_id, student_id)
);
alter table public.quiz_weight_overrides enable row level security;

drop trigger if exists trg_quiz_weight_overrides_school_id on public.quiz_weight_overrides;
create trigger trg_quiz_weight_overrides_school_id before insert on public.quiz_weight_overrides
  for each row execute function public.set_school_id();

drop policy if exists "quiz weight overrides select" on public.quiz_weight_overrides;
create policy "quiz weight overrides select" on public.quiz_weight_overrides for select
using (
  student_id = auth.uid()
  or exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "quiz weight overrides write" on public.quiz_weight_overrides;
create policy "quiz weight overrides write" on public.quiz_weight_overrides for all
using (exists (select 1 from public.quizzes q where q.id = quiz_id and (q.teacher_id = auth.uid() or public.is_admin())))
with check (exists (select 1 from public.quizzes q where q.id = quiz_id and (q.teacher_id = auth.uid() or public.is_admin())));

create table if not exists public.exam_weight_overrides (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  weight_percent numeric not null,
  school_id uuid references public.schools(id),
  created_at timestamptz not null default now(),
  unique (exam_id, student_id)
);
alter table public.exam_weight_overrides enable row level security;

drop trigger if exists trg_exam_weight_overrides_school_id on public.exam_weight_overrides;
create trigger trg_exam_weight_overrides_school_id before insert on public.exam_weight_overrides
  for each row execute function public.set_school_id();

drop policy if exists "exam weight overrides select" on public.exam_weight_overrides;
create policy "exam weight overrides select" on public.exam_weight_overrides for select
using (
  student_id = auth.uid()
  or exists (select 1 from public.exams e where e.id = exam_id and e.teacher_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "exam weight overrides write" on public.exam_weight_overrides;
create policy "exam weight overrides write" on public.exam_weight_overrides for all
using (exists (select 1 from public.exams e where e.id = exam_id and (e.teacher_id = auth.uid() or public.is_admin())))
with check (exists (select 1 from public.exams e where e.id = exam_id and (e.teacher_id = auth.uid() or public.is_admin())));

alter publication supabase_realtime add table public.teacher_grading_defaults;
alter publication supabase_realtime add table public.quiz_weight_overrides;
alter publication supabase_realtime add table public.exam_weight_overrides;
