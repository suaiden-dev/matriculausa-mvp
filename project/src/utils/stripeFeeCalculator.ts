/**
 * Calculadora de taxas do Stripe (Frontend)
 * 
 * Calcula o valor a cobrar do cliente para garantir que recebamos
 * o valor líquido desejado após as taxas do Stripe.
 * 
 * Taxas configuradas:
 * - Cartão USD: 3.9% + $0.30 (taxa conservadora para cartões internacionais - garante valor mínimo)
 * - PIX BRL: 1.19% (processamento) + ~0.6% (conversão de moedas) = ~1.8% total (IOF de 3.5% é adicionado automaticamente pelo Stripe ao aluno)
 */

/**
 * Busca a taxa de câmbio USD para BRL da mesma API que o backend usa
 * Aplica a mesma margem comercial de 4% que o backend aplica
 * 
 * @returns Promise com a taxa de câmbio (ex: 5.512)
 */
export async function getExchangeRate(): Promise<number> {
  try {
    // Usar a mesma API que o backend usa
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (response.ok) {
      const data = await response.json();
      const baseRate = parseFloat(data.rates.BRL);
      
      // Aplicar a mesma margem comercial que o backend (4%)
      const exchangeRate = baseRate * 1.04;
      return Math.round(exchangeRate * 1000) / 1000; // Arredondar para 3 casas decimais
    } else {
      throw new Error('API externa falhou');
    }
  } catch (error) {
    console.error('Erro ao buscar taxa de câmbio:', error);
    // Fallback para a mesma taxa que o backend usa quando a API falha
    return 5.6;
  }
}

/**
 * Calcula o valor a cobrar para cartão USD considerando as taxas do Stripe
 * 
 * @param netAmount - Valor líquido desejado em dólares (ex: 1000 para $1,000.00)
 * @returns Valor a cobrar em dólares (ex: 1040.27 para $1,040.27)
 * 
 * @example
 * // Para receber $1,000 líquido:
 * const amountToCharge = calculateCardAmountWithFees(1000);
 * // Retorna: 1040.27 = $1,040.27
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
  
  // Arredondar para 2 casas decimais
  return Math.round(grossAmount * 100) / 100;
}

/**
 * Calcula o valor a cobrar para PIX BRL considerando as taxas do Stripe
 * 
 * @param netAmountUSD - Valor líquido desejado em dólares (ex: 1000 para $1,000.00)
 * @param exchangeRate - Taxa de câmbio USD para BRL (ex: 5.6). Se não fornecido, busca da API
 * @returns Valor a cobrar em BRL (ex: 5667.48 para R$ 5,667.48)
 * 
 * @example
 * // Para receber $1,000 USD líquido com taxa de câmbio 5.6:
 * const amountToCharge = calculatePIXAmountWithFees(1000, 5.6);
 * // Retorna: 5667.48 = R$ 5,667.48
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
  
  // Arredondar para 2 casas decimais
  return Math.round(grossAmountBRL * 100) / 100;
}

/**
 * Calcula o valor total que o aluno pagará para PIX, incluindo IOF de 3.5%
 * O Stripe adiciona automaticamente o IOF ao valor final
 * 
 * @param netAmountUSD - Valor líquido desejado em dólares (ex: 1000 para $1,000.00)
 * @param exchangeRate - Taxa de câmbio USD para BRL (ex: 5.6)
 * @returns Objeto com valor base e valor total com IOF
 * 
 * @example
 * // Para receber $1,000 USD líquido:
 * const { baseAmount, totalWithIOF, iofAmount } = calculatePIXTotalWithIOF(1000, 5.6);
 * // baseAmount: 5667.48 (valor antes do IOF)
 * // totalWithIOF: 5865.84 (valor que o aluno paga)
 * // iofAmount: 198.36 (valor do IOF)
 */
export function calculatePIXTotalWithIOF(netAmountUSD: number, exchangeRate: number): {
  baseAmount: number;
  totalWithIOF: number;
  iofAmount: number;
} {
  // IOF de 3.5% que o Stripe adiciona automaticamente
  const IOF_PERCENTAGE = 0.035; // 3.5%
  
  // Calcular valor base (com markup do Stripe, mas sem IOF)
  const baseAmount = calculatePIXAmountWithFees(netAmountUSD, exchangeRate);
  
  // Calcular IOF sobre o valor base
  const iofAmount = baseAmount * IOF_PERCENTAGE;
  
  // Valor total que o aluno pagará (base + IOF)
  const totalWithIOF = baseAmount + iofAmount;
  
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    totalWithIOF: Math.round(totalWithIOF * 100) / 100,
    iofAmount: Math.round(iofAmount * 100) / 100
  };
}

