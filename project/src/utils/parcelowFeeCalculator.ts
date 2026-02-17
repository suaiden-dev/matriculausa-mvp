/**
 * Calculadora de parcelas Parcelow (Preview)
 * 
 * Esta calculadora fornece uma estimativa das parcelas para o usuário.
 * O cálculo real é feito pela Parcelow no momento do checkout, 
 * mas usamos esta lógica para dar transparência ao aluno.
 */

interface InstallmentPreview {
  count: number;
  installmentAmount: number;
  totalBRL: number;
  exchangeRateUsed: number;
}

/**
 * Calcula uma estimativa de parcelas para Parcelow
 * 
 * @param amountUSD - Valor líquido em dólares
 * @param exchangeRate - Taxa de câmbio USD -> BRL
 * @returns InstallmentPreview
 */
export function calculateParcelowPreview(
  amountUSD: number, 
  exchangeRate: number
): InstallmentPreview {
  // 1. Aplicar markup comercial (estimado em 6.5% para cobrir merchant fee e variações)
  const PARCELOW_MARKUP = 1.065; 
  const grossAmountUSD = amountUSD * PARCELOW_MARKUP;
  
  // 2. Converter para BRL
  const totalBRL = grossAmountUSD * exchangeRate;
  
  // 3. Calcular parcelas máximas baseadas no valor
  // Se o valor for baixo ( < $300), a Parcelow geralmente limita a 12x. 
  // Para valores maiores, permite até 21x.
  const INSTALLMENTS = amountUSD >= 250 ? 21 : 12;
  const installmentAmount = totalBRL / INSTALLMENTS;
  
  return {
    count: INSTALLMENTS,
    installmentAmount: Math.round(installmentAmount * 100) / 100,
    totalBRL: Math.round(totalBRL * 100) / 100,
    exchangeRateUsed: exchangeRate
  };
}
