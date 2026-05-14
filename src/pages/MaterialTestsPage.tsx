import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Beaker, Upload, AlertTriangle, CheckCircle, TrendingUp, FileText } from 'lucide-react';
import { MaterialAI } from '../services/ai/materialAI';

const materialTestSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  material_type: z.string().min(1, 'Material type is required'),
  test_type: z.string().min(1, 'Test type is required'),
  sample_id: z.string().min(1, 'Sample ID is required'),
  test_date: z.string().min(1, 'Test date is required'),
  tested_by: z.string().min(1, 'Tester name is required'),
  test_results: z.record(z.any()).optional(),
  status: z.enum(['pending', 'completed', 'failed']).default('pending'),
  remarks: z.string().optional()
});

type MaterialTestFormData = z.infer<typeof materialTestSchema>;

export const MaterialTestsPage: React.FC = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [uploadedReport, setUploadedReport] = useState<File | null>(null);
  const [analyzingTest, setAnalyzingTest] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<MaterialTestFormData>({
    resolver: zodResolver(materialTestSchema)
  });

  useEffect(() => {
    loadMaterialTests();
  }, []);

  const loadMaterialTests = async () => {
    try {
      const { data, error } = await supabase
        .from('material_tests')
        .select(`
          *,
          projects(project_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error loading material tests:', error);
      toast.error('Failed to load material tests');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: MaterialTestFormData) => {
    try {
      const { error } = await supabase
        .from('material_tests')
        .insert([data]);

      if (error) throw error;

      toast.success('Material test added successfully');
      reset();
      setShowAddForm(false);
      loadMaterialTests();
    } catch (error) {
      console.error('Error adding material test:', error);
      toast.error('Failed to add material test');
    }
  };

  const handleReportUpload = async (testId: string) => {
    if (!uploadedReport) {
      toast.error('Please select a report file');
      return;
    }

    setAnalyzingTest(testId);
    try {
      // Upload report to Supabase storage
      const filePath = `material-reports/${Date.now()}_${uploadedReport.name}`;
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, uploadedReport);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      // Analyze with AI
      const targetTest = tests.find(t => t.id === testId);
      const analysis = await MaterialAI.verifyMaterialTest(testId, {
        materialType: targetTest?.material_type || 'unknown',
        testType: targetTest?.test_type || 'unknown',
        requiredValue: 'Not specified',
        achievedValue: 'Not specified',
        labName: 'Unknown laboratory',
        testReportUrl: urlData.publicUrl
      });

      // Update test with analysis results
      const { error: updateError } = await supabase
        .from('material_tests')
        .update({
          status: analysis.isAuthentic ? 'completed' : 'failed',
          test_results: analysis,
          report_url: urlData.publicUrl
        })
        .eq('id', testId);

      if (updateError) throw updateError;

      toast.success('Report analyzed and saved successfully');
      loadMaterialTests();
      setUploadedReport(null);
    } catch (error) {
      console.error('Error analyzing report:', error);
      toast.error('Failed to analyze report');
    } finally {
      setAnalyzingTest(null);
    }
  };

  const getStatusBadge = (status: string, analysis?: any) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', label: 'Pending' },
      completed: { color: 'bg-green-500', label: 'Completed' },
      failed: { color: 'bg-red-500', label: 'Failed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    if (analysis && !analysis.isAuthentic) {
      return <Badge className="bg-red-500 text-white">Suspicious</Badge>;
    }

    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
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
            <Beaker className="text-[#FF6B00]" />
            Material Tests & Quality Control
          </h1>
          <p className="text-gray-400 mt-1">AI-powered material testing and quality verification</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-[#FF6B00] hover:bg-[#FF6B00]/90"
        >
          <Beaker size={16} className="mr-2" />
          Add Test
        </Button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1A1A1A] border-[#333]">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Add Material Test</h2>
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">Material Type</label>
                    <select
                      {...register('material_type')}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#444] rounded-lg text-white"
                    >
                      <option value="">Select material type</option>
                      <option value="cement">Cement</option>
                      <option value="steel">Steel</option>
                      <option value="concrete">Concrete</option>
                      <option value="aggregate">Aggregate</option>
                      <option value="sand">Sand</option>
                      <option value="brick">Brick</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.material_type && <p className="text-red-400 text-sm mt-1">{errors.material_type.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Test Type</label>
                    <Input
                      {...register('test_type')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                      placeholder="e.g., Compressive Strength, Tensile Test"
                    />
                    {errors.test_type && <p className="text-red-400 text-sm mt-1">{errors.test_type.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Sample ID</label>
                    <Input
                      {...register('sample_id')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                      placeholder="Enter sample ID"
                    />
                    {errors.sample_id && <p className="text-red-400 text-sm mt-1">{errors.sample_id.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Test Date</label>
                    <Input
                      type="date"
                      {...register('test_date')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                    />
                    {errors.test_date && <p className="text-red-400 text-sm mt-1">{errors.test_date.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Tested By</label>
                    <Input
                      {...register('tested_by')}
                      className="bg-[#2A2A2A] border-[#444] text-white"
                      placeholder="Enter tester name"
                    />
                    {errors.tested_by && <p className="text-red-400 text-sm mt-1">{errors.tested_by.message}</p>}
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
                    Add Material Test
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

      {/* Tests List */}
      <div className="grid gap-4">
        {tests.map((test) => (
          <Card key={test.id} className="bg-[#1A1A1A] border-[#333] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">{test.sample_id}</h3>
                {getStatusBadge(test.status, test.test_results)}
              </div>
              <div className="flex items-center gap-2">
                {test.test_results?.qualityScore && (
                  <div className={`text-sm font-semibold ${getQualityScoreColor(test.test_results.qualityScore)}`}>
                    Quality: {test.test_results.qualityScore}%
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-400">Material</p>
                <p className="text-white capitalize">{test.material_type}</p>
              </div>
              <div>
                <p className="text-gray-400">Test Type</p>
                <p className="text-white">{test.test_type}</p>
              </div>
              <div>
                <p className="text-gray-400">Project</p>
                <p className="text-white">{test.projects?.project_name}</p>
              </div>
              <div>
                <p className="text-gray-400">Test Date</p>
                <p className="text-white">{new Date(test.test_date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* AI Analysis Results */}
            {test.test_results && (
              <div className="border-t border-[#333] pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-400" />
                      Analysis Results
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Authenticity:</span>
                        <span className={test.test_results.isAuthentic ? 'text-green-400' : 'text-red-400'}>
                          {test.test_results.isAuthentic ? 'Verified' : 'Suspicious'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Quality Score:</span>
                        <span className={getQualityScoreColor(test.test_results.qualityScore)}>
                          {test.test_results.qualityScore}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Compliance:</span>
                        <span className={test.test_results.complianceStatus === 'compliant' ? 'text-green-400' : 'text-red-400'}>
                          {test.test_results.complianceStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp size={16} className="text-blue-400" />
                      Key Parameters
                    </h4>
                    <div className="space-y-1 text-sm">
                      {test.test_results.keyParameters?.map((param: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-gray-400">{param.name}:</span>
                          <span className="text-white">{param.value} {param.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {test.test_results.recommendations && (
                  <div className="bg-[#2A2A2A] rounded-lg p-3">
                    <p className="text-sm text-gray-300">
                      <strong>AI Recommendations:</strong> {test.test_results.recommendations}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Upload Report */}
            {test.status === 'pending' && (
              <div className="border-t border-[#333] pt-4">
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setUploadedReport(e.target.files?.[0] || null)}
                    className="text-sm text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#FF6B00] file:text-white hover:file:bg-[#FF6B00]/90"
                  />
                  <Button
                    onClick={() => handleReportUpload(test.id)}
                    disabled={!uploadedReport || analyzingTest === test.id}
                    size="sm"
                    className="bg-[#FF6B00] hover:bg-[#FF6B00]/90"
                  >
                    {analyzingTest === test.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload size={14} className="mr-1" />
                        Analyze Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {tests.length === 0 && (
        <div className="text-center py-12">
          <Beaker size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No material tests found</p>
        </div>
      )}
    </div>
  );
};