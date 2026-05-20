// Hooks for accessing data services
import { useEffect, useState, useRef } from 'react';
import { offlineSyncService } from '../services/offline/offlineSyncService';
import { materialReportsService } from '../services/data/materialReportsService';
import { gisPinsService } from '../services/data/gisPinsService';
import { budgetSessionsService } from '../services/data/budgetSessionsService';
import { tpaReviewsService } from '../services/data/tpaReviewsService';
import { hindranceService } from '../services/data/hindranceService';
import { dieselLogsService } from '../services/data/dieselLogsService';

// Hook to sync status
export function useSyncStatus() {
  const [status, setStatus] = useState({ pending: 0, syncing: 0, synced: 0, failed: 0 });

  useEffect(() => {
    const checkStatus = async () => {
      const s = await offlineSyncService.getStatus();
      setStatus(s);
    };

    checkStatus();
    const timer = setInterval(checkStatus, 5000); // Poll every 5s

    return () => clearInterval(timer);
  }, []);

  return status;
}

// Hook to material reports
export function useMaterialReports(projectId: string) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        const data = await materialReportsService.listReports(projectId);
        setReports(data);
      } catch (error) {
        console.error('Failed to load reports:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();

    unsubscribeRef.current = materialReportsService.subscribe(() => {
      loadReports();
    });

    return () => unsubscribeRef.current?.();
  }, [projectId]);

  return { reports, loading };
}

// Hook to GIS pins
export function useGisPins(projectId: string) {
  const [pins, setPins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const loadPins = async () => {
      setLoading(true);
      try {
        const data = await gisPinsService.listPins(projectId);
        setPins(data);
      } catch (error) {
        console.error('Failed to load pins:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPins();

    unsubscribeRef.current = gisPinsService.subscribe(() => {
      loadPins();
    });

    return () => unsubscribeRef.current?.();
  }, [projectId]);

  return { pins, loading };
}

// Hook to budget sessions
export function useBudgetSessions(projectId: string) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      try {
        const data = await budgetSessionsService.listSessions(projectId);
        setSessions(data);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();

    unsubscribeRef.current = budgetSessionsService.subscribe(() => {
      loadSessions();
    });

    return () => unsubscribeRef.current?.();
  }, [projectId]);

  return { sessions, loading };
}

// Hook to hindrance entries
export function useHindranceEntries(projectId: string) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true);
      try {
        const data = await hindranceService.listEntries(projectId);
        setEntries(data);
      } catch (error) {
        console.error('Failed to load entries:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();

    unsubscribeRef.current = hindranceService.subscribe(() => {
      loadEntries();
    });

    return () => unsubscribeRef.current?.();
  }, [projectId]);

  return { entries, loading };
}

// Hook to diesel logs
export function useDieselLogs(projectId: string) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const data = await dieselLogsService.listLogs(projectId);
        setLogs(data);
      } catch (error) {
        console.error('Failed to load logs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();

    unsubscribeRef.current = dieselLogsService.subscribe(() => {
      loadLogs();
    });

    return () => unsubscribeRef.current?.();
  }, [projectId]);

  return { logs, loading };
}
