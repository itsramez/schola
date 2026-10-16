-- ============ SCHOOLS (tenants) ============
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.schools enable row level security;

-- Backfill: every existing account/row belongs to one pre-existing tenant.
insert into public.schools (id, name)
select gen_random_uuid(), 'Default School'
where not exists (select 1 from public.schools);

-- ============ school_id columns ============
alter table public.users add column if not exists school_id uuid references public.schools(id);
alter table public.assignments add column if not exists school_id uuid references public.schools(id);
alter table public.submissions add column if not exists school_id uuid references public.schools(id);
alter table public.attendance_records add column if not exists school_id uuid references public.schools(id);
alter table public.announcements add column if not exists school_id uuid references public.schools(id);
alter table public.quizzes add column if not exists school_id uuid references public.schools(id);
alter table public.messages add column if not exists school_id uuid references public.schools(id);

-- Backfill every existing row to the one pre-existing tenant.
update public.users set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;
update public.assignments set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;
update public.submissions set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;
update public.attendance_records set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;
update public.announcements set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;
update public.quizzes set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;
update public.messages set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;

alter table public.users alter column school_id set not null;
alter table public.assignments alter column school_id set not null;
alter table public.submissions alter column school_id set not null;
alter table public.attendance_records alter column school_id set not null;
alter table public.announcements alter column school_id set not null;
alter table public.quizzes alter column school_id set not null;
alter table public.messages alter column school_id set not null;

-- ============ helper: caller's own school ============
create or replace function public.my_school_id()
returns uuid
language sql
security definer
stable
as $$
  select school_id from public.users where id = auth.uid()
$$;

drop policy if exists "schools select own" on public.schools;
create policy "schools select own" on public.schools for select to authenticated
using (id = public.my_school_id());

-- ============ trigger: force school_id to the caller's own on every client insert ============
create or replace function public.set_school_id()
returns trigger
language plpgsql
security definer
as $$
begin
  new.school_id := public.my_school_id();
  return new;
end;
$$;

drop trigger if exists trg_assignments_school_id on public.assignments;
create trigger trg_assignments_school_id before insert on public.assignments
  for each row execute function public.set_school_id();

drop trigger if exists trg_submissions_school_id on public.submissions;
create trigger trg_submissions_school_id before insert on public.submissions
  for each row execute function public.set_school_id();

drop trigger if exists trg_attendance_school_id on public.attendance_records;
create trigger trg_attendance_school_id before insert on public.attendance_records
  for each row execute function public.set_school_id();

drop trigger if exists trg_announcements_school_id on public.announcements;
create trigger trg_announcements_school_id before insert on public.announcements
  for each row execute function public.set_school_id();

drop trigger if exists trg_quizzes_school_id on public.quizzes;
create trigger trg_quizzes_school_id before insert on public.quizzes
  for each row execute function public.set_school_id();

drop trigger if exists trg_messages_school_id on public.messages;
create trigger trg_messages_school_id before insert on public.messages
  for each row execute function public.set_school_id();

-- Submissions upsert (on_conflict) needs the trigger to also fire on UPDATE, since an upsert's
-- conflict path is technically an UPDATE and the client never sends school_id at all.
drop trigger if exists trg_submissions_school_id_upd on public.submissions;
create trigger trg_submissions_school_id_upd before update on public.submissions
  for each row execute function public.set_school_id();

drop trigger if exists trg_attendance_school_id_upd on public.attendance_records;
create trigger trg_attendance_school_id_upd before update on public.attendance_records
  for each row execute function public.set_school_id();

-- ============ users: replace the wide-open policies with school-scoped ones ============
drop policy if exists "anon can read users" on public.users;
drop policy if exists "anon can insert users" on public.users;

drop policy if exists "users select own school" on public.users;
create policy "users select own school" on public.users for select to authenticated
using (school_id = public.my_school_id());

-- No insert policy: account creation only happens server-side via the service-role key
-- (create-school-user / create-school Edge Functions), which bypasses RLS entirely.

drop policy if exists "admins can delete users" on public.users;
create policy "admins can delete users" on public.users for delete
using (public.is_admin() and school_id = public.my_school_id());

-- ============ assignments: add school scoping ============
drop policy if exists "assignments select" on public.assignments;
create policy "assignments select" on public.assignments for select to authenticated
using (school_id = public.my_school_id());

drop policy if exists "assignments insert" on public.assignments;
create policy "assignments insert" on public.assignments for insert
with check ((teacher_id = auth.uid() or public.is_admin()) and school_id = public.my_school_id());

drop policy if exists "assignments update" on public.assignments;
create policy "assignments update" on public.assignments for update
using ((teacher_id = auth.uid() or public.is_admin()) and school_id = public.my_school_id());

drop policy if exists "assignments delete" on public.assignments;
create policy "assignments delete" on public.assignments for delete
using ((teacher_id = auth.uid() or public.is_admin()) and school_id = public.my_school_id());

-- ============ submissions: add school scoping ============
drop policy if exists "submissions select" on public.submissions;
create policy "submissions select" on public.submissions for select
using (
  school_id = public.my_school_id()
  and (
    student_id = auth.uid()
    or exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
    or public.is_admin()
    or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
  )
);

drop policy if exists "submissions insert" on public.submissions;
create policy "submissions insert" on public.submissions for insert
with check (
  school_id = public.my_school_id()
  and (
    student_id = auth.uid()
    or exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
    or public.is_admin()
  )
);

drop policy if exists "submissions update" on public.submissions;
create policy "submissions update" on public.submissions for update
using (
  school_id = public.my_school_id()
  and (
    student_id = auth.uid()
    or exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
    or public.is_admin()
  )
);

-- ============ attendance_records: add school scoping ============
drop policy if exists "attendance select" on public.attendance_records;
create policy "attendance select" on public.attendance_records for select
using (
  school_id = public.my_school_id()
  and (
    student_id = auth.uid()
    or teacher_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
  )
);

drop policy if exists "attendance insert" on public.attendance_records;
create policy "attendance insert" on public.attendance_records for insert
with check ((teacher_id = auth.uid() or public.is_admin()) and school_id = public.my_school_id());

drop policy if exists "attendance update" on public.attendance_records;
create policy "attendance update" on public.attendance_records for update
using ((teacher_id = auth.uid() or public.is_admin()) and school_id = public.my_school_id());

-- ============ announcements: add school scoping ============
drop policy if exists "announcements select" on public.announcements;
create policy "announcements select" on public.announcements for select to authenticated
using (school_id = public.my_school_id());

drop policy if exists "announcements insert" on public.announcements;
create policy "announcements insert" on public.announcements for insert
with check (
  school_id = public.my_school_id()
  and (public.is_admin() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'teacher'))
);

-- ============ quizzes: add school scoping ============
drop policy if exists "quizzes select" on public.quizzes;
create policy "quizzes select" on public.quizzes for select to authenticated
using (school_id = public.my_school_id());

drop policy if exists "quizzes insert" on public.quizzes;
create policy "quizzes insert" on public.quizzes for insert
with check ((teacher_id = auth.uid() or public.is_admin()) and school_id = public.my_school_id());

drop policy if exists "quizzes delete" on public.quizzes;
create policy "quizzes delete" on public.quizzes for delete
using ((teacher_id = auth.uid() or public.is_admin()) and school_id = public.my_school_id());

-- ============ messages: add school scoping ============
drop policy if exists "read own or channel messages" on public.messages;
create policy "read own or channel messages" on public.messages for select
using (
  school_id = public.my_school_id()
  and (channel_id is not null or sender_id = auth.uid() or recipient_id = auth.uid())
);

drop policy if exists "send as self" on public.messages;
create policy "send as self" on public.messages for insert
with check (sender_id = auth.uid() and school_id = public.my_school_id());
