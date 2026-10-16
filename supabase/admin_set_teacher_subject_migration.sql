-- Lets an admin (re)assign a teacher's subject after the account already exists — e.g. from the
-- Subjects catalog ("add this teacher to Physics") or from the teacher's own row in People.
-- Done as a SECURITY DEFINER function rather than a broad "admins can update users" RLS policy,
-- so admins can only ever touch this one column, never role/email/school_id. Mirrors
-- admin_set_student_section.
create or replace function public.admin_set_teacher_subject(p_teacher_id uuid, p_subject_name text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  caller_school uuid;
  teacher_school uuid;
  teacher_role text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change a teacher''s subject';
  end if;
  caller_school := public.my_school_id();

  select school_id, role into teacher_school, teacher_role from public.users where id = p_teacher_id;
  if teacher_school is null or teacher_school <> caller_school then
    raise exception 'Teacher not found in your school';
  end if;
  if teacher_role <> 'teacher' then
    raise exception 'Target user is not a teacher';
  end if;

  update public.users set subject_name = p_subject_name where id = p_teacher_id;
end;
$$;

grant execute on function public.admin_set_teacher_subject(uuid, text) to authenticated;
