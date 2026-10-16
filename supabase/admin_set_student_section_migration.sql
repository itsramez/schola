-- Lets an admin reassign a student to a different (or no) class section after the account
-- already exists. Done as a SECURITY DEFINER function rather than a broad "admins can update
-- users" RLS policy, so admins can only ever touch this one column, never role/email/school_id.
create or replace function public.admin_set_student_section(p_student_id uuid, p_section_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  caller_school uuid;
  student_school uuid;
  student_role text;
  section_school uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change a student''s section';
  end if;
  caller_school := public.my_school_id();

  select school_id, role into student_school, student_role from public.users where id = p_student_id;
  if student_school is null or student_school <> caller_school then
    raise exception 'Student not found in your school';
  end if;
  if student_role <> 'student' then
    raise exception 'Target user is not a student';
  end if;

  if p_section_id is not null then
    select school_id into section_school from public.class_sections where id = p_section_id;
    if section_school is null or section_school <> caller_school then
      raise exception 'Section not found in your school';
    end if;
  end if;

  update public.users set section_id = p_section_id where id = p_student_id;
end;
$$;

grant execute on function public.admin_set_student_section(uuid, uuid) to authenticated;
