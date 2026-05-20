import React, { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertTriangle, Calendar, Download, IndianRupee, TrendingUp, Zap } from 'lucide-react';
import { analyzeBudgetProgress } from '../services/ai/constructionAI';
import { budgetSessionsService } from '../services/data/budgetSessionsService';
import { OfflineSyncIndicator } from '../components/offline/OfflineSyncIndicator';
import { useAuth } from '../contexts/useAuth';

const DEFAULT_PROJECT_ID = 'project-1';

const defaultForm = {
  projectCost: '10000000',
  startDate: '2026-01-01',
  endDate: '2026-08-31',
  raBills: '1st RA bill: 14 Feb 2026, amount 12 lakh',
  workProgress: 'Physical progress 18%',
  billingTimeline: 'Billing started in month 2',
  delays: 'Intermittent material delay and slow shuttering cycle',
  milestones: 'Foundation complete, plinth in progress',
  manpower: '42 workers average, 6 masons, 2 supervisors',
};

export const BudgetProgressPage: React.FC = () => {
  const { user } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);

  const metrics = useMemo(() => {
    const cost = Number(form.projectCost) || 0;
    const actualProgress = Number(form.workProgress.match(/\d+(\.\d+)?/)?.[0] || 0);
    const billed = Number(form.raBills.match(/(\d+(\.\d+)?)\s*lakh/i)?.[1] || 0) * 100000;
    const burnRate = cost ? Math.round((billed / cost) * 100) : 0;
    const expectedProgress = 32;
    const riskScore = Math.min(100, Math.max(5, (expectedProgress - actualProgress) * 2 + Math.max(0, burnRate - actualProgress)));
    const projectVelocity = Math.max(0, actualProgress - expectedProgress + 50);
    const delayRisk = Math.min(100, Math.max(0, expectedProgress - actualProgress + (form.delays ? 18 : 0)));
    const billingEfficiency = actualProgress ? Math.min(140, Math.round((burnRate / actualProgress) * 100)) : 0;
    const manpowerSufficiency = /short|low|less|insufficient/i.test(form.manpower) ? 42 : 78;
    const projectedCompletionTrend = actualProgress >= expectedProgress ? 'On-track' : delayRisk > 45 ? 'Likely delayed' : 'Watch';
    const contractorRisk = Math.min(100, Math.round((delayRisk + Math.max(0, billingEfficiency - 110)) / 1.4));
    const cashflowStress = Math.min(100, Math.max(0, burnRate - actualProgress + 25));

    return { cost, actualProgress, billed, burnRate, expectedProgress, riskScore, projectVelocity, delayRisk, billingEfficiency, manpowerSufficiency, projectedCompletionTrend, contractorRisk, cashflowStress };
  }, [form]);

  const insightCards = useMemo(() => [
    ['Project velocity', `${metrics.projectVelocity}%`, metrics.projectVelocity >= 50 ? '#00D4AA' : '#F59E0B'],
    ['Delay risk', `${metrics.delayRisk}%`, metrics.delayRisk > 45 ? '#ef4444' : '#00D4AA'],
    ['Billing efficiency', `${metrics.billingEfficiency}%`, metrics.billingEfficiency > 115 ? '#F59E0B' : '#3B82F6'],
    ['Manpower sufficiency', `${metrics.manpowerSufficiency}%`, metrics.manpowerSufficiency > 65 ? '#00D4AA' : '#ef4444'],
    ['Contractor risk', `${metrics.contractorRisk}%`, metrics.contractorRisk > 55 ? '#ef4444' : '#00D4AA'],
    ['Cashflow stress', `${metrics.cashflowStress}%`, metrics.cashflowStress > 50 ? '#F59E0B' : '#00D4AA'],
  ], [metrics]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeBudgetProgress(form);
      setInsight(result);
      try {
        await budgetSessionsService.createSession({
          project_id: DEFAULT_PROJECT_ID,
          session_data: form,
          results: { insight: result, metrics },
          created_by: user?.id,
        });
      } catch (syncError) {
        console.warn('[Budget] Session queued fallback failed:', syncError);
      }
    } catch (error) {
      setInsight(error instanceof Error ? error.message : 'AI analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const exportBudgetAnalytics = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(insight || 'Budget analysis has not been generated yet.', 180);
    doc.text('NIRMAN Budget Analytics Export', 14, 16);
    doc.text(`Project cost: ${form.projectCost}`, 14, 28);
    doc.text(`Progress: ${form.workProgress}`, 14, 36);
    doc.text(`Risk score: ${metrics.riskScore}`, 14, 44);
    doc.text(lines, 14, 56);
    doc.save(`budget-analytics-${Date.now()}.pdf`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Budget vs Progress</h1>
          <p className="text-gray-400">Compare project spending against construction progress and milestone delivery.</p>
        </div>
        <OfflineSyncIndicator />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card className="bg-[#1A1A1A] border-[#333] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Project Inputs</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" value={form.projectCost} onChange={(event) => setForm((prev) => ({ ...prev, projectCost: event.target.value }))} placeholder="Project cost" />
            <input className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" type="date" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} />
            <input className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" type="date" value={form.endDate} onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))} />
            <input className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" value={form.workProgress} onChange={(event) => setForm((prev) => ({ ...prev, workProgress: event.target.value }))} placeholder="Work progress" />
          </div>
          {(['raBills', 'billingTimeline', 'delays', 'milestones', 'manpower'] as const).map((field) => (
            <textarea
              key={field}
              className="mt-3 w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white"
              rows={2}
              value={form[field]}
              onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
              placeholder={field}
            />
          ))}
          <Button onClick={runAnalysis} disabled={loading} className="mt-4 bg-[#FF6B00] hover:bg-[#FF6B00]/90" icon={<Zap size={14} />}>
            {loading ? 'Analyzing...' : 'Generate AI Project Health'}
          </Button>
          <Button variant="outline" onClick={exportBudgetAnalytics} className="ml-3 mt-4" icon={<Download size={14} />}>
            Export
          </Button>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#333] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Project Health Dashboard</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-[#111] p-4">
              <IndianRupee size={18} className="text-[#00D4AA]" />
              <p className="mt-2 text-2xl font-bold text-white">{metrics.burnRate}%</p>
              <p className="text-xs text-gray-400">Financial burn</p>
            </div>
            <div className="rounded-xl bg-[#111] p-4">
              <TrendingUp size={18} className="text-[#3B82F6]" />
              <p className="mt-2 text-2xl font-bold text-white">{metrics.actualProgress}%</p>
              <p className="text-xs text-gray-400">Actual progress</p>
            </div>
            <div className="rounded-xl bg-[#111] p-4">
              <AlertTriangle size={18} className="text-[#F59E0B]" />
              <p className="mt-2 text-2xl font-bold text-white">{metrics.riskScore}</p>
              <p className="text-xs text-gray-400">Risk score</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {[
              ['Expected progress', metrics.expectedProgress, '#00D4AA'],
              ['Actual progress', metrics.actualProgress, '#3B82F6'],
              ['Billing efficiency', metrics.burnRate, '#FF6B00'],
              ['Delay risk heat', metrics.delayRisk, metrics.delayRisk > 45 ? '#ef4444' : '#F59E0B'],
            ].map(([label, value, color]) => (
              <div key={String(label)}>
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>{label}</span>
                  <span>{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#111]">
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(Number(value), 100)}%`, background: String(color) }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {insightCards.map(([label, value, color]) => (
          <Card key={label} className="bg-[#1A1A1A] border-[#333] p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-2 text-xl font-bold text-white">{value}</p>
            <div className="mt-3 h-1.5 rounded-full bg-[#111]">
              <div className="h-1.5 rounded-full" style={{ width: String(value), background: color }} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
          <Calendar size={18} className="text-[#FF6B00]" />
          Timeline Visualization
        </h2>
        <div className="grid gap-3 md:grid-cols-4">
          {['Start', '1st RA Bill', 'Current Progress', 'Completion'].map((item, index) => (
            <div key={item} className="rounded-xl border border-[#333] bg-[#111] p-4">
              <p className="text-xs text-gray-500">Step {index + 1}</p>
              <p className="mt-1 font-semibold text-white">{item}</p>
              <p className="mt-2 text-sm text-gray-400">{index === 0 ? form.startDate : index === 3 ? form.endDate : index === 1 ? form.raBills : form.workProgress}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">AI Insights Panel</h2>
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <p className="rounded-lg bg-[#111] p-3 text-sm text-gray-300">Projected completion: <span className="text-white">{metrics.projectedCompletionTrend}</span></p>
          <p className="rounded-lg bg-[#111] p-3 text-sm text-gray-300">Recommendation: <span className="text-white">{metrics.delayRisk > 45 ? 'Recover schedule with labour and billing review.' : 'Maintain weekly controls.'}</span></p>
          <p className="rounded-lg bg-[#111] p-3 text-sm text-gray-300">Cashflow: <span className="text-white">{metrics.cashflowStress > 50 ? 'Stress watch' : 'Acceptable'}</span></p>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">
          {insight || 'Run AI analysis to generate engineer summary, delay prediction, risk score, corrective actions, burn-rate interpretation, and productivity trends.'}
        </p>
      </Card>
    </div>
  );
};
