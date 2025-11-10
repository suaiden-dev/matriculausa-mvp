import { supabase } from '../../../../lib/supabase';

type AnyRecord = Record<string, any>;

/**
 * Verifica se está em desenvolvimento (localhost)
 */
function isDevelopment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' ||
         hostname.includes('localhost') ||
         hostname.includes('dev');
}

/**
 * Verifica se está em produção ou staging
 */
function shouldFilter(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  const href = window.location.href;
  
  // Verificações mais robustas
  const isProduction = hostname === 'matriculausa.com' || 
                       hostname.includes('matriculausa.com') ||
                       href.includes('matriculausa.com');
  
  const isStaging = hostname === 'staging-matriculausa.netlify.app' || 
                    hostname.includes('staging-matriculausa.netlify.app') ||
                    hostname.includes('staging-matriculausa') ||
                    href.includes('staging-matriculausa.netlify.app') ||
                    href.includes('staging-matriculausa');
  
  return isProduction || isStaging;
}

/**
 * Verifica se deve excluir estudante com email @uorak.com
 */
function shouldExcludeStudent(email: string | null | undefined): boolean {
  if (!shouldFilter()) return false; // Em localhost, não excluir
  if (!email) return false; // Se não tem email, não excluir
  return email.toLowerCase().includes('@uorak.com');
}

export interface FetchPaymentsParams extends AnyRecord {
	universityId?: string;
	page?: number;
	pageSize?: number;
	filters?: AnyRecord;
	signal?: AbortSignal;
}

// Utilitário para aplicar abort signal, mantendo compatibilidade com versões do supabase-js
function withAbortSignal<T extends { abortSignal?: (signal: AbortSignal) => any }>(
    qb: T,
    signal?: AbortSignal
) {
    if (signal && typeof (qb as any).abortSignal === 'function') {
        (qb as any).abortSignal(signal);
    }
    return qb;
}

export async function fetchPayments(params: FetchPaymentsParams) {
    const { universityId, page = 1, pageSize = 25, filters = {}, signal } = params;

    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Consulta única com joins para evitar N+1
        // Traz aplicações, usuário e bolsa + universidade
        let baseQuery = supabase
            .from('scholarship_applications')
            .select(
                `
                id,
                student_id,
                status,
                applied_at,
                payment_status,
                is_application_fee_paid,
                is_scholarship_fee_paid,
                scholarship_id,
                user_profiles:id(user_id, full_name, email, phone, country, dependents, system_type),
                scholarships:id(id, title, amount, application_fee_amount, scholarship_type, field_of_study, level, university_id, universities(name))
                `,
                { count: 'exact' }
            )
            ;
        if (universityId) {
            baseQuery = baseQuery.eq('scholarships.university_id', universityId);
        }

        // Filtros
        if (filters.application_status && filters.application_status !== 'all') {
            baseQuery = baseQuery.eq('status', filters.application_status);
        }
        const paymentType = filters.payment_type;
        const statusFilter = filters.status;
        if (paymentType && paymentType !== 'all') {
            if (paymentType === 'application_fee') {
                if (statusFilter === 'paid') baseQuery = baseQuery.eq('is_application_fee_paid', true);
                if (statusFilter === 'pending') baseQuery = baseQuery.eq('is_application_fee_paid', false);
                if (statusFilter === 'failed') baseQuery = baseQuery.eq('payment_status', 'failed');
            } else if (paymentType === 'scholarship_fee') {
                if (statusFilter === 'paid') baseQuery = baseQuery.eq('is_scholarship_fee_paid', true);
                if (statusFilter === 'pending') baseQuery = baseQuery.eq('is_scholarship_fee_paid', false);
                if (statusFilter === 'failed') baseQuery = baseQuery.eq('payment_status', 'failed');
            }
        } else if (statusFilter && statusFilter !== 'all') {
            // Sem tipo específico, assumimos application_fee para manter compatibilidade visual
            if (statusFilter === 'paid') baseQuery = baseQuery.eq('is_application_fee_paid', true);
            if (statusFilter === 'pending') baseQuery = baseQuery.eq('is_application_fee_paid', false);
            if (statusFilter === 'failed') baseQuery = baseQuery.eq('payment_status', 'failed');
        }
        if (filters.date_from) {
            baseQuery = baseQuery.gte('applied_at', filters.date_from);
        }
        if (filters.date_to) {
            baseQuery = baseQuery.lte('applied_at', filters.date_to);
        }
        if (filters.search_query && String(filters.search_query).trim() !== '') {
            // Busca simples por nome/email do estudante ou título da bolsa - feito após carregar
        }

        baseQuery = baseQuery.order('applied_at', { ascending: false }).range(from, to);

        const { data, count, error } = await withAbortSignal(baseQuery as any, signal);
        if (error) return { data: [], count: 0, error };

        // Transformação leve para shape do front existente
        const records = (data || []).map((row: any) => {
            const user = row.user_profiles as any;
            const sch = row.scholarships as any;
            return {
                id: row.id,
                student_id: row.student_id,
                student_name: user?.full_name || 'Unknown',
                student_email: user?.email || 'Unknown',
                student_country: user?.country || 'Unknown',
                student_phone: user?.phone || 'Unknown',
                university_id: sch?.university_id,
                university_name: sch?.universities?.name || 'Unknown',
                application_id: row.id,
                application_status: row.status,
                applied_at: row.applied_at,
                scholarship_id: sch?.id,
                scholarship_title: sch?.title || 'Unknown',
                scholarship_amount: Number(sch?.amount) || 0,
                scholarship_type: sch?.scholarship_type || 'Not specified',
                scholarship_field: sch?.field_of_study || 'Not specified',
                scholarship_level: sch?.level || 'Not specified',
                payment_type: 'application_fee',
                amount_charged: Number(sch?.application_fee_amount) || 0,
                currency: 'USD',
                status: row.is_application_fee_paid ? 'succeeded' : 'pending',
                created_at: row.applied_at,
                is_application_fee_paid: !!row.is_application_fee_paid,
                is_scholarship_fee_paid: !!row.is_scholarship_fee_paid,
                application_fee_amount: Number(sch?.application_fee_amount) || 0,
            };
        });

        // Filtrar estudantes com email @uorak.com (exceto em localhost)
        const recordsFiltered = shouldFilter()
          ? records.filter((p: any) => {
              const email = p.student_email?.toLowerCase() || '';
              return !shouldExcludeStudent(email);
            })
          : records;

        // Filtro de busca em memória (até migrar para FTS)
        const search = (filters.search_query || '').toString().toLowerCase().trim();
        const filtered = search
            ? recordsFiltered.filter((p: any) =>
                  (p.student_name || '').toLowerCase().includes(search) ||
                  (p.student_email || '').toLowerCase().includes(search) ||
                  (p.scholarship_title || '').toLowerCase().includes(search)
              )
            : recordsFiltered;

        // Se houve busca ou filtro de ambiente, o count deve refletir o total filtrado para a UI
        const effectiveCount = (search || shouldFilter()) ? filtered.length : (count ?? filtered.length);
        return { data: filtered, count: effectiveCount, error: null };
    } catch (error: any) {
        return { data: [], count: 0, error };
    }
}

export async function fetchStats(params: { universityId?: string }) {
	const { universityId } = params;
	if (!universityId) return { data: null, error: null };
	try {
		// Placeholder; will mirror existing stats computation
		return { data: null, error: null };
	} catch (error: any) {
		return { data: null, error };
	}
}

export function createAbortController() {
	return new AbortController();
}

// Debounce leve para buscas/inputs
export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  let timer: number | undefined;
  return (...args: Parameters<T>) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}


