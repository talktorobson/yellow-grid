import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DistanceResult {
  distanceKm: number;
  method: 'haversine' | 'google_distance_matrix';
  calculatedAt: Date;
}

export interface DistanceCalculationOptions {
  /**
   * Preferred calculation method
   * - 'haversine': Fast, as-the-crow-flies distance (default)
   * - 'google_distance_matrix': Driving distance via Google Maps API (requires API key)
   */
  method?: 'haversine' | 'google_distance_matrix';

  /**
   * For Google Distance Matrix API
   */
  travelMode?: 'driving' | 'walking' | 'bicycling' | 'transit';
}

/**
 * Distance Calculation Service
 *
 * Provides geographic distance calculations between two points using:
 * 1. Haversine formula (default) - fast, accurate as-the-crow-flies distance
 * 2. Google Distance Matrix API (optional) - real driving distance via roads
 *
 * Based on documentation/domain/05-assignment-dispatch-logic.md
 * Distance scoring is 20% of provider ranking score.
 */
@Injectable()
export class DistanceCalculationService {
  private readonly logger = new Logger(DistanceCalculationService.name);
  private readonly googleMapsApiKey?: string;
  private readonly defaultMethod: 'haversine' | 'google_distance_matrix';

  // Earth's radius in kilometers
  private readonly EARTH_RADIUS_KM = 6371;

  constructor(private readonly configService: ConfigService) {
    this.googleMapsApiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    this.defaultMethod = this.googleMapsApiKey ? 'google_distance_matrix' : 'haversine';
  }

  /**
   * Calculate distance between two points
   *
   * @param from - Origin coordinates
   * @param to - Destination coordinates
   * @param options - Calculation options
   * @returns Distance result with method used
   */
  async calculateDistance(
    from: Coordinates,
    to: Coordinates,
    options?: DistanceCalculationOptions,
  ): Promise<DistanceResult> {
    const method = options?.method || this.defaultMethod;

    // Validate coordinates
    this.validateCoordinates(from);
    this.validateCoordinates(to);

    let distanceKm: number;

    if (method === 'google_distance_matrix' && this.googleMapsApiKey) {
      try {
        distanceKm = await this.calculateDistanceViaGoogleAPI(
          from,
          to,
          options?.travelMode || 'driving',
        );
      } catch (error) {
        this.logger.warn(
          `Google Distance Matrix API failed, falling back to Haversine: ${error.message}`,
        );
        distanceKm = this.calculateHaversineDistance(from, to);
      }
    } else {
      distanceKm = this.calculateHaversineDistance(from, to);
    }

    return {
      distanceKm: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
      method:
        method === 'google_distance_matrix' && this.googleMapsApiKey
          ? 'google_distance_matrix'
          : 'haversine',
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate distance score for provider ranking
   *
   * Scoring ranges (from documentation/domain/05-assignment-dispatch-logic.md):
   * - 0-10 km = 20 points
   * - 10-30 km = 15 points
   * - 30-50 km = 10 points
   * - >50 km = 5 points
   *
   * @param distanceKm - Distance in kilometers
   * @returns Score between 5 and 20 points
   */
  calculateDistanceScore(distanceKm: number): number {
    if (distanceKm <= 10) {
      return 20;
    } else if (distanceKm <= 30) {
      return 15;
    } else if (distanceKm <= 50) {
      return 10;
    } else {
      return 5;
    }
  }

  /**
   * Calculate as-the-crow-flies distance using Haversine formula
   *
   * The Haversine formula calculates the great-circle distance between two points
   * on a sphere given their longitudes and latitudes.
   *
   * Formula:
   * a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
   * c = 2 ⋅ atan2(√a, √(1−a))
   * d = R ⋅ c
   *
   * where φ is latitude, λ is longitude, R is earth's radius
   *
   * @param from - Origin coordinates
   * @param to - Destination coordinates
   * @returns Distance in kilometers
   */
  private calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
    const lat1Rad = this.toRadians(from.latitude);
    const lat2Rad = this.toRadians(to.latitude);
    const deltaLatRad = this.toRadians(to.latitude - from.latitude);
    const deltaLonRad = this.toRadians(to.longitude - from.longitude);

    // Haversine formula
    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceKm = this.EARTH_RADIUS_KM * c;

    return distanceKm;
  }

  /**
   * Calculate driving distance using Google Distance Matrix API
   *
   * @param from - Origin coordinates
   * @param to - Destination coordinates
   * @param travelMode - Travel mode (driving, walking, bicycling, transit)
   * @returns Distance in kilometers
   */
  private async calculateDistanceViaGoogleAPI(
    from: Coordinates,
    to: Coordinates,
    travelMode: string,
  ): Promise<number> {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.append('origins', `${from.latitude},${from.longitude}`);
    url.searchParams.append('destinations', `${to.latitude},${to.longitude}`);
    url.searchParams.append('mode', travelMode);
    url.searchParams.append('key', this.googleMapsApiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google API returned status: ${data.status}`);
    }

    if (!data.rows?.[0]?.elements?.[0]) {
      throw new Error('Invalid response structure from Google API');
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      throw new Error(`Distance calculation failed: ${element.status}`);
    }

    // Google returns distance in meters, convert to kilometers
    const distanceMeters = element.distance.value;
    const distanceKm = distanceMeters / 1000;

    return distanceKm;
  }

  /**
   * Convert Prisma Decimal coordinates to number coordinates
   *
   * @param latitude - Prisma Decimal latitude
   * @param longitude - Prisma Decimal longitude
   * @returns Coordinates object with numbers
   */
  decimalToCoordinates(latitude: Decimal | null, longitude: Decimal | null): Coordinates | null {
    if (!latitude || !longitude) {
      return null;
    }

    return {
      latitude: Number(latitude),
      longitude: Number(longitude),
    };
  }

  /**
   * Validate coordinates
   *
   * @param coords - Coordinates to validate
   * @throws Error if coordinates are invalid
   */
  private validateCoordinates(coords: Coordinates): void {
    if (!coords) {
      throw new Error('Coordinates are required');
    }

    if (typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      throw new Error('Latitude and longitude must be numbers');
    }

    if (coords.latitude < -90 || coords.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    if (coords.longitude < -180 || coords.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }
  }

  /**
   * Convert degrees to radians
   *
   * @param degrees - Angle in degrees
   * @returns Angle in radians
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
