/**
 * Converte um valor de centavos para dólares
 * @param cents - Valor em centavos
 * @returns Valor formatado em dólares
 */
export const formatCentsToDollars = (cents: number | null | undefined): string => {
  if (!cents) return '0';
  
  // Se o valor for maior que 10000, provavelmente está em centavos (ex: 99900 = $999)
  if (cents > 10000) {
    const dollars = cents / 100;
    // Se for um número inteiro, não mostrar decimais
    return dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
  }
  
  // Se o valor for menor ou igual a 10000, provavelmente já está em dólares
  const dollars = cents;
  // Se for um número inteiro, não mostrar decimais
  return dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
};

/**
 * Converte um valor de centavos para dólares como número
 * @param cents - Valor em centavos
 * @returns Valor em dólares
 */
export const convertCentsToDollars = (cents: number | null | undefined): number => {
  if (!cents) return 0;
  
  // Se o valor for maior que 10000, provavelmente está em centavos (ex: 99900 = $999)
  if (cents > 10000) {
    return cents / 100;
  }
  
  // Se o valor for menor ou igual a 10000, provavelmente já está em dólares
  return cents;
};
