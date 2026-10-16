-- ============ QUIZZES / EXAMS / ATTENDANCE: scope to a class (Phase 2 continued) ============
-- Same pattern already applied to assignments: a class_id column, roster-based RLS via
-- public.is_enrolled_in_class(), and backfill to each row's teacher's first-created class.

alter table public.quizzes add column if not exists class_id uuid references public.classes(id);
alter table public.exams add column if not exists class_id uuid references public.classes(id);
alter table public.attendance_records add column if not exists class_id uuid references public.classes(id);

update public.quizzes q
set class_id = c.id
from public.classes c
where q.class_id is null
  and c.id = (select id from public.classes c2 where c2.teacher_id = q.teacher_id order by c2.created_at asc limit 1);

update public.exams e
set class_id = c.id
from public.classes c
where e.class_id is null
  and c.id = (select id from public.classes c2 where c2.teacher_id = e.teacher_id order by c2.created_at asc limit 1);

-- trg_attendance_school_id_upd fires on UPDATE too (needed for the normal upsert-conflict path)
-- and would null out school_id here since this migration runs with no authenticated session.
alter table public.attendance_records disable trigger trg_attendance_school_id_upd;

update public.attendance_records a
set class_id = c.id
from public.classes c
where a.class_id is null
  and a.teacher_id is not null
  and c.id = (select id from public.classes c2 where c2.teacher_id = a.teacher_id order by c2.created_at asc limit 1);

alter table public.attendance_records enable trigger trg_attendance_school_id_upd;

-- ---- quizzes RLS: roster-based visibility, same shape as assignments ----
drop policy if exists "quizzes select" on public.quizzes;
create policy "quizzes select" on public.quizzes for select to authenticated
using (
  school_id = public.my_school_id()
  and (
    public.is_admin()
    or teacher_id = auth.uid()
    or (
      class_id is not null
      and public.is_enrolled_in_class(class_id, auth.uid())
      and (assigned_student_ids is null or auth.uid() = any(assigned_student_ids))
    )
    or exists (
      select 1 from public.users p
      where p.id = auth.uid() and p.linked_student_id is not null
        and class_id is not null
        and public.is_enrolled_in_class(class_id, p.linked_student_id)
        and (assigned_student_ids is null or p.linked_student_id = any(assigned_student_ids))
    )
  )
);

drop policy if exists "quizzes insert" on public.quizzes;
create policy "quizzes insert" on public.quizzes for insert
with check (
  public.is_admin()
  or (
    teacher_id = auth.uid()
    and (class_id is null or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()))
  )
);

-- ---- exams RLS: same shape ----
drop policy if exists "exams select" on public.exams;
create policy "exams select" on public.exams for select
using (
  school_id = public.my_school_id()
  and (
    public.is_admin()
    or teacher_id = auth.uid()
    or (
      class_id is not null
      and public.is_enrolled_in_class(class_id, auth.uid())
      and (assigned_student_ids is null or auth.uid() = any(assigned_student_ids))
    )
    or exists (
      select 1 from public.users p
      where p.id = auth.uid() and p.linked_student_id is not null
        and class_id is not null
        and public.is_enrolled_in_class(class_id, p.linked_student_id)
        and (assigned_student_ids is null or p.linked_student_id = any(assigned_student_ids))
    )
  )
);

drop policy if exists "exams insert" on public.exams;
create policy "exams insert" on public.exams for insert
with check (
  school_id = public.my_school_id()
  and (
    public.is_admin()
    or (
      teacher_id = auth.uid()
      and (class_id is null or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()))
    )
  )
);

-- ---- attendance_records: widen the uniqueness key so a teacher can mark different classes'
-- attendance for the same student on the same day without overwriting each other ----
do $$
declare
  cname text;
begin
  select tc.constraint_name into cname
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
  where tc.table_schema = 'public' and tc.table_name = 'attendance_records' and tc.constraint_type = 'UNIQUE'
  group by tc.constraint_name
  having array_agg(kcu.column_name::text order by kcu.column_name) = array['date', 'student_id', 'teacher_id']
  limit 1;
  if cname is not null then
    execute format('alter table public.attendance_records drop constraint %I', cname);
  end if;
end $$;

alter table public.attendance_records
  drop constraint if exists attendance_records_student_teacher_class_date_key;
alter table public.attendance_records
  add constraint attendance_records_student_teacher_class_date_key unique (student_id, teacher_id, class_id, date);
