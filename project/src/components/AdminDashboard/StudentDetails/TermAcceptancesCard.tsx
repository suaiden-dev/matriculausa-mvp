import React from 'react';
import { FileText, Download } from 'lucide-react';
import { TermAcceptance } from './types';

interface TermAcceptancesCardProps {
  termAcceptances: TermAcceptance[];
  loading: boolean;
  onDownloadPDF: (acceptance: TermAcceptance) => Promise<void>;
}

/**
 * TermAcceptancesCard - Exibe termos aceitos pelo aluno.
 * Status de foto de identidade foi movido para o IdentityPhotoVerificationCard (lê de user_profiles).
 */
const TermAcceptancesCard: React.FC<TermAcceptancesCardProps> = React.memo(({
  termAcceptances,
  loading,
  onDownloadPDF,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const hasAcceptances = termAcceptances.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
        <FileText className="w-5 h-5 mr-2 text-[#05294E]" />
        Accepted Terms
      </h3>
      <div className="space-y-3">
        {hasAcceptances ? (
          termAcceptances.map((acceptance) => (
            <div key={acceptance.id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {acceptance.term_title || 'Term'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Accepted {new Date(acceptance.accepted_at).toLocaleDateString()}
                  </p>
                  {acceptance.identity_photo_status === 'approved' && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                      <svg className="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified Identity Attached
                    </span>
                  )}
                </div>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await onDownloadPDF(acceptance);
                    } catch (error) {
                      console.error('Error downloading PDF:', error);
                    }
                  }}
                  className="ml-3 p-2 text-slate-600 hover:text-[#05294E] hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  title="Download PDF"
                  type="button"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-500">No terms accepted yet</p>
          </div>
        )}
      </div>
    </div>
  );
});

TermAcceptancesCard.displayName = 'TermAcceptancesCard';

export default TermAcceptancesCard;
