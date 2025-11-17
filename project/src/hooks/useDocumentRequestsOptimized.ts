import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface StudentRecord {
  user_id: string;
  all_applications?: any[];
}

/**
 * Hook otimizado para carregar document requests
 * - Usa campos específicos em vez de select('*')
 * - Consolida queries quando possível
 * - Implementa debounce para evitar múltiplas chamadas
 * - Cache básico para evitar refetch desnecessário
 */
export const useDocumentRequestsOptimized = (
  student: StudentRecord | null,
  activeTab?: string
) => {
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<string>('');
  const cacheRef = useRef<{ data: any[]; timestamp: number } | null>(null);
  const CACHE_DURATION = 5000; // 5 segundos de cache

  // Debounce helper
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  // Função otimizada para carregar document requests
  const loadDocumentRequests = useCallback(async (force = false) => {
    if (!student?.all_applications || student.all_applications.length === 0) {
      setDocumentRequests([]);
      return;
    }

    // Verificar cache
    if (!force && cacheRef.current) {
      const now = Date.now();
      if (now - cacheRef.current.timestamp < CACHE_DURATION) {
        setDocumentRequests(cacheRef.current.data);
        return;
      }
    }

    // Criar chave única para esta busca
    const applicationIds = student.all_applications.map((app: any) => app.id).filter(Boolean);
    const universityIds = (student.all_applications || [])
      .map((app: any) => app.scholarships?.university_id || app.university_id)
      .filter(Boolean);
    const uniqueUniversityIds = [...new Set(universityIds)];
    const cacheKey = `${applicationIds.join(',')}-${uniqueUniversityIds.join(',')}`;

    // Evitar múltiplas chamadas simultâneas
    if (lastFetchRef.current === cacheKey && !force) {
      return;
    }
    lastFetchRef.current = cacheKey;

    setLoading(true);
    try {
      // ✅ OTIMIZAÇÃO 1: Selecionar apenas campos necessários
      const fields = [
        'id',
        'title',
        'description',
        'due_date',
        'is_global',
        'university_id',
        'scholarship_application_id',
        'created_at',
        'updated_at',
        'template_url',
        'attachment_url'
      ].join(',');

      const promises: Promise<any>[] = [];

      // ✅ OTIMIZAÇÃO 2: Executar queries em paralelo
      if (applicationIds.length > 0) {
        promises.push(
          supabase
            .from('document_requests')
            .select(fields)
            .in('scholarship_application_id', applicationIds)
            .order('created_at', { ascending: false })
        );
      }

      if (uniqueUniversityIds.length > 0) {
        promises.push(
          supabase
            .from('document_requests')
            .select(fields)
            .eq('is_global', true)
            .in('university_id', uniqueUniversityIds)
            .order('created_at', { ascending: false })
        );
      }

      // Executar todas as queries em paralelo
      const results = await Promise.all(promises);
      
      // Combinar resultados
      let allRequests: any[] = [];
      for (const result of results) {
        if (result.data && !result.error) {
          allRequests = [...allRequests, ...result.data];
        } else if (result.error) {
          console.error('Error fetching document requests:', result.error);
        }
      }

      // Remover duplicatas (caso algum request apareça em ambas as queries)
      const uniqueRequests = Array.from(
        new Map(allRequests.map(req => [req.id, req])).values()
      );

      // Atualizar cache
      cacheRef.current = {
        data: uniqueRequests,
        timestamp: Date.now()
      };

      setDocumentRequests(uniqueRequests);
    } catch (error) {
      console.error('Error loading document requests:', error);
      setDocumentRequests([]);
    } finally {
      setLoading(false);
    }
  }, [student?.all_applications]);

  // Versão com debounce para evitar múltiplas chamadas
  const debouncedLoad = useRef(
    debounce((force: boolean) => {
      loadDocumentRequests(force);
    }, 300)
  ).current;

  // Carregar quando student ou activeTab mudar (apenas se for aba documents)
  useEffect(() => {
    if (activeTab === 'documents' && student) {
      debouncedLoad(false);
    } else if (!activeTab || activeTab === 'overview') {
      // Limpar quando sair da aba documents
      setDocumentRequests([]);
    }
  }, [student?.all_applications, activeTab, debouncedLoad]);

  // Função para forçar reload (usar após criar/atualizar/deletar)
  const reload = useCallback(() => {
    cacheRef.current = null;
    loadDocumentRequests(true);
  }, [loadDocumentRequests]);

  return {
    documentRequests,
    loading,
    reload
  };
};




