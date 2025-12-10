import type { AdminPaymentsFilters, PaymentRecord } from '../data/types';

export async function exportPaymentsToCsvViaEdge(filters: AdminPaymentsFilters) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-payments-csv`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  // Mapear filtros locais para o payload esperado pela Edge Function
  const payload = {
    status: filters.status,
    fee_type: filters.feeType,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    university_id: filters.university && filters.university !== 'all' ? filters.university : undefined,
    search_query: (filters.search || '').trim() || undefined,
    affiliate_id: filters.affiliate && filters.affiliate !== 'all' ? filters.affiliate : undefined,
  } as Record<string, any>;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Export failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const blob = await res.blob();
  const filename = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

// Fallback: geração client-side (usado apenas se a Edge Function falhar)
export function downloadCsvFromPayments(sortedPayments: PaymentRecord[]) {
  const csvContent = [
    ['Student Name', 'Email', 'University', 'Scholarship', 'Field of Study', 'Fee Type', 'Amount', 'Status', 'Payment Method', 'Payment Date'].join(','),
    ...sortedPayments.map(payment => [
      payment.student_name,
      payment.student_email,
      payment.university_name,
      payment.scholarship_title || '',
      payment.field_of_study || '',
      payment.fee_type,
      String(payment.amount),
      payment.status,
      payment.payment_method || 'stripe',
      payment.payment_date || ''
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}


