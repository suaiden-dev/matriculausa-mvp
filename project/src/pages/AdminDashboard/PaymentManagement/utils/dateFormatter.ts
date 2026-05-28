/**
 * Formata a data de pagamento de forma a evitar distorções por fuso horário.
 * Se a data for apenas data (ex: '2026-05-21 00:00:00+00' ou 'T00:00:00'),
 * exibe apenas o dia correto em formato UTC.
 * Caso contrário, exibe o dia e horário convertidos para o horário de Brasília.
 */
export const formatPaymentDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';
  
  // Verifica se a string indica que é um registro de data-only (ex: meia-noite UTC/local)
  const isMidnight = dateStr.includes('00:00:00') || dateStr.endsWith('T00:00:00.000Z');
  
  if (isMidnight) {
    // Exibe apenas DD/MM/AAAA no fuso UTC para não deslocar o dia por fuso horário
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
  
  // Exibe data e hora convertidas para o fuso de São Paulo
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
