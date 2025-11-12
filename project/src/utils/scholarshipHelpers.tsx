import React from 'react';
import { 
  GraduationCap, 
  Users, 
  Award, 
  Monitor, 
  Building, 
  Globe, 
  MapPin 
} from 'lucide-react';
import { convertCentsToDollars } from './currency';

/**
 * Formata um valor monetário para exibição
 */
export const formatAmount = (amount: any): string => {
  if (typeof amount === 'string') return amount;
  if (typeof amount === 'number') return amount.toLocaleString('en-US');
  return String(amount || 'N/A');
};

/**
 * Retorna a cor do badge baseada no field of study
 */
export const getFieldBadgeColor = (field: string | undefined): string => {
  switch (field?.toLowerCase()) {
    case 'stem':
      return 'bg-gradient-to-r from-blue-600 to-indigo-600';
    case 'business':
      return 'bg-gradient-to-r from-green-600 to-emerald-600';
    case 'engineering':
      return 'bg-gradient-to-r from-purple-600 to-violet-600';
    case 'arts':
      return 'bg-gradient-to-r from-pink-600 to-rose-600';
    case 'medicine':
      return 'bg-gradient-to-r from-red-600 to-pink-600';
    case 'law':
      return 'bg-gradient-to-r from-amber-600 to-orange-600';
    default:
      return 'bg-gradient-to-r from-slate-600 to-slate-700';
  }
};

/**
 * Retorna o ícone baseado no level da bolsa
 */
export const getLevelIcon = (level: string): React.ReactElement => {
  switch (level?.toLowerCase()) {
    case 'undergraduate':
      return <GraduationCap className="h-4 w-4" />;
    case 'graduate':
      return <Users className="h-4 w-4" />;
    case 'doctorate':
      return <Award className="h-4 w-4" />;
    default:
      return <GraduationCap className="h-4 w-4" />;
  }
};

/**
 * Retorna o ícone baseado no delivery mode
 */
export const getDeliveryModeIcon = (mode: string): React.ReactElement => {
  switch (mode?.toLowerCase()) {
    case 'online':
      return <Monitor className="h-3 w-3" />;
    case 'in_person':
      return <Building className="h-3 w-3" />;
    case 'hybrid':
      return <Globe className="h-3 w-3" />;
    default:
      return <MapPin className="h-3 w-3" />;
  }
};

/**
 * Retorna a cor do badge baseada no delivery mode
 */
export const getDeliveryModeColor = (mode: string): string => {
  switch (mode?.toLowerCase()) {
    case 'online':
      return 'bg-blue-100 text-blue-700';
    case 'in_person':
      return 'bg-green-100 text-green-700';
    case 'hybrid':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

/**
 * Retorna o label do delivery mode (sem tradução - deve ser usado com useTranslation no componente)
 */
export const getDeliveryModeLabel = (mode: string, t?: (key: string) => string): string => {
  if (t) {
    switch (mode?.toLowerCase()) {
      case 'online':
        return t('studentDashboard.findScholarships.filters.online');
      case 'in_person':
        return t('studentDashboard.findScholarships.scholarshipCard.inPerson');
      case 'hybrid':
        return t('studentDashboard.findScholarships.filters.hybrid');
      default:
        return t('studentDashboard.findScholarships.scholarshipCard.mixed');
    }
  }
  
  // Fallback sem tradução
  switch (mode?.toLowerCase()) {
    case 'online':
      return 'Online';
    case 'in_person':
      return 'In Person';
    case 'hybrid':
      return 'Hybrid';
    default:
      return 'Mixed';
  }
};

/**
 * Calcula os dias até o deadline
 */
export const getDaysUntilDeadline = (deadline: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [year, month, day] = deadline.split('-').map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  deadlineDate.setHours(23, 59, 59, 999);
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Retorna os dias até o deadline para exibição (nunca negativo)
 */
export const getDaysUntilDeadlineDisplay = (deadline: string): number => {
  const days = getDaysUntilDeadline(deadline);
  return Math.max(days, 0);
};

/**
 * Retorna o status e cor do deadline
 */
export const getDeadlineStatus = (deadline: string): { 
  status: 'expired' | 'urgent' | 'warning' | 'normal'; 
  color: string; 
  bg: string 
} => {
  const days = getDaysUntilDeadline(deadline);
  if (days < 0) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-50' };
  if (days <= 7) return { status: 'urgent', color: 'text-orange-600', bg: 'bg-orange-50' };
  if (days <= 30) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
  return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50' };
};

/**
 * Calcula a application fee considerando dependentes (legacy)
 */
export const getApplicationFeeWithDependents = (
  baseInCents: number,
  systemType: string = 'legacy',
  dependents: number = 0
): number => {
  const baseInDollars = convertCentsToDollars(baseInCents);
  return systemType === 'legacy' && dependents > 0 ? baseInDollars + dependents * 100 : baseInDollars;
};

