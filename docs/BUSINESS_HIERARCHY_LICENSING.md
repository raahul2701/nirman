# Business Hierarchy And Licensing

## Model

NIRMAN uses an Executive Engineer owned workspace model.

```text
Executive Engineer
  -> Assistant Engineer
    -> Junior Engineer
      -> Project
        -> Contractor Licence
```

Government users are free lifetime users. Executive Engineers, Assistant Engineers, and Junior Engineers are never billing owners.

Contractors are paid users. The licence rule is:

```text
billable_users = max(actual_contractor_users, 10)
monthly_amount = billable_users * 270
```

Examples:

- 8 contractor users: 10 billable users, Rs 2700/month
- 15 contractor users: 15 billable users, Rs 4050/month

## Workspace Isolation

Each Executive Engineer workspace has its own:

- hierarchy membership in `workspace_users`
- project access rows in `project_assignments`
- contractor licences in `contractor_licenses`
- Google setup metadata in `workspace_google_connections`
- Drive folder mapping in `workspace_drive_folders`
- document metadata in `document_metadata`
- AI context in `project_ai_context`

The app stores government documents in the EE-owned Google Drive namespace and keeps only metadata and Drive IDs in Supabase.

## Drive Structure

```text
NIRMAN/
  ExecutiveEngineer_{name_or_id}/
    Projects/
      {ProjectName}/
        DPR/
        QC/
        TPA/
        MB/
        Bills/
        Drawings/
        Diesel/
        Hindrance/
        GIS/
        Photos/
        Videos/
    Contractors/
    Reports/
    Archive/
```

Drive writes still require OAuth. During pilot setup, admins can manually record Google project and Drive folder IDs per EE workspace. OAuth/service-account connection can be enabled later through the existing Drive auth abstraction.

## Access Rules

- EE can view the full workspace hierarchy, projects, contractors, documents, and AI summaries.
- AE can view assigned subdivision/project records.
- JE can view assigned project/site records and upload field data.
- Contractor can view only assigned project data and requires an active/trial licence.
- Documents are filtered by `workspace_id`, `owner_executive_engineer_id`, `project_id`, and optional `contractor_id`.

## Rollout Phases

Phase A: database schema, RLS helpers, hierarchy models.

Phase B: contractor licence engine, billing summaries, recommendation workflow.

Phase C: project isolation, document metadata, per-EE Drive mapping.

Phase D: hierarchy dashboards, EE analytics, risk heatmap surfaces.

Feature flags:

```text
VITE_ENABLE_CONTRACTOR_BILLING=true
VITE_ENABLE_EE_WORKSPACE_ISOLATION=true
VITE_ENABLE_GOOGLE_DRIVE_PER_EE=true
```
