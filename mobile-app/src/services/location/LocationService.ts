import * as Location from 'expo-location';
import { GeoLocation } from '../../types/api';

export class LocationService {
  private static instance: LocationService;

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request permissions and get current location
   */
  async getCurrentLocation(): Promise<GeoLocation> {
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
      accuracy: location.coords.accuracy || 0,
      altitude: location.coords.altitude || 0,
      heading: location.coords.heading || 0,
    };
  }
}
