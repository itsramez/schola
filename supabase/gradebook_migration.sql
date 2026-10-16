-- ============ GRADEBOOK ============
-- Lets a teacher put a weight (%) on any quiz or exam, and manually grade paper quizzes/exams
-- (anything in the `exams` table, which already covers kind='quiz'|'midterm'|'final'|'exam').
-- Online quizzes keep using quiz_attempts for the actual score; this just adds a weight to them.

alter table public.quizzes add column if not exists weight_percent numeric;
alter table public.exams add column if not exists weight_percent numeric;

create table if not exists public.exam_grades (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  score numeric not null,
  out_of numeric not null default 100,
  school_id uuid references public.schools(id),
  graded_at timestamptz not null default now(),
  unique (exam_id, student_id)
);
alter table public.exam_grades enable row level security;

drop trigger if exists trg_exam_grades_school_id on public.exam_grades;
create trigger trg_exam_grades_school_id before insert on public.exam_grades
  for each row execute function public.set_school_id();

drop policy if exists "exam grades select" on public.exam_grades;
create policy "exam grades select" on public.exam_grades for select
using (
  school_id = public.my_school_id()
  and (
    student_id = auth.uid()
    or exists (select 1 from public.exams e where e.id = exam_id and e.teacher_id = auth.uid())
    or public.is_admin()
    or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
  )
);

drop policy if exists "exam grades insert" on public.exam_grades;
create policy "exam grades insert" on public.exam_grades for insert
with check (
  school_id = public.my_school_id()
  and exists (select 1 from public.exams e where e.id = exam_id and (e.teacher_id = auth.uid() or public.is_admin()))
);

drop policy if exists "exam grades update" on public.exam_grades;
create policy "exam grades update" on public.exam_grades for update
using (
  exists (select 1 from public.exams e where e.id = exam_id and (e.teacher_id = auth.uid() or public.is_admin()))
)
with check (
  exists (select 1 from public.exams e where e.id = exam_id and (e.teacher_id = auth.uid() or public.is_admin()))
);

alter publication supabase_realtime add table public.exam_grades;
