import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-[#6C7568] text-xs font-medium">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6C7568]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-lg px-3 py-2.5 text-sm text-[#12332D] placeholder-[#9A9F93] outline-none transition-all',
              'border focus:border-[#005F56]/50 focus:ring-1 focus:ring-[#C89B3C]/30',
              error ? 'border-red-400/50' : 'border-[#DDD4B9]',
              icon ? 'pl-9' : undefined,
              className
            )}
            style={{ background: '#FFFFFF' }}
            {...props}
          />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[#6C7568] text-xs font-medium">{label}</label>}
      <select
        className={cn(
          'w-full rounded-lg px-3 py-2.5 text-sm text-[#12332D] outline-none transition-all',
          'border focus:border-[#005F56]/50 focus:ring-1 focus:ring-[#C89B3C]/30',
          error ? 'border-red-400/50' : 'border-[#DDD4B9]',
          className
        )}
        style={{ background: '#FFFFFF' }}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled} style={{ background: '#FFFFFF' }}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[#6C7568] text-xs font-medium">{label}</label>}
      <textarea
        className={cn(
          'w-full rounded-lg px-3 py-2.5 text-sm text-[#12332D] placeholder-[#9A9F93] outline-none transition-all resize-none',
          'border focus:border-[#005F56]/50 focus:ring-1 focus:ring-[#C89B3C]/30',
          error ? 'border-red-400/50' : 'border-[#DDD4B9]',
          className
        )}
        style={{ background: '#FFFFFF' }}
        {...props}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
