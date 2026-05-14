import { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'default';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variants = {
  primary: 'text-white font-semibold',
  secondary: 'text-white font-medium border border-[#2A2A2A] hover:border-[#FF6B00]/40 hover:bg-[#FF6B00]/5',
  ghost: 'text-[#A0A0A0] hover:text-white hover:bg-white/5',
  danger: 'text-red-400 border border-red-400/20 hover:bg-red-400/10',
  outline: 'text-white border border-[#2A2A2A] hover:border-[#FF6B00]/40 hover:bg-[#FF6B00]/5',
  default: 'text-white border border-[#2A2A2A] hover:border-[#FF6B00]/40 hover:bg-[#FF6B00]/5',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
};

export function Button({ variant = 'secondary', size = 'md', loading, icon, children, className, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        variant === 'primary' && 'bg-[#FF6B00] hover:bg-[#FF8C00] active:bg-[#E55A00]',
        variant === 'secondary' && 'bg-[#1F1F1F]',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
