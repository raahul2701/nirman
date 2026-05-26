import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Beaker, Upload, CheckCircle, TrendingUp, Camera, Video, X } from 'lucide-react';
import { MaterialAI } from '../services/ai/materialAI';
import { analyzeMaterialInspection } from '../services/ai/constructionAI';
import { compressImage } from '../services/ai/imageCompression';
import { materialReportsService } from '../services/data/materialReportsService';
import { OfflineSyncIndicator } from '../components/offline/OfflineSyncIndicator';
import { useAuth } from '../contexts/useAuth';

const materialTestSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  material_type: z.string().min(1, 'Material type is required'),
  test_type: z.string().min(1, 'Test type is required'),
  sample_id: z.string().min(1, 'Sample ID is required'),
  test_date: z.string().min(1, 'Test date is required'),
  tested_by: z.string().min(1, 'Tester name is required'),
  test_results: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['pending', 'completed', 'failed']),
  remarks: z.string().optional()
});

type MaterialTestFormData = z.infer<typeof materialTestSchema>;
const OFFLINE_INSPECTION_QUEUE_KEY = 'nirman:material-inspection-queue';
const DEFAULT_PROJECT_ID = 'project-1';

interface MaterialTestAnalysis {
  confidence?: number;
  isAuthentic?: boolean;
  qualityScore?: number;
  complianceStatus?: string;
  keyParameters?: Array<{
    name?: string;
    value?: string | number;
    unit?: string;
  }>;
  recommendations?: string;
}

interface MaterialTestRow {
  id: string;
  project_id?: string | null;
  sample_id: string;
  material_type?: string | null;
  test_type?: string | null;
  test_date: string;
  status: string;
  test_results?: MaterialTestAnalysis | null;
  projects?: {
    project_name?: string | null;
  } | null;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const MaterialTestsPage: React.FC = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<MaterialTestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTest] = useState<MaterialTestRow | null>(null);
  const [uploadedReport, setUploadedReport] = useState<File | null>(null);
  const [inspectionFiles, setInspectionFiles] = useState<File[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionResult, setInspectionResult] = useState('');
  const [analyzingTest, setAnalyzingTest] = useState<string | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [queuedInspectionCount, setQueuedInspectionCount] = useState(0);
  const inspectionAbortRef = useRef<AbortController | null>(null);

  const inspectionPreviews = useMemo(
    () => inspectionFiles
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 4)
      .map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [inspectionFiles]
  );

  useEffect(() => {
    return () => {
      inspectionPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [inspectionPreviews]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<MaterialTestFormData>({
    resolver: zodResolver(materialTestSchema),
    defaultValues: {
      status: 'pending',
    },
  });

  useEffect(() => {
    loadMaterialTests();
    const queued = JSON.parse(localStorage.getItem(OFFLINE_INSPECTION_QUEUE_KEY) || '[]') as unknown[];
    setQueuedInspectionCount(queued.length);
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
      setTests((data || []) as MaterialTestRow[]);
    } catch (error) {
      console.error('Error loading material tests:', error);
      toast.error('Failed to load material tests');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<MaterialTestFormData> = async (data) => {
    try {
      try {
        await materialReportsService.createReport({
          id: crypto.randomUUID(),
          project_id: data.project_id || DEFAULT_PROJECT_ID,
          report: data,
          severity: data.status === 'failed' ? 'high' : 'medium',
          created_by: user?.id,
        });
      } catch (syncError) {
        console.warn('[Material] Test queue failed:', syncError);
      }

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
      let uploadError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { error } = await supabase.storage
          .from('project-files')
          .upload(filePath, uploadedReport, { upsert: true });
        uploadError = error;
        if (!error) break;
        await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
      }

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
          status: analysis.authenticityVerified ? 'completed' : 'failed',
          test_results: analysis,
          report_url: urlData.publicUrl
        })
        .eq('id', testId);

      if (updateError) throw updateError;

      try {
        await materialReportsService.createReport({
          id: crypto.randomUUID(),
          project_id: targetTest?.project_id || DEFAULT_PROJECT_ID,
          material_id: testId,
          report: {
            materialType: targetTest?.material_type || 'unknown',
            testType: targetTest?.test_type || 'unknown',
            reportUrl: urlData.publicUrl,
          },
          structured_output: analysis,
          confidence: Number((analysis as unknown as MaterialTestAnalysis).confidence || 0.85),
          severity: analysis.authenticityVerified ? 'low' : 'high',
          created_by: user?.id,
        });
      } catch (syncError) {
        console.warn('[Material] Report queue failed:', syncError);
      }

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

  const addInspectionFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    setInspectionFiles((prev) => [...prev, ...accepted].slice(0, 6));
  };

  const runInspection = async () => {
    if (!navigator.onLine) {
      const queued = JSON.parse(localStorage.getItem(OFFLINE_INSPECTION_QUEUE_KEY) || '[]') as Array<Record<string, unknown>>;
      queued.push({
        id: crypto.randomUUID(),
        notes: inspectionNotes,
        files: inspectionFiles.map((file) => ({ name: file.name, type: file.type, size: file.size })),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(OFFLINE_INSPECTION_QUEUE_KEY, JSON.stringify(queued));
      setQueuedInspectionCount(queued.length);
      toast.success('Offline: inspection request queued locally');
      return;
    }

    inspectionAbortRef.current?.abort();
    const controller = new AbortController();
    inspectionAbortRef.current = controller;
    setInspectionLoading(true);
    try {
      const imageDataUrls = await Promise.all(
        inspectionFiles
          .filter((file) => file.type.startsWith('image/'))
          .slice(0, 4)
          .map(async (file) => readFileAsDataUrl(await compressImage(file)))
      );

      if (controller.signal.aborted) return;

      const result = await analyzeMaterialInspection({
        materialType: selectedTest?.material_type || undefined,
        testType: selectedTest?.test_type || undefined,
        remarks: `${inspectionNotes}\n\nRequired report format: Observation | IS/MORTH Reference | Severity | Suggested Action | AI Confidence.`,
        mediaDataUrls: imageDataUrls,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      setInspectionResult(result);
      try {
        await materialReportsService.createReport({
          id: crypto.randomUUID(),
          project_id: selectedTest?.project_id || DEFAULT_PROJECT_ID,
          material_id: selectedTest?.id,
          report: {
            notes: inspectionNotes,
            files: inspectionFiles.map((file) => ({ name: file.name, type: file.type, size: file.size })),
          },
          structured_output: { result },
          confidence: 0.85,
          severity: /critical|fail|unsafe/i.test(result) ? 'high' : 'medium',
          created_by: user?.id,
        });
      } catch (syncError) {
        console.warn('[Material] Inspection queue failed:', syncError);
      }
      toast.success('AI material inspection generated');
    } catch (error) {
      console.error('Material inspection failed:', error);
      toast.error(error instanceof Error ? error.message : 'AI material inspection failed');
    } finally {
      setInspectionLoading(false);
    }
  };

  const cancelInspection = () => {
    inspectionAbortRef.current?.abort();
    setInspectionLoading(false);
    toast('AI inspection cancelled');
  };

  const downloadInspectionPdf = async () => {
    if (!inspectionResult) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(inspectionResult, 180);
    doc.text('NIRMAN AI Material Inspection Report', 14, 16);
    doc.text(lines, 14, 28);
    doc.save(`material-inspection-${Date.now()}.pdf`);
  };

  const getStatusBadge = (status: string, analysis?: MaterialTestAnalysis | null) => {
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
        <div className="flex items-center gap-3">
          <OfflineSyncIndicator />
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-[#FF6B00] hover:bg-[#FF6B00]/90"
          >
            <Beaker size={16} className="mr-2" />
            Add Test
          </Button>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Camera size={18} className="text-[#FF6B00]" />
              AI Material Inspection
            </h2>
            <p className="text-sm text-gray-400">
              Capture site photos, lab images, or upload test videos for QA/QC observations.
            </p>
          </div>
          <Badge className="bg-[#FF6B00]/15 text-[#FF6B00]">AI ready</Badge>
        </div>

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addInspectionFiles(event.dataTransfer.files);
          }}
          className="rounded-xl border border-dashed border-[#444] bg-[#111] p-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#FF6B00] px-3 py-2 text-sm font-semibold text-white">
              <Camera size={15} />
              Camera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => event.target.files && addInspectionFiles(event.target.files)}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#444] px-3 py-2 text-sm font-semibold text-white">
              <Upload size={15} />
              Upload Images
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => event.target.files && addInspectionFiles(event.target.files)}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#444] px-3 py-2 text-sm font-semibold text-white">
              <Video size={15} />
              Upload Video
              <input
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(event) => event.target.files && addInspectionFiles(event.target.files)}
              />
            </label>
            <span className="text-xs text-gray-500">Drag and drop media here</span>
          </div>

          {inspectionFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {inspectionFiles.map((file, index) => (
                <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-lg bg-[#2A2A2A] px-2 py-1 text-xs text-gray-200">
                  {file.name}
                  <button
                    type="button"
                    onClick={() => setInspectionFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {inspectionPreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {inspectionPreviews.map((preview) => (
                <img
                  key={preview.url}
                  src={preview.url}
                  alt={preview.name}
                  loading="lazy"
                  className="aspect-square rounded-lg border border-[#333] object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <textarea
          value={inspectionNotes}
          onChange={(event) => setInspectionNotes(event.target.value)}
          className="mt-4 w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none"
          rows={3}
          placeholder="Optional site context: material, location, suspected issue, lab/sample reference..."
        />

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={runInspection}
            disabled={inspectionLoading || (!inspectionFiles.length && !inspectionNotes.trim())}
            className="bg-[#FF6B00] hover:bg-[#FF6B00]/90"
          >
            {inspectionLoading ? 'Analyzing...' : 'Generate AI QC Report'}
          </Button>
          {inspectionLoading && (
            <Button variant="outline" onClick={cancelInspection}>
              Cancel
            </Button>
          )}
          {inspectionResult && (
            <Button variant="outline" onClick={downloadInspectionPdf}>
              Download PDF
            </Button>
          )}
          {inspectionFiles.some((file) => file.type.startsWith('video/')) && (
            <p className="text-xs text-yellow-400">Video files are uploaded for record; AI vision currently analyzes image frames you provide.</p>
          )}
        </div>

        {queuedInspectionCount > 0 && (
          <p className="mt-3 text-xs text-yellow-400">{queuedInspectionCount} offline inspection request(s) queued.</p>
        )}

        {inspectionLoading && (
          <div className="mt-4 space-y-2 rounded-xl border border-[#333] bg-[#111] p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-[#2A2A2A]" />
            <div className="h-3 w-full animate-pulse rounded bg-[#2A2A2A]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[#2A2A2A]" />
          </div>
        )}

        {inspectionResult && (
          <div className="mt-4 rounded-xl border border-[#333] bg-[#111] p-4">
            <h3 className="mb-2 text-sm font-semibold text-white">AI Engineer Summary</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">{inspectionResult}</p>
          </div>
        )}
      </Card>

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
                    <div className={`text-sm font-semibold ${getQualityScoreColor(test.test_results.qualityScore || 0)}`}>
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
                        <span className={getQualityScoreColor(test.test_results.qualityScore || 0)}>
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
                      {test.test_results.keyParameters?.map((param, index) => (
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
