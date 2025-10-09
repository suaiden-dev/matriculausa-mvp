/**
 * Normaliza nomes de arquivos para exibição mais limpa na interface
 * Remove timestamps, UUIDs e outros caracteres desnecessários
 */

export interface NormalizedFilename {
  original: string;
  normalized: string;
  extension: string;
  baseName: string;
}

/**
 * Normaliza um nome de arquivo para exibição mais limpa
 * @param filename - Nome original do arquivo
 * @param documentType - Tipo do documento (opcional, para nomes mais específicos)
 * @returns Objeto com informações normalizadas
 */
export function normalizeFilename(filename: string, documentType?: string): NormalizedFilename {
  if (!filename) {
    return {
      original: '',
      normalized: '',
      extension: '',
      baseName: ''
    };
  }

  // Extrair extensão
  const lastDotIndex = filename.lastIndexOf('.');
  const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  const nameWithoutExt = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;

  // Mapear tipos de documentos para nomes mais amigáveis
  const documentTypeMap: Record<string, string> = {
    'passport': 'Passport',
    'diploma': 'High School Diploma',
    'funds_proof': 'Proof of Funds',
    'transcript': 'Transcript',
    'recommendation': 'Recommendation Letter',
    'essay': 'Essay',
    'cv': 'CV/Resume',
    'photo': 'Photo',
    'medical': 'Medical Certificate',
    'english_test': 'English Test Results',
    'financial': 'Financial Documents',
    'i20': 'I-20 Form',
    'visa': 'Visa Documents'
  };

  // Se temos um tipo de documento específico, usar o nome mapeado
  if (documentType && documentTypeMap[documentType.toLowerCase()]) {
    return {
      original: filename,
      normalized: `${documentTypeMap[documentType.toLowerCase()]}${extension}`,
      extension,
      baseName: documentTypeMap[documentType.toLowerCase()]
    };
  }

  // Remover padrões comuns de timestamps e UUIDs
  let normalized = nameWithoutExt
    // Remover timestamps no início (ex: 1759888955434_)
    .replace(/^\d{10,}_/, '')
    // Remover UUIDs (ex: C933FFD5-9EF7-4842-A7C6-53BAE23DCE13)
    .replace(/[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/gi, '')
    // Remover timestamps no meio (ex: _1234567890_)
    .replace(/_\d{10,}_/g, '_')
    // Remover underscores duplos
    .replace(/_+/g, '_')
    // Remover underscores no início e fim
    .replace(/^_+|_+$/g, '')
    // Remover espaços extras
    .replace(/\s+/g, ' ')
    .trim();

  // Se o nome ficou vazio após a limpeza, usar um nome genérico
  if (!normalized) {
    normalized = 'Document';
  }

  // Capitalizar primeira letra de cada palavra
  normalized = normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return {
    original: filename,
    normalized: `${normalized}${extension}`,
    extension,
    baseName: normalized
  };
}

/**
 * Normaliza nome de arquivo para exibição em tooltip (mostra nome original)
 * @param filename - Nome original do arquivo
 * @param documentType - Tipo do documento (opcional)
 * @returns Nome normalizado para exibição
 */
export function getDisplayFilename(filename: string, documentType?: string): string {
  const normalized = normalizeFilename(filename, documentType);
  return normalized.normalized;
}

/**
 * Normaliza nome de arquivo para tooltip (mostra nome original completo)
 * @param filename - Nome original do arquivo
 * @returns Nome original para tooltip
 */
export function getTooltipFilename(filename: string): string {
  return filename || 'Unknown file';
}

/**
 * Verifica se um nome de arquivo precisa ser normalizado
 * @param filename - Nome do arquivo
 * @returns true se o nome contém padrões que devem ser normalizados
 */
export function shouldNormalize(filename: string): boolean {
  if (!filename) return false;
  
  // Verificar se contém timestamps longos
  const hasLongTimestamp = /\d{10,}/.test(filename);
  
  // Verificar se contém UUIDs
  const hasUUID = /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/gi.test(filename);
  
  // Verificar se é muito longo
  const isTooLong = filename.length > 30;
  
  return hasLongTimestamp || hasUUID || isTooLong;
}
