// Este hook é um wrapper leve do PaymentBlockedContext.
// Toda a lógica de fetch foi movida para o Context Provider para garantir
// uma única requisição por sessão, compartilhada entre todos os componentes.
import { usePaymentBlockedContext } from '../contexts/PaymentBlockedContext';

export const usePaymentBlocked = usePaymentBlockedContext;
