-- Run after database_schema.sql and auth_security.sql.
-- Allows admin-created walk-in patient profiles without a Supabase Auth account.
begin;

do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and confrelid = 'auth.users'::regclass
      and contype = 'f'
  loop
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end loop;
end;
$$;

-- Remove earlier drafts/overloads so PostgREST sees one unambiguous RPC signature.
do $$
declare signature text;
begin
  for signature in
    select pg_get_function_identity_arguments(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_create_patient'
  loop
    execute format('drop function public.admin_create_patient(%s)', signature);
  end loop;
end;
$$;

create or replace function public.admin_create_patient(
  p_full_name text,
  p_email text,
  p_phone text,
  p_gender text,
  p_date_of_birth date,
  p_address text,
  p_avatar_url text
)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare created_profile public.profiles;
begin
  if not public.is_admin() or not public.has_required_aal() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_full_name is null or length(trim(p_full_name)) not between 2 and 100 or
     p_phone is null or p_phone !~ '^0[0-9]{9}$' or
     (p_gender is not null and p_gender not in ('male', 'female', 'other')) or
     (p_date_of_birth is not null and (p_date_of_birth < date '1900-01-01' or p_date_of_birth > current_date)) or
     (p_email is not null and length(trim(p_email)) > 254) or
     (nullif(trim(p_email), '') is not null and trim(p_email) !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$') or
     (p_address is not null and length(p_address) > 500) or
     (p_avatar_url is not null and (p_avatar_url !~ '^https?://' or length(p_avatar_url) > 2048)) then
    raise exception 'Invalid patient data' using errcode = '22023';
  end if;
  if nullif(trim(p_email), '') is not null and exists (
    select 1 from public.profiles where lower(email) = lower(trim(p_email))
  ) then
    raise exception 'Email is already used by another profile' using errcode = '23505';
  end if;

  insert into public.profiles(id, email, full_name, phone, role, date_of_birth, gender, address, avatar_url)
  values (
    gen_random_uuid(), coalesce(nullif(lower(trim(p_email)), ''), ''), trim(p_full_name), p_phone,
    'patient', p_date_of_birth, nullif(p_gender, '')::public.gender_type,
    nullif(trim(p_address), ''), nullif(trim(p_avatar_url), '')
  ) returning * into created_profile;
  return created_profile;
end;
$$;

revoke all on function public.admin_create_patient(text,text,text,text,date,text,text) from public, anon;
grant execute on function public.admin_create_patient(text,text,text,text,date,text,text) to authenticated;

notify pgrst, 'reload schema';

commit;
