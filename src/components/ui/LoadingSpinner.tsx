import { memo } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner = memo(({
  size = 'md',
  className = ''
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div
      className={`rounded-full border-2 border-[#FF6B00] border-t-transparent animate-spin ${sizeClasses[size]} ${className}`}
    />
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const LoadingButton = memo(({
  loading,
  children,
  loadingText = 'Loading...',
  disabled,
  onClick,
  className = '',
  variant = 'primary'
}: LoadingButtonProps) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = {
    primary: 'bg-[#FF6B00] hover:bg-[#E55A00] text-white',
    secondary: 'bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading && <LoadingSpinner size="sm" />}
      {loading ? loadingText : children}
    </button>
  );
});

LoadingButton.displayName = 'LoadingButton';