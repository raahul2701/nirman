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
        {label && <label className="text-[#A0A0A0] text-xs font-medium">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#404040] outline-none transition-all',
              'border focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/20',
              error ? 'border-red-400/50' : 'border-[#2A2A2A]',
              icon ? 'pl-9' : undefined,
              className
            )}
            style={{ background: '#111111' }}
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
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[#A0A0A0] text-xs font-medium">{label}</label>}
      <select
        className={cn(
          'w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all',
          'border focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/20',
          error ? 'border-red-400/50' : 'border-[#2A2A2A]',
          className
        )}
        style={{ background: '#111111' }}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: '#1A1A1A' }}>{o.label}</option>
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
      {label && <label className="text-[#A0A0A0] text-xs font-medium">{label}</label>}
      <textarea
        className={cn(
          'w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#404040] outline-none transition-all resize-none',
          'border focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/20',
          error ? 'border-red-400/50' : 'border-[#2A2A2A]',
          className
        )}
        style={{ background: '#111111' }}
        {...props}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
