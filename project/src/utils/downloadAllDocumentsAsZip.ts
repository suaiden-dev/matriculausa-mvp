import JSZip from 'jszip';
import { supabase } from '../lib/supabase';

interface DocumentEntry {
  folder: string;
  filename: string;
  fileUrl: string;
  bucketHint?: string;
}

function resolveSignedUrl(fileUrl: string, bucketHint?: string): { bucket: string; path: string } | null {
  let bucket = bucketHint || 'student-documents';
  let path = fileUrl;

  // All full HTTP URLs (public buckets, already-signed, external) can be fetched directly.
  // Only relative paths (private bucket objects) need a signed URL.
  if (fileUrl.startsWith('http')) {
    return null;
  }

  if (path.includes('transfer-forms') || path.startsWith('uploads/')) {
    bucket = 'document-attachments';
  }

  return { bucket, path };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

function getExtensionFromUrl(url: string): string {
  try {
    // Handle both full URLs and relative paths
    const pathname = url.startsWith('http') ? new URL(url).pathname : url;
    const ext = pathname.split('.').pop()?.toLowerCase();
    if (ext && ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx'].includes(ext)) {
      return `.${ext}`;
    }
  } catch { /* ignore */ }
  return '.pdf';
}

async function fetchFileBlob(fileUrl: string, bucketHint?: string): Promise<Blob | null> {
  const resolved = resolveSignedUrl(fileUrl, bucketHint);

  if (resolved) {
    const { data: signedData, error } = await supabase.storage
      .from(resolved.bucket)
      .createSignedUrl(resolved.path, 3600);

    if (error || !signedData?.signedUrl) return null;

    const response = await fetch(signedData.signedUrl);
    if (!response.ok) return null;
    return response.blob();
  }

  // External or already signed URL
  const response = await fetch(fileUrl);
  if (!response.ok) return null;
  return response.blob();
}

interface DownloadAllOptions {
  studentName: string;
  studentUserId: string;
  applications: any[];
  documentRequests: any[];
  transferFormUploads?: any[];
}

export async function downloadAllDocumentsAsZip(
  options: DownloadAllOptions,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; totalFiles: number; failedFiles: number }> {
  const { studentName, studentUserId, applications, documentRequests, transferFormUploads } = options;
  const entries: DocumentEntry[] = [];

  console.log('=== [ZIP] Download All Documents ===');
  console.log('[ZIP] studentName:', studentName);
  console.log('[ZIP] studentUserId:', studentUserId);
  console.log('[ZIP] applications count:', applications.length);
  console.log('[ZIP] applications:', JSON.stringify(applications.map((a: any) => ({
    id: a.id, status: a.status, is_application_fee_paid: a.is_application_fee_paid,
    docs_count: (a.documents || []).length,
    acceptance_letter: !!a.acceptance_letter_url,
    university: a.scholarships?.universities?.name
  })), null, 2));
  console.log('[ZIP] documentRequests count:', documentRequests.length);
  console.log('[ZIP] documentRequests with uploads:', documentRequests.filter((r: any) => (r.document_request_uploads || []).length > 0).map((r: any) => ({
    id: r.id, title: r.title, is_global: r.is_global,
    total_uploads: (r.document_request_uploads || []).length,
    student_uploads: (r.document_request_uploads || []).filter((u: any) => u.uploaded_by === studentUserId).length
  })));
  console.log('[ZIP] transferFormUploads count:', (transferFormUploads || []).length);

  // 1. Application documents (passport, diploma, funds_proof, etc.)
  for (const app of applications) {
    const universityName = app.scholarships?.universities?.name || app.scholarships?.university_name || 'Unknown_University';
    const folderName = `Application_${sanitizeFilename(universityName)}`;
    const docs = app.documents || [];

    for (const doc of docs) {
      const url = doc.url || doc.file_url;
      if (!url) continue;
      const ext = getExtensionFromUrl(url);
      entries.push({
        folder: folderName,
        filename: `${sanitizeFilename(doc.type || 'document')}${ext}`,
        fileUrl: url,
      });
    }

    // Acceptance letter
    if (app.acceptance_letter_url) {
      const ext = getExtensionFromUrl(app.acceptance_letter_url);
      entries.push({
        folder: 'Acceptance_Letters',
        filename: `acceptance_letter_${sanitizeFilename(universityName)}${ext}`,
        fileUrl: app.acceptance_letter_url,
      });
    }
  }

  // 2. Document request uploads (global + individual)
  for (const request of documentRequests) {
    const allUploads = request.document_request_uploads || [];
    // For global requests, filter only this student's uploads
    const uploads = request.is_global
      ? allUploads.filter((u: any) => u.uploaded_by === studentUserId)
      : allUploads;
    if (uploads.length === 0) continue;
    const requestTitle = sanitizeFilename(request.title || 'Request');
    const folder = request.is_global ? 'Global_Document_Requests' : 'Document_Requests';

    for (let i = 0; i < uploads.length; i++) {
      const upload = uploads[i];
      const url = upload.file_url;
      if (!url) continue;
      const ext = getExtensionFromUrl(url);
      const originalFilename = upload.filename ? sanitizeFilename(upload.filename) : null;
      const suffix = uploads.length > 1 ? `_${i + 1}` : '';
      // Student uploads via TUS go to 'document-attachments' bucket
      // Admin uploads store full public URL (handled by resolveSignedUrl)
      const isRelativePath = !url.startsWith('http');
      entries.push({
        folder,
        filename: originalFilename || `${requestTitle}${suffix}${ext}`,
        fileUrl: url,
        bucketHint: isRelativePath ? 'document-attachments' : undefined,
      });
    }
  }

  // 3. Transfer form uploads
  if (transferFormUploads && transferFormUploads.length > 0) {
    for (let i = 0; i < transferFormUploads.length; i++) {
      const upload = transferFormUploads[i];
      const url = upload.file_url;
      if (!url) continue;
      const ext = getExtensionFromUrl(url);
      const suffix = transferFormUploads.length > 1 ? `_${i + 1}` : '';
      entries.push({
        folder: 'Transfer_Forms',
        filename: `transfer_form${suffix}${ext}`,
        fileUrl: url,
      });
    }
  }

  console.log('[ZIP] Total entries to download:', entries.length);
  console.log('[ZIP] Entries:', entries.map(e => `${e.folder}/${e.filename}`));

  if (entries.length === 0) {
    return { success: false, totalFiles: 0, failedFiles: 0 };
  }

  // Deduplicate filenames within the same folder
  const usedNames = new Map<string, number>();
  for (const entry of entries) {
    const key = `${entry.folder}/${entry.filename}`;
    const count = usedNames.get(key) || 0;
    if (count > 0) {
      const dotIdx = entry.filename.lastIndexOf('.');
      const name = entry.filename.substring(0, dotIdx);
      const ext = entry.filename.substring(dotIdx);
      entry.filename = `${name}_${count + 1}${ext}`;
    }
    usedNames.set(key, count + 1);
  }

  const zip = new JSZip();
  const rootFolder = sanitizeFilename(studentName || 'Student') + '_Documents';
  let failedFiles = 0;

  // Fetch all files in parallel for speed
  const results = await Promise.allSettled(
    entries.map(entry => fetchFileBlob(entry.fileUrl, entry.bucketHint))
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const entry = entries[i];
    onProgress?.(i + 1, entries.length);

    if (result.status === 'fulfilled' && result.value) {
      zip.file(`${rootFolder}/${entry.folder}/${entry.filename}`, result.value);
    } else {
      failedFiles++;
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${rootFolder}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, totalFiles: entries.length, failedFiles };
}
