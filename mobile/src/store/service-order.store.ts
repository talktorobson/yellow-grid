import { create } from 'zustand';
import type { ServiceOrder, ServiceOrderStatus } from '@types/service-order.types';

interface ServiceOrderFilters {
  status?: ServiceOrderStatus[];
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

interface ServiceOrderStore {
  // State
  serviceOrders: ServiceOrder[];
  selectedServiceOrder: ServiceOrder | null;
  filters: ServiceOrderFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  setServiceOrders: (orders: ServiceOrder[]) => void;
  setSelectedServiceOrder: (order: ServiceOrder | null) => void;
  updateServiceOrder: (orderId: string, updates: Partial<ServiceOrder>) => void;
  setFilters: (filters: ServiceOrderFilters) => void;
  clearFilters: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Computed
  getFilteredOrders: () => ServiceOrder[];
}

export const useServiceOrderStore = create<ServiceOrderStore>((set, get) => ({
  // Initial state
  serviceOrders: [],
  selectedServiceOrder: null,
  filters: {},
  isLoading: false,
  error: null,

  // Actions
  setServiceOrders: (orders: ServiceOrder[]) => {
    set({ serviceOrders: orders });
  },

  setSelectedServiceOrder: (order: ServiceOrder | null) => {
    set({ selectedServiceOrder: order });
  },

  updateServiceOrder: (orderId: string, updates: Partial<ServiceOrder>) => {
    set((state) => ({
      serviceOrders: state.serviceOrders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      ),
      selectedServiceOrder:
        state.selectedServiceOrder?.id === orderId
          ? { ...state.selectedServiceOrder, ...updates }
          : state.selectedServiceOrder,
    }));
  },

  setFilters: (filters: ServiceOrderFilters) => {
    set({ filters });
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // Computed
  getFilteredOrders: () => {
    const { serviceOrders, filters } = get();
    let filtered = [...serviceOrders];

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((order) => filters.status?.includes(order.status));
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(
        (order) => new Date(order.scheduledDate) >= new Date(filters.startDate!)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (order) => new Date(order.scheduledDate) <= new Date(filters.endDate!)
      );
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(query) ||
          order.customer.firstName.toLowerCase().includes(query) ||
          order.customer.lastName.toLowerCase().includes(query) ||
          order.siteAddress.city.toLowerCase().includes(query)
      );
    }

    return filtered;
  },
}));
