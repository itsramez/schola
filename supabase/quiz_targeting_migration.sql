alter table public.quizzes add column if not exists assigned_student_ids uuid[];

drop policy if exists "quizzes select" on public.quizzes;
create policy "quizzes select" on public.quizzes for select to authenticated
using (
  school_id = public.my_school_id()
  and (
    assigned_student_ids is null
    or teacher_id = auth.uid()
    or public.is_admin()
    or auth.uid() = any(assigned_student_ids)
  )
);
