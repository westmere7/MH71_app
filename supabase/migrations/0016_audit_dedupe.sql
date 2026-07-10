-- =====================================================================
-- MH71 — De-duplicate the audit log for tenant edits.
--
-- Editing a tenant updates two tables: tenants (name/phone) AND the current
-- month's bill, which keeps a per-month SNAPSHOT of tenant_name/tenant_phone.
-- Both triggers fired → two log entries per change. This replaces the audit
-- function so a bills UPDATE that changes ONLY the tenant mirror
-- (tenant_name/tenant_phone/tenant_id) is skipped — the change is already
-- recorded against the tenants row. Real bill changes (readings, fees,
-- payment status, reactivation, etc.) are still logged.
--
-- `create or replace` keeps the existing triggers pointing at this function.
-- Run in the Supabase SQL editor (after 0015).
-- =====================================================================

create or replace function audit_capture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who     text := coalesce(auth.uid()::text, current_user);
  changed text[];
begin
  if (tg_op = 'DELETE') then
    insert into audit_log(table_name, op, row_pk, actor, before, after)
      values (tg_table_name, tg_op, (old).id::text, who, to_jsonb(old), null);
    return old;

  elsif (tg_op = 'UPDATE') then
    if to_jsonb(new) = to_jsonb(old) then return new; end if;

    if tg_table_name = 'bills' then
      select coalesce(array_agg(n.key), '{}') into changed
      from jsonb_each(to_jsonb(new)) as n
      where n.value is distinct from (to_jsonb(old) -> n.key)
        and n.key not in ('updated_at', 'created_at');
      -- only the tenant snapshot changed → already logged on tenants; skip
      if changed <@ array['tenant_name', 'tenant_phone', 'tenant_id']::text[] then
        return new;
      end if;
    end if;

    insert into audit_log(table_name, op, row_pk, actor, before, after)
      values (tg_table_name, tg_op, (new).id::text, who, to_jsonb(old), to_jsonb(new));
    return new;

  else -- INSERT
    insert into audit_log(table_name, op, row_pk, actor, before, after)
      values (tg_table_name, tg_op, (new).id::text, who, null, to_jsonb(new));
    return new;
  end if;
end $$;
