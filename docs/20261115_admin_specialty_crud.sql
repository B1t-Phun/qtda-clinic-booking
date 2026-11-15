-- Run after database_schema.sql and auth_security.sql in Supabase SQL Editor.
-- Admin-only transactional specialty create/edit RPC.
begin;

create or replace function public.admin_save_specialty(
  p_specialty_id bigint,
  p_name text,
  p_description text
)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  target_specialty public.specialties;
  result_id bigint;
begin
  if not public.is_admin() or not public.has_required_aal() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) not between 2 and 100 or
     (p_description is not null and length(trim(p_description)) > 1000) then
    raise exception 'Invalid specialty data' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.specialties
    where lower(name) = lower(trim(p_name))
      and (p_specialty_id is null or id <> p_specialty_id)
  ) then
    raise exception 'Specialty name is already used' using errcode = '23505';
  end if;

  if p_specialty_id is null then
    insert into public.specialties(name, description)
    values(trim(p_name), nullif(trim(p_description), ''))
    returning id into result_id;
    return result_id;
  end if;

  select * into target_specialty
  from public.specialties where id = p_specialty_id for update;
  if not found then raise exception 'Specialty not found' using errcode = '22023'; end if;

  update public.specialties
    set name = trim(p_name), description = nullif(trim(p_description), '')
    where id = p_specialty_id
    returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.admin_save_specialty(bigint,text,text) from public, anon;
grant execute on function public.admin_save_specialty(bigint,text,text) to authenticated;

notify pgrst, 'reload schema';

commit;
