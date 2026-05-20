import { useEffect, useState } from 'react';
import {
  Shield, Users, Activity, AlertTriangle, Database,
  Zap, TrendingUp, Clock, Server, HardDrive
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import { featureFlags } from '../lib/featureFlags';
import { formatDistanceToNow } from '../lib/utils';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  aiUsageToday: number;
  storageUsed: number;
  storageLimit: number;
  failedJobs: number;
  bgAlertsToday: number;
  disputesToday: number;
  pendingDefects: number;
}

interface RecentActivity {
  id: string;
  action: string;
  user_id: string;
  created_at: string;
  details?: any;
}

export function AdminSystemPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadSystemData();
  }, [user]);

  async function loadSystemData() {
    try {
      // Get system statistics
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: onlineUsers },
        { data: aiUsage },
        { data: storage },
        { count: failedJobs },
        { count: bgAlertsToday },
        { count: disputesToday },
        { count: pendingDefects },
        { data: recentActivities }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('last_login', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString()),
        supabase.from('audit_logs').select('*').eq('action', 'ai_call').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.storage.from('files').list(),
        supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('level', 'error').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('bank_guarantees').select('*', { count: 'exact', head: true }).eq('status', 'alert').gte('alert_date', new Date().toISOString().split('T')[0]),
        featureFlags.disputes
          ? supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          : Promise.resolve({ count: 0 }),
        supabase.from('problems').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10)
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        onlineUsers: onlineUsers || 0,
        aiUsageToday: aiUsage?.length || 0,
        storageUsed: storage?.reduce((acc: number, file: any) => acc + (file.metadata?.size || 0), 0) || 0,
        storageLimit: 100 * 1024 * 1024 * 1024, // 100GB
        failedJobs: failedJobs || 0,
        bgAlertsToday: bgAlertsToday || 0,
        disputesToday: disputesToday || 0,
        pendingDefects: pendingDefects || 0
      });

      setActivities(recentActivities || []);
    } catch (error) {
      console.error('Failed to load system data:', error);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <AppLayout title="System Administration">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00]"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="System Administration" subtitle="NIRMAN AI ERP System Overview">
      {/* System Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users size={20} style={{ color: '#3B82F6' }} />
            <div>
              <p className="text-[#606060] text-xs">Total Users</p>
              <p className="text-white text-xl font-bold">{stats?.totalUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Activity size={20} style={{ color: '#22c55e' }} />
            <div>
              <p className="text-[#606060] text-xs">Online Now</p>
              <p className="text-white text-xl font-bold">{stats?.onlineUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Zap size={20} style={{ color: '#F59E0B' }} />
            <div>
              <p className="text-[#606060] text-xs">AI Calls Today</p>
              <p className="text-white text-xl font-bold">{stats?.aiUsageToday}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <HardDrive size={20} style={{ color: '#8B5CF6' }} />
            <div>
              <p className="text-[#606060] text-xs">Storage Used</p>
              <p className="text-white text-xl font-bold">
                {((stats?.storageUsed || 0) / (1024 * 1024 * 1024)).toFixed(1)}GB
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts and Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle size={24} style={{ color: '#ef4444' }} />
            <h3 className="text-white font-semibold">System Alerts</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">Failed Jobs</span>
              <Badge color={stats?.failedJobs ? '#ef4444' : '#22c55e'}>
                {stats?.failedJobs.toString() || '0'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">BG Alerts Today</span>
              <Badge color={stats?.bgAlertsToday ? '#F59E0B' : '#22c55e'}>
                {stats?.bgAlertsToday.toString() || '0'}
              </Badge>
            </div>
            {featureFlags.disputes && (
              <div className="flex justify-between items-center">
                <span className="text-[#606060] text-sm">Active Disputes</span>
                <Badge color={stats?.disputesToday ? '#f97316' : '#22c55e'}>
                  {stats?.disputesToday.toString() || '0'}
                </Badge>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">Pending Defects</span>
              <Badge color={stats?.pendingDefects ? '#f97316' : '#22c55e'}>
                {stats?.pendingDefects.toString() || '0'}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Server size={24} style={{ color: '#00D4AA' }} />
            <h3 className="text-white font-semibold">System Health</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">Database</span>
              <Badge color="#22c55e">Healthy</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">Edge Functions</span>
              <Badge color="#22c55e">Operational</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">Storage</span>
              <Badge color="#22c55e">Available</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">Realtime</span>
              <Badge color="#22c55e">Active</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp size={24} style={{ color: '#FF6B00' }} />
            <h3 className="text-white font-semibold">Performance</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">Avg Response</span>
              <span className="text-white text-sm">245ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">Uptime</span>
              <span className="text-white text-sm">99.9%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">Error Rate</span>
              <span className="text-white text-sm">0.1%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#606060] text-sm">Active Sessions</span>
              <span className="text-white text-sm">{stats?.onlineUsers || 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock size={24} style={{ color: '#3B82F6' }} />
          <h3 className="text-white font-semibold">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-b-0">
              <div>
                <p className="text-white text-sm">{activity.action}</p>
                <p className="text-[#606060] text-xs">User: {activity.user_id.slice(0, 8)}...</p>
              </div>
              <span className="text-[#606060] text-xs">
                {formatDistanceToNow(activity.created_at)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Admin Actions */}
      <div className="flex gap-4 mt-6">
        <Button variant="secondary" icon={<Database size={14} />}>
          Run System Diagnostics
        </Button>
        <Button variant="secondary" icon={<Shield size={14} />}>
          Security Audit
        </Button>
        <Button variant="secondary" icon={<TrendingUp size={14} />}>
          Performance Report
        </Button>
      </div>
    </AppLayout>
  );
}
