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
import { Banknote, Search, Plus, Calendar, Clock } from 'lucide-react';

const bankGuaranteeSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  contractor_id: z.string().min(1, 'Contractor ID is required'),
  bg_number: z.string().min(1, 'BG number is required'),
  bg_type: z.enum(['performance', 'advance', 'retention', 'other']).default('performance'),
  issuing_bank: z.string().min(1, 'Issuing bank is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  currency: z.string().default('INR'),
  issue_date: z.string().min(1, 'Issue date is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  claim_amount: z.number().optional(),
  claim_date: z.string().optional(),
  status: z.enum(['active', 'expired', 'claimed', 'cancelled']).default('active'),
  remarks: z.string().optional()
});

type BankGuaranteeFormData = z.infer<typeof bankGuaranteeSchema>;

interface BankGuaranteeRow {
  id: string;
  bg_number: string;
  status: string;
  expiry_date: string;
  amount?: number | null;
  issuing_bank?: string | null;
  contractors?: {
    contractor_name?: string | null;
    company_name?: string | null;
  } | null;
  projects?: {
    project_name?: string | null;
  } | null;
}

export const BankGuaranteesPage: React.FC = () => {
  const [guarantees, setGuarantees] = useState<BankGuaranteeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<BankGuaranteeFormData>({
    resolver: zodResolver(bankGuaranteeSchema) as Resolver<BankGuaranteeFormData>
  });

  useEffect(() => {
    loadBankGuarantees();
  }, []);

  const loadBankGuarantees = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_guarantees')
        .select(`
          *,
          projects(project_name),
          contractors(contractor_name, company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuarantees((data || []) as BankGuaranteeRow[]);
    } catch (error) {
      console.error('Error loading bank guarantees:', error);
      toast.error('Failed to load bank guarantees');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<BankGuaranteeFormData> = async (data) => {
    try {
      const { error } = await supabase
        .from('bank_guarantees')
        .insert([data]);

      if (error) throw error;

      toast.success('Bank guarantee added successfully');
      reset();
      setShowAddForm(false);
      loadBankGuarantees();
    } catch (error) {
      console.error('Error adding bank guarantee:', error);
      toast.error('Failed to add bank guarantee');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bank_guarantees')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success('Status updated successfully');
      loadBankGuarantees();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: '#22c55e', label: 'Active' },
      expired: { color: '#ef4444', label: 'Expired' },
      claimed: { color: '#f59e0b', label: 'Claimed' },
      cancelled: { color: '#6b7280', label: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge color={config.color}>{config.label}</Badge>;
  };

  const filteredGuarantees = guarantees.filter(guarantee =>
    guarantee.bg_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guarantee.contractors?.contractor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guarantee.projects?.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDaysToExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Banknote className="text-[#FF6B00]" />
            Bank Guarantees & Security Deposits
          </h1>
          <p className="text-gray-400 mt-1">Track and manage bank guarantees and security deposits</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-[#FF6B00] hover:bg-[#FF6B00]/90"
        >
          <Plus size={16} className="mr-2" />
          Add BG/SD
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <Input
          placeholder="Search by BG number, contractor, or project..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-[#1A1A1A] border-[#333] text-white"
        />
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1A1A1A] border-[#333]">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Add Bank Guarantee</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Project ID</label>
                    <Input
                      {...register('project_id')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                      placeholder="Enter project ID"
                    />
                    {errors.project_id && <p className="text-red-400 text-sm mt-1">{errors.project_id.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Contractor ID</label>
                    <Input
                      {...register('contractor_id')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                      placeholder="Enter contractor ID"
                    />
                    {errors.contractor_id && <p className="text-red-400 text-sm mt-1">{errors.contractor_id.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">BG Number</label>
                    <Input
                      {...register('bg_number')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                      placeholder="Enter BG number"
                    />
                    {errors.bg_number && <p className="text-red-400 text-sm mt-1">{errors.bg_number.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">BG Type</label>
                    <select
                      {...register('bg_type')}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444] rounded-lg text-white"
                    >
                      <option value="performance">Performance</option>
                      <option value="advance">Advance</option>
                      <option value="retention">Retention</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Issuing Bank</label>
                    <Input
                      {...register('issuing_bank')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                      placeholder="Enter bank name"
                    />
                    {errors.issuing_bank && <p className="text-red-400 text-sm mt-1">{errors.issuing_bank.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
                    <Input
                      type="number"
                      {...register('amount', { valueAsNumber: true })}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                      placeholder="Enter amount"
                    />
                    {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Issue Date</label>
                    <Input
                      type="date"
                      {...register('issue_date')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                    />
                    {errors.issue_date && <p className="text-red-400 text-sm mt-1">{errors.issue_date.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Expiry Date</label>
                    <Input
                      type="date"
                      {...register('expiry_date')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                    />
                    {errors.expiry_date && <p className="text-red-400 text-sm mt-1">{errors.expiry_date.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Remarks</label>
                  <textarea
                    {...register('remarks')}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444] rounded-lg text-white"
                    rows={3}
                    placeholder="Additional remarks..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="bg-[#FF6B00] hover:bg-[#FF6B00]/90">
                    Add Bank Guarantee
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Guarantees List */}
      <div className="grid gap-4">
        {filteredGuarantees.map((guarantee) => {
          const daysToExpiry = getDaysToExpiry(guarantee.expiry_date);
          const isExpiringSoon = daysToExpiry <= 30 && daysToExpiry > 0;
          const isExpired = daysToExpiry <= 0;

          return (
            <Card key={guarantee.id} className="bg-[#1A1A1A] border-[#333] p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{guarantee.bg_number}</h3>
                    {getStatusBadge(guarantee.status)}
                    {isExpired && <Badge className="bg-red-500 text-white">Expired</Badge>}
                    {isExpiringSoon && <Badge className="bg-yellow-500 text-white">Expiring Soon</Badge>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Contractor</p>
                      <p className="text-white">{guarantee.contractors?.contractor_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Project</p>
                      <p className="text-white">{guarantee.projects?.project_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Amount</p>
                      <p className="text-white">₹{guarantee.amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Bank</p>
                      <p className="text-white">{guarantee.issuing_bank}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-gray-400">Expires: {new Date(guarantee.expiry_date).toLocaleDateString()}</span>
                    </div>
                    {daysToExpiry > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-gray-400">{daysToExpiry} days left</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <select
                    value={guarantee.status}
                    onChange={(e) => updateStatus(guarantee.id, e.target.value)}
                    className="px-2 py-1 bg-[#2A2A2A] border border-[#444] rounded text-white text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="claimed">Claimed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredGuarantees.length === 0 && (
        <div className="text-center py-12">
          <Banknote size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No bank guarantees found</p>
        </div>
      )}
    </div>
  );
};
