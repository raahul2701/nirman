import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Brain, CheckCircle2, ClipboardCheck, FileText, IndianRupee, UploadCloud } from '../../lib/icons';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { createSignedUrl, uploadFileWithRetry } from '../../services/storageService';
import { getMyWorkspaceSummary, type ProjectAssignment, type WorkspaceSummary } from '../../services/businessHierarchyService';
import { buildDriveFolderPath, recordDocumentMetadata } from '../../services/documentMapping';
import { agreementStudyDemo } from '../../services/executionDemoData';

type ProjectOption = {
  id: string;
  table: string;
  code: string;
  name: string;
  budget: number;
};

type AgreementDocument = {
  id: string;
  file_name: string;
  original_filename?: string | null;
  ai_processing_status?: 'uploaded' | 'pending' | 'running' | 'completed' | 'failed';
  ai_error_message?: string | null;
  google_drive_sync_status?: string | null;
  drive_folder_path?: string | null;
  created_at?: string;
};

type BoqItem = {
  id?: string;
  item_number?: string | null;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function statusLabel(status?: AgreementDocument['ai_processing_status']) {
  if (status === 'pending') return 'AI Study Pending';
  if (status === 'running') return 'AI Study Running';
  if (status === 'completed') return 'AI Study Completed';
  if (status === 'failed') return 'AI Study Failed';
  return 'Uploaded';
}

function isSupportedStudyFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type === 'application/pdf'
    || file.type === 'text/csv'
    || name.endsWith('.pdf')
    || name.endsWith('.csv')
    || name.endsWith('.txt')
    || name.endsWith('.xlsx')
    || name.endsWith('.xls')
    || name.endsWith('.doc')
    || name.endsWith('.docx');
}

async function fetchProjectOptions(assignments: ProjectAssignment[]) {
  const legacyIds = assignments.filter((assignment) => assignment.project_table !== 'gov_projects').map((assignment) => assignment.project_id);
  const govIds = assignments.filter((assignment) => assignment.project_table === 'gov_projects').map((assignment) => assignment.project_id);
  const [legacyResult, govResult] = await Promise.all([
    legacyIds.length > 0 ? supabase.from('projects').select('id,name,budget').in('id', legacyIds) : Promise.resolve({ data: [], error: null }),
    govIds.length > 0 ? supabase.from('gov_projects').select('id,project_name,project_code,total_contract_value').in('id', govIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (legacyResult.error) throw legacyResult.error;
  if (govResult.error) throw govResult.error;

  const options: ProjectOption[] = [
    ...((legacyResult.data || []) as { id: string; name: string; budget?: number }[]).map((project) => ({
      id: project.id,
      table: 'projects',
      code: 'PROJECT',
      name: project.name,
      budget: Number(project.budget || 0),
    })),
    ...((govResult.data || []) as { id: string; project_name: string; project_code: string; total_contract_value?: number }[]).map((project) => ({
      id: project.id,
      table: 'gov_projects',
      code: project.project_code,
      name: project.project_name,
      budget: Number(project.total_contract_value || 0),
    })),
  ];

  return assignments
    .map((assignment) => options.find((option) => option.id === assignment.project_id))
    .filter((option): option is ProjectOption => Boolean(option));
}

export function AgreementBoqStudyPage() {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [document, setDocument] = useState<AgreementDocument | null>(null);
  const [boqItems, setBoqItems] = useState<BoqItem[]>(agreementStudyDemo.boqItems.map((item) => ({ ...item, item_number: item.itemNo })));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [studying, setStudying] = useState(false);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;
  const totalBoq = useMemo(() => boqItems.reduce((sum, item) => sum + Number(item.amount || 0), 0), [boqItems]);
  const driveFolderPath = buildDriveFolderPath(summary?.workspace, selectedProject, 'agreement_boq');
  const uploadDisabled = !selectedFile || !selectedProjectId;
  const aiReadDisabled = !document || document.ai_processing_status === 'running';

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supabaseProjectRef = supabaseUrl?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1] || null;

    console.log('[agreement-upload disabled trace]', {
      location: typeof window === 'undefined' ? null : window.location.href,
      currentUser: {
        id: user?.id || null,
        email: user?.email || null,
      },
      role: profile?.role || null,
      supabase: {
        url: supabaseUrl || null,
        projectRef: supabaseProjectRef,
        expectedProjectRef: 'aaxbulmndnblclmcuqgj',
        matchesExpectedProjectRef: supabaseProjectRef === 'aaxbulmndnblclmcuqgj',
      },
      workspace: summary?.workspace || null,
      workspaceId: summary?.workspace?.id || null,
      assignments: summary?.projects || [],
      assignmentCount: summary?.projects?.length || 0,
      projects,
      projectCount: projects.length,
      selectedProjectId,
      selectedProject,
      selectedFile: selectedFile
        ? {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        }
        : null,
      loadingState: {
        loading,
        uploading,
        studying,
      },
      agreementDocumentState: {
        document,
        documentMissing: !document,
        aiProcessingStatus: document?.ai_processing_status || null,
      },
      disabledState: {
        uploadDisabled,
        uploadDisabledBecauseSelectedFileMissing: !selectedFile,
        uploadDisabledBecauseSelectedProjectIdMissing: !selectedProjectId,
        uploadButtonEffectiveDisabled: uploadDisabled || uploading,
        aiReadDisabled,
        aiReadDisabledBecauseDocumentMissing: !document,
        aiReadDisabledBecauseRunning: document?.ai_processing_status === 'running',
        aiReadButtonEffectiveDisabled: aiReadDisabled || studying,
      },
    });
  }, [aiReadDisabled, document, loading, profile?.role, projects, selectedFile, selectedProject, selectedProjectId, studying, summary, uploadDisabled, uploading, user?.email, user?.id]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const workspaceSummary = await getMyWorkspaceSummary();
        if (!active) return;
        setSummary(workspaceSummary);
        const options = await fetchProjectOptions(workspaceSummary.projects.filter((assignment) => assignment.access_status === 'active' || assignment.access_status === 'pilot'));
        if (!active) return;
        setProjects(options);
        setSelectedProjectId((current) => current || options[0]?.id || '');
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Workspace/project context could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function refreshBoq(projectId: string, documentId: string) {
    const { data } = await supabase
      .from('boq_items')
      .select('id,item_number,description,quantity,unit,rate,amount')
      .eq('project_id', projectId)
      .eq('agreement_document_id', documentId)
      .order('created_at', { ascending: false });
    if (data && data.length > 0) setBoqItems(data as BoqItem[]);
  }

  async function uploadAgreement() {
    setError('');
    setMessage('');
    console.log('[agreement-upload uploadAgreement start]', {
      userId: user?.id || null,
      role: profile?.role || null,
      workspace: summary?.workspace || null,
      selectedProjectId,
      selectedProject,
      selectedFile: selectedFile
        ? {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        }
        : null,
      uploadDisabled,
      uploadDisabledBecauseSelectedFileMissing: !selectedFile,
      uploadDisabledBecauseSelectedProjectIdMissing: !selectedProjectId,
      uploading,
    });
    if (!selectedFile) {
      console.warn('[agreement-upload uploadAgreement blocked]', {
        reason: 'selectedFile missing',
        selectedFile,
        selectedProjectId,
      });
      setError('Select an agreement/BOQ file first.');
      return;
    }
    if (!summary?.workspace || !selectedProject || !user) {
      console.warn('[agreement-upload uploadAgreement blocked]', {
        reason: 'workspace/project/user context missing',
        workspace: summary?.workspace || null,
        selectedProject,
        userId: user?.id || null,
      });
      setError('Workspace, project, or logged-in user context is missing. Assign the project before upload.');
      return;
    }
    if (!isSupportedStudyFile(selectedFile)) {
      console.warn('[agreement-upload uploadAgreement blocked]', {
        reason: 'unsupported file type',
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });
      setError('Unsupported file type. Use PDF, DOC/DOCX, XLS/XLSX, CSV, or TXT.');
      return;
    }

    setUploading(true);
    try {
      const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const storagePath = `${summary.workspace.id}/${selectedProject.id}/01-agreement-boq/${Date.now()}-${cleanName}`;
      await uploadFileWithRetry('project-files', storagePath, selectedFile, { upsert: false });
      const fileUrl = await createSignedUrl('project-files', storagePath, 60 * 60);
      const payload = {
        workspace_id: summary.workspace.id,
        project_id: selectedProject.id,
        uploaded_by: user.id,
        role: profile?.role || null,
        document_type: 'agreement',
        module_name: 'agreement_boq',
        file_name: selectedFile.name,
        original_filename: selectedFile.name,
        file_url: fileUrl,
        storage_path: storagePath,
        supabase_path: storagePath,
        mime_type: selectedFile.type || 'application/octet-stream',
        storage_provider: 'supabase',
        google_drive_sync_status: summary.googleConnection?.drive_root_folder_id ? 'google_drive_sync_pending' : 'uploaded_to_supabase',
        drive_folder_path: driveFolderPath,
        document_status: 'uploaded',
        ai_processing_status: 'uploaded',
      };

      console.log('[agreement-upload agreement_documents payload]', payload);
      const { data, error: insertError } = await supabase.from('agreement_documents').insert(payload).select().single();
      console.log('[agreement-upload agreement_documents result]', { data, insertError });
      if (insertError) throw insertError;

      await recordDocumentMetadata({
        workspaceId: summary.workspace.id,
        ownerExecutiveEngineerId: summary.workspace.executive_engineer_id,
        projectId: selectedProject.id,
        uploadedBy: user.id,
        role: profile?.role || null,
        documentType: 'agreement',
        moduleName: 'agreement_boq',
        originalFilename: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size,
        storageProvider: 'supabase',
        supabasePath: storagePath,
        fileUrl,
        aiProcessingStatus: 'uploaded',
        driveSyncStatus: summary.googleConnection?.drive_root_folder_id ? 'google_drive_sync_pending' : 'uploaded_to_supabase',
        driveFolderPath,
      });

      console.log('[agreement-upload setDocument]', data);
      setDocument(data as AgreementDocument);
      setMessage('Uploaded. AI Study is ready to run.');
    } catch (uploadError) {
      console.error('[agreement-upload uploadAgreement error]', uploadError);
      setError(uploadError instanceof Error ? uploadError.message : 'Agreement upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function runStudy() {
    setError('');
    setMessage('');
    if (!document || !summary?.workspace || !selectedProject) {
      setError('Upload an agreement document before running AI Study.');
      return;
    }

    setStudying(true);
    setDocument((current) => current ? { ...current, ai_processing_status: 'pending', ai_error_message: null } : current);
    try {
      await supabase.from('agreement_documents').update({ ai_processing_status: 'pending', ai_error_message: null }).eq('id', document.id);
      setDocument((current) => current ? { ...current, ai_processing_status: 'running', ai_error_message: null } : current);
      const { data, error: functionError } = await supabase.functions.invoke('agreement-study', {
        body: {
          document_id: document.id,
          workspace_id: summary.workspace.id,
          project_id: selectedProject.id,
        },
      });
      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.details || data.error);
      setDocument((current) => current ? { ...current, ai_processing_status: 'completed' } : current);
      await refreshBoq(selectedProject.id, document.id);
      setMessage('AI Study completed and saved.');
    } catch (studyError) {
      const details = studyError instanceof Error ? studyError.message : 'AI Study failed.';
      await supabase.from('agreement_documents').update({ ai_processing_status: 'failed', document_status: 'failed', ai_error_message: details }).eq('id', document.id);
      setDocument((current) => current ? { ...current, ai_processing_status: 'failed', ai_error_message: details } : current);
      setError(details);
    } finally {
      setStudying(false);
    }
  }

  return (
    <AppLayout title="Agreement & BOQ AI Study" subtitle="Upload agreement copies and structure BOQ, clauses, milestones, BG, SD, DLP, and payment terms.">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="BOQ Items" value={boqItems.length} icon={<FileText size={18} />} color="#005F56" />
        <StatCard label="Extracted Value" value={formatMoney(totalBoq)} icon={<IndianRupee size={18} />} color="#C89B3C" />
        <StatCard label="Projects Mapped" value={projects.length} icon={<ClipboardCheck size={18} />} loading={loading} color="#0B8B7D" />
        <StatCard label="AI Study" value={statusLabel(document?.ai_processing_status)} icon={<Brain size={18} />} color={document?.ai_processing_status === 'failed' ? '#B42318' : '#2F6B9A'} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h3 className="text-sm font-bold text-[#12332D]">Agreement Upload</h3>
          <label className="mt-4 block text-xs font-semibold text-[#6C7568]" htmlFor="agreement-project">Assigned project</label>
          <select
            id="agreement-project"
            className="mt-2 w-full rounded-lg border border-[#D9D0B5] bg-white px-3 py-2 text-sm text-[#12332D]"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
          >
            {projects.length === 0 ? <option value="">No assigned project found</option> : null}
            {projects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
          </select>
          <div className="mt-3 rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-3 text-xs leading-relaxed text-[#6C7568]">
            Drive path: {driveFolderPath}
          </div>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#CDBD82] bg-[#F9F7EF] p-6 text-center">
            <UploadCloud size={28} className="text-[#005F56]" />
            <span className="mt-2 text-sm font-semibold text-[#12332D]">{selectedFile?.name || document?.original_filename || document?.file_name || 'Select agreement file'}</span>
            <span className="mt-1 text-xs text-[#6C7568]">PDF/DOC/XLS metadata is linked to workspace_id, project_id, and module_name</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
          </label>
          <Button className="mt-4 w-full" variant="outline" loading={uploading} disabled={uploadDisabled} icon={<UploadCloud size={14} />} onClick={uploadAgreement}>
            Upload Agreement
          </Button>
          <Button className="mt-3 w-full" variant="primary" loading={studying} disabled={aiReadDisabled} icon={<Brain size={14} />} onClick={runStudy}>
            Run AI Agreement Study
          </Button>
          <div className="mt-3 space-y-2 text-xs text-[#6C7568]">
            <p>Status: {statusLabel(document?.ai_processing_status)}</p>
            <p>Drive sync: {document?.google_drive_sync_status || 'pending until upload'}</p>
          </div>
          {message ? <p className="mt-3 flex gap-2 rounded-lg border border-[#0B8B7D]/20 bg-[#0B8B7D]/8 p-3 text-xs text-[#005F56]"><CheckCircle2 size={14} />{message}</p> : null}
          {error ? <p className="mt-3 flex gap-2 rounded-lg border border-[#B42318]/20 bg-[#B42318]/8 p-3 text-xs text-[#B42318]"><AlertTriangle size={14} />{error}</p> : null}
        </Card>

        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-bold text-[#12332D]">Structured BOQ Items</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-[#6C7568]">
                  <tr>
                    <th className="py-2">Item</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {boqItems.map((item) => (
                    <tr key={item.id || item.item_number || item.description} className="border-t border-[#EFE8D4]">
                      <td className="py-3 font-semibold text-[#12332D]">{item.item_number || '-'}</td>
                      <td>{item.description}</td>
                      <td>{Number(item.quantity || 0)} {item.unit}</td>
                      <td>{formatMoney(Number(item.rate || 0))}</td>
                      <td className="font-semibold">{formatMoney(Number(item.amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-bold text-[#12332D]">AI Study Failure Checks</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                'Missing server-side Gemini/API key',
                'File not found in Supabase storage',
                'Storage permission or RLS issue',
                'Unsupported file type/parser',
                'Supabase Edge Function error',
                'AI response parsing failed',
              ].map((item) => (
                <div key={item} className="rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-3 text-sm text-[#12332D]">{item}</div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
