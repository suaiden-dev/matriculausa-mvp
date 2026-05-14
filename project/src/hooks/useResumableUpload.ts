import { useState, useRef, useEffect } from 'react';
import * as tus from 'tus-js-client';
import { supabase } from '../lib/supabaseClient';

export function useResumableUpload() {
  const [progress, setProgress]       = useState<Record<string, number>>({});
  const [uploading, setUploading]     = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<Record<string, string | null>>({});

  const uploadsRef    = useRef<Record<string, tus.Upload>>({});
  const activeKeysRef = useRef<Set<string>>(new Set());

  // Sincroniza activeKeysRef com o state (sem causar re-render extra)
  useEffect(() => {
    activeKeysRef.current = new Set(
      Object.entries(uploading)
        .filter(([, v]) => v)
        .map(([k]) => k)
    );
  }, [uploading]);

  // beforeunload — avisa o aluno se tentar fechar enquanto há upload ativo
  useEffect(() => {
    const anyUploading = Object.values(uploading).some(Boolean);
    if (!anyUploading) return;
    const warnFn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warnFn);
    return () => window.removeEventListener('beforeunload', warnFn);
  }, [uploading]);

  // visibilitychange — retoma uploads ao voltar para a aba/app no mobile
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      for (const key of activeKeysRef.current) {
        uploadsRef.current[key]?.start();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []); // mount/unmount only — usa ref para estado atual

  const startUpload = (key: string, file: File, filePath: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      setUploading(prev => ({ ...prev, [key]: true }));
      setProgress(prev => ({ ...prev, [key]: 0 }));
      setUploadError(prev => ({ ...prev, [key]: null }));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

      const upload = new tus.Upload(file, {
        endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        chunkSize: 6 * 1024 * 1024, // 6 MB — mínimo Supabase
        removeFingerprintOnSuccess: true,
        headers: {
          'x-upsert': 'true',
        },
        metadata: {
          bucketName: 'document-attachments',
          objectName: filePath,
          contentType: file.type || 'application/pdf',
          cacheControl: '3600',
        },
        // Token fresco em cada chunk — cobre uploads longos onde o token expira
        onBeforeRequest: async (req) => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            req.setHeader('Authorization', `Bearer ${session.access_token}`);
          }
        },
        onProgress(bytesUploaded, bytesTotal) {
          const pct = bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
          setProgress(prev => ({ ...prev, [key]: pct }));
        },
        onSuccess() {
          setUploading(prev => ({ ...prev, [key]: false }));
          setProgress(prev => ({ ...prev, [key]: 100 }));
          delete uploadsRef.current[key];
          resolve(filePath);
        },
        onError(err) {
          setUploading(prev => ({ ...prev, [key]: false }));
          setUploadError(prev => ({ ...prev, [key]: err.message }));
          delete uploadsRef.current[key];
          reject(err);
        },
      });

      // Fingerprint em localStorage → retoma automaticamente se houver upload anterior
      const previous = await upload.findPreviousUploads();
      if (previous.length) {
        upload.resumeFromPreviousUpload(previous[0]);
      }
      upload.start();
      uploadsRef.current[key] = upload;
    });
  };

  const abortUpload = (key: string) => {
    uploadsRef.current[key]?.abort();
    setUploading(prev => ({ ...prev, [key]: false }));
    delete uploadsRef.current[key];
  };

  return { progress, uploading, uploadError, startUpload, abortUpload };
}
