alter table public.users add column if not exists office_hours_start time;
alter table public.users add column if not exists office_hours_end time;

-- Letting a user update their own row (needed for office hours) must not let them touch
-- their own role, school, or email — those are fixed at account-creation time.
create or replace function public.prevent_identity_change()
returns trigger
language plpgsql
as $$
begin
  new.role := old.role;
  new.school_id := old.school_id;
  new.email := old.email;
  return new;
end;
$$;

drop trigger if exists trg_prevent_identity_change on public.users;
create trigger trg_prevent_identity_change before update on public.users
  for each row execute function public.prevent_identity_change();

drop policy if exists "users update own" on public.users;
create policy "users update own" on public.users for update
using (id = auth.uid())
with check (id = auth.uid());
