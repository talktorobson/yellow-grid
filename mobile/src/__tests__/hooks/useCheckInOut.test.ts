import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { useCheckIn, useCheckOut, useCheckInByServiceOrder } from '@hooks/useCheckInOut';
import { apiService } from '@services/api.service';
import { useExecutionStore } from '@store/execution.store';
import {
  mockCheckIn,
  mockServiceOrder,
  mockLocation,
} from '../../__mocks__/mockData';
import { CheckInMethod, CompletionStatus } from '@/types/checkin-checkout.types';
import React from 'react';

// Mock dependencies
jest.mock('expo-location');
jest.mock('expo-device');
jest.mock('@services/api.service');
jest.mock('@store/execution.store');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCheckInOut hooks', () => {
  const mockSetCheckIn = jest.fn();
  const mockSetCheckOut = jest.fn();
  const mockSetError = jest.fn();
  const mockSetLoading = jest.fn();
  const mockUseExecutionStore = useExecutionStore as jest.MockedFunction<
    typeof useExecutionStore
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useExecutionStore default implementation
    mockUseExecutionStore.mockReturnValue({
      currentCheckIn: null,
      currentCheckOut: null,
      photos: [],
      isLoading: false,
      error: null,
      setCheckIn: mockSetCheckIn,
      setCheckOut: mockSetCheckOut,
      addPhoto: jest.fn(),
      removePhoto: jest.fn(),
      clearPhotos: jest.fn(),
      setLoading: mockSetLoading,
      setError: mockSetError,
      clearError: jest.fn(),
    });

    // Mock Location.requestForegroundPermissionsAsync
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    // Mock Location.getCurrentPositionAsync
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

    // Mock Device.getBatteryLevelAsync
    (Device.getBatteryLevelAsync as jest.Mock) = jest.fn().mockResolvedValue(0.85);
  });

  describe('useCheckIn', () => {
    it('should successfully check in with GPS location', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce(mockCheckIn);

      const { result } = renderHook(() => useCheckIn(), {
        wrapper: createWrapper(),
      });

      const checkInData = {
        serviceOrderId: mockServiceOrder.id,
        customerPresent: true,
        siteAccessNotes: 'Access via main entrance',
        safetyHazards: [],
      };

      await result.current.mutateAsync(checkInData);

      // Verify location was requested
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High,
      });

      // Verify API was called with correct data
      expect(apiService.post).toHaveBeenCalledWith(
        '/check-ins',
        expect.objectContaining({
          serviceOrderId: checkInData.serviceOrderId,
          checkInMethod: CheckInMethod.GPS_AUTO,
          customerPresent: checkInData.customerPresent,
          siteAccessNotes: checkInData.siteAccessNotes,
          safetyHazards: checkInData.safetyHazards,
          location: expect.objectContaining({
            latitude: mockLocation.coords.latitude,
            longitude: mockLocation.coords.longitude,
          }),
          metadata: expect.objectContaining({
            batteryLevel: 85,
          }),
        })
      );

      // Verify store was updated
      expect(mockSetCheckIn).toHaveBeenCalledWith(mockCheckIn);
      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    it('should set loading state during check-in', async () => {
      (apiService.post as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCheckIn), 100))
      );

      const { result } = renderHook(() => useCheckIn(), {
        wrapper: createWrapper(),
      });

      const checkInData = {
        serviceOrderId: mockServiceOrder.id,
        customerPresent: true,
      };

      // Start check-in
      result.current.mutate(checkInData);

      // Verify loading was set to true
      await waitFor(() => {
        expect(mockSetLoading).toHaveBeenCalledWith(true);
      });

      // Wait for completion
      await waitFor(
        () => {
          expect(mockSetLoading).toHaveBeenCalledWith(false);
        },
        { timeout: 2000 }
      );
    });

    it('should handle location permission denial', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const { result } = renderHook(() => useCheckIn(), {
        wrapper: createWrapper(),
      });

      const checkInData = {
        serviceOrderId: mockServiceOrder.id,
        customerPresent: true,
      };

      await expect(result.current.mutateAsync(checkInData)).rejects.toThrow(
        'Location permission not granted'
      );

      // Verify error was set
      expect(mockSetError).toHaveBeenCalledWith('Location permission not granted');
    });

    it('should handle check-in API failure', async () => {
      const errorMessage = 'Network error';
      (apiService.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useCheckIn(), {
        wrapper: createWrapper(),
      });

      const checkInData = {
        serviceOrderId: mockServiceOrder.id,
        customerPresent: true,
      };

      await expect(result.current.mutateAsync(checkInData)).rejects.toThrow(errorMessage);

      // Verify error was set
      expect(mockSetError).toHaveBeenCalledWith(errorMessage);
      expect(mockSetCheckIn).not.toHaveBeenCalled();
    });

    it('should include safety hazards in check-in', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce(mockCheckIn);

      const { result } = renderHook(() => useCheckIn(), {
        wrapper: createWrapper(),
      });

      const safetyHazards = [
        {
          type: 'ELECTRICAL' as const,
          description: 'Exposed wiring',
          severity: 'HIGH' as const,
          mitigationActions: ['Turn off power'],
          reportedAt: new Date().toISOString(),
        },
      ];

      const checkInData = {
        serviceOrderId: mockServiceOrder.id,
        customerPresent: true,
        safetyHazards,
      };

      await result.current.mutateAsync(checkInData);

      // Verify safety hazards were included
      expect(apiService.post).toHaveBeenCalledWith(
        '/check-ins',
        expect.objectContaining({
          safetyHazards,
        })
      );
    });

    it('should use custom check-in method', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce(mockCheckIn);

      const { result } = renderHook(() => useCheckIn(), {
        wrapper: createWrapper(),
      });

      const checkInData = {
        serviceOrderId: mockServiceOrder.id,
        checkInMethod: CheckInMethod.MANUAL,
        customerPresent: false,
      };

      await result.current.mutateAsync(checkInData);

      expect(apiService.post).toHaveBeenCalledWith(
        '/check-ins',
        expect.objectContaining({
          checkInMethod: CheckInMethod.MANUAL,
        })
      );
    });
  });

  describe('useCheckOut', () => {
    beforeEach(() => {
      // Mock active check-in
      mockUseExecutionStore.mockReturnValue({
        currentCheckIn: mockCheckIn,
        currentCheckOut: null,
        photos: [],
        isLoading: false,
        error: null,
        setCheckIn: mockSetCheckIn,
        setCheckOut: mockSetCheckOut,
        addPhoto: jest.fn(),
        removePhoto: jest.fn(),
        clearPhotos: jest.fn(),
        setLoading: mockSetLoading,
        setError: mockSetError,
        clearError: jest.fn(),
      });
    });

    it('should successfully check out', async () => {
      const mockCheckOutResponse = {
        id: 'checkout-123',
        serviceOrderId: mockServiceOrder.id,
        checkInId: mockCheckIn.id,
        checkOutTime: new Date().toISOString(),
        completionStatus: CompletionStatus.COMPLETED,
        location: mockCheckIn.location,
        metadata: mockCheckIn.metadata,
      };

      (apiService.post as jest.Mock).mockResolvedValueOnce(mockCheckOutResponse);

      const { result } = renderHook(() => useCheckOut(), {
        wrapper: createWrapper(),
      });

      const checkOutData = {
        serviceOrderId: mockServiceOrder.id,
        completionStatus: CompletionStatus.COMPLETED,
        workPerformed: {
          description: 'Installed kitchen cabinets',
          tasksCompleted: ['Cabinet installation', 'Hardware fitting'],
          issuesEncountered: [],
          workDuration: 180,
          breakDuration: 15,
        },
        materialsUsed: [],
        nextVisitRequired: false,
      };

      await result.current.mutateAsync(checkOutData);

      // Verify API was called
      expect(apiService.post).toHaveBeenCalledWith(
        '/check-outs',
        expect.objectContaining({
          serviceOrderId: checkOutData.serviceOrderId,
          checkInId: mockCheckIn.id,
          completionStatus: checkOutData.completionStatus,
          workPerformed: checkOutData.workPerformed,
        })
      );

      // Verify store was updated
      expect(mockSetCheckOut).toHaveBeenCalledWith(mockCheckOutResponse);
      expect(mockSetCheckIn).toHaveBeenCalledWith(null); // Clear check-in
      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    it('should throw error when no active check-in exists', async () => {
      // Mock no active check-in
      mockUseExecutionStore.mockReturnValue({
        currentCheckIn: null,
        currentCheckOut: null,
        photos: [],
        isLoading: false,
        error: null,
        setCheckIn: mockSetCheckIn,
        setCheckOut: mockSetCheckOut,
        addPhoto: jest.fn(),
        removePhoto: jest.fn(),
        clearPhotos: jest.fn(),
        setLoading: mockSetLoading,
        setError: mockSetError,
        clearError: jest.fn(),
      });

      const { result } = renderHook(() => useCheckOut(), {
        wrapper: createWrapper(),
      });

      const checkOutData = {
        serviceOrderId: mockServiceOrder.id,
        completionStatus: CompletionStatus.COMPLETED,
        workPerformed: {
          description: 'Work completed',
          tasksCompleted: [],
          issuesEncountered: [],
          workDuration: 120,
          breakDuration: 0,
        },
        nextVisitRequired: false,
      };

      await expect(result.current.mutateAsync(checkOutData)).rejects.toThrow(
        'No active check-in found'
      );

      // Verify error was set
      expect(mockSetError).toHaveBeenCalledWith('No active check-in found');
      expect(apiService.post).not.toHaveBeenCalled();
    });

    it('should include customer feedback in check-out', async () => {
      const mockCheckOutResponse = { id: 'checkout-123', serviceOrderId: mockServiceOrder.id };
      (apiService.post as jest.Mock).mockResolvedValueOnce(mockCheckOutResponse);

      const { result } = renderHook(() => useCheckOut(), {
        wrapper: createWrapper(),
      });

      const checkOutData = {
        serviceOrderId: mockServiceOrder.id,
        completionStatus: CompletionStatus.COMPLETED,
        workPerformed: {
          description: 'Work done',
          tasksCompleted: [],
          issuesEncountered: [],
          workDuration: 120,
          breakDuration: 0,
        },
        nextVisitRequired: false,
        customerFeedback: {
          rating: 5,
          comments: 'Excellent work!',
          wouldRecommend: true,
        },
      };

      await result.current.mutateAsync(checkOutData);

      expect(apiService.post).toHaveBeenCalledWith(
        '/check-outs',
        expect.objectContaining({
          customerFeedback: checkOutData.customerFeedback,
        })
      );
    });

    it('should handle check-out API failure', async () => {
      const errorMessage = 'Network error';
      (apiService.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useCheckOut(), {
        wrapper: createWrapper(),
      });

      const checkOutData = {
        serviceOrderId: mockServiceOrder.id,
        completionStatus: CompletionStatus.COMPLETED,
        workPerformed: {
          description: 'Work done',
          tasksCompleted: [],
          issuesEncountered: [],
          workDuration: 120,
          breakDuration: 0,
        },
        nextVisitRequired: false,
      };

      await expect(result.current.mutateAsync(checkOutData)).rejects.toThrow(errorMessage);

      // Verify error was set
      expect(mockSetError).toHaveBeenCalledWith(errorMessage);
      expect(mockSetCheckOut).not.toHaveBeenCalled();
    });
  });

  describe('useCheckInByServiceOrder', () => {
    it('should fetch check-in by service order ID', async () => {
      (apiService.get as jest.Mock).mockResolvedValueOnce(mockCheckIn);

      const { result } = renderHook(
        () => useCheckInByServiceOrder(mockServiceOrder.id),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiService.get).toHaveBeenCalledWith(
        `/check-ins/service-order/${mockServiceOrder.id}`
      );
      expect(result.current.data).toEqual(mockCheckIn);
    });

    it('should not fetch when service order ID is empty', () => {
      const { result } = renderHook(() => useCheckInByServiceOrder(''), {
        wrapper: createWrapper(),
      });

      expect(apiService.get).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });

    it('should handle fetch error', async () => {
      (apiService.get as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(
        () => useCheckInByServiceOrder(mockServiceOrder.id),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});
