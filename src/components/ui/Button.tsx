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
  primary: 'text-[#12332D] font-semibold shadow-enterprise',
  secondary: 'text-white font-medium border border-[#CDBD82]/40 hover:border-[#D8B15A]/70 hover:bg-[#005F56]',
  ghost: 'text-[#6C7568] hover:text-[#005F56] hover:bg-[#005F56]/5',
  danger: 'text-red-400 border border-red-400/20 hover:bg-red-400/10',
  outline: 'text-[#005F56] border border-[#CDBD82] hover:border-[#005F56]/50 hover:bg-[#005F56]/5',
  default: 'text-[#005F56] border border-[#CDBD82] hover:border-[#005F56]/50 hover:bg-[#005F56]/5',
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
        variant === 'primary' && 'bg-[#C89B3C] hover:bg-[#D8B15A] active:bg-[#B88F18]',
        variant === 'secondary' && 'bg-[#005F56] hover:text-white',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
