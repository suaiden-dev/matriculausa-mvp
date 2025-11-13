import type { Scholarship } from '../types';

/**
 * Deadline para bolsas de $3800: 6 de novembro de 2025, 23:59 (último minuto do dia)
 * Timezone: America/Phoenix (MST - Mountain Standard Time, UTC-7, sem DST)
 *
 * Como o Arizona não usa DST, sempre é UTC-7.
 * 6 de novembro de 2025 23:59 MST = 7 de novembro de 2025 06:59 UTC
 * A partir de 00:00 do dia 7/11 (07:00 UTC) não será mais possível se candidatar
 */
const DEADLINE_UTC = new Date('2025-11-07T06:59:59Z');

/**
 * ID da bolsa de teste: International Excellence Scholarship
 * Para testes apenas
 */
const TEST_SCHOLARSHIP_ID = 'cc2f1ab2-7478-422e-8450-babc130a87e7';

/**
 * Deadline fixo para a bolsa de teste (5 minutos a partir de quando foi configurado)
 * Este deadline NÃO muda a cada refresh - é fixo para permitir teste real
 * Calculado uma vez quando o módulo é carregado
 */
const TEST_DEADLINE_UTC = (() => {
  const deadline = new Date();
  deadline.setMinutes(deadline.getMinutes() + 5);
  return deadline;
})();

/**
 * Verifica se uma bolsa é do tipo $3800 (ou bolsa de teste)
 * @param scholarship - Objeto da bolsa
 * @returns true se annual_value_with_scholarship === 3800 ou se for a bolsa de teste
 */
export function is3800Scholarship(scholarship: Scholarship | null | undefined): boolean {
  if (!scholarship) return false;
  // Incluir bolsa de teste temporariamente
  if (scholarship.id === TEST_SCHOLARSHIP_ID) return true;
  return scholarship.annual_value_with_scholarship === 3800;
}

/**
 * Obtém o deadline UTC para uma bolsa específica
 * IMPORTANTE:
 * - Bolsas de $3800 reais: usam DEADLINE_UTC fixo (6 nov 2025 23:59 Arizona = 7 nov 2025 06:59 UTC)
 * - Bolsa de teste: usa TEST_DEADLINE_UTC fixo (5 minutos a partir de quando foi configurado)
 *
 * O deadline NÃO muda a cada refresh - é fixo para permitir teste real
 */
function getDeadlineUtc(scholarship?: Scholarship | null): Date {
  // Se for a bolsa de teste, usar deadline fixo de teste
  if (scholarship?.id === TEST_SCHOLARSHIP_ID) {
    return TEST_DEADLINE_UTC;
  }

  // Caso contrário, usar o deadline padrão das bolsas de $3800 (fixo: 6 nov 2025 23:59 Arizona)
  return DEADLINE_UTC;
}

/**
 * Verifica se o deadline para bolsas de $3800 já passou
 * Compara a data/hora atual (UTC) com o deadline (UTC)
 * @param scholarship - Opcional: bolsa específica para verificar deadline customizado
 * @returns true se já passou o deadline
 */
export function is3800ScholarshipExpired(scholarship?: Scholarship | null): boolean {
  const now = new Date();
  const deadline = getDeadlineUtc(scholarship);
  
  // Comparar diretamente (ambos em UTC)
  return now >= deadline;
}

/**
 * Verifica se uma bolsa de $3800 está expirada (não pode mais ser selecionada/candidatada)
 * @param scholarship - Objeto da bolsa
 * @returns true se é bolsa de $3800 E já passou o deadline
 */
export function is3800ScholarshipBlocked(scholarship: Scholarship | null | undefined): boolean {
  return is3800Scholarship(scholarship) && is3800ScholarshipExpired(scholarship);
}

/**
 * Obtém a mensagem de aviso de expiração baseada no idioma
 * @param language - Código do idioma ('pt', 'en', 'es')
 * @param isExpired - Se true, retorna mensagem de expirado; se false, retorna mensagem de próximo de expirar
 * @returns Mensagem de aviso
 */
export function get3800ScholarshipWarningMessage(
  language: string = 'pt',
  isExpired: boolean = false
): string {
  if (isExpired) {
    const messages: Record<string, string> = {
      pt: 'Não disponível para candidatura',
      en: 'Not Available for application',
      es: 'No disponible para candidatura'
    };
    return messages[language] || messages.pt;
  } else {
    const messages: Record<string, string> = {
      pt: 'Últimas horas para se candidatar! Prazo expira amanhã (6 de novembro)',
      en: 'Last hours to apply! Deadline expires tomorrow (November 6th)',
      es: '¡Últimas horas para aplicar! El plazo expira mañana (6 de noviembre)'
    };
    return messages[language] || messages.pt;
  }
}

/**
 * Obtém mensagem curta de aviso
 * @param language - Código do idioma ('pt', 'en', 'es')
 * @returns Mensagem curta de aviso
 */
export function get3800ScholarshipWarningMessageShort(
  language: string = 'pt'
): string {
  const messages: Record<string, string> = {
    pt: 'Prazo expira amanhã',
    en: 'Deadline expires tomorrow',
    es: 'El plazo expira mañana'
  };
  return messages[language] || messages.pt;
}

/**
 * Calcula o tempo restante até o deadline de bolsas de $3800
 * @param scholarship - Opcional: bolsa específica para calcular deadline customizado
 * @returns Objeto com horas, minutos e segundos restantes, ou null se já expirou
 */
export function get3800ScholarshipTimeRemaining(scholarship?: Scholarship | null): { hours: number; minutes: number; seconds: number } | null {
  const now = new Date();
  const deadline = getDeadlineUtc(scholarship);
  
  if (now >= deadline) {
    return null; // Já expirou
  }
  
  const diffMs = deadline.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
}

