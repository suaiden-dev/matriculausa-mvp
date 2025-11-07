import { formatCentsToDollars } from '../../../../utils/currency';

/**
 * Formata um valor numérico para formato USD com 2 casas decimais
 */
export const formatUSD = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Formata valores em centavos para dólares (formato USD)
 */
export const formatCentsToUSD = (cents: number) => formatUSD(Number(formatCentsToDollars(cents)));

/**
 * Normaliza valores que podem vir em dólares ou centavos para centavos.
 * Regras: se o número for grande (>= 10_000), consideramos que já está em centavos.
 * Caso contrário, tratamos como dólares e convertemos para centavos.
 */
export const toCents = (value: number | null | undefined): number => {
  const n = Number(value);
  if (!isFinite(n) || isNaN(n)) return 0;
  return n >= 10000 ? Math.round(n) : Math.round(n * 100);
};

