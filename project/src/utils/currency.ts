/**
 * Converte um valor de centavos para dólares
 * @param cents - Valor em centavos (ou dólares se forceDollars=true)
 * @param forceDollars - Se true, trata o valor como já sendo em dólares
 * @returns Valor formatado em dólares
 */
export const formatCentsToDollars = (cents: number | null | undefined, forceDollars: boolean = false): string => {
  if (cents === null || cents === undefined) return '0';
  
  if (forceDollars) {
    const dollars = cents;
    return dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
  }

  // Se o valor for maior ou igual a 10000, provavelmente está em centavos (ex: 10000 = $100)
  if (cents >= 10000) {
    const dollars = cents / 100;
    // Se for um número inteiro, não mostrar decimais
    return dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
  }
  
  // Se o valor for menor que 10000, provavelmente já está em dólares
  const dollars = cents;
  // Se for um número inteiro, não mostrar decimais
  return dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
};

/**
 * Converte um valor de centavos para dólares como número
 * @param cents - Valor em centavos
 * @param forceDollars - Se true, trata o valor como já sendo em dólares
 * @returns Valor em dólares
 */
export const convertCentsToDollars = (cents: number | null | undefined, forceDollars: boolean = false): number => {
  if (cents === null || cents === undefined) return 0;
  
  if (forceDollars) return cents;

  if (cents >= 10000) {
    return cents / 100;
  }
  
  return cents;
};

/**
 * Formata um valor numérico para exibição como moeda (USD) com separadores de milhares
 * @param amount - O valor a ser formatado
 * @param includeSymbol - Se deve incluir o símbolo '$' (padrão: true)
 * @returns String formatada (ex: "$10,000.00" ou "10,000.00")
 */
export const formatCurrency = (amount: number | null | undefined, includeSymbol: boolean = true): string => {
  if (amount === null || amount === undefined) {
    return includeSymbol ? '$0.00' : '0.00';
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: includeSymbol ? 'currency' : 'decimal',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
};
