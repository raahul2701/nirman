# NIRMAN AI 🏗️
### Government Construction Monitoring ERP
### By ARSPL — Apostolic Redeem Services Pvt Ltd
### ROC Patna, Bihar | Construction Technology Platform

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/nirman-ai)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3+-61dafb.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.105+-3ecf8e.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38bdf8.svg)](https://tailwindcss.com/)

## 📋 Overview

NIRMAN AI is a comprehensive Government Construction Monitoring ERP system designed for Bihar's public works department. It combines AI-powered analytics, real-time monitoring, and automated workflows to ensure transparent, efficient, and corruption-free construction project management.

### 🎯 Key Features

- **AI-Powered Analysis**: Claude Sonnet 4 integration for intelligent project insights
- **Real-time Monitoring**: Live dashboards with automated alerts
- **Government Compliance**: Multi-level approval workflows and audit trails
- **Contractor Management**: Blacklist database and performance tracking
- **Quality Assurance**: Drawing vs Reality AI comparison and material testing
- **Financial Tracking**: Bank guarantees, security deposits, and payment milestones
- **GIS Mapping**: Interactive project visualization with Leaflet.js
- **Weather Integration**: Automated weather logging and extension eligibility
- **WhatsApp Bot**: Contractor communication and updates
- **Mobile-First**: Responsive design for field engineers and contractors

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **npm or yarn**
- **Supabase account**
- **Claude API key** (Anthropic)
- **Google Cloud Console** (for Drive integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/nirman-ai.git
   cd nirman-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Supabase Setup**
   ```bash
   # Run migrations in Supabase SQL Editor (in order):
   # 1. supabase/migrations/20260512092335_001_initial_schema.sql
   # 2. supabase/migrations/20260512094546_002_govtrack_schema.sql
   # 3. supabase/migrations/003_advanced_features.sql
   ```

5. **Deploy Edge Functions**
   ```bash
   # Deploy Supabase Edge Functions
   supabase functions deploy ai-analyze
   supabase functions deploy analyze-progress
   supabase functions deploy extract-boq
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `VITE_CLAUDE_API_KEY` | Anthropic Claude API key | ✅ |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ |
| `VITE_GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ |
| `VITE_OPENWEATHER_API_KEY` | OpenWeatherMap API key | ❌ |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_WHATSAPP_MODE` | WhatsApp integration mode | `mock` |
| `VITE_MAX_FILE_SIZE_MB` | Maximum upload file size | `10` |
| `VITE_SESSION_TIMEOUT_MINUTES` | Session timeout | `480` |

## 🏗️ Project Structure

```
nirman-ai/
├── src/
│   ├── components/
│   │   ├── forms/          # Reusable form components
│   │   ├── layout/         # Layout components (Header, Sidebar)
│   │   └── ui/             # UI primitives (Button, Card, etc.)
│   ├── contexts/           # React contexts (Auth, Notifications)
│   ├── lib/                # Utilities and configurations
│   ├── pages/              # Page components
│   │   ├── auth/           # Authentication pages
│   │   └── govtrack/       # Government-specific pages
│   ├── services/           # External service integrations
│   └── types/              # TypeScript type definitions
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
├── .github/
│   └── workflows/          # CI/CD pipelines
└── public/                 # Static assets
```

## 🗄️ Database Schema

### Core Tables
- `profiles` - User profiles and roles
- `projects` - Construction projects
- `gov_projects` - Government contract projects
- `workers` - Labor workforce
- `materials` - Inventory management
- `problems` - Issue tracking

### Advanced Features
- `blacklisted_contractors` - Contractor blacklist
- `bank_guarantees` - BG tracking
- `drawing_comparisons` - AI drawing analysis
- `material_tests` - Quality testing
- `ai_progress_reports` - AI analytics

## 🔐 Authentication & Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full system access |
| `project_manager` | Project management |
| `site_engineer` | Quality inspection |
| `labor_supervisor` | Workforce management |
| `worker` | Basic access |

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Vercel will auto-detect from GitHub
   ```

2. **Environment Variables**
   - Add all variables from `.env.example`
   - Ensure `VITE_` prefix for client-side vars

3. **Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node Version: `18.x`

### Manual Deployment

```bash
# Build for production
npm run build

# Preview build
npm run preview

# Deploy dist/ folder to your hosting provider
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The project includes automated CI/CD with:

- **Node.js 18** environment
- **Dependency installation** (`npm ci`)
- **Type checking** (`npm run typecheck`)
- **Linting** (`npm run lint`)
- **Build validation** (`npm run build`)
- **Vercel deployment** (on main branch)

### Required GitHub Secrets

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_CLAUDE_API_KEY
VITE_GOOGLE_CLIENT_ID
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

## 🧪 Testing

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build validation
npm run build
```

## 📱 API Reference

### Supabase Edge Functions

#### `ai-analyze`
Analyzes construction data using Claude AI.

**Endpoint:** `POST /functions/v1/ai-analyze`
```json
{
  "prompt": "Analyze this construction progress...",
  "data": {...}
}
```

#### `analyze-progress`
Generates AI progress reports.

**Endpoint:** `POST /functions/v1/analyze-progress`
```json
{
  "project_id": "uuid",
  "reports": [...]
}
```

#### `extract-boq`
Extracts BOQ data from documents.

**Endpoint:** `POST /functions/v1/extract-boq`
```json
{
  "file_url": "https://...",
  "file_type": "pdf|excel"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use functional components with hooks
- Implement proper error boundaries
- Add loading states for async operations
- Follow existing Tailwind CSS patterns
- Test all new features thoroughly

## 📄 License

This project is proprietary software owned by Apostolic Redeem Services Pvt Ltd.

## 🆘 Support

For support and questions:
- **Email:** support@arspl.in
- **Documentation:** [Internal Wiki](https://wiki.arspl.in/nirman-ai)
- **Issues:** [GitHub Issues](https://github.com/your-org/nirman-ai/issues)

## 🏢 About ARSPL

**Apostolic Redeem Services Pvt Ltd**
- **ROC:** Patna, Bihar
- **Focus:** Construction Technology & Government Solutions
- **Mission:** Digital transformation of public infrastructure projects

---

**Built with ❤️ for Bihar's construction ecosystem**
