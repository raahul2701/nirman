# Decision Log

## 2026-07-10 - Production Hierarchy Must Be Self-Service

Status: Accepted

Decision:
NIRMAN AI hierarchy and organization management must be self-service through the application UI/API. Production hierarchy must not depend on manual SQL seed data, hardcoded demo users, temporary bootstrap records, fixed UUIDs, fixed workspace IDs, fixed organization IDs, or developer-created customer rows.

Rationale:
NIRMAN AI is a multi-tenant production SaaS system. Every Executive Engineer organization must be isolated and able to manage its own hierarchy. Manual developer onboarding does not scale, risks tenant isolation failures, bypasses normal authorization, and hides incomplete product workflows.

Rules:
- Super Admin creates organizations, manages billing/subscriptions/suspension, and assigns the Executive Engineer.
- Executive Engineer creates and manages Assistant Engineers.
- Assistant Engineer creates and manages Junior Engineers.
- Junior Engineer creates Contractors and assigns work.
- Contractor creates and manages site staff.
- No role may create users above its own permission level.
- Permissions and visibility must follow tenant membership, role permissions, and the parent-child reporting chain.
- Existing production tables and RLS policies must be inspected and reused before proposing schema changes.

Implementation Direction:
Use role-driven organization membership with a tenant/organization/workspace reference and optional parent reference. Build hierarchy dynamically from those relationships. Prefer extending current production structures such as `profiles`, `workspace_users`, `executive_engineer_workspaces`, `project_assignments`, and `contractor_licenses` over introducing duplicate tables or services.

Violation Examples:
- Manually inserting AE/JE/Contractor rows for each customer.
- Adding hardcoded workspace or organization IDs.
- Creating demo hierarchy automatically in production.
- Bypassing RLS to make hierarchy screens work.
- Replacing existing production structures without inspecting them first.
## 2026-07-10 - Architecture Decisions Must Be Evidence-Driven

Status: Accepted

Decision:
All architecture reviews, production investigations, and runtime repair decisions must be evidence-driven. When the available evidence cannot conclusively identify the correct explanation, the finding must be classified as `Undetermined (Evidence Insufficient)`.

Rationale:
Production runtime errors can have multiple valid explanations. Treating an unverified hypothesis as a conclusion risks invalid architecture changes, business-semantic drift, unsafe workarounds, and incorrect repairs.

Required Investigation Output:
- Confirmed Evidence
- Unknowns
- Plausible Explanations
- Classification
- Additional Evidence Required

Decision Standard:
Architecture decisions must not be based on assumptions, table-name similarity, temporary runtime behavior, inferred intent, or undocumented conventions. Valid support includes production schema inspection, runtime API behavior, source code analysis, deployment artifacts, official project documentation, existing business rules, and verified production logs.

Runtime Rule:
A runtime error does not automatically imply a schema defect, obsolete frontend, obsolete backend, incomplete deployment, or missing migration. These remain hypotheses until supported by verifiable evidence.

Business Semantics Rule:
Runtime convenience must never override business semantics. If a repair changes the meaning of business data, it is architecturally invalid until explicitly approved.