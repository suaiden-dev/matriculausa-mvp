import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UploaderInfo {
  by_type: 'admin' | 'student' | 'university';
  by_name: string;
}

/**
 * Returns a map of { file_url → UploaderInfo } built from student_action_logs.
 * Admin uploads are always logged with action_type = 'document_upload' and metadata.file_url.
 * Any URL NOT found in those logs was uploaded by the student.
 */
export function useDocumentUploaderMap(studentId: string | undefined) {
  const [map, setMap] = useState<Record<string, UploaderInfo>>({});

  useEffect(() => {
    if (!studentId) return;

    supabase
      .from('student_action_logs')
      .select('performed_by_type, performed_by_name, metadata')
      .eq('student_id', studentId)
      .eq('action_type', 'document_upload')
      .then(({ data }) => {
        if (!data) return;
        const result: Record<string, UploaderInfo> = {};
        for (const row of data) {
          const url = row.metadata?.file_url;
          if (url) {
            result[url] = {
              by_type: row.performed_by_type as UploaderInfo['by_type'],
              by_name: row.performed_by_name || row.performed_by_type,
            };
          }
        }
        setMap(result);
      });
  }, [studentId]);

  /**
   * Given a file URL, returns who uploaded it.
   * If found in admin logs → admin info.
   * Otherwise → student (no name available from this source alone).
   */
  function getUploader(fileUrl: string | undefined): UploaderInfo | null {
    if (!fileUrl) return null;
    return map[fileUrl] ?? { by_type: 'student', by_name: '' };
  }

  return { uploaderMap: map, getUploader };
}
