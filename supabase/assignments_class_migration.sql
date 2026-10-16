-- ============ ASSIGNMENTS: scope to a class instead of broadcasting to the whole school ============
-- Phase 2 of the classes rework — first real consumer of public.classes.

-- Reusable helper: is this student enrolled in this class? (section roster or manual roster)
create or replace function public.is_enrolled_in_class(p_class_id uuid, p_student_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.classes c
    where c.id = p_class_id
      and (
        (c.roster_mode = 'section' and exists (
          select 1 from public.users su where su.id = p_student_id and su.section_id = c.section_id
        ))
        or
        (c.roster_mode = 'manual' and exists (
          select 1 from public.class_enrollments ce where ce.class_id = c.id and ce.student_id = p_student_id
        ))
      )
  );
$$;

alter table public.assignments add column if not exists class_id uuid references public.classes(id);

-- Backfill: each existing assignment -> its teacher's class from the Phase 1 backfill
-- (every teacher had exactly one class at that point, so this is unambiguous).
update public.assignments a
set class_id = c.id
from public.classes c
where a.class_id is null
  and c.id = (select id from public.classes c2 where c2.teacher_id = a.teacher_id order by c2.created_at asc limit 1);

-- Replace the broadcast-by-default select policy with roster-based visibility, keeping
-- assigned_student_ids as a further narrowing filter within the class's own roster.
drop policy if exists "assignments select" on public.assignments;
create policy "assignments select" on public.assignments for select to authenticated
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
      where p.id = auth.uid()
        and p.linked_student_id is not null
        and class_id is not null
        and public.is_enrolled_in_class(class_id, p.linked_student_id)
        and (assigned_student_ids is null or p.linked_student_id = any(assigned_student_ids))
    )
  )
);

-- A teacher may only post into their own class.
drop policy if exists "assignments insert" on public.assignments;
create policy "assignments insert" on public.assignments for insert
with check (
  public.is_admin()
  or (
    teacher_id = auth.uid()
    and (class_id is null or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()))
  )
);
