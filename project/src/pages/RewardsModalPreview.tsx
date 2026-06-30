import React, { useState } from 'react';
import MatriculaRewardsInvitePopup from '../components/MatriculaRewardsInvitePopup';

const RewardsModalPreview: React.FC = () => {
  const [variant, setVariant] = useState<'onboarding' | 'dashboard'>('onboarding');
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-6">
      <div className="flex gap-3">
        <button
          onClick={() => { setVariant('onboarding'); setOpen(true); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${variant === 'onboarding' ? 'bg-[#05294E] text-white border-[#05294E]' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
        >
          Variant: Onboarding
        </button>
        <button
          onClick={() => { setVariant('dashboard'); setOpen(true); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${variant === 'dashboard' ? 'bg-[#05294E] text-white border-[#05294E]' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
        >
          Variant: Dashboard
        </button>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-400 text-[#05294E] hover:bg-amber-500 transition-colors"
          >
            Reabrir modal
          </button>
        )}
      </div>

      <MatriculaRewardsInvitePopup
        isOpen={open}
        onClose={() => setOpen(false)}
        onAccept={() => setOpen(false)}
        variant={variant}
      />
    </div>
  );
};

export default RewardsModalPreview;
