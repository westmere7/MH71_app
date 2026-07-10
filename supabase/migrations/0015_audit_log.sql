-- =====================================================================
-- MH71 — Universal audit log. A DB trigger records EVERY insert/update/delete
-- on the core tables, so nothing is missed regardless of who made the change
-- (owner app, meter page's service-role route, or a manual SQL edit). This is
-- view-and-proof only — the app never uses it to undo/revert.
--
-- Cheap at runtime: one lightweight jsonb insert per row change, server-side.
-- Run in the Supabase SQL editor (after 0001–0014).
-- =====================================================================

create table if not exists audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  table_name text not null,
  op         text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  row_pk     text,
  actor      text,          -- auth.uid() for the owner; DB role otherwise
  before     jsonb,
  after      jsonb
);

create index if not exists audit_log_at_idx on audit_log (at desc);

alter table audit_log enable row level security;
-- read-only for the owner; nobody can write/edit/delete from a client — only
-- the SECURITY DEFINER trigger below inserts rows.
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select to authenticated using (true);

create or replace function audit_capture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who text := coalesce(auth.uid()::text, current_user);
begin
  if (tg_op = 'DELETE') then
    insert into audit_log(table_name, op, row_pk, actor, before, after)
      values (tg_table_name, tg_op, (old).id::text, who, to_jsonb(old), null);
    return old;
  elsif (tg_op = 'UPDATE') then
    if to_jsonb(new) = to_jsonb(old) then return new; end if; -- skip no-op writes
    insert into audit_log(table_name, op, row_pk, actor, before, after)
      values (tg_table_name, tg_op, (new).id::text, who, to_jsonb(old), to_jsonb(new));
    return new;
  else -- INSERT
    insert into audit_log(table_name, op, row_pk, actor, before, after)
      values (tg_table_name, tg_op, (new).id::text, who, null, to_jsonb(new));
    return new;
  end if;
end $$;

-- attach to every core table (NOT audit_log itself, nor payment_logs which is
-- already a log, nor backups which are snapshots)
do $$
declare t text;
begin
  foreach t in array array['settings', 'rooms', 'tenants', 'months', 'bills'] loop
    execute format('drop trigger if exists audit_%1$s on %1$s;', t);
    execute format(
      'create trigger audit_%1$s after insert or update or delete on %1$s '
      || 'for each row execute function audit_capture();', t);
  end loop;
end $$;
