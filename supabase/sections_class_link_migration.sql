-- ============ LINK SECTION PERIODS TO CLASSES ============
-- Ties each schedule slot to a real Class (teacher + subject + roster) instead of a loose
-- teacher_id + free-text subject_label. This lets a student's personal timetable (and their
-- subject-based fees) reflect their own Class roster — if they're removed from a manual-roster
-- class, that period disappears from their schedule specifically, without touching the section's
-- schedule for anyone else still enrolled in it.

alter table public.class_section_periods add column if not exists class_id uuid references public.classes(id) on delete set null;

-- Backfill: every existing period -> the one class its teacher already has (unambiguous today,
-- since every teacher had exactly one class before this feature existed). Periods whose teacher
-- has no class at all are left unlinked (class_id null) and stay visible to the whole section, as
-- a safe fallback — nothing already on a timetable goes dark.
update public.class_section_periods p
set class_id = c.id
from public.classes c
where p.class_id is null
  and p.teacher_id is not null
  and c.id = (select id from public.classes c2 where c2.teacher_id = p.teacher_id order by c2.created_at asc limit 1);
