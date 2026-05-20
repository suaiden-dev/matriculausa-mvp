export interface DocumentRequestUpload {
  id: string;
  document_request_id: string;
  file_url: string;
  uploaded_at: string;
  status: string;
  review_notes?: string;
  rejection_reason?: string;
  uploaded_by?: string;
  is_admin_upload?: boolean;
}

/**
 * Extrai o nome original do arquivo a partir de sua URL de armazenamento,
 * decodificando caracteres especiais e removendo timestamps adicionados no upload.
 *
 * Exemplo:
 * "1716161616_meu-documento.pdf" -> "meu-documento.pdf"
 */
export function getFileName(fileUrl: string | null | undefined): string {
  if (!fileUrl) return '';

  // Obtém a última parte do caminho/URL
  const parts = fileUrl.split('/');
  const lastPart = parts[parts.length - 1];

  let decoded = lastPart;
  try {
    decoded = decodeURIComponent(lastPart);
  } catch (e) {
    // Silencia erros de decodificação se a string estiver mal formatada
  }

  // Remove o timestamp inicial (dígitos numéricos seguidos de underscore)
  return decoded.replace(/^\d+_(.+)$/, '$1');
}

/**
 * Agrupa uploads de documentos por lote de submissão/tentativa usando
 * a proximidade temporal dos envios (loteamento de múltiplos arquivos).
 *
 * Retorna dois blocos:
 * - closedGroups: Tentativas passadas já revisadas (aprovadas ou rejeitadas).
 * - currentGroup: Tentativa atual pendente de revisão (contém ao menos um item 'under_review').
 */
export function groupUploadsBySubmission(uploads: DocumentRequestUpload[]) {
  if (!uploads || uploads.length === 0) {
    return { closedGroups: [], currentGroup: [] };
  }

  // 1. Ordena os uploads por data de envio de forma ascendente
  const sortedUploads = [...uploads].sort((a, b) => {
    return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
  });

  // 2. Agrupa uploads cuja diferença de tempo de envio seja de até 10 minutos
  const TIME_THRESHOLD_MS = 10 * 60 * 1000;
  const groups: DocumentRequestUpload[][] = [];

  for (const upload of sortedUploads) {
    if (groups.length === 0) {
      groups.push([upload]);
    } else {
      const lastGroup = groups[groups.length - 1];
      const lastUploadInGroup = lastGroup[lastGroup.length - 1];

      const timeDiff = new Date(upload.uploaded_at).getTime() - new Date(lastUploadInGroup.uploaded_at).getTime();

      if (timeDiff <= TIME_THRESHOLD_MS) {
        lastGroup.push(upload);
      } else {
        groups.push([upload]);
      }
    }
  }

  // 3. Classifica os grupos em finalizados (closedGroups) ou pendentes (currentGroup)
  const closedGroups: DocumentRequestUpload[][] = [];
  let currentGroup: DocumentRequestUpload[] = [];

  if (groups.length > 0) {
    const lastGroup = groups[groups.length - 1];
    // Se o grupo mais recente tiver pelo menos um upload 'under_review', é a tentativa ativa
    const hasPending = lastGroup.some(u => u.status === 'under_review');

    if (hasPending) {
      currentGroup = lastGroup;
      closedGroups.push(...groups.slice(0, -1));
    } else {
      closedGroups.push(...groups);
    }
  }

  return { closedGroups, currentGroup };
}
