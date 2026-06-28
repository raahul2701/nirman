-- Repair document_metadata.uploaded_by foreign key alignment.
-- The application passes auth/profile user ids in uploaded_by, so the FK must target public.profiles(id).

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workspace_users'::regclass
      and contype in ('p', 'u')
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.workspace_users'::regclass
            and attname = 'id'
        )
      ]::smallint[]
  ) then
    alter table public.workspace_users
      add constraint workspace_users_id_key unique (id);
  end if;
end $$;

alter table public.document_metadata
drop constraint if exists document_metadata_uploaded_by_fkey;

alter table public.document_metadata
add constraint document_metadata_uploaded_by_fkey
foreign key (uploaded_by)
references public.profiles(id)
on delete set null
not valid;
