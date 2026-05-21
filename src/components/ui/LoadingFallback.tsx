import { memo } from 'react';
import { BRANDING } from '../../constants/branding';

export const LoadingFallback = memo(() => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
    <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-8 shadow-command" style={{ border: '1px solid var(--border)' }}>
      <img src={BRANDING.LOGO_PATH} alt="ARSPL NIRMAN AI" className="arspl-logo w-52" />
      <div className="w-8 h-8 rounded-full border-2 border-[#C89B3C] border-t-[#005F56] animate-spin" />
      <p className="text-[#6C7568] text-sm">{BRANDING.LOADING_MESSAGE}</p>
    </div>
  </div>
));
