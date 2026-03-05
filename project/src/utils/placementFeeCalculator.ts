/**
 * Tabela de cálculo do Placement Fee baseado no annual_value_with_scholarship da bolsa.
 * Para novos usuários (placement_fee_flow = true) que substitui scholarship_fee + i20_control_fee.
 */

/** Entrada da tabela: tuition máxima e valor correspondente da placement fee */
interface PlacementFeeEntry {
  maxTuition: number;
  fee: number;
}

/**
 * Tabela de Placement Fee ordenada de MENOR para MAIOR tuition.
 * O valor da fee é cobrado quando a tuition da bolsa é <= maxTuition.
 * 
 * Lógica: se a bolsa tem annual_value_with_scholarship = $5,000 → fee = $1,200
 */
const PLACEMENT_FEE_TABLE: PlacementFeeEntry[] = [
  { maxTuition: 4500, fee: 1450 },
  { maxTuition: 5000, fee: 1200 },
  { maxTuition: 5500, fee: 1100 },
  { maxTuition: 6000, fee: 900 },
  { maxTuition: 6500, fee: 550 },
  { maxTuition: 7000, fee: 350 },
  { maxTuition: 7500, fee: 300 },
  { maxTuition: 8000, fee: 250 },
  { maxTuition: 8500, fee: 200 },
  { maxTuition: 9000, fee: 150 },
  { maxTuition: 9500, fee: 100 },
  { maxTuition: 15000, fee: 100 },
];

/**
 * Calcula o valor da Placement Fee com base no valor anual da bolsa selecionada.
 * 
 * @param annualScholarshipValue - Valor anual da bolsa (annual_value_with_scholarship)
 * @returns Valor da Placement Fee em dólares
 */
export function getPlacementFee(annualScholarshipValue: number): number {
  // Ordenar da menor para maior e retornar o fee do primeiro range que abrange o valor
  const sorted = [...PLACEMENT_FEE_TABLE].sort((a, b) => a.maxTuition - b.maxTuition);

  for (const entry of sorted) {
    if (annualScholarshipValue <= entry.maxTuition) {
      return entry.fee;
    }
  }

  // Se maior que todos os ranges, usar o menor fee (bolsa mais cara = menor fee)
  return sorted[sorted.length - 1].fee;
}

/**
 * Formata o valor da Placement Fee para exibição
 */
export function formatPlacementFee(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Retorna a descrição do intervalo de tuition para um determinado valor de fee.
 */
export function getPlacementFeeTierLabel(annualScholarshipValue: number): string {
  const fee = getPlacementFee(annualScholarshipValue);
  return `Placement Fee: $${fee} (Bolsa com valor anual de $${annualScholarshipValue.toLocaleString()})`;
}
