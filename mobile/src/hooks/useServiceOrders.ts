import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@services/api.service';
import { queryKeys } from '@config/react-query.config';
import { useServiceOrderStore } from '@store/service-order.store';
import type { ServiceOrder, ServiceOrderStatus } from '@types/service-order.types';

// Fetch assigned service orders
export const useAssignedServiceOrders = () => {
  const { setServiceOrders, setLoading, setError } = useServiceOrderStore();

  return useQuery({
    queryKey: queryKeys.serviceOrders.assigned,
    queryFn: async () => {
      setLoading(true);
      try {
        const orders = await apiService.get<ServiceOrder[]>('/service-orders/assigned');
        setServiceOrders(orders);
        setError(null);
        return orders;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch orders';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
  });
};

// Fetch single service order
export const useServiceOrder = (orderId: string) => {
  const { setSelectedServiceOrder, setError } = useServiceOrderStore();

  return useQuery({
    queryKey: queryKeys.serviceOrders.detail(orderId),
    queryFn: async () => {
      try {
        const order = await apiService.get<ServiceOrder>(`/service-orders/${orderId}`);
        setSelectedServiceOrder(order);
        setError(null);
        return order;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch order';
        setError(errorMessage);
        throw error;
      }
    },
    enabled: !!orderId,
  });
};

// Update service order status
export const useUpdateServiceOrderStatus = () => {
  const queryClient = useQueryClient();
  const { updateServiceOrder, setError } = useServiceOrderStore();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: ServiceOrderStatus;
    }) => {
      const order = await apiService.patch<ServiceOrder>(`/service-orders/${orderId}/status`, {
        status,
      });
      return order;
    },
    onSuccess: (order) => {
      updateServiceOrder(order.id, order);
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceOrders.detail(order.id) });
      setError(null);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status';
      setError(errorMessage);
    },
  });
};

// Accept service order assignment
export const useAcceptAssignment = () => {
  const queryClient = useQueryClient();
  const { updateServiceOrder, setError } = useServiceOrderStore();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const order = await apiService.post<ServiceOrder>(`/service-orders/${orderId}/accept`);
      return order;
    },
    onSuccess: (order) => {
      updateServiceOrder(order.id, order);
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceOrders.all });
      setError(null);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept assignment';
      setError(errorMessage);
    },
  });
};

// Decline service order assignment
export const useDeclineAssignment = () => {
  const queryClient = useQueryClient();
  const { setError } = useServiceOrderStore();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      await apiService.post(`/service-orders/${orderId}/decline`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceOrders.all });
      setError(null);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to decline assignment';
      setError(errorMessage);
    },
  });
};
