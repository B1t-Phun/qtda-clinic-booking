-- Private profile portraits for doctors and patients.
-- Run in Supabase SQL Editor after auth_security.sql.
-- No public profile columns, clinical records or existing buckets are changed.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-avatars','profile-avatars',false,1048576,array['image/webp'])
on conflict(id)do nothing;
do $$
begin
  if exists(select 1 from storage.buckets where id='profile-avatars' and public)then
    raise exception 'profile-avatars already exists as a public bucket. Review its access before applying this migration.';
  end if;
end $$;

drop policy if exists profile_avatar_read on storage.objects;
create policy profile_avatar_read on storage.objects for select to authenticated using(
  bucket_id='profile-avatars' and public.has_required_aal() and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.is_admin()
    -- Doctor portraits are visible to signed-in users who can view doctor listings.
    or exists(select 1 from public.doctors d where d.profile_id::text=(storage.foldername(name))[1])
    -- A doctor sees a patient's portrait only when that patient has an appointment with them.
    or exists(select 1 from public.appointments a where a.patient_id::text=(storage.foldername(name))[1] and a.doctor_id=public.current_doctor_id())
  )
);
drop policy if exists profile_avatar_insert on storage.objects;
create policy profile_avatar_insert on storage.objects for insert to authenticated with check(
  bucket_id='profile-avatars' and public.has_required_aal()
  and (storage.foldername(name))[1]=auth.uid()::text
  and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}[.]webp$'
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in('doctor','patient'))
);
drop policy if exists profile_avatar_delete on storage.objects;
create policy profile_avatar_delete on storage.objects for delete to authenticated using(
  bucket_id='profile-avatars' and public.has_required_aal() and (storage.foldername(name))[1]=auth.uid()::text
);
-- No UPDATE policy: every new image has a unique immutable object name.
-- Only the app user's JWT is used by the upload/download routes, never service_role.
commit;
