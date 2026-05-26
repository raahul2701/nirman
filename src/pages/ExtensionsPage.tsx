import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { MessageSquare, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { ExtensionAI } from '../services/ai/extensionAI';

const extensionSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  contract_id: z.string().min(1, 'Contract ID is required'),
  extension_reason: z.string().min(10, 'Extension reason must be at least 10 characters'),
  requested_days: z.number().min(1, 'Requested days must be greater than 0'),
  requested_date: z.string().min(1, 'Requested date is required'),
  original_completion_date: z.string().min(1, 'Original completion date is required'),
  supporting_documents: z.array(z.string()).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'under_review']),
  remarks: z.string().optional(),
});

type ExtensionFormData = z.infer<typeof extensionSchema>;

interface ExtensionAnalysis {
  isEligible?: boolean;
  recommendedDays?: number;
  confidence?: number;
  keyFactors?: string[];
  recommendation?: string;
  letterContent?: string;
  reasonAccepted?: boolean;
}

interface ExtensionRow {
  id: string;
  project_id: string;
  requested_days: number;
  extension_reason: string;
  original_completion_date: string;
  requested_date: string;
  status: string;
  projects?: {
    project_name?: string | null;
  } | null;
  contracts?: {
    contract_number?: string | null;
  } | null;
  ai_analysis?: ExtensionAnalysis | null;
}

export const ExtensionsPage: React.FC = () => {
  const [extensions, setExtensions] = useState<ExtensionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [analyzingExtension, setAnalyzingExtension] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ExtensionFormData>({
    resolver: zodResolver(extensionSchema),
    defaultValues: {
      status: 'pending',
    },
  });

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    try {
      const { data, error } = await supabase
        .from('time_extensions')
        .select(`
          *,
          projects(project_name),
          contracts(contract_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExtensions((data || []) as ExtensionRow[]);
    } catch (error) {
      console.error('Error loading extensions:', error);
      toast.error('Failed to load time extensions');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<ExtensionFormData> = async (data) => {
    try {
      const { error } = await supabase
        .from('time_extensions')
        .insert([data]);

      if (error) throw error;

      toast.success('Time extension request submitted successfully');
      reset();
      setShowAddForm(false);
      loadExtensions();
    } catch (error) {
      console.error('Error submitting extension:', error);
      toast.error('Failed to submit time extension request');
    }
  };

  const analyzeExtension = async (extensionId: string) => {
    const extension = extensions.find(e => e.id === extensionId);
    if (!extension) return;

    setAnalyzingExtension(extensionId);
    try {
      const analysis = await ExtensionAI.analyzeExtensionRequest(extension.project_id, {
        daysRequested: extension.requested_days,
        reason: extension.extension_reason,
        supportingFacts: {
          rainDays: 0,
          floodDays: 0,
          otherHindranceDays: 0,
          totalHindranceDays: 0
        },
        contractCompletionDate: extension.original_completion_date,
        currentProgress: 75,
        hindranceRecords: []
      });

      // Update extension with AI analysis
      const { error } = await supabase
        .from('time_extensions')
        .update({
          ai_analysis: analysis,
          status: analysis.reasonAccepted ? 'under_review' : 'pending'
        })
        .eq('id', extensionId);

      if (error) throw error;

      toast.success('Extension analyzed successfully');
      loadExtensions();
    } catch (error) {
      console.error('Error analyzing extension:', error);
      toast.error('Failed to analyze extension');
    } finally {
      setAnalyzingExtension(null);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('time_extensions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success('Status updated successfully');
      loadExtensions();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', label: 'Pending' },
      under_review: { color: 'bg-blue-500', label: 'Under Review' },
      approved: { color: 'bg-green-500', label: 'Approved' },
      rejected: { color: 'bg-red-500', label: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const getEligibilityColor = (eligible: boolean) => {
    return eligible ? 'text-green-400' : 'text-red-400';
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
            <MessageSquare className="text-[#FF6B00]" />
            Time Extensions Management
          </h1>
          <p className="text-gray-400 mt-1">AI-powered analysis of time extension requests</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-[#FF6B00] hover:bg-[#FF6B00]/90"
        >
          <FileText size={16} className="mr-2" />
          Request Extension
        </Button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1A1A1A] border-[#333]">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Request Time Extension</h2>
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">Contract ID</label>
                    <Input
                      {...register('contract_id')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                      placeholder="Enter contract ID"
                    />
                    {errors.contract_id && <p className="text-red-400 text-sm mt-1">{errors.contract_id.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Requested Days</label>
                    <Input
                      type="number"
                      {...register('requested_days', { valueAsNumber: true })}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                      placeholder="Enter number of days"
                    />
                    {errors.requested_days && <p className="text-red-400 text-sm mt-1">{errors.requested_days.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Requested Date</label>
                    <Input
                      type="date"
                      {...register('requested_date')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                    />
                    {errors.requested_date && <p className="text-red-400 text-sm mt-1">{errors.requested_date.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Original Completion Date</label>
                  <Input
                    type="date"
                    {...register('original_completion_date')}
                    className="bg-[#2A2A2A] border-[#444] text-white"
                  />
                  {errors.original_completion_date && <p className="text-red-400 text-sm mt-1">{errors.original_completion_date.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Extension Reason</label>
                  <textarea
                    {...register('extension_reason')}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444] rounded-lg text-white"
                    rows={4}
                    placeholder="Detailed reason for time extension request..."
                  />
                  {errors.extension_reason && <p className="text-red-400 text-sm mt-1">{errors.extension_reason.message}</p>}
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
                    Submit Extension Request
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
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

      {/* Extensions List */}
      <div className="grid gap-4">
        {extensions.map((extension) => (
          <Card key={extension.id} className="bg-[#1A1A1A] border-[#333] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">
                  Extension Request #{extension.id.slice(-8)}
                </h3>
                {getStatusBadge(extension.status)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Requested:</span>
                <span className="text-white font-semibold">{extension.requested_days} days</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-400">Project</p>
                <p className="text-white">{extension.projects?.project_name}</p>
              </div>
              <div>
                <p className="text-gray-400">Contract</p>
                <p className="text-white">{extension.contracts?.contract_number}</p>
              </div>
              <div>
                <p className="text-gray-400">Original Completion</p>
                <p className="text-white">{new Date(extension.original_completion_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Requested Date</p>
                <p className="text-white">{new Date(extension.requested_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-1">Reason:</p>
              <p className="text-white">{extension.extension_reason}</p>
            </div>

            {/* AI Analysis Results */}
            {extension.ai_analysis && (
              <div className="border-t border-[#333] pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-400" />
                      AI Analysis
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Eligibility:</span>
                        <span className={getEligibilityColor(Boolean(extension.ai_analysis.isEligible))}>
                          {extension.ai_analysis.isEligible ? 'Eligible' : 'Not Eligible'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Recommended Days:</span>
                        <span className="text-white">{extension.ai_analysis.recommendedDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Confidence:</span>
                        <span className="text-white">{extension.ai_analysis.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-yellow-400" />
                      Key Factors
                    </h4>
                    <div className="space-y-1 text-sm">
                      {extension.ai_analysis.keyFactors?.map((factor: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-300">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {extension.ai_analysis.recommendation && (
                  <div className="bg-[#2A2A2A] rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-300">
                      <strong>AI Recommendation:</strong> {extension.ai_analysis.recommendation}
                    </p>
                  </div>
                )}

                {extension.ai_analysis.letterContent && (
                  <div className="bg-[#2A2A2A] rounded-lg p-3">
                    <p className="text-sm text-gray-300 mb-2">
                      <strong>Generated Letter Preview:</strong>
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-3">
                      {extension.ai_analysis.letterContent}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-[#333]">
              {!extension.ai_analysis && (
                <Button
                  onClick={() => analyzeExtension(extension.id)}
                  disabled={analyzingExtension === extension.id}
                  size="sm"
                  className="bg-[#FF6B00] hover:bg-[#FF6B00]/90"
                >
                  {analyzingExtension === extension.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <MessageSquare size={14} className="mr-1" />
                      AI Analysis
                    </>
                  )}
                </Button>
              )}

              {extension.status === 'pending' && (
                <>
                  <Button
                    onClick={() => updateStatus(extension.id, 'approved')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle size={14} className="mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => updateStatus(extension.id, 'rejected')}
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    <AlertTriangle size={14} className="mr-1" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {extensions.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No time extension requests found</p>
        </div>
      )}
    </div>
  );
};
