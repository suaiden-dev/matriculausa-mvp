/**
 * Gera um UUID v4 compatível com todos os navegadores
 * Usa crypto.randomUUID() quando disponível, caso contrário usa fallback
 */
export function generateUUID(): string {
  // Tentar usar crypto.randomUUID() se disponível (suportado na maioria dos navegadores modernos)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn('crypto.randomUUID() falhou, usando fallback:', error);
    }
  }

  // Fallback: gerar UUID v4 manualmente
  // Formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

