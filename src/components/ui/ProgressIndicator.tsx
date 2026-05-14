import { memo, useEffect, useState } from 'react';

interface ProgressIndicatorProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
  color?: string;
  animated?: boolean;
}

export const ProgressIndicator = memo(({
  progress,
  label,
  showPercentage = true,
  className = '',
  color = '#FF6B00',
  animated = true
}: ProgressIndicatorProps) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-white text-sm">{label}</span>}
          {showPercentage && (
            <span className="text-[#606060] text-sm">{Math.round(displayProgress)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${animated ? 'animate-pulse' : ''}`}
          style={{
            width: `${displayProgress}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
});

ProgressIndicator.displayName = 'ProgressIndicator';

interface StepProgressProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export const StepProgress = memo(({
  steps,
  currentStep,
  className = ''
}: StepProgressProps) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index <= currentStep
                    ? 'bg-[#FF6B00] text-white'
                    : 'bg-[#2A2A2A] text-[#606060]'
                }`}
              >
                {index + 1}
              </div>
              <span className={`text-xs mt-1 text-center ${
                index <= currentStep ? 'text-white' : 'text-[#606060]'
              }`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 transition-colors ${
                  index < currentStep ? 'bg-[#FF6B00]' : 'bg-[#2A2A2A]'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

StepProgress.displayName = 'StepProgress';