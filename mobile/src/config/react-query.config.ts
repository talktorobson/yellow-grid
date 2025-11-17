import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst', // Support offline mode
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
  },
});

// Query keys factory
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  serviceOrders: {
    all: ['serviceOrders'] as const,
    list: (filters?: Record<string, unknown>) => ['serviceOrders', 'list', filters] as const,
    detail: (id: string) => ['serviceOrders', 'detail', id] as const,
    assigned: ['serviceOrders', 'assigned'] as const,
  },
  checkIns: {
    all: ['checkIns'] as const,
    detail: (id: string) => ['checkIns', 'detail', id] as const,
    byServiceOrder: (serviceOrderId: string) =>
      ['checkIns', 'byServiceOrder', serviceOrderId] as const,
  },
  checkOuts: {
    all: ['checkOuts'] as const,
    detail: (id: string) => ['checkOuts', 'detail', id] as const,
    byServiceOrder: (serviceOrderId: string) =>
      ['checkOuts', 'byServiceOrder', serviceOrderId] as const,
  },
  media: {
    all: ['media'] as const,
    byServiceOrder: (serviceOrderId: string) => ['media', 'byServiceOrder', serviceOrderId] as const,
  },
};
