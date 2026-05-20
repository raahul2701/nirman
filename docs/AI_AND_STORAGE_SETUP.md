# AI And Storage Setup

## Gemini Server Proxy

Gemini requests should go through the Supabase `ai-proxy` edge function. Keep API keys out of `VITE_*` variables and configure these as server-side Supabase secrets:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_PROXY_SIGNING_SECRET`
- `AI_PROXY_TIMEOUT_MS`
- `AI_PROXY_RATE_LIMIT`
- `AI_PROXY_RATE_WINDOW_MS`

Client code may set non-secret model hints such as `VITE_GEMINI_MODEL` and `VITE_GEMINI_IMAGE_MODEL`. The browser should not contain a Gemini API key.

## Google Drive Storage

Google Drive is optional. It is only selected when `VITE_STORAGE_PROVIDER=googleDrive` and the Drive integration is available.

Drive writes require OAuth access tokens with the needed Drive scopes. API-key-only access can read public metadata in limited cases, but it cannot create folders or upload files to a user's Drive. The current `driveAuth` abstraction is OAuth-ready and disabled by default; it returns no token until a real auth provider is configured.

Drive uploads use this folder shape when enabled:

```text
NIRMAN/Projects/{ProjectNameOrId}/{Category}
```

## Supabase Fallback

Supabase storage remains the default provider. If Drive is disabled, unavailable, missing OAuth, or fails during upload, `storageService` falls back to Supabase storage and records upload metadata best-effort.

This preserves offline queue compatibility and keeps uploads non-blocking from the app's perspective.

## Validation

Run the standard checks after AI or storage changes:

```bash
npm run typecheck
npm run build
npm run analyze
rg "GEMINI_API_KEY|SERVICE_ROLE|SIGNING_SECRET|AIzaSy" dist
```
