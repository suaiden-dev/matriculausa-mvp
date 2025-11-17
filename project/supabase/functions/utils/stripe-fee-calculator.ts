/**
 * Calculadora de taxas do Stripe
 * 
 * Calcula o valor a cobrar do cliente para garantir que recebamos
 * o valor líquido desejado após as taxas do Stripe.
 * 
 * Taxas configuradas:
 * - Cartão USD: 3.9% + $0.30 (taxa conservadora para cartões internacionais - garante valor mínimo)
 * - PIX BRL: 1.19% (processamento) + ~0.6% (conversão de moedas) = ~1.8% total (IOF de 3.5% é adicionado automaticamente pelo Stripe ao aluno)
 */

/**
 * Calcula o valor a cobrar para cartão USD considerando as taxas do Stripe
 * 
 * @param netAmount - Valor líquido desejado em dólares (ex: 1000 para $1,000.00)
 * @returns Valor a cobrar em centavos (ex: 104027 para $1,040.27)
 * 
 * @example
 * // Para receber $1,000 líquido:
 * const amountToCharge = calculateCardAmountWithFees(1000);
 * // Retorna: 104027 (centavos) = $1,040.27
 */
export function calculateCardAmountWithFees(netAmount: number): number {
  // Taxa do Stripe para cartões: 3.9% + $0.30
  // Usamos taxa conservadora que cobre cartões internacionais (2.9% base + 1% internacional)
  // Para cartões domésticos dos EUA (2.9% + $0.30), vamos receber um pouco mais que o valor desejado
  // Mas isso garante que sempre recebemos pelo menos o valor desejado, mesmo com cartões internacionais
  const STRIPE_PERCENTAGE = 0.039; // 3.9% (taxa para cartões internacionais - conservadora)
  const STRIPE_FIXED_FEE = 0.30;   // $0.30
  
  // Fórmula: (Valor líquido + Taxa fixa) / (1 - Taxa percentual)
  const grossAmount = (netAmount + STRIPE_FIXED_FEE) / (1 - STRIPE_PERCENTAGE);
  
  // Arredondar para 2 casas decimais e converter para centavos
  const grossAmountRounded = Math.round(grossAmount * 100) / 100;
  const grossAmountInCents = Math.round(grossAmountRounded * 100);
  
  return grossAmountInCents;
}

/**
 * Calcula o valor a cobrar para PIX BRL considerando as taxas do Stripe
 * 
 * @param netAmountUSD - Valor líquido desejado em dólares (ex: 1000 para $1,000.00)
 * @param exchangeRate - Taxa de câmbio USD para BRL (ex: 5.6)
 * @returns Valor a cobrar em centavos de BRL (ex: 566748 para R$ 5,667.48)
 * 
 * @example
 * // Para receber $1,000 USD líquido com taxa de câmbio 5.6:
 * const amountToCharge = calculatePIXAmountWithFees(1000, 5.6);
 * // Retorna: 566748 (centavos) = R$ 5,667.48
 * // Nota: IOF de 3.5% será adicionado automaticamente pelo Stripe ao aluno
 */
export function calculatePIXAmountWithFees(netAmountUSD: number, exchangeRate: number): number {
  // Taxas do Stripe para PIX:
  // - Taxa de processamento: 1.19%
  // - Taxa de conversão de moedas: ~0.6% (aplicada sobre o valor convertido - conservador para garantir valor mínimo)
  // Total aproximado: ~1.8% (conservador para garantir que sempre recebamos pelo menos o valor desejado)
  // IOF de 3.5% é adicionado automaticamente pelo Stripe ao aluno, não precisa incluir no cálculo
  const STRIPE_PIX_PROCESSING_PERCENTAGE = 0.0119; // 1.19% - taxa de processamento
  const STRIPE_CURRENCY_CONVERSION_PERCENTAGE = 0.006; // 0.6% - taxa de conversão de moedas (conservador)
  const STRIPE_PIX_TOTAL_PERCENTAGE = STRIPE_PIX_PROCESSING_PERCENTAGE + STRIPE_CURRENCY_CONVERSION_PERCENTAGE; // ~1.8%
  
  // 1. Converter USD para BRL
  const netAmountBRL = netAmountUSD * exchangeRate;
  
  // 2. Calcular valor antes das taxas do Stripe
  // Fórmula: Valor líquido / (1 - Taxa percentual total)
  // Consideramos ambas as taxas (processamento + conversão) para garantir valor mínimo
  const grossAmountBRL = netAmountBRL / (1 - STRIPE_PIX_TOTAL_PERCENTAGE);
  
  // Arredondar para 2 casas decimais e converter para centavos
  const grossAmountRounded = Math.round(grossAmountBRL * 100) / 100;
  const grossAmountInCents = Math.round(grossAmountRounded * 100);
  
  return grossAmountInCents;
}

/**
 * Calcula o valor da taxa do Stripe para cartão
 * 
 * @param grossAmount - Valor bruto cobrado em dólares
 * @returns Valor da taxa em dólares
 */
export function calculateCardFee(grossAmount: number): number {
  const STRIPE_PERCENTAGE = 0.039; // 3.9%
  const STRIPE_FIXED_FEE = 0.30;   // $0.30
  
  return (grossAmount * STRIPE_PERCENTAGE) + STRIPE_FIXED_FEE;
}

/**
 * Calcula o valor da taxa do Stripe para PIX
 * 
 * @param grossAmountBRL - Valor bruto cobrado em BRL
 * @returns Valor da taxa em BRL
 */
export function calculatePIXFee(grossAmountBRL: number): number {
  const STRIPE_PIX_PROCESSING_PERCENTAGE = 0.0119; // 1.19% - taxa de processamento
  const STRIPE_CURRENCY_CONVERSION_PERCENTAGE = 0.006; // 0.6% - taxa de conversão de moedas (conservador)
  const STRIPE_PIX_TOTAL_PERCENTAGE = STRIPE_PIX_PROCESSING_PERCENTAGE + STRIPE_CURRENCY_CONVERSION_PERCENTAGE; // ~1.8%
  
  return grossAmountBRL * STRIPE_PIX_TOTAL_PERCENTAGE;
}

