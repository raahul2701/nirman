import { memo, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Brain, Cloud, Fuel, Shield, TrendingUp, Upload } from 'lucide-react';
import { offlineSyncService } from '../../services/offline/offlineSyncService';
import { mobileUploadManager } from '../../services/mobile/mobileUploadManager';
import { runtimeHealthMonitor } from '../../lib/runtimeHealth';
import { fieldEventBus, createSyncEvent, type FieldEvent } from '../../services/operations/fieldEventBus';

type Widget = {
  label: string;
  value: string | number;
  detail: string;
  tone: string;
  icon: typeof Activity;
};

function useOperationalSnapshot() {
  const [pendingSync, setPendingSync] = useState(0);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [events, setEvents] = useState<FieldEvent[]>([]);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const controller = new AbortController();

    const refresh = async () => {
      try {
        const [syncStatus, uploadSessions] = await Promise.all([
          offlineSyncService.getStatus(),
          Promise.resolve(mobileUploadManager.getAllSessions()),
        ]);
        if (!active) return;
        setPendingSync(syncStatus.pending + syncStatus.syncing);
        setPendingUploads(uploadSessions.filter((session) => session.status === 'pending' || session.status === 'uploading' || session.status === 'paused').length);
        setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
        createSyncEvent(syncStatus.pending, syncStatus.syncing);
      } finally {
        if (active) timer = window.setTimeout(refresh, document.hidden ? 30000 : 8000);
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) void refresh();
    };

    void refresh();
    fieldEventBus.subscribe(setEvents, controller.signal);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      controller.abort();
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { pendingSync, pendingUploads, online, events, health: runtimeHealthMonitor.snapshot() };
}

export const OperationalIntelligenceWidgets = memo(function OperationalIntelligenceWidgets() {
  const snapshot = useOperationalSnapshot();
  const executive = useMemo(() => {
    const criticalEvents = snapshot.events.filter((event) => event.priority === 'critical').length;
    const highEvents = snapshot.events.filter((event) => event.priority === 'high').length;
    const failedAi = snapshot.health.metrics.filter((metric) => metric.label.startsWith('ai:') && metric.failures > 0).length;
    const projectHealthScore = Math.max(0, 100 - snapshot.pendingSync * 3 - snapshot.pendingUploads * 4 - criticalEvents * 12 - highEvents * 6);
    const contractorRiskIndex = Math.min(100, highEvents * 12 + failedAi * 8);
    return {
      projectHealthScore,
      contractorRiskIndex,
      escalationCount: criticalEvents + highEvents,
      cashflowRisk: snapshot.pendingSync > 10 ? 'Elevated' : 'Normal',
      manpowerRisk: highEvents > 2 ? 'Watch' : 'Normal',
    };
  }, [snapshot]);
  const widgets = useMemo<Widget[]>(() => [
    {
      label: 'Project Health Score',
      value: executive.projectHealthScore,
      detail: 'Composite sync, upload and escalation score',
      tone: executive.projectHealthScore < 70 ? '#F59E0B' : '#00D4AA',
      icon: TrendingUp,
    },
    {
      label: 'Contractor Risk Index',
      value: executive.contractorRiskIndex,
      detail: 'AI and field event risk summary',
      tone: executive.contractorRiskIndex > 50 ? '#ef4444' : '#3B82F6',
      icon: Shield,
    },
    {
      label: 'Active Sync Queue',
      value: snapshot.pendingSync,
      detail: snapshot.online ? 'Reconnect-aware flushing enabled' : 'Offline queue active',
      tone: snapshot.pendingSync > 0 ? '#F59E0B' : '#00D4AA',
      icon: Cloud,
    },
    {
      label: 'Pending Uploads',
      value: snapshot.pendingUploads,
      detail: 'Duplicate upload guard enabled',
      tone: snapshot.pendingUploads > 0 ? '#3B82F6' : '#00D4AA',
      icon: Upload,
    },
    {
      label: 'AI Inspection Alerts',
      value: snapshot.health.metrics.filter((metric) => metric.label.startsWith('ai:') && metric.failures > 0).length,
      detail: 'Timeout and retry metrics tracked',
      tone: '#FF6B00',
      icon: Brain,
    },
    {
      label: 'Diesel Anomaly Watch',
      value: 'Ready',
      detail: 'Variance and misuse heuristics enabled',
      tone: '#ef4444',
      icon: Fuel,
    },
    {
      label: 'Project Delay Risk',
      value: executive.escalationCount > 0 ? 'Review' : 'Normal',
      detail: `Cashflow ${executive.cashflowRisk}; manpower ${executive.manpowerRisk}`,
      tone: executive.escalationCount > 0 ? '#F59E0B' : '#00D4AA',
      icon: AlertTriangle,
    },
  ], [executive, snapshot]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7 mb-6">
      {widgets.map((widget) => (
        <div key={widget.label} className="rounded-2xl p-4" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <div className="flex items-center justify-between">
            <widget.icon size={17} style={{ color: widget.tone }} />
            <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: widget.tone }}>AI Ops</span>
          </div>
          <p className="mt-3 text-xl font-semibold text-white">{widget.value}</p>
          <p className="text-xs text-[#A0A0A0]">{widget.label}</p>
          <p className="mt-2 text-[11px] text-[#606060]">{widget.detail}</p>
        </div>
      ))}
    </div>
  );
});
