# NIRMAN AI Deployment Guide 🚀

## Overview

This guide covers the complete deployment process for NIRMAN AI, a Government Construction Monitoring ERP system built for ARSPL.

## Prerequisites

### Required Accounts & Services

1. **GitHub Repository**
   - Repository: `your-org/nirman-ai`
   - Branch protection on `main`
   - Required secrets configured

2. **Vercel Account**
   - Team/Organization account
   - Project connected to GitHub repo

3. **Supabase Project**
   - Database instance
   - All migrations applied
   - Edge functions deployed

4. **External APIs**
   - Google Gemini API key
   - Google Cloud Console (OAuth + Drive API)
   - OpenWeatherMap API (free tier)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/nirman-ai.git
cd nirman-ai
```

### 2. Environment Variables

Copy and configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your actual values (see `.env.example` for all variables).

### 3. Supabase Setup

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note down project URL and API keys

#### Run Database Migrations

Execute SQL migrations in Supabase SQL Editor in this order:

1. `supabase/migrations/20260512092335_001_initial_schema.sql`
2. `supabase/migrations/20260512094546_002_govtrack_schema.sql`
3. `supabase/migrations/003_advanced_features.sql`

#### Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy ai-analyze
supabase functions deploy analyze-progress
supabase functions deploy extract-boq
```

### 4. Google Cloud Setup

#### Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://yourdomain.com/auth/google/callback`
   - `http://localhost:5173/auth/google/callback` (for development)

#### Required Scopes

```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

## GitHub Configuration

### Required Secrets

Add these secrets in GitHub repository settings:

#### Supabase Secrets
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...

```

#### AI & External APIs
```
GEMINI_API_KEY=your_server_side_gemini_key
VITE_OPENWEATHER_API_KEY=abcd1234...
```

#### Google Integration
```
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
```

#### Vercel Deployment
```
VERCEL_TOKEN=abcd1234...
VERCEL_ORG_ID=team_xxxx
VERCEL_PROJECT_ID=prj_xxxx
```

#### Application Config
```
VITE_APP_NAME=NIRMAN AI
VITE_APP_URL=https://nirman.apostolicredeem.com
VITE_COMPANY_NAME=Apostolic Redeem Services Pvt Ltd
```

## Vercel Deployment

### Method 1: GitHub Integration (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import GitHub repository
   - Connect to `your-org/nirman-ai`

2. **Configure Project**
   - Framework Preset: `Vite`
   - Root Directory: `./` (leave default)
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables**
   - Add all `VITE_` prefixed variables from `.env`
   - Ensure production values are used

4. **Deploy**
   - Push to `main` branch triggers automatic deployment
   - Monitor deployment in Vercel dashboard

### Method 2: Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Or link existing project
vercel link
vercel --prod
```

## CI/CD Pipeline

### GitHub Actions Workflow

The project includes automated CI/CD with these stages:

1. **Quality Check**
   - TypeScript compilation
   - ESLint linting
   - Security vulnerability scan

2. **Build & Test**
   - Dependency installation
   - Test execution (if present)
   - Production build

3. **Environment Validation**
   - Required secrets validation
   - Configuration checks

4. **Deployment**
   - Production deploy (main branch)
   - Staging deploy (develop branch)

### Branch Strategy

```
main      → Production deployment
develop   → Staging deployment
feature/* → Pull request validation only
```

## Post-Deployment Configuration

### 1. Domain Setup

Configure custom domain in Vercel:

1. Go to Vercel project settings
2. Add domain: `nirman.apostolicredeem.com`
3. Update DNS records as instructed
4. Update `VITE_APP_URL` environment variable

### 2. Supabase Configuration

#### Enable Realtime

Ensure these tables have realtime enabled:
- `notifications`
- `problems`
- `gov_projects`
- `payment_milestones`
- `work_uploads`
- `payment_requests`

#### Storage Buckets

Create storage bucket for file uploads:
- Bucket name: `uploads`
- Public access: Enabled
- File size limit: 10MB

### 3. Edge Functions Secrets

Configure secrets for Edge Functions:

```bash
# Set Gemini API key for functions
supabase secrets set GEMINI_API_KEY=your_server_side_gemini_key
```

## Monitoring & Maintenance

### Health Checks

- **Application**: Check Vercel deployment status
- **Database**: Monitor Supabase dashboard
- **Functions**: Check Edge Functions logs
- **Storage**: Monitor file upload usage

### Backup Strategy

- **Database**: Supabase automatic backups
- **Files**: Google Drive integration
- **Code**: GitHub repository

### Update Process

1. Create feature branch
2. Implement changes
3. Test locally
4. Create pull request
5. Merge to `develop` (staging test)
6. Merge to `main` (production deploy)

## Troubleshooting

### Common Issues

#### Build Failures
- Check Node.js version (must be 18+)
- Verify all environment variables are set
- Check for TypeScript errors

#### Deployment Issues
- Verify Vercel tokens are correct
- Check GitHub secrets configuration
- Ensure branch protection rules allow deployment

#### Runtime Errors
- Check Supabase connection
- Verify API keys are valid
- Check browser console for client-side errors

### Support

For deployment issues:
- Check GitHub Actions logs
- Review Vercel deployment logs
- Monitor Supabase function logs
- Contact: support@arspl.in

## Security Checklist

- [ ] Environment variables not exposed in client
- [ ] Supabase RLS policies enabled
- [ ] API keys properly secured
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] File upload validation implemented
- [ ] Rate limiting configured

## Performance Optimization

- [ ] Enable Vercel caching
- [ ] Optimize bundle size
- [ ] Configure CDN for static assets
- [ ] Implement lazy loading
- [ ] Set up monitoring alerts

---

**Deployment completed successfully! 🎉**

Monitor the application and configure monitoring alerts for optimal performance.
