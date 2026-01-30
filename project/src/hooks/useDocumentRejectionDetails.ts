import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface DocumentRejectionDetails {
  passport?: string;
  diploma?: string;
  funds_proof?: string;
}

interface RejectionLog {
  id: string;
  action_type: string;
  action_description: string;
  metadata: {
    errors?: DocumentRejectionDetails;
    document_types?: string[];
    rejection_reason?: string;
    process_type?: string;
  };
  created_at: string;
  performed_by_name?: string;
  performed_by_email?: string;
}

interface UseDocumentRejectionDetailsResult {
  rejectionDetails: DocumentRejectionDetails | null;
  rejectionLog: RejectionLog | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch AI document rejection details from student action logs
 * @param studentId - The student's profile ID (user_profiles.id)
 * @param documentsStatus - Current documents status to determine if we should fetch
 */
export function useDocumentRejectionDetails(
  studentId: string | undefined
): UseDocumentRejectionDetailsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['documentRejectionDetails', studentId],
    queryFn: async () => {
      if (!studentId) {
        return null;
      }

      // Fetch the most recent document_rejection log for this student
      const { data: logs, error: logsError } = await supabase
        .from('student_action_logs')
        .select('*')
        .eq('student_id', studentId)
        .eq('action_type', 'document_rejection')
        .order('created_at', { ascending: false })
        .limit(1);

      if (logsError) {
        console.error('Error fetching document rejection logs:', logsError);
        throw logsError;
      }

      if (!logs || logs.length === 0) {
        console.log('No document rejection logs found for student:', studentId);
        return null;
      }

      const log = logs[0] as RejectionLog;
      
      // Extract rejection details from metadata
      const rejectionDetails: DocumentRejectionDetails = {
        passport: log.metadata?.errors?.passport || undefined,
        diploma: log.metadata?.errors?.diploma || undefined,
        funds_proof: log.metadata?.errors?.funds_proof || undefined,
      };

      console.log('Document rejection details fetched:', {
        studentId,
        logId: log.id,
        createdAt: log.created_at,
        rejectionDetails,
      });

      return {
        rejectionDetails,
        rejectionLog: log,
      };
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  return {
    rejectionDetails: data?.rejectionDetails || null,
    rejectionLog: data?.rejectionLog || null,
    isLoading,
    error: error as Error | null,
  };
}
