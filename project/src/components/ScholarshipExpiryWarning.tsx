import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock } from 'lucide-react';
import { is3800Scholarship, is3800ScholarshipExpired } from '../utils/scholarshipDeadlineValidation';
import type { Scholarship } from '../types';

interface ScholarshipExpiryWarningProps {
  scholarship: Scholarship;
  variant?: 'banner' | 'badge' | 'inline';
  className?: string;
}

/**
 * Componente para exibir avisos de expiração de deadline para bolsas de $3800
 */
export const ScholarshipExpiryWarning: React.FC<ScholarshipExpiryWarningProps> = ({
  scholarship,
  variant = 'banner',
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || 'pt';

  // Verificar se é bolsa de $3800
  if (!is3800Scholarship(scholarship)) {
    return null;
  }

  const isExpired = is3800ScholarshipExpired(scholarship);

  if (variant === 'badge') {
    // Badge compacto para cards
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
          isExpired
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-orange-100 text-orange-700 border border-orange-200'
        } ${className}`}
      >
        {isExpired ? (
          <>
            <AlertTriangle className="h-4 w-4" />
            <span>{t('scholarshipDeadline.3800Expired')}</span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" />
            <span>{t('scholarshipDeadline.3800ExpiringShort')}</span>
          </>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    // Texto inline simples
    return (
      <span
        className={`text-xs font-medium ${
          isExpired ? 'text-red-600' : 'text-orange-600'
        } ${className}`}
      >
        {isExpired
          ? t('scholarshipDeadline.3800Expired')
          : t('scholarshipDeadline.3800ExpiringShort')}
      </span>
    );
  }

  // Banner padrão (variant === 'banner')
  return (
    <div
      className={`w-full rounded-lg p-3 border ${
        isExpired
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-orange-50 border-orange-200 text-orange-800'
      } ${className}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {isExpired ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            {isExpired
              ? t('scholarshipDeadline.3800Expired')
              : t('scholarshipDeadline.3800Expiring')}
          </p>
        </div>
      </div>
    </div>
  );
};

