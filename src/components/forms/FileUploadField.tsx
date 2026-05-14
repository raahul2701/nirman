import { useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileUploadFieldProps {
  label: string;
  accept?: string;
  onFileSelect: (file: File | null) => void;
  helpText?: string;
}

export function FileUploadField({ label, accept = '*/*', onFileSelect, helpText }: FileUploadFieldProps) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <label className="block rounded-3xl border border-dashed border-[#333] p-6 text-center cursor-pointer transition-colors hover:border-[#FF6B00]">
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setFileName(file?.name ?? null);
          onFileSelect(file);
        }}
      />
      <div className="flex flex-col items-center justify-center gap-3">
        <UploadCloud className="text-[#FF6B00]" size={36} />
        <div>
          <p className="font-semibold text-white">{label}</p>
          <p className="text-sm text-[#A0A0A0]">{fileName || 'Drag & drop or click to upload'}</p>
        </div>
        {helpText && <p className="text-xs text-[#7A7A7A]">{helpText}</p>}
      </div>
    </label>
  );
}
