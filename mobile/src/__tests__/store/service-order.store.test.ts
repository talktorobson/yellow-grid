import { renderHook, act } from '@testing-library/react-native';
import { useServiceOrderStore } from '@store/service-order.store';
import { mockServiceOrder, mockServiceOrders } from '../../__mocks__/mockData';
import { ServiceOrderStatus } from '@/types/service-order.types';

describe('service-order.store', () => {
  beforeEach(() => {
    // Clear store state before each test
    const { result } = renderHook(() => useServiceOrderStore());
    act(() => {
      result.current.setServiceOrders([]);
      result.current.setSelectedServiceOrder(null);
      result.current.clearFilters();
      result.current.setError(null);
      result.current.setLoading(false);
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      expect(result.current.serviceOrders).toEqual([]);
      expect(result.current.selectedServiceOrder).toBeNull();
      expect(result.current.filters).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('setServiceOrders()', () => {
    it('should set service orders', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setServiceOrders(mockServiceOrders);
      });

      expect(result.current.serviceOrders).toEqual(mockServiceOrders);
      expect(result.current.serviceOrders).toHaveLength(3);
    });

    it('should replace existing service orders', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setServiceOrders(mockServiceOrders);
      });

      expect(result.current.serviceOrders).toHaveLength(3);

      act(() => {
        result.current.setServiceOrders([mockServiceOrder]);
      });

      expect(result.current.serviceOrders).toHaveLength(1);
    });
  });

  describe('setSelectedServiceOrder()', () => {
    it('should set selected service order', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setSelectedServiceOrder(mockServiceOrder);
      });

      expect(result.current.selectedServiceOrder).toEqual(mockServiceOrder);
    });

    it('should clear selected service order', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setSelectedServiceOrder(mockServiceOrder);
      });

      expect(result.current.selectedServiceOrder).toEqual(mockServiceOrder);

      act(() => {
        result.current.setSelectedServiceOrder(null);
      });

      expect(result.current.selectedServiceOrder).toBeNull();
    });
  });

  describe('updateServiceOrder()', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useServiceOrderStore());
      act(() => {
        result.current.setServiceOrders(mockServiceOrders);
        result.current.setSelectedServiceOrder(mockServiceOrder);
      });
    });

    it('should update service order in list', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      const update = { status: ServiceOrderStatus.IN_PROGRESS };

      act(() => {
        result.current.updateServiceOrder(mockServiceOrder.id, update);
      });

      const updatedOrder = result.current.serviceOrders.find(
        (o) => o.id === mockServiceOrder.id
      );

      expect(updatedOrder?.status).toBe(ServiceOrderStatus.IN_PROGRESS);
    });

    it('should update selected service order if it matches', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      const update = { status: ServiceOrderStatus.COMPLETED };

      act(() => {
        result.current.updateServiceOrder(mockServiceOrder.id, update);
      });

      expect(result.current.selectedServiceOrder?.status).toBe(ServiceOrderStatus.COMPLETED);
    });

    it('should not update selected service order if it does not match', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      const differentOrderId = mockServiceOrders[1].id;
      const update = { status: ServiceOrderStatus.COMPLETED };

      act(() => {
        result.current.updateServiceOrder(differentOrderId, update);
      });

      // Selected order should remain unchanged
      expect(result.current.selectedServiceOrder?.id).toBe(mockServiceOrder.id);
      expect(result.current.selectedServiceOrder?.status).toBe(mockServiceOrder.status);
    });

    it('should not affect other orders', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      const update = { status: ServiceOrderStatus.COMPLETED };

      act(() => {
        result.current.updateServiceOrder(mockServiceOrder.id, update);
      });

      // Other orders should remain unchanged
      const otherOrders = result.current.serviceOrders.filter(
        (o) => o.id !== mockServiceOrder.id
      );

      otherOrders.forEach((order, index) => {
        expect(order.status).toBe(mockServiceOrders[index + 1].status);
      });
    });
  });

  describe('Filters', () => {
    it('should set filters', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      const filters = {
        status: [ServiceOrderStatus.ASSIGNED, ServiceOrderStatus.ACCEPTED],
        searchQuery: 'Paris',
      };

      act(() => {
        result.current.setFilters(filters);
      });

      expect(result.current.filters).toEqual(filters);
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      const filters = {
        status: [ServiceOrderStatus.ASSIGNED],
        searchQuery: 'test',
      };

      act(() => {
        result.current.setFilters(filters);
      });

      expect(result.current.filters).toEqual(filters);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
    });
  });

  describe('Loading and Error State', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set error', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      const errorMessage = 'Failed to fetch orders';

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('getFilteredOrders()', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useServiceOrderStore());
      act(() => {
        result.current.setServiceOrders(mockServiceOrders);
      });
    });

    it('should return all orders when no filters applied', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(mockServiceOrders);
    });

    it('should filter by status', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          status: [ServiceOrderStatus.ASSIGNED],
        });
      });

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe(ServiceOrderStatus.ASSIGNED);
    });

    it('should filter by multiple statuses', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          status: [ServiceOrderStatus.ASSIGNED, ServiceOrderStatus.ACCEPTED],
        });
      });

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(2);
      expect(filtered.every((o) => [ServiceOrderStatus.ASSIGNED, ServiceOrderStatus.ACCEPTED].includes(o.status))).toBe(true);
    });

    it('should filter by search query - order number', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          searchQuery: 'SO-2025-001',
        });
      });

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].orderNumber).toBe('SO-2025-001');
    });

    it('should filter by search query - customer name', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          searchQuery: 'marie',
        });
      });

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].customer.firstName).toBe('Marie');
    });

    it('should filter by search query - city', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          searchQuery: 'paris',
        });
      });

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(2);
      expect(filtered.every((o) => o.siteAddress.city === 'Paris')).toBe(true);
    });

    it('should filter by search query - case insensitive', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          searchQuery: 'MARIE',
        });
      });

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(1);
    });

    it('should filter by date range - start date', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          startDate: '2025-01-19',
        });
      });

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(2); // Orders on 2025-01-19 and 2025-01-20
    });

    it('should filter by date range - end date', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          endDate: '2025-01-19',
        });
      });

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(2); // Orders on or before 2025-01-19
    });

    it('should filter by date range - start and end date', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          startDate: '2025-01-19',
          endDate: '2025-01-19',
        });
      });

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].scheduledDate).toBe('2025-01-19');
    });

    it('should apply multiple filters together', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          status: [ServiceOrderStatus.ASSIGNED, ServiceOrderStatus.ACCEPTED],
          searchQuery: 'paris',
        });
      });

      const filtered = result.current.getFilteredOrders();

      // Only 2 orders match: ASSIGNED and ACCEPTED orders in Paris
      expect(filtered).toHaveLength(2);
      expect(filtered.every((o) => o.siteAddress.city === 'Paris')).toBe(true);
      expect(filtered.every((o) => [ServiceOrderStatus.ASSIGNED, ServiceOrderStatus.ACCEPTED].includes(o.status))).toBe(true);
    });

    it('should return empty array when no orders match filters', () => {
      const { result } = renderHook(() => useServiceOrderStore());

      act(() => {
        result.current.setFilters({
          searchQuery: 'nonexistent',
        });
      });

      const filtered = result.current.getFilteredOrders();

      expect(filtered).toHaveLength(0);
    });
  });
});
