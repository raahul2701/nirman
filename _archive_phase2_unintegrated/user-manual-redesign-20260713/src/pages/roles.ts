import type { Role } from '@/types/userManual';

export const roles: Role[] = [
  {
    role: 'Executive Engineer',
    can: 'Setup workspace, create/import projects, upload Agreement/BOQ, run AI project study, assign AE/JE/Contractor, monitor physical/financial progress, review inspections, RA bills, material advance, and approve/reject submissions.',
    daily: 'Dashboard, Projects, Agreement & BOQ, Reports, Enterprise Access, Assign Project, Activity Logs during pilot.',
    review: 'Workspace projects, component progress, pending inspections, QC/TPA issues, budget gaps, RA bills, material advance, hindrances, diesel alerts, and contractor uploads.',
    cannot: 'Should not upload on behalf of every field user during normal use; field evidence should come from the actual JE/Contractor account.',
  },
  {
    role: 'Assistant Engineer',
    can: 'View assigned projects, review JE daily progress, contractor submissions, quality/testing records, and escalate issues to EE.',
    daily: 'Gov Dashboard, Upload Work review, Inspections, Reports, Budget vs Progress, Material Tests.',
    review: 'JE site verification, contractor uploads, quality risks, delay reasons, and payment-support evidence.',
    cannot: 'Usually should not create the EE workspace or override final EE ownership decisions.',
  },
  {
    role: 'Junior Engineer',
    can: 'Enter daily site progress, labour, material, equipment, survey/TBM/level data, inspections, site photos, and measurement book entries for assigned site/project.',
    daily: 'Dashboard, Daily Progress, Survey & Quantity, Inspections, GIS Map, Material Tests, Hindrance Register.',
    review: 'Own pending uploads, missing GPS/photos, survey warnings, AI feedback, and items returned by AE/EE.',
    cannot: 'Usually should not manage workspace billing, contractor licensing, or final EE-level access setup.',
  },
  {
    role: 'Contractor',
    can: 'View own assigned project, read BOQ/agreement summary, upload bills/photos/challans, submit material advance claim, view MB/possible billing, and track RA bill/payment milestone.',
    daily: 'Dashboard, Agreement & BOQ, Material Advance, Diesel, Materials, Labour, Maintenance, TPA Portal.',
    review: 'Own submissions, pending documents, rejected/flagged uploads, possible billing, RA bill status, and payment milestones.',
    cannot: 'Should not see unrelated government projects or change EE/AE/JE hierarchy.',
  },
  {
    role: 'Admin',
    can: 'Manage users, roles, activity logs, access control checks, and support EE workspace setup.',
    daily: 'Admin Activity Logs, Audit Logs, Enterprise Access, Assign Project, Workspace Setup.',
    review: 'Role/profile issues, login/page activity, assignment events, shared-login misuse, missing configuration, and blocked access.',
    cannot: 'Should not expose secrets, bypass production approval, or use shared accounts as a permanent operating model.',
  },
];