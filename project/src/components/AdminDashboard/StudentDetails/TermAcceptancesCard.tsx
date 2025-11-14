import React from 'react';
import { FileText, Download } from 'lucide-react';
import { TermAcceptance } from './types';

interface TermAcceptancesCardProps {
  termAcceptances: TermAcceptance[];
  loading: boolean;
  onDownloadPDF: (acceptance: TermAcceptance) => Promise<void>;
}

/**
 * TermAcceptancesCard - Displays accepted terms
 */
const TermAcceptancesCard: React.FC<TermAcceptancesCardProps> = React.memo(({
  termAcceptances,
  loading,
  onDownloadPDF,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (termAcceptances.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
        <FileText className="w-5 h-5 mr-2 text-[#05294E]" />
        Accepted Terms
      </h3>
      <div className="space-y-3">
        {termAcceptances.map((acceptance) => (
          <div key={acceptance.id} className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {acceptance.term_title || 'Term'}
                </p>
                <p className="text-xs text-slate-500">
                  Accepted {new Date(acceptance.accepted_at).toLocaleDateString()}
                </p>
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
        ))}
      </div>
    </div>
  );
});

TermAcceptancesCard.displayName = 'TermAcceptancesCard';

export default TermAcceptancesCard;

