# Business Rules

This document outlines the standard business processes and workflows for NIRMAN AI.

## Production Hierarchy Management Rule

NIRMAN AI is a production multi-tenant SaaS system. Organization and hierarchy management must be self-service through the application UI/API.

No developer should manually insert Executive Engineers, Assistant Engineers, Junior Engineers, Contractors, Site Teams, hardcoded demo users, bootstrap records, fixed UUIDs, fixed workspace IDs, or fixed organization IDs for normal customer onboarding.

Manual SQL is allowed only for database migrations, schema upgrades, production repair, and development/testing environments. It must never become part of the normal business workflow.

## Multi-Tenant Organization Model

Every Executive Engineer belongs to one independent organization/tenant. Organization data must remain isolated from every other organization.

Example tenant hierarchy:

- Organization A: EE -> AE -> JE -> Contractor -> Site Team
- Organization B: EE -> AE -> JE -> Contractor -> Site Team
- Organization C: EE -> AE -> JE -> Contractor -> Site Team

An Executive Engineer must never be able to see another Executive Engineer's organization. Tenant isolation is mandatory.

## User Creation Hierarchy

User creation follows a strict top-down hierarchy to maintain organizational structure.

1. Super Admin -> Creates Organization, manages billing/subscription/suspension, and assigns the primary Executive Engineer.
2. Executive Engineer (EE) -> Creates and manages Assistant Engineers, creates projects, approves contractors, and views complete organization reports.
3. Assistant Engineer (AE) -> Creates and manages Junior Engineers, assigns work, and manages assigned projects.
4. Junior Engineer (JE) -> Creates/onboards Contractors, assigns work orders, and monitors execution and daily progress.
5. Contractor -> Creates and manages site staff such as Project Manager, Site Engineer, Supervisor, Surveyor, QC Engineer, Mechanical Engineer, Electrical Engineer, Store Keeper, and Labour Team.

No role may create users above its own permission level.

## Reporting & Visibility Hierarchy

Data visibility flows upward through the reporting chain. A user can see data from their direct and indirect reports, but not from peers, superiors outside permitted workflows, or other organizations.

Reporting chain:

Labour -> Supervisor -> Surveyor -> QC -> Project Manager -> Contractor -> Junior Engineer -> Assistant Engineer -> Executive Engineer

Visibility rules:

- EE can view the complete organization.
- AE can view only assigned JEs and their descendants.
- JE can view only assigned Contractors and their descendants.
- Contractor can view only their own site team.

## Hierarchy Data Model Rule

Avoid rigid hierarchy tables. Hierarchy should be role-driven and parent-child based.

Preferred logical membership model:

- `id`
- `organization_id` or current production tenant/workspace equivalent
- `parent_id` or current production parent user/member equivalent
- `role`
- `status`

The hierarchy must be constructed dynamically from these relationships. Adding new roles such as Planning Engineer, Billing Engineer, Safety Officer, QA Manager, or future construction roles should not require schema redesign.

## Existing Production Tables Rule

Before proposing schema changes, inspect and reuse existing production tables, services, APIs, UI components, and RLS policies.

Existing production structures include:

- `profiles`
- `workspace_users`
- `executive_engineer_workspaces`
- `project_assignments`
- `contractor_licenses`

Do not duplicate responsibilities across new tables. Extend current architecture only when evidence shows the existing structure cannot support the required workflow.

## Required UI Responsibilities

The application must provide self-service interfaces for normal hierarchy operations:

- Executive Engineer: Create Assistant Engineer, view team, disable team member, transfer team member.
- Assistant Engineer: Create Junior Engineer and manage Junior Engineers.
- Junior Engineer: Create Contractor and assign Contractor.
- Contractor: Create Site Team and manage site staff.

No SQL should be required during normal business operations.