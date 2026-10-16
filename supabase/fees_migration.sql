-- ============ FEES & PAYMENTS ============
-- Admin-managed fee plans (itemized lists or installment schedules), assigned to one or many
-- students, with payment status tracked manually by the admin (no real payment processing).

create table if not exists public.fee_plans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  created_by uuid not null references public.users(id),
  title text not null,
  kind text not null check (kind in ('itemized', 'installments')),
  payment_instructions text,
  created_at timestamptz not null default now()
);
alter table public.fee_plans enable row level security;

drop trigger if exists trg_fee_plans_school_id on public.fee_plans;
create trigger trg_fee_plans_school_id before insert on public.fee_plans
  for each row execute function public.set_school_id();

create table if not exists public.fee_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.fee_plans(id) on delete cascade,
  label text not null,
  amount numeric not null,
  due_date date,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.fee_plan_items enable row level security;

create table if not exists public.fee_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.fee_plans(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  school_id uuid references public.schools(id),
  assigned_at timestamptz not null default now(),
  unique (plan_id, student_id)
);
alter table public.fee_assignments enable row level security;

drop trigger if exists trg_fee_assignments_school_id on public.fee_assignments;
create trigger trg_fee_assignments_school_id before insert on public.fee_assignments
  for each row execute function public.set_school_id();

create table if not exists public.fee_item_payments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.fee_plan_items(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  paid_amount numeric not null default 0,
  paid_at timestamptz,
  note text,
  school_id uuid references public.schools(id),
  unique (item_id, student_id)
);
alter table public.fee_item_payments enable row level security;

drop trigger if exists trg_fee_item_payments_school_id on public.fee_item_payments;
create trigger trg_fee_item_payments_school_id before insert on public.fee_item_payments
  for each row execute function public.set_school_id();

-- ---- fee_plans ----
drop policy if exists "fee plans select" on public.fee_plans;
create policy "fee plans select" on public.fee_plans for select
using (
  school_id = public.my_school_id()
  and (
    public.is_admin()
    or exists (
      select 1 from public.fee_assignments fa
      where fa.plan_id = id
        and (
          fa.student_id = auth.uid()
          or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = fa.student_id)
        )
    )
  )
);

drop policy if exists "fee plans write" on public.fee_plans;
create policy "fee plans write" on public.fee_plans for all
using (public.is_admin())
with check (public.is_admin());

-- ---- fee_plan_items ----
drop policy if exists "fee plan items select" on public.fee_plan_items;
create policy "fee plan items select" on public.fee_plan_items for select
using (
  exists (
    select 1 from public.fee_plans fp
    where fp.id = plan_id
      and fp.school_id = public.my_school_id()
      and (
        public.is_admin()
        or exists (
          select 1 from public.fee_assignments fa
          where fa.plan_id = fp.id
            and (
              fa.student_id = auth.uid()
              or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = fa.student_id)
            )
        )
      )
  )
);

drop policy if exists "fee plan items write" on public.fee_plan_items;
create policy "fee plan items write" on public.fee_plan_items for all
using (exists (select 1 from public.fee_plans fp where fp.id = plan_id and public.is_admin()))
with check (exists (select 1 from public.fee_plans fp where fp.id = plan_id and public.is_admin()));

-- ---- fee_assignments ----
drop policy if exists "fee assignments select" on public.fee_assignments;
create policy "fee assignments select" on public.fee_assignments for select
using (
  school_id = public.my_school_id()
  and (
    public.is_admin()
    or student_id = auth.uid()
    or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
  )
);

drop policy if exists "fee assignments write" on public.fee_assignments;
create policy "fee assignments write" on public.fee_assignments for all
using (public.is_admin())
with check (public.is_admin());

-- ---- fee_item_payments ----
drop policy if exists "fee item payments select" on public.fee_item_payments;
create policy "fee item payments select" on public.fee_item_payments for select
using (
  public.is_admin()
  or student_id = auth.uid()
  or exists (select 1 from public.users p where p.id = auth.uid() and p.linked_student_id = student_id)
);

drop policy if exists "fee item payments write" on public.fee_item_payments;
create policy "fee item payments write" on public.fee_item_payments for all
using (public.is_admin())
with check (public.is_admin());

alter publication supabase_realtime add table public.fee_plans;
alter publication supabase_realtime add table public.fee_plan_items;
alter publication supabase_realtime add table public.fee_assignments;
alter publication supabase_realtime add table public.fee_item_payments;
