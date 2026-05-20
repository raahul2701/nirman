# Pilot Testing

Pilot mode is enabled with:

```text
VITE_ENABLE_PILOT_MODE=true
```

The pilot admin screen is available at `/enterprise/pilot`.

It uses deterministic synthetic seed data from `src/services/pilotSeedData.ts`:

- 1 Executive Engineer
- 2 Assistant Engineers
- 4 Junior Engineers
- 3 Contractors
- 5 Projects
- Contractor billing examples:
  - 8 users -> 10 billable -> Rs 2700/month
  - 12 users -> 12 billable -> Rs 3240/month
  - trial contractor

The seed data does not contain real engineer names, real phone numbers, real API keys, or real Drive file IDs. It is safe for demo and manual verification.

For live Supabase testing, create real authenticated pilot users first, then map them into the hierarchy tables from migration `014_business_hierarchy_licensing.sql`.
