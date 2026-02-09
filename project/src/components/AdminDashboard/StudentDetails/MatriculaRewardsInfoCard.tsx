import React from 'react';
import { Gift } from 'lucide-react';

interface MatriculaRewardsInfoCardProps {
  referrerInfo: {
    name: string | null;
    email: string | null;
    code: string;
    usedAt: string;
  } | null;
  loading: boolean;
}

/**
 * MatriculaRewardsInfoCard - Displays Matricula Rewards referral information
 * Shows which student referred the current student using a MATR code
 */
const MatriculaRewardsInfoCard: React.FC<MatriculaRewardsInfoCardProps> = React.memo(({
  referrerInfo,
  loading,
}) => {
  // Sempre renderizar o card se estiver carregando ou se houver dados
  // Se não houver dados e não estiver carregando, não renderizar
  if (!loading && !referrerInfo) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
        <Gift className="w-5 h-5 mr-2 text-purple-600" />
        Matricula Rewards
      </h3>
      <div className="space-y-3">
        {loading ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-48"></div>
          </div>
        ) : referrerInfo ? (
          <>
            <div>
              <dt className="text-sm font-medium text-slate-600 mb-2">Referral Code Used</dt>
              <dd className="text-base text-slate-900 font-mono bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                {referrerInfo.code}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600 mb-2">Referred By</dt>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-sm font-medium text-slate-700">
                    Student Referral
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  <div className="font-medium">{referrerInfo.name || 'Unknown'}</div>
                  <div className="text-slate-500">{referrerInfo.email || 'No email'}</div>
                </div>
                {referrerInfo.usedAt && (
                  <div className="mt-2 pt-2 border-t border-purple-200">
                    <div className="text-xs text-slate-500">
                      Code used on: {new Date(referrerInfo.usedAt).toLocaleDateString('pt-BR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
});

MatriculaRewardsInfoCard.displayName = 'MatriculaRewardsInfoCard';

export default MatriculaRewardsInfoCard;
