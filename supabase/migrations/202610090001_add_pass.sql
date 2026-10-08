-- Adds passing-through experiences without changing existing records or access policies.
begin;

alter table public.experiences
  drop constraint experiences_kind_check;
alter table public.experiences
  add constraint experiences_kind_check
  check (kind in ('pass','visit','stay','live'));

commit;
