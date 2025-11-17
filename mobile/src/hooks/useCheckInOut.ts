import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { apiService } from '@services/api.service';
import { queryKeys } from '@config/react-query.config';
import { useExecutionStore } from '@store/execution.store';
import type {
  CheckIn,
  CheckOut,
  CheckInMethod,
  CompletionStatus,
  DeviceMetadata,
  SafetyHazard,
} from '@types/checkin-checkout.types';
import type { GeoLocation } from '@types/service-order.types';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Get current location
const getCurrentLocation = async (): Promise<GeoLocation> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission not granted');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    altitude: location.coords.altitude ?? undefined,
    accuracy: location.coords.accuracy ?? 0,
    timestamp: new Date(location.timestamp).toISOString(),
  };
};

// Get device metadata
const getDeviceMetadata = async (): Promise<DeviceMetadata> => {
  const batteryLevel = await Device.getBatteryLevelAsync?.() ?? 1.0;

  return {
    deviceId: Constants.sessionId || 'unknown',
    appVersion: Constants.expoConfig?.version || '1.0.0',
    networkStatus: 'ONLINE', // Will be determined by network check
    batteryLevel: batteryLevel * 100,
    osVersion: `${Platform.OS} ${Platform.Version}`,
    deviceModel: Device.modelName || 'unknown',
  };
};

// Check-in mutation
export const useCheckIn = () => {
  const queryClient = useQueryClient();
  const { setCheckIn, setError, setLoading } = useExecutionStore();

  return useMutation({
    mutationFn: async ({
      serviceOrderId,
      checkInMethod = CheckInMethod.GPS_AUTO,
      customerPresent,
      siteAccessNotes,
      safetyHazards = [],
    }: {
      serviceOrderId: string;
      checkInMethod?: CheckInMethod;
      customerPresent: boolean;
      siteAccessNotes?: string;
      safetyHazards?: SafetyHazard[];
    }) => {
      setLoading(true);

      try {
        const [location, metadata] = await Promise.all([
          getCurrentLocation(),
          getDeviceMetadata(),
        ]);

        const checkInData = {
          serviceOrderId,
          checkInMethod,
          location,
          locationAccuracy: location.accuracy,
          customerPresent,
          siteAccessNotes,
          safetyHazards,
          metadata,
          checkInTime: new Date().toISOString(),
          actualArrivalTime: new Date().toISOString(),
        };

        const checkIn = await apiService.post<CheckIn>('/check-ins', checkInData);
        setCheckIn(checkIn);
        setError(null);
        return checkIn;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Check-in failed';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    onSuccess: (checkIn) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.serviceOrders.detail(checkIn.serviceOrderId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
    },
  });
};

// Check-out mutation
export const useCheckOut = () => {
  const queryClient = useQueryClient();
  const { setCheckOut, setError, setLoading, currentCheckIn } = useExecutionStore();

  return useMutation({
    mutationFn: async ({
      serviceOrderId,
      completionStatus,
      workPerformed,
      materialsUsed = [],
      nextVisitRequired,
      nextVisitReason,
      customerFeedback,
    }: {
      serviceOrderId: string;
      completionStatus: CompletionStatus;
      workPerformed: {
        description: string;
        tasksCompleted: string[];
        issuesEncountered: string[];
        workDuration: number;
        breakDuration: number;
      };
      materialsUsed?: Array<{
        materialId: string;
        materialName: string;
        quantity: number;
        unit: string;
        notes?: string;
      }>;
      nextVisitRequired: boolean;
      nextVisitReason?: string;
      customerFeedback?: {
        rating: number;
        comments?: string;
        wouldRecommend: boolean;
      };
    }) => {
      setLoading(true);

      try {
        if (!currentCheckIn) {
          throw new Error('No active check-in found');
        }

        const [location, metadata] = await Promise.all([
          getCurrentLocation(),
          getDeviceMetadata(),
        ]);

        const checkOutData = {
          serviceOrderId,
          checkInId: currentCheckIn.id,
          completionStatus,
          workPerformed,
          materialsUsed,
          nextVisitRequired,
          nextVisitReason,
          customerFeedback,
          location,
          metadata,
          checkOutTime: new Date().toISOString(),
          departurePhotos: [], // Will be added separately
        };

        const checkOut = await apiService.post<CheckOut>('/check-outs', checkOutData);
        setCheckOut(checkOut);
        setCheckIn(null); // Clear check-in after successful check-out
        setError(null);
        return checkOut;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Check-out failed';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    onSuccess: (checkOut) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.serviceOrders.detail(checkOut.serviceOrderId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkOuts.all });
    },
  });
};

// Fetch check-in by service order
export const useCheckInByServiceOrder = (serviceOrderId: string) => {
  return useQuery({
    queryKey: queryKeys.checkIns.byServiceOrder(serviceOrderId),
    queryFn: async () => {
      const checkIn = await apiService.get<CheckIn>(
        `/check-ins/service-order/${serviceOrderId}`
      );
      return checkIn;
    },
    enabled: !!serviceOrderId,
  });
};
