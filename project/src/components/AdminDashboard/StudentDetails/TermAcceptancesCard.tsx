import React from 'react';
import { FileText, Download, Camera, Clock, CheckCircle, XCircle } from 'lucide-react';
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
        {termAcceptances.map((acceptance) => {
          const hasIdentityPhoto = acceptance.identity_photo_path && acceptance.identity_photo_path.trim() !== '';
          const photoStatus = acceptance.identity_photo_status;
          
          const getPhotoStatusBadge = () => {
            if (!hasIdentityPhoto) return null;
            
            switch (photoStatus) {
              case 'pending':
                return (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ml-2">
                    <Clock className="w-3 h-3 mr-1" />
                    Photo Pending
                  </span>
                );
              case 'approved':
                return (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Photo Approved
                  </span>
                );
              case 'rejected':
                return (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">
                    <XCircle className="w-3 h-3 mr-1" />
                    Photo Rejected
                  </span>
                );
              default:
                return null;
            }
          };

          return (
            <div key={acceptance.id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {acceptance.term_title || 'Term'}
                    </p>
                    {hasIdentityPhoto && (
                      <span className="inline-flex items-center ml-2 text-slate-500" title="Has identity photo">
                        <Camera className="w-3 h-3" />
                      </span>
                    )}
                    {getPhotoStatusBadge()}
                  </div>
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
          );
        })}
      </div>
    </div>
  );
});

TermAcceptancesCard.displayName = 'TermAcceptancesCard';

export default TermAcceptancesCard;

