-- ============ ASSIGNMENTS ============
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.users(id) on delete set null,
  subject_label text not null,
  title text not null,
  chapter text,
  exercises text,
  due_date date not null,
  submission_enabled boolean not null default true,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.assignments enable row level security;

drop policy if exists "assignments select" on public.assignments;
create policy "assignments select" on public.assignments for select to authenticated using (true);

drop policy if exists "assignments insert" on public.assignments;
create policy "assignments insert" on public.assignments for insert
with check (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "assignments update" on public.assignments;
create policy "assignments update" on public.assignments for update
using (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "assignments delete" on public.assignments;
create policy "assignments delete" on public.assignments for delete
using (teacher_id = auth.uid() or public.is_admin());

-- ============ SUBMISSIONS (one row per student per assignment: status + file/text + review) ============
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  kind text check (kind in ('file','text')),
  file_name text,
  file_type text check (file_type in ('pdf','image')),
  data_url text,
  text_content text,
  submitted_at timestamptz,
  file_removed_at timestamptz,
  review_status text check (review_status in ('graded','resubmit')),
  review_score numeric,
  review_out_of numeric,
  review_feedback text,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);
alter table public.submissions enable row level security;

drop policy if exists "submissions select" on public.submissions;
create policy "submissions select" on public.submissions for select
using (
  student_id = auth.uid()
  or exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
  or public.is_admin()
  or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
);

drop policy if exists "submissions insert" on public.submissions;
create policy "submissions insert" on public.submissions for insert
with check (
  student_id = auth.uid()
  or exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "submissions update" on public.submissions;
create policy "submissions update" on public.submissions for update
using (
  student_id = auth.uid()
  or exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid())
  or public.is_admin()
);

-- ============ ATTENDANCE ============
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid references public.users(id) on delete set null,
  subject_label text,
  date date not null,
  status text not null check (status in ('present','absent','late')),
  created_at timestamptz not null default now(),
  unique (student_id, teacher_id, date)
);
alter table public.attendance_records enable row level security;

drop policy if exists "attendance select" on public.attendance_records;
create policy "attendance select" on public.attendance_records for select
using (
  student_id = auth.uid()
  or teacher_id = auth.uid()
  or public.is_admin()
  or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
);

drop policy if exists "attendance insert" on public.attendance_records;
create policy "attendance insert" on public.attendance_records for insert
with check (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "attendance update" on public.attendance_records;
create policy "attendance update" on public.attendance_records for update
using (teacher_id = auth.uid() or public.is_admin());

-- ============ ANNOUNCEMENTS ============
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null check (category in ('general','transport','event','academic','closure')),
  important boolean not null default false,
  audience_type text not null check (audience_type in ('school','grade','class','students','parents','teachers')),
  audience_label text not null,
  audience_grade int,
  audience_subject text,
  audience_student_ids uuid[],
  author_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;

drop policy if exists "announcements select" on public.announcements;
create policy "announcements select" on public.announcements for select to authenticated using (true);

drop policy if exists "announcements insert" on public.announcements;
create policy "announcements insert" on public.announcements for insert
with check (
  public.is_admin()
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'teacher')
);

-- ============ QUIZZES ============
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  section text,
  due_date date,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.quizzes enable row level security;

drop policy if exists "quizzes select" on public.quizzes;
create policy "quizzes select" on public.quizzes for select to authenticated using (true);

drop policy if exists "quizzes insert" on public.quizzes;
create policy "quizzes insert" on public.quizzes for insert
with check (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "quizzes delete" on public.quizzes;
create policy "quizzes delete" on public.quizzes for delete
using (teacher_id = auth.uid() or public.is_admin());
