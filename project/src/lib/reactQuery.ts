import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient configurado para React Query
 * Centraliza todas as configurações de cache e refetch
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 segundos - dados são considerados frescos por 30s
      gcTime: 5 * 60 * 1000, // 5 minutos - dados inativos são removidos após 5min
      refetchOnWindowFocus: false, // Desabilitado por padrão - cada query configura individualmente
      refetchOnMount: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});


