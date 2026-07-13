# NIRMAN AI Advanced Features — Quick Reference for Developers

## 🚀 Quick Start (5 minutes)

### 1. Apply Database Migration
```bash
npx supabase db push
# or
supabase migration up
```

### 2. Deploy Edge Functions
```bash
supabase functions deploy
```

### 3. Set Gemini API Key
```bash
# In Supabase Dashboard → Settings → Edge Function Secrets
GEMINI_API_KEY=your_server_side_gemini_key
```

### 4. Test in Browser
```bash
npm run dev
# Visit http://localhost:5173/daily-reports
```

---

## 📖 Component Reference

### Daily Report Form
```tsx
import { DailyReportForm } from '@/components/forms/DailyReportForm';

<DailyReportForm 
  project={selectedProject}
  onSubmit={(report) => console.log(report)}
/>
```

### BOQ Manager
```tsx
import { BOQManager } from '@/components/forms/BOQManager';

<BOQManager 
  project={project}
  onUpload={(boq) => console.log(boq)}
/>
```

### EE Contractor Management
```tsx
import { EEContractorManagement } from '@/components/EEContractorManagement';

<EEContractorManagement />
```

### AI Progress Intelligence
```tsx
import { AIProgressIntelligence } from '@/components/AIProgressIntelligence';

<AIProgressIntelligence project={project} />
```

---

## 🔧 Utility Functions Reference

### Generate Invite Code
```typescript
import { generateEEInviteCode } from '@/lib/utils';

const code = generateEEInviteCode("Rahul Sharma");
// Returns: "NIRMAN-EE-RAHU-7834"
```

### Generate Invite Link
```typescript
import { generateInviteLink } from '@/lib/utils';

const link = generateInviteLink("NIRMAN-EE-RAHU-7834");
// Returns: "https://nirman.apostolicredeem.com/join?ee=NIRMAN-EE-RAHU-7834"
```

### Generate Report Code
```typescript
import { generateReportCode } from '@/lib/utils';

const code = generateReportCode("PR-2024-001");
// Returns: "PR-2024-001-DR-130524-123"
```

### Call Gemini API
```typescript
import { callGeminiAPI } from '@/lib/utils';

const result = await callGeminiAPI(
  "You are a construction expert.",
  "Analyze this progress data..."
);
```

### Extract BOQ
```typescript
import { extractBOQFromFile } from '@/lib/utils';

const items = await extractBOQFromFile(
  File,
  "Project: Patna Ring Road"
);
```

### Analyze Progress
```typescript
import { analyzeConstructionProgress } from '@/lib/utils';

const analysis = await analyzeConstructionProgress({
  siteName: "Site A",
  contractValue: 50000000,
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  daysRemaining: 100,
  expectedProgress: 75,
  actualProgress: 67,
  last7DaysReports: [...],
  boqTargets: [...],
  surveyData: [...]
});
```

---

## 🗄️ Database Query Examples

### Create EE Invite Code
```typescript
const { error } = await supabase.from('ee_invite_codes').insert({
  ee_id: userId,
  invite_code: 'NIRMAN-EE-RAHU-7834',
  invite_link: 'https://...',
  max_uses: 100
});
```

### Get Connected Contractors
```typescript
const { data } = await supabase
  .from('ee_contractor_links')
  .select('*')
  .eq('ee_id', eeUserId)
  .eq('is_active', true);
```

### Save Daily Report
```typescript
const { data } = await supabase
  .from('daily_reports')
  .insert({
    report_code: 'PR-2024-001-DR-130524-123',
    project_id: projectId,
    submitted_by: userId,
    mistri_count: 5,
    labour_count: 20,
    // ... other fields
  })
  .select()
  .single();
```

### Get Project BOQ
```typescript
const { data } = await supabase
  .from('project_boq')
  .select('*, boq_items(*)')
  .eq('project_id', projectId)
  .limit(1)
  .single();
```

---

## 🔐 RLS Policy Reference

### Read Own Daily Reports
```sql
CREATE POLICY "user_see_own_reports" ON daily_reports
  FOR SELECT USING (auth.uid() = submitted_by);
```

### EE Sees Contractor Reports
```sql
CREATE POLICY "ee_see_contractor_reports" ON daily_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ee_contractor_links
      WHERE ee_id = auth.uid() 
      AND contractor_id = daily_reports.submitted_by
      AND is_active = TRUE
    )
  );
```

---

## 🎨 Component Props Reference

### DailyReportForm Props
```typescript
interface DailyReportFormProps {
  project: GovProject;
  onSubmit?: (report: DailyReport) => void;
}
```

### BOQManager Props
```typescript
interface BOQManagerProps {
  project: GovProject;
  onUpload?: (boq: ProjectBOQ) => void;
}
```

### AIProgressIntelligence Props
```typescript
interface AIProgressIntelligenceProps {
  project: GovProject;
}
```

---

## 📱 Mobile Optimization Tips

### For Daily Report Form
- Form width: 100% max-width on screens < 768px
- Button size: Larger touch targets (48px minimum)
- Input size: Bigger input fields
- Screens: One field per view

### Testing Mobile
```bash
# Firefox DevTools - Responsive Design Mode
# Chrome DevTools - Toggle Device Toolbar (Cmd+Shift+M)
# Test on actual devices:
- iPhone 12/13/14
- Android Samsung S20+
```

---

## 🔍 Common Issues & Solutions

### Issue: Gemini API 401 error
```
Solution: 
1. Check GEMINI_API_KEY in Supabase Secrets
2. Use correct model: "gemini-2.5-flash"
3. Verify API key format: "server-side Gemini key"
```

### Issue: Daily report not saving
```
Solution:
1. Check auth.uid() returns valid user ID
2. Verify project_id exists in gov_projects
3. Check Supabase auth session
4. Look for RLS policy blocking insert
```

### Issue: BOQ extraction returns empty
```
Solution:
1. Ensure file is valid Excel/PDF (not corrupted)
2. BOQ file should have clear headers
3. Check Gemini API response in edge function logs
4. Verify file encoding UTF-8
```

### Issue: Photo upload fails
```
Solution:
1. Check Supabase storage permissions (anon read/write)
2. Verify bucket name: "nirman-uploads"
3. Check file size < 5MB
4. Ensure file format: jpg, png, webp
```

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Daily report form all 9 steps work
- [ ] Photos upload without error
- [ ] Report code generates correctly
- [ ] Report appears in history
- [ ] BOQ extracts from Excel
- [ ] BOQ items display in table
- [ ] AI analysis returns results
- [ ] EE can see contractor data
- [ ] Other contractors can't see each other
- [ ] Mobile layout responsive

### Edge Cases
- [ ] Empty BOQ file
- [ ] Large file upload (5MB)
- [ ] Slow network (throttle in DevTools)
- [ ] Offline behavior
- [ ] Zero daily reports
- [ ] Special characters in names

---

## 📊 Performance Tips

### Component Optimization
```typescript
// Lazy load heavy components
const AIProgressIntelligence = lazy(() => 
  import('@/components/AIProgressIntelligence')
);

// Use memo for expensive renders
export const DailyReportForm = memo(function DailyReportForm(props) {
  // ...
});
```

### Database Query Optimization
```typescript
// Use select() to limit columns
const { data } = await supabase
  .from('daily_reports')
  .select('id, report_code, report_date')
  .limit(100);

// Use pagination
.range(0, 49); // Items 0-49
```

---

## 📚 File Navigation Guide

```
nirman/
├── src/
│   ├── components/
│   │   ├── forms/
│   │   │   ├── DailyReportForm.tsx      ← Daily reports
│   │   │   └── BOQManager.tsx           ← BOQ upload
│   │   ├── EEContractorManagement.tsx   ← EE codes
│   │   └── AIProgressIntelligence.tsx   ← AI insights
│   ├── pages/
│   │   └── DailyReportsPage.tsx         ← Main page
│   ├── lib/
│   │   └── utils.ts                     ← All utilities
│   ├── types/
│   │   └── index.ts                     ← Type definitions
│   └── App.tsx                          ← Routes
├── supabase/
│   ├── migrations/
│   │   └── 003_advanced_features.sql    ← Database schema
│   └── functions/
│       ├── ai-analyze/
│       ├── analyze-progress/
│       └── extract-boq/
├── ADVANCED_FEATURES_GUIDE.md           ← Feature docs
├── IMPLEMENTATION_GUIDE.md              ← Setup guide
└── FEATURES_CHECKLIST.md                ← This reference
```

---

## 🔗 External Resources

### Gemini API
- Docs: https://ai.google.dev/gemini-api/docs
- API Key: https://aistudio.google.com/app/apikey
- Model: gemini-2.5-flash

### Supabase
- Docs: https://supabase.io/docs
- Dashboard: https://app.supabase.com
- Edge Functions: https://supabase.com/docs/guides/functions

### React
- Docs: https://react.dev
- Hooks: https://react.dev/reference/react/hooks

---

## 🆘 Quick Debug Commands

### Check Database
```sql
-- View tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS
SELECT * FROM pg_policies;

-- View data
SELECT * FROM ee_invite_codes;
SELECT * FROM daily_reports;
```

### Check Functions
```bash
# List deployed functions
supabase functions list

# View function logs
supabase functions logs ai-analyze

# Test locally
supabase functions serve
```

### Check Auth
```javascript
// Browser console
const { data } = await supabase.auth.getUser();
console.log(data.user);
```

---

## 📞 Quick Help

**Component doesn't work?**
1. Check props passed correctly
2. Verify Supabase connection
3. Check browser console for errors
4. Look at edge function logs

**API returning error?**
1. Check Supabase secrets set
2. Verify API key format
3. Check request body format
4. Look at function logs

**Database not updating?**
1. Check RLS policies
2. Verify user authentication
3. Check foreign key relationships
4. Verify data types match

---

## ✨ Pro Tips

1. **Use Tailwind Classes** - All styling via Tailwind, maintain consistency
2. **Follow Dark Theme** - Use #0D0D0D, #1A1A1A for backgrounds
3. **Always Toast** - User feedback via `useToast()` hook
4. **Handle Loading** - Show spinners during operations
5. **Mobile First** - Design mobile, then scale up
6. **RLS Always** - Never bypass row-level security

---

## 📄 Footer

© 2024 NIRMAN AI | Powered by ARSPL
Quick Reference v1.0 | Updated: 2026-05-13

For detailed documentation, see other .md files in root directory
