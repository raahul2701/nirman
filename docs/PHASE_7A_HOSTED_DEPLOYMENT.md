# Phase 7A Hosted Deployment

## Environment Architecture

- Use `.env.development`, `.env.staging`, and `.env.production` as client-safe Vite environment files.
- Keep server-only values in Supabase secrets, never in `VITE_*` files:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - `AI_PROXY_SIGNING_SECRET`
  - `AI_PROXY_TIMEOUT_MS`
  - `AI_PROXY_RATE_LIMIT`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Validate before deployment:
  - `npm run env:check -- staging`
  - `npm run env:check -- production`

## Supabase Staging And Production

1. Link the correct project: `supabase link --project-ref <project-ref>`.
2. Push migrations to staging first: `supabase db push`.
3. Generate fresh types: `npm run supabase:types`.
4. Bootstrap buckets with service role env set: `npm run supabase:bootstrap:buckets`.
5. Deploy functions: `npm run supabase:deploy:functions`.
6. Run health checks: `npm run supabase:health`.
7. Run RLS smoke checks: `npm run supabase:verify:rls`.
8. Run storage policy and signed URL checks: `npm run supabase:verify:storage`.

Rollback rule: prefer forward-only rollback migrations that disable new behavior, mark records inactive, or restore old policies. Do not drop tables or buckets during incident rollback.

## Seed Strategy

- Keep production seed data minimal: admin profile, company defaults, storage buckets, and feature flags.
- Use staging seeds for demo projects, contractors, uploads, and AI logs.
- Never seed production with sample personally identifiable data.

## Hosted Pipeline

- Vercel: use `vercel.json`, `npm run deploy:validate -- production`, then deploy `dist`.
- Netlify fallback: use `netlify.toml`.
- Supabase Edge Functions: deploy independently before frontend promotion.

## Final Validation

- Production build: `npm run build`.
- Bundle analysis: `npm run analyze`.
- Hosted smoke test: open `/`, `/operations`, `/manifest.json`, `/sw.js`, `/offline.html`.
- Confirm no client bundle contains server secrets: `rg "GEMINI_API_KEY|SERVICE_ROLE|SIGNING_SECRET|AIzaSy|sk-" dist`.
- Confirm AI proxy health function returns `ok: true`.
- Confirm signed uploads create URLs and storage policies reject anonymous writes.
