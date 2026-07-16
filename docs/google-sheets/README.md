# NIRMAN AI Google Sheets Supabase Presentation Export

This folder contains a paste-ready Google Apps Script for building a read-only presentation workbook from the production Supabase schema.

## Files

- `NirmanSupabasePresentation.gs` - Google Apps Script source.
- `README.md` - setup, operating notes, and troubleshooting.

## Setup

1. Create or open the Google Sheet used for the presentation.
2. Open **Extensions > Apps Script**.
3. Paste `NirmanSupabasePresentation.gs` into the script editor.
4. Open **Project Settings > Script properties**.
5. Add these properties:
   - `SUPABASE_URL`: `https://aaxbulmndnblclmcuqgj.supabase.co/rest/v1`
   - `SUPABASE_ANON_KEY`: the Supabase anon key only
   - `WORKSPACE_ID`: the selected workspace id
   - `PROJECT_ID`: the selected project id
   - `PROJECT_TABLE`: `projects` or `gov_projects`
6. Optionally add `SUPABASE_EDGE_FUNCTION_URL` if a read-only export function is deployed later.
7. Save the script.
8. Reload the spreadsheet.
9. Use the **NIRMAN AI** menu.

Do not use a service-role key in Apps Script. The script is designed for the anon key and read-only REST requests.

## Menu

- **Refresh All Data**
- **Refresh AI Data**
- **Build Dashboard**
- **Configure Connection**
- **Install Hourly Refresh**
- **Remove Refresh Triggers**

## Tabs

The script creates and refreshes these tabs:

- `Dashboard`
- `Projects`
- `AI Project Study`
- `AI Reports`
- `Documents`
- `BOQ`
- `Assignments`
- `Inspections`
- `Raw AI JSON`
- `Sync Log`

## Data Sources

The script reads only verified physical columns from these tables:

- `projects`
- `gov_projects`
- `ai_project_study`
- `ai_reports`
- `material_ai_reports`
- `agreement_documents`
- `document_metadata`
- `project_boq`
- `boq_items`
- `project_assignments`
- `inspection_reports`
- `material_tests`

Regular project identity comes from `projects.project_code`; there is no `projects.code` usage. Regular-project contractor identity is resolved from the separate `project_assignments` read. GovTrack contractor identity comes from `gov_projects.contractor_name`.

The `projects` and `gov_projects` tables are queried separately and normalized only after those table-specific reads complete.

## Safety Notes

- The script performs read-only `GET` requests to Supabase REST.
- It does not execute SQL.
- It does not deploy functions.
- It does not add migrations, columns, aliases, or fallback writes.
- It does not write secrets into sheet cells.
- Sync errors are sanitized before being written to `Sync Log`.
- Transient `429` and `5xx` failures are retried with backoff.
- Schema, missing-table, and permission failures are not retried.
- Dataset failures are logged independently so one failing tab does not block the rest of the refresh.

## Timed Refresh

Use **Install Hourly Refresh** to create an Apps Script time trigger for `refreshNirmanAllData`. Use **Remove Refresh Triggers** before handing off or when the workbook should stop polling Supabase.

## Troubleshooting

- `401` or `403`: verify the anon key and RLS access for the selected user/project.
- `404` or `PGRST205`: verify the table exists in the exposed REST schema.
- `400`, `406`, `409`, or `422`: check `Sync Log`; this usually means a schema or filter mismatch.
- `429`: wait for rate limits to clear, then refresh again.
- `5xx`: retry later; these are treated as transient server failures.
- Empty tabs: verify `WORKSPACE_ID`, `PROJECT_ID`, and `PROJECT_TABLE`.
- Raw JSON too large: values are truncated before they exceed Google Sheets cell limits.

## Presentation Checklist

- Confirm selected workspace.
- Confirm selected project.
- Refresh all data.
- Check `Sync Log`.
- Verify `AI Project Study` rows.
- Verify `Raw AI JSON`.
- Open `Dashboard`.
- Hide technical tabs if needed.
- Do not display tokens or secret properties.
