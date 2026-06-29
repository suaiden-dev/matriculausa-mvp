import {
  Clock,
  CheckCircle2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
} from 'lucide-react';

export function formatActivityDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function getPayoutStatusConfig(status: string) {
  switch (status) {
    case 'pending':
      return { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', bgColor: 'bg-yellow-50' };
    case 'approved':
      return { icon: CheckCircle2, color: 'bg-blue-100 text-blue-800 border-blue-200', bgColor: 'bg-blue-50' };
    case 'paid':
      return { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', bgColor: 'bg-green-50' };
    case 'rejected':
      return { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', bgColor: 'bg-red-50' };
    case 'cancelled':
      return { icon: XCircle, color: 'bg-gray-100 text-gray-800 border-gray-200', bgColor: 'bg-gray-50' };
    default:
      return { icon: AlertTriangle, color: 'bg-gray-100 text-gray-800 border-gray-200', bgColor: 'bg-gray-50' };
  }
}

export function getPayoutMethodConfig(method: string) {
  switch (method) {
    case 'zelle':
      return { icon: CreditCard, color: 'text-purple-600', bgColor: 'bg-purple-100' };
    case 'bank_transfer':
      return { icon: Banknote, color: 'text-blue-600', bgColor: 'bg-blue-100' };
    case 'stripe':
      return { icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-100' };
    default:
      return { icon: CreditCard, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
}

export function getRangeStart(range: string): Date {
  const now = new Date();
  if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (range === '90d') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (range === '1y') return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

export function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header]}"`).join(',')),
  ];
  return csvRows.join('\n');
}

const isProductionHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'matriculausa.com' || window.location.hostname === 'www.matriculausa.com');

export function filterUorak<T extends { email?: string; userEmail?: string; referrerEmail?: string }>(arr: T[]): T[] {
  if (!isProductionHost) return arr;
  return arr.filter(item => {
    const email = (item.email || item.userEmail || '').toLowerCase();
    const refEmail = (item.referrerEmail || '').toLowerCase();
    return !email.includes('uorak') && !refEmail.includes('uorak');
  });
}
