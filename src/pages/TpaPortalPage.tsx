import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ClipboardCheck, Download, FileText, Upload, X, Zap } from 'lucide-react';
import { summarizeTpaDocument } from '../services/ai/constructionAI';
import { tpaReviewsService } from '../services/data/tpaReviewsService';
import { OfflineSyncIndicator } from '../components/offline/OfflineSyncIndicator';
import { useAuth } from '../contexts/useAuth';

export const TpaPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const previews = useMemo(() => files.slice(0, 4).map((file) => ({
    file,
    url: URL.createObjectURL(file),
  })), [files]);

  const issueFlags = useMemo(() => files.flatMap((file) => {
    const name = file.name.toLowerCase();
    const flags: string[] = [];
    if (/fake|edited|scan-copy|copy/.test(name)) flags.push(`${file.name}: possible fake/edited report naming`);
    if (/unsigned|no-sign|draft/.test(name)) flags.push(`${file.name}: missing signature risk`);
    if (file.size < 8_000) flags.push(`${file.name}: unusually small file`);
    return flags;
  }), [files]);

  useEffect(() => {
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  const addFiles = (nextFiles: FileList | File[]) => {
    const accepted = Array.from(nextFiles).filter((file) =>
      ['application/pdf'].includes(file.type) || file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    setFiles((prev) => [...prev, ...accepted]);
  };

  const runSummary = async () => {
    setLoading(true);
    try {
      const result = await summarizeTpaDocument(files.map((file) => file.name));
      setSummary(result);
      try {
        await tpaReviewsService.createReview({
          id: crypto.randomUUID(),
          upload_id: `local-${Date.now()}`,
          review: {
            summary: result,
            flags: issueFlags,
            files: files.map((file) => ({ name: file.name, type: file.type, size: file.size })),
          },
          reviewer_id: user?.id,
          status: issueFlags.length ? 'pending' : 'approved',
        });
      } catch (syncError) {
        console.warn('[TPA] Review queue failed:', syncError);
      }
    } catch (error) {
      setSummary(error instanceof Error ? error.message : 'AI summary failed');
    } finally {
      setLoading(false);
    }
  };

  const exportComplianceReview = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(summary || 'TPA compliance review has not been generated yet.', 180);
    doc.text('NIRMAN TPA Compliance Export', 14, 16);
    doc.text(`Files reviewed: ${files.length}`, 14, 28);
    doc.text(`Flags: ${issueFlags.length}`, 14, 36);
    doc.text(lines, 14, 48);
    doc.save(`tpa-compliance-${Date.now()}.pdf`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">TPA Portal</h1>
          <p className="text-gray-400">Provide Third Party Agency access for inspections, reports, and approval workflows.</p>
        </div>
        <OfflineSyncIndicator />
      </div>

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">TPA Access & Reports</h2>
            <p className="text-gray-400 text-sm">Upload PDFs, images, videos and generate AI compliance observations.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#FF6B00] px-3 py-2 text-sm font-semibold text-white">
            <Upload size={15} />
            Upload
            <input type="file" accept=".pdf,image/*,video/*" multiple className="hidden" onChange={(event) => event.target.files && addFiles(event.target.files)} />
          </label>
        </div>

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files);
          }}
          className="rounded-xl border border-dashed border-[#444] bg-[#111] p-5 text-center text-sm text-gray-400"
        >
          Drag and drop TPA documents, lab reports, images, or inspection videos here.
        </div>

        <div className="mt-4 grid gap-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-[#111] px-3 py-2 text-sm text-gray-200">
              <span className="flex items-center gap-2"><FileText size={14} />{file.name}</span>
              <button onClick={() => setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))} className="text-gray-400 hover:text-white"><X size={14} /></button>
            </div>
          ))}
        </div>

        {previews.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {previews.map(({ file, url }) => (
              <div key={url} className="overflow-hidden rounded-xl border border-[#333] bg-[#111]">
                {file.type.startsWith('image/') ? (
                  <img src={url} alt={file.name} loading="lazy" className="h-48 w-full object-cover" />
                ) : file.type === 'application/pdf' ? (
                  <iframe src={url} title={file.name} className="h-48 w-full bg-white" loading="lazy" />
                ) : (
                  <video src={url} controls className="h-48 w-full bg-black" preload="metadata" />
                )}
                <p className="truncate px-3 py-2 text-xs text-gray-400">{file.name}</p>
              </div>
            ))}
          </div>
        )}

        {issueFlags.length > 0 && (
          <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <h3 className="mb-2 text-sm font-semibold text-yellow-200">Issue Highlighting</h3>
            {issueFlags.map((flag) => <p key={flag} className="text-xs text-yellow-100">{flag}</p>)}
          </div>
        )}

        <Button onClick={runSummary} disabled={loading || files.length === 0} className="mt-4 bg-[#FF6B00] hover:bg-[#FF6B00]/90" icon={<Zap size={14} />}>
          {loading ? 'Analyzing...' : 'Generate TPA AI Review'}
        </Button>
        <Button variant="outline" onClick={exportComplianceReview} disabled={files.length === 0} className="ml-3 mt-4" icon={<Download size={14} />}>
          Export
        </Button>

        {summary && (
          <div className="mt-4 rounded-xl border border-[#333] bg-[#111] p-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">{summary}</p>
          </div>
        )}
      </Card>
    </div>
  );
};
