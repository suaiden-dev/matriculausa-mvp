import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface StudentActionLog {
  id: string;
  student_id: string;
  action_type: string;
  action_description: string;
  performed_by: string;
  performed_by_type: 'student' | 'admin' | 'university';
  performed_by_name: string | null;
  performed_by_email: string | null;
  metadata: any;
  created_at: string;
}

export interface LogFilters {
  action_type?: string;
  performed_by_type?: string;
  date_from?: string;
  date_to?: string;
}

export const useStudentLogs = (studentId: string) => {
  const [logs, setLogs] = useState<StudentActionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  });

  const fetchLogs = async (page = 1, reset = false) => {
    if (!studentId) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('student_action_logs')
        .select('*', { count: 'exact' })
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }
      if (filters.performed_by_type) {
        query = query.eq('performed_by_type', filters.performed_by_type);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply pagination
      const from = (page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const newLogs = data || [];
      const total = count || 0;

      setLogs(prev => reset ? newLogs : [...prev, ...newLogs]);
      setPagination(prev => ({
        ...prev,
        page,
        total,
        hasMore: (page * prev.limit) < total
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const logAction = async (
    actionType: string,
    actionDescription: string,
    performedBy: string,
    performedByType: 'student' | 'admin' | 'university',
    metadata?: any
  ) => {
    try {
      const { data, error } = await supabase.rpc('log_student_action', {
        p_student_id: studentId,
        p_action_type: actionType,
        p_action_description: actionDescription,
        p_performed_by: performedBy,
        p_performed_by_type: performedByType,
        p_metadata: metadata || null
      });

      if (error) throw error;

      // Refresh logs after logging new action
      await fetchLogs(1, true);
      
      return data;
    } catch (err) {
      console.error('Failed to log action:', err);
      throw err;
    }
  };

  const refreshLogs = () => {
    fetchLogs(1, true);
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchLogs(pagination.page + 1, false);
    }
  };

  const updateFilters = (newFilters: Partial<LogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  useEffect(() => {
    fetchLogs(1, true);
  }, [studentId, filters]);

  return {
    logs,
    loading,
    error,
    filters,
    pagination,
    fetchLogs,
    logAction,
    refreshLogs,
    loadMore,
    updateFilters,
    clearFilters
  };
};

