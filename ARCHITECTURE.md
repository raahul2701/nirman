> **Status: LOCKED**
>
> **Version: 1.0**
>
> **Effective Date: 2024-05-15**
>
> This document defines the immutable architectural principles of NIRMAN AI. Changes require documented architectural review.

---
# NIRMAN AI Architectural Constitution

## Architecture Principle

This document is the authoritative architecture specification for NIRMAN AI.

If existing code conflicts with this document:

- preserve working production functionality where possible,
- but all new development must follow this architecture.

Never introduce shortcuts that violate these principles.

When uncertain, prefer scalable multi-tenant architecture over temporary implementation convenience.

---

## Core Architectural Rules

### Rule 1: Tenancy Model

Every `Organization` has exactly one primary `Executive Engineer`.

The `Organization` is the tenant.

The `Executive Engineer` is the initial primary administrator of that tenant.

The `Organization` continues to exist even if the `Executive Engineer` changes. This supports transfers, retirements, and replacements.

### Rule 2: Organization Lifecycle

An `Organization` is the primary business entity.

An `Organization` may contain one or more `Workspaces`. Workspaces are organizational subdivisions (e.g., Divisions, Circles) and never represent separate tenants.

Executive Engineers may change over time.

Projects, documents, contractors, audit logs, and historical records remain attached to the `Organization`, not to an individual Executive Engineer.

### Rule 3: Self-Service Onboarding

Production onboarding must never require SQL.

Manual SQL may be used only for database migrations, schema upgrades, production repair, or development/testing environments. It must never become part of the normal business workflow for creating Executive Engineers, Assistant Engineers, Junior Engineers, Contractors, or Site Teams.

The standard user creation hierarchy is defined in the business rules.

After Organization creation, every user must be created through the application UI/API. If SQL is required to create users or hierarchy, the implementation is considered incomplete.

Do not solve hierarchy gaps with seed data, hardcoded demo users, temporary bootstrap records, fixed UUIDs, fixed workspace IDs, or fixed organization IDs.

### Rule 4: Permission Evaluation

Every API endpoint, query, report, and document must validate:

1.  **Organization membership**: The user belongs to the correct tenant.
2.  **Role permissions**: The user's role has the necessary permissions for the action.
3.  **Hierarchy access**: The user has rights over the specific data entity based on their position in the hierarchy.

Permission is granted only if all required checks pass.

Never trust client-side authorization. Authorization must always be enforced on the server.

### Rule 5: Reporting Hierarchy

The system is built on a strict user hierarchy. A user's visibility and actions are constrained by their position in this hierarchy.

The reporting chain is defined as follows:
*This is a business rule and is defined in `03_BUSINESS_RULES.md`.*

-   **Visibility** always propagates upward.
-   **Permissions** never propagate downward.

### Rule 6: User Creation and Assignment

Only the immediate parent role may create or assign direct child users.

Child users may only belong to one reporting parent unless explicitly designed otherwise.

### Rule 7: Permission Matrix

Each role has a clearly defined scope of actions.

**Example:**

-   **Executive Engineer**: Create AE, Create Project, View Organization, Approve Contractor.
-   **Assistant Engineer**: Create JE, Assign Work, View Assigned Projects.
-   **Junior Engineer**: Create Contractor, Daily Monitoring.
-   **Contractor**: Create Site Team.

### Rule 8: Data Isolation

Data is strictly partitioned by the tenant identifier used in production. Conceptually this is `organization_id`; in current production structures this may be represented through existing tables such as `executive_engineer_workspaces`, `workspace_users`, and related workspace ownership columns.

A user from one organization must never be able to see or modify data from another organization.

Before proposing any schema change, inspect and reuse existing production tables and RLS policies. Current production structures such as `profiles`, `workspace_users`, `executive_engineer_workspaces`, `project_assignments`, and `contractor_licenses` must be extended or reused where appropriate rather than duplicated.

### Rule 9: File & Document Isolation

Documents, Drawings, Photos, MB, Bills, DPR, and QC Reports must inherit `organization_id` and access permissions from their parent entity.

### Rule 10: AI Module Isolation

AI modules inherit organization isolation. AI can never access another organization's data. Every AI response must be generated only from data available to the requesting organization.

### Rule 11: Reporting vs. Approval Hierarchy

Reporting hierarchy and workflow approval hierarchy are separate concepts.

-   **Reporting** defines visibility (who can see whose data).
-   **Workflow approvals** may be configured independently when required by department rules.

### Rule 12: Data-Driven Roles

Roles must be data-driven. New roles should be configurable through role definitions rather than requiring source code changes whenever possible.

Avoid rigid role-specific hierarchy tables. Organization membership should be modeled as role-driven membership with one tenant/organization/workspace reference and an optional parent member/user reference. The hierarchy must be constructed dynamically from those relationships so roles such as Planning Engineer, Billing Engineer, Safety Officer, QA Manager, or future department roles do not require schema redesign.

### Rule 13: Data Models

The core data models should be structured for clarity and scalability.

**Conceptual User Model**

-   `id`: Unique identifier for the user.
-   `organization_id`: Foreign key to the `Organization` (tenant).
-   `role_id`: Foreign key to the `Role`.
-   `parent_user_id`: Self-referencing key to establish the hierarchy.
-   `status`: e.g., `active`, `inactive`, `archived`.
-   `created_by`: User ID of the creator.
-   `created_at`: Timestamp of creation.

**Conceptual Role Model**

-   `role_id`: Unique identifier for the role.
-   `role_name`: e.g., "Executive Engineer", "Junior Engineer".
-   `hierarchy_level`: A numeric or string value to order roles.
-   `permissions`: A structured format (e.g., JSON) defining what the role can do.

### Rule 14: Scalability & Performance

The architecture must remain performant as organizations grow. Hierarchy queries should be optimized and must not require full table scans for common operations.

The database schema must support future expansion without requiring breaking schema redesign for new roles or organizational growth.

The architecture must support:
-   Unlimited Organizations
-   Unlimited Projects
-   100,000+ Users
-   Millions of Documents

All without requiring manual database operations for scaling.

### Rule 15: Soft Deletion

Users, projects, contractors, and reports should generally be archived or deactivated (`soft-deleted`) rather than permanently deleted. Historical audit data must remain available.

### Rule 16: Existing Production Architecture First

All production changes must begin by inspecting the existing implementation, production tables, services, APIs, components, and RLS policies.

Do not create duplicate pages, duplicate services, duplicate schemas, or duplicate business logic when an existing production structure can be repaired or extended.

Manual data insertion, RLS bypasses, hardcoded identifiers, and automatic demo hierarchy creation are architecture violations unless explicitly scoped to development/testing or documented production repair.

### Rule 17: Evidence-Driven Architecture Decisions

All architecture reviews, production investigations, and runtime repair decisions must be evidence-driven.

If multiple explanations remain plausible, the investigation must not select one without sufficient supporting evidence. The finding must be classified as:

**Status: Undetermined (Evidence Insufficient)**

The investigation must explicitly document:

- Confirmed evidence.
- Unknowns.
- Plausible explanations.
- Additional evidence required to reach a conclusion.

Architectural decisions must never be based on assumptions, table-name similarity, temporary runtime behavior, inferred intent, or undocumented conventions.

Architectural decisions must be supported by one or more of the following:

- Production schema inspection.
- Runtime API behavior.
- Source code analysis.
- Deployment artifacts.
- Official project documentation.
- Existing business rules.
- Verified production logs.

A runtime error does not automatically imply a schema defect, obsolete frontend, obsolete backend, incomplete deployment, or missing migration. Those are hypotheses until supported by verifiable evidence.

Runtime convenience must never override business semantics. If a repair changes the meaning of business data, it is architecturally invalid until explicitly approved.

When evidence is insufficient, preserve existing business semantics and identify the additional evidence required to reach a defensible architectural decision.
### Rule 18: Audit Trail

Every important operation must be auditable. The system must log who did what, and when.

Examples of auditable events:

-   User Created
-   Role Changed
-   Hierarchy Changed
-   Project Assigned
-   Contractor Approved
-   QC Approved
-   Bill Passed
-   MB Modified
-   Attendance Edited
