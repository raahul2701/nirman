# AI Development Rules (Codex Rule)

This document provides specific architectural directives for AI coding assistants (e.g., Gemini, Codex, Copilot).

AI coding assistants must treat the `00_ARCHITECTURE.md` document as the highest-priority architectural specification.

If existing code conflicts with the architectural principles:

-   Preserve working production behavior whenever possible.
-   Propose incremental migration paths to align with the architecture.
-   Never introduce new architectural regressions or temporary shortcuts that violate the defined principles.
## Production Hierarchy & Organization Management Rule

AI coding assistants must not solve hierarchy or onboarding gaps by inserting manual SQL seed data, hardcoded demo users, temporary bootstrap records, fixed UUIDs, fixed organization IDs, fixed workspace IDs, or RLS bypasses.

Before modifying hierarchy, organization, workspace, role, assignment, or onboarding behavior, assistants must first inspect and reuse existing production implementation, including existing components, services, APIs, tables, and RLS policies.

Production hierarchy must be self-service through the application UI/API. Manual SQL is allowed only for database migrations, schema upgrades, documented production repair, or development/testing environments.

The preferred hierarchy approach is role-driven membership with a tenant/organization/workspace reference and an optional parent reference. Do not create rigid role-specific hierarchy tables or duplicate responsibilities already covered by `profiles`, `workspace_users`, `executive_engineer_workspaces`, `project_assignments`, or `contractor_licenses` without evidence and architectural review.

Any recommendation that requires developers to manually create users or hierarchy for every new customer is a production architecture violation.
## Evidence-Driven Investigation Rule

AI coding assistants must not select an architectural explanation unless the available evidence supports it.

If multiple explanations remain plausible, classify the finding as:

**Status: Undetermined (Evidence Insufficient)**

Every production investigation should conclude with these sections:

1. Confirmed Evidence
2. Unknowns
3. Plausible Explanations
4. Classification
5. Additional Evidence Required

Allowed classifications are:

- Confirmed
- Repaired
- Deprecated
- Intended Behavior
- Undetermined (Evidence Insufficient)

Use `Undetermined (Evidence Insufficient)` whenever the available evidence cannot conclusively identify the correct explanation.

Do not base architecture decisions on assumptions, table-name similarity, temporary runtime behavior, inferred intent, or undocumented conventions. Decisions require production schema inspection, runtime API behavior, source code analysis, deployment artifacts, official project documentation, existing business rules, or verified production logs.

Runtime errors are hypotheses, not conclusions. A runtime error does not by itself prove a schema defect, obsolete frontend, obsolete backend, incomplete deployment, or missing migration.

Runtime convenience must never override business semantics. If a repair changes the meaning of business data, it is architecturally invalid until explicitly approved.

Permanent principle: never assume and never infer business intent without evidence.