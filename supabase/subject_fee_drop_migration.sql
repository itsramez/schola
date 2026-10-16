-- ============ SUBJECT FEE DROPS: grace period for dropping a priced subject ============
-- If a student drops a subject within the grace period after starting it, the fee is waived.
-- If they drop after the grace period, they still owe it even though they're no longer taking it.

create table if not exists public.fee_settings (
  school_id uuid primary key references public.schools(id),
  subject_drop_grace_days int not null default 7,
  updated_at timestamptz not null default now()
);
alter table public.fee_settings enable row level security;

drop trigger if exists trg_fee_settings_school_id on public.fee_settings;
create trigger trg_fee_settings_school_id before insert on public.fee_settings
  for each row execute function public.set_school_id();
drop trigger if exists trg_fee_settings_school_id_upd on public.fee_settings;
create trigger trg_fee_settings_school_id_upd before update on public.fee_settings
  for each row execute function public.set_school_id();

drop policy if exists "fee settings select" on public.fee_settings;
create policy "fee settings select" on public.fee_settings for select
using (school_id = public.my_school_id());

drop policy if exists "fee settings write" on public.fee_settings;
create policy "fee settings write" on public.fee_settings for all
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.subject_fee_enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  student_id uuid not null references public.users(id) on delete cascade,
  subject_label text not null,
  started_at timestamptz not null default now(),
  dropped_at timestamptz,
  fee_waived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, subject_label)
);
alter table public.subject_fee_enrollments enable row level security;

drop trigger if exists trg_subject_fee_enrollments_school_id on public.subject_fee_enrollments;
create trigger trg_subject_fee_enrollments_school_id before insert on public.subject_fee_enrollments
  for each row execute function public.set_school_id();

-- admin, the student themself, or their parent can read; admin-only write (this is a billing
-- record — a student shouldn't be able to set their own "started taking this subject" date)
drop policy if exists "subject fee enrollments select" on public.subject_fee_enrollments;
create policy "subject fee enrollments select" on public.subject_fee_enrollments for select
using (
  public.is_admin()
  or student_id = auth.uid()
  or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
);

drop policy if exists "subject fee enrollments write" on public.subject_fee_enrollments;
create policy "subject fee enrollments write" on public.subject_fee_enrollments for all
using (public.is_admin())
with check (public.is_admin());

alter publication supabase_realtime add table public.fee_settings;
alter publication supabase_realtime add table public.subject_fee_enrollments;
