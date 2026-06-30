-- Repair document_metadata project references for both active project sources.
-- document_metadata.project_id is intentionally polymorphic and validated by
-- project_table because NIRMAN supports public.projects and public.gov_projects.

alter table public.document_metadata
  add column if not exists project_table text;

alter table public.document_metadata
  drop constraint if exists document_metadata_project_table_check;

alter table public.document_metadata
  add constraint document_metadata_project_table_check
  check (project_table is null or project_table in ('projects', 'gov_projects'));

update public.document_metadata dm
set project_table = (
  select pa.project_table
  from public.project_assignments pa
  where pa.workspace_id = dm.workspace_id
    and pa.project_id = dm.project_id
    and pa.project_table in ('projects', 'gov_projects')
  order by
    case when pa.access_status in ('active', 'pilot') then 0 else 1 end,
    pa.created_at desc
  limit 1
)
where dm.project_id is not null
  and dm.project_table is null
  and exists (
    select 1
    from public.project_assignments pa
    where pa.workspace_id = dm.workspace_id
      and pa.project_id = dm.project_id
      and pa.project_table in ('projects', 'gov_projects')
  );

update public.document_metadata dm
set project_table = 'projects'
where dm.project_id is not null
  and dm.project_table is null
  and exists (
    select 1
    from public.projects p
    where p.id = dm.project_id
  );

update public.document_metadata dm
set project_table = 'gov_projects'
where dm.project_id is not null
  and dm.project_table is null
  and exists (
    select 1
    from public.gov_projects gp
    where gp.id = dm.project_id
  );

alter table public.document_metadata
  drop constraint if exists document_metadata_project_id_fkey;

create or replace function public.validate_document_metadata_project_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_project_table text;
begin
  if new.project_id is null then
    new.project_table := null;
    return new;
  end if;

  if new.project_table is null then
    select pa.project_table
      into resolved_project_table
    from public.project_assignments pa
    where pa.workspace_id = new.workspace_id
      and pa.project_id = new.project_id
      and pa.project_table in ('projects', 'gov_projects')
    order by
      case when pa.access_status in ('active', 'pilot') then 0 else 1 end,
      pa.created_at desc
    limit 1;

    if resolved_project_table is not null then
      new.project_table := resolved_project_table;
    elsif exists (select 1 from public.projects p where p.id = new.project_id) then
      new.project_table := 'projects';
    elsif exists (select 1 from public.gov_projects gp where gp.id = new.project_id) then
      new.project_table := 'gov_projects';
    end if;
  end if;

  if new.project_table = 'projects' then
    if not exists (select 1 from public.projects p where p.id = new.project_id) then
      raise exception 'document_metadata.project_id % is not present in public.projects', new.project_id
        using errcode = '23503';
    end if;
  elsif new.project_table = 'gov_projects' then
    if not exists (select 1 from public.gov_projects gp where gp.id = new.project_id) then
      raise exception 'document_metadata.project_id % is not present in public.gov_projects', new.project_id
        using errcode = '23503';
    end if;
  else
    raise exception 'document_metadata.project_table is required for project_id %', new.project_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists document_metadata_project_ref_validate
  on public.document_metadata;

create trigger document_metadata_project_ref_validate
before insert or update of workspace_id, project_id, project_table
on public.document_metadata
for each row
execute function public.validate_document_metadata_project_ref();

create index if not exists idx_document_metadata_workspace_project_source
  on public.document_metadata(workspace_id, project_table, project_id);
