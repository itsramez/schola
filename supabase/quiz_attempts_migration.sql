create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  score int not null,
  out_of int not null,
  school_id uuid references public.schools(id),
  submitted_at timestamptz not null default now(),
  unique (quiz_id, student_id)
);
alter table public.quiz_attempts enable row level security;

drop trigger if exists trg_quiz_attempts_school_id on public.quiz_attempts;
create trigger trg_quiz_attempts_school_id before insert on public.quiz_attempts
  for each row execute function public.set_school_id();

drop policy if exists "quiz attempts select" on public.quiz_attempts;
create policy "quiz attempts select" on public.quiz_attempts for select
using (
  school_id = public.my_school_id()
  and (
    student_id = auth.uid()
    or exists (select 1 from public.quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
    or public.is_admin()
    or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
  )
);

drop policy if exists "quiz attempts insert" on public.quiz_attempts;
create policy "quiz attempts insert" on public.quiz_attempts for insert
with check (school_id = public.my_school_id() and student_id = auth.uid());
