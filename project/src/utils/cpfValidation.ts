/**
 * Validates a Brazilian CPF (Cadastro de Pessoas Físicas)
 * @param cpf - CPF string with or without formatting
 * @returns boolean indicating if CPF is valid
 */
export function validateCPF(cpf: string): boolean {
  // Remove all non-digit characters
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // CPF must have exactly 11 digits
  if (cleanCPF.length !== 11) {
    return false;
  }
  
  // Check for known invalid CPFs (all digits the same)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) {
    checkDigit = 0;
  }
  if (checkDigit !== parseInt(cleanCPF.charAt(9))) {
    return false;
  }
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) {
    checkDigit = 0;
  }
  if (checkDigit !== parseInt(cleanCPF.charAt(10))) {
    return false;
  }
  
  return true;
}

/**
 * Formats a CPF string with standard Brazilian formatting
 * @param cpf - CPF string
 * @returns Formatted CPF (XXX.XXX.XXX-XX)
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) {
    return cpf;
  }
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
