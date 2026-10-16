-- ============ AUTOMATIC FEES: grade-based and subject-based ============
-- No manual assignment — these compute from the roster (grade) / schedule (subject) directly.

create table if not exists public.grade_fee_rates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  grade int not null check (grade between 1 and 12),
  amount numeric not null,
  created_at timestamptz not null default now(),
  unique (school_id, grade)
);
alter table public.grade_fee_rates enable row level security;

drop trigger if exists trg_grade_fee_rates_school_id on public.grade_fee_rates;
create trigger trg_grade_fee_rates_school_id before insert on public.grade_fee_rates
  for each row execute function public.set_school_id();

create table if not exists public.subject_fee_rates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  subject_label text,
  is_general boolean not null default false,
  amount numeric not null,
  created_at timestamptz not null default now()
);
alter table public.subject_fee_rates enable row level security;

drop trigger if exists trg_subject_fee_rates_school_id on public.subject_fee_rates;
create trigger trg_subject_fee_rates_school_id before insert on public.subject_fee_rates
  for each row execute function public.set_school_id();

drop index if exists subject_fee_rates_general_uidx;
create unique index subject_fee_rates_general_uidx on public.subject_fee_rates (school_id) where is_general;
drop index if exists subject_fee_rates_label_uidx;
create unique index subject_fee_rates_label_uidx on public.subject_fee_rates (school_id, subject_label) where not is_general;

create table if not exists public.grade_fee_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id),
  student_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  paid_amount numeric not null default 0,
  paid_at timestamptz,
  unique (student_id)
);
alter table public.grade_fee_payments enable row level security;

drop trigger if exists trg_grade_fee_payments_school_id on public.grade_fee_payments;
create trigger trg_grade_fee_payments_school_id before insert on public.grade_fee_payments
  for each row execute function public.set_school_id();

create table if not exists public.subject_fee_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id),
  student_id uuid not null references public.users(id) on delete cascade,
  subject_label text not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  paid_amount numeric not null default 0,
  paid_at timestamptz,
  unique (student_id, subject_label)
);
alter table public.subject_fee_payments enable row level security;

drop trigger if exists trg_subject_fee_payments_school_id on public.subject_fee_payments;
create trigger trg_subject_fee_payments_school_id before insert on public.subject_fee_payments
  for each row execute function public.set_school_id();

-- ---- rate tables: readable by everyone in the school, writable by admin only ----
drop policy if exists "grade fee rates select" on public.grade_fee_rates;
create policy "grade fee rates select" on public.grade_fee_rates for select
using (school_id = public.my_school_id());

drop policy if exists "grade fee rates write" on public.grade_fee_rates;
create policy "grade fee rates write" on public.grade_fee_rates for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "subject fee rates select" on public.subject_fee_rates;
create policy "subject fee rates select" on public.subject_fee_rates for select
using (school_id = public.my_school_id());

drop policy if exists "subject fee rates write" on public.subject_fee_rates;
create policy "subject fee rates write" on public.subject_fee_rates for all
using (public.is_admin())
with check (public.is_admin());

-- ---- payment tables: self/parent/admin read, admin-only write ----
drop policy if exists "grade fee payments select" on public.grade_fee_payments;
create policy "grade fee payments select" on public.grade_fee_payments for select
using (
  public.is_admin()
  or student_id = auth.uid()
  or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
);

drop policy if exists "grade fee payments write" on public.grade_fee_payments;
create policy "grade fee payments write" on public.grade_fee_payments for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "subject fee payments select" on public.subject_fee_payments;
create policy "subject fee payments select" on public.subject_fee_payments for select
using (
  public.is_admin()
  or student_id = auth.uid()
  or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
);

drop policy if exists "subject fee payments write" on public.subject_fee_payments;
create policy "subject fee payments write" on public.subject_fee_payments for all
using (public.is_admin())
with check (public.is_admin());

alter publication supabase_realtime add table public.grade_fee_rates;
alter publication supabase_realtime add table public.subject_fee_rates;
alter publication supabase_realtime add table public.grade_fee_payments;
alter publication supabase_realtime add table public.subject_fee_payments;
