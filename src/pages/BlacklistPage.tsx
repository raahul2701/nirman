import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Shield, AlertTriangle, Search, UserPlus, Ban, CheckCircle } from 'lucide-react';

const blacklistSchema = z.object({
  contractor_name: z.string().min(1, 'Contractor name is required'),
  contractor_company: z.string().optional(),
  phone: z.string().optional(),
  aadhaar: z.string().optional(),
  pan_number: z.string().optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  fraud_type: z.string().optional(),
  fraud_amount: z.number().optional(),
  case_reference: z.string().optional(),
  fir_number: z.string().optional(),
  evidence_urls: z.array(z.string()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});

type BlacklistFormData = z.infer<typeof blacklistSchema>;

interface BlacklistedContractorRow {
  id: string;
  contractor_name: string;
  contractor_company?: string | null;
  phone?: string | null;
  aadhaar?: string | null;
  pan_number?: string | null;
  reason: string;
  fraud_type?: string | null;
  severity: string;
  status: string;
  created_at: string;
}

interface BlacklistAlertRow {
  id: string;
  alert_reason: string;
  created_at: string;
  blacklist?: {
    contractor_name?: string | null;
  } | null;
}

export const BlacklistPage: React.FC = () => {
  const [contractors, setContractors] = useState<BlacklistedContractorRow[]>([]);
  const [alerts, setAlerts] = useState<BlacklistAlertRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<BlacklistFormData>({
    resolver: zodResolver(blacklistSchema) as Resolver<BlacklistFormData>
  });

  useEffect(() => {
    loadBlacklistData();
  }, []);

  const loadBlacklistData = async () => {
    try {
      // Load blacklisted contractors
      const { data: contractorsData, error: contractorsError } = await supabase
        .from('blacklisted_contractors')
        .select('*')
        .order('created_at', { ascending: false });

      if (contractorsError) throw contractorsError;

      // Load blacklist alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('blacklist_alerts')
        .select(`
          *,
          blacklist:blacklisted_contractors(*)
        `)
        .eq('alert_read', false)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      setContractors((contractorsData || []) as BlacklistedContractorRow[]);
      setAlerts((alertsData || []) as BlacklistAlertRow[]);
    } catch (error) {
      console.error('Load blacklist data error:', error);
      toast.error('Failed to load blacklist data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<BlacklistFormData> = async (data) => {
    try {
      const blacklistData = {
        ...data,
        blacklisted_by: (await supabase.auth.getUser()).data.user?.id,
        status: 'active'
      };

      const { error } = await supabase
        .from('blacklisted_contractors')
        .insert([blacklistData]);

      if (error) throw error;

      toast.success('Contractor added to blacklist successfully!');
      reset();
      setShowAddForm(false);
      loadBlacklistData();
    } catch (error) {
      console.error('Add to blacklist error:', error);
      toast.error('Failed to add contractor to blacklist');
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('blacklist_alerts')
        .update({ alert_read: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.filter(alert => alert.id !== alertId));
      toast.success('Alert marked as read');
    } catch (error) {
      console.error('Mark alert read error:', error);
      toast.error('Failed to mark alert as read');
    }
  };

  const filteredContractors = contractors.filter(contractor =>
    contractor.contractor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.phone?.includes(searchTerm) ||
    contractor.pan_number?.includes(searchTerm) ||
    contractor.aadhaar?.includes(searchTerm)
  );

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;

    return <Badge variant={colors[severity as keyof typeof colors] || 'outline'}>{severity}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Shield className="w-8 h-8 mr-3 text-red-500" />
          Contractor Blacklist Database
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage blacklisted contractors and fraud prevention alerts
        </p>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="p-6 mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Active Alerts ({alerts.length})
          </h3>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium text-red-700 dark:text-red-400">
                    {alert.alert_reason}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Contractor: {alert.blacklist?.contractor_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAlertAsRead(alert.id)}
                >
                  Mark Read
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center">
            <Ban className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Blacklisted</p>
              <p className="text-2xl font-bold">{contractors.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">High Risk</p>
              <p className="text-2xl font-bold">
                {contractors.filter(c => c.severity === 'high' || c.severity === 'critical').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Alerts</p>
              <p className="text-2xl font-bold">{alerts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Protected Projects</p>
              <p className="text-2xl font-bold">All</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Add */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search by name, phone, PAN, Aadhaar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add to Blacklist
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add Contractor to Blacklist</h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contractor Name *</label>
                <Input
                  {...register('contractor_name')}
                  placeholder="Full name of the contractor"
                  error={errors.contractor_name?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <Input
                  {...register('contractor_company')}
                  placeholder="Company or firm name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <Input
                  {...register('phone')}
                  placeholder="Contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">PAN Number</label>
                <Input
                  {...register('pan_number')}
                  placeholder="PAN card number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Aadhaar Number</label>
                <Input
                  {...register('aadhaar')}
                  placeholder="Aadhaar card number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Reason for Blacklisting *</label>
              <textarea
                {...register('reason')}
                rows={3}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                placeholder="Detailed reason for blacklisting this contractor..."
              />
              {errors.reason && (
                <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fraud Type</label>
                <select
                  {...register('fraud_type')}
                  className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="">Select fraud type</option>
                  <option value="payment_fraud">Payment Fraud</option>
                  <option value="quality_fraud">Quality Fraud</option>
                  <option value="fake_documents">Fake Documents</option>
                  <option value="abandoned_work">Abandoned Work</option>
                  <option value="cartel">Cartel Activity</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Severity</label>
                <select
                  {...register('severity')}
                  className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fraud Amount (₹)</label>
                <Input
                  type="number"
                  {...register('fraud_amount', { valueAsNumber: true })}
                  placeholder="Amount involved in fraud"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Case Reference</label>
                <Input
                  {...register('case_reference')}
                  placeholder="Court case or reference number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">FIR Number</label>
              <Input
                {...register('fir_number')}
                placeholder="Police FIR number if applicable"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Add to Blacklist
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Blacklist Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Blacklisted Contractors</h3>

        {filteredContractors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No blacklisted contractors found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-600">
                  <th className="text-left p-2">Contractor</th>
                  <th className="text-left p-2">Contact</th>
                  <th className="text-left p-2">Reason</th>
                  <th className="text-center p-2">Severity</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-center p-2">Date Added</th>
                </tr>
              </thead>
              <tbody>
                {filteredContractors.map((contractor) => (
                  <tr key={contractor.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2">
                      <div>
                        <p className="font-medium">{contractor.contractor_name}</p>
                        {contractor.contractor_company && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {contractor.contractor_company}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-sm">
                        {contractor.phone && <p>📞 {contractor.phone}</p>}
                        {contractor.pan_number && <p>🆔 {contractor.pan_number}</p>}
                        {contractor.aadhaar && <p>🆔 {contractor.aadhaar}</p>}
                      </div>
                    </td>
                    <td className="p-2">
                      <div>
                        <p className="text-sm">{contractor.reason.substring(0, 50)}...</p>
                        {contractor.fraud_type && (
                          <Badge variant="outline" className="mt-1">
                            {contractor.fraud_type}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      {getSeverityBadge(contractor.severity)}
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant={contractor.status === 'active' ? 'destructive' : 'outline'}>
                        {contractor.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-center text-sm">
                      {new Date(contractor.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
