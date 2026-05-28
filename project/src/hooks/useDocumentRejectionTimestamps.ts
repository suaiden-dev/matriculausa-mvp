import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface RejectionLogEntry {
  created_at: string;
  rejection_reason: string | null;
}

// Map: docType → array sorted ASC by created_at
export type RejectionLogsMap = Record<string, RejectionLogEntry[]>;

export function useDocumentRejectionTimestamps(studentId: string | undefined) {
  const [logsMap, setLogsMap] = useState<RejectionLogsMap>({});

  useEffect(() => {
    if (!studentId) return;
    supabase
      .from('student_action_logs')
      .select('metadata, created_at')
      .eq('student_id', studentId)
      .eq('action_type', 'document_rejection')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const result: RejectionLogsMap = {};
        for (const row of data) {
          const docType = row.metadata?.document_type;
          if (!docType) continue;
          if (!result[docType]) result[docType] = [];
          result[docType].push({
            created_at: row.created_at,
            rejection_reason: row.metadata?.rejection_reason || null,
          });
        }
        setLogsMap(result);
      });
  }, [studentId]);

  /**
   * Returns the last rejection log for a doc type that falls within
   * [uploadedAt, nextUploadAt). "Last" = final decision before resubmit.
   *
   * If uploadedAt is unknown, considers any log before nextUploadAt.
   * If nextUploadAt is unknown, considers any log after uploadedAt.
   */
  function getRejectionForEntry(
    docType: string,
    uploadedAt: string | undefined,
    nextUploadAt: string | undefined
  ): RejectionLogEntry | null {
    const logs = logsMap[docType];
    if (!logs || logs.length === 0) return null;

    const candidates = logs.filter(log => {
      if (uploadedAt && log.created_at <= uploadedAt) return false;
      if (nextUploadAt && log.created_at >= nextUploadAt) return false;
      return true;
    });

    if (candidates.length === 0) return null;
    return candidates[0];
  }

  return { getRejectionForEntry };
}
