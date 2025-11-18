/**
 * Geofence Validation Utility
 *
 * Implements geofence validation for field service check-in operations.
 * Based on product-docs/domain/06-execution-field-operations.md
 * and product-docs/api/06-execution-mobile-api.md
 */

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface GeofenceValidationResult {
  valid: boolean;
  distanceMeters: number;
  requiresSupervisorApproval: boolean;
  message?: string;
}

export interface GeofenceConfig {
  /**
   * Geofence radius in meters (default: 100m)
   */
  radiusMeters: number;
  /**
   * Minimum GPS accuracy required in meters (default: 50m)
   */
  minAccuracyMeters: number;
  /**
   * Distance threshold for supervisor approval in meters (default: 500m)
   */
  supervisorApprovalThresholdMeters: number;
}

const DEFAULT_GEOFENCE_CONFIG: GeofenceConfig = {
  radiusMeters: 100,
  minAccuracyMeters: 50,
  supervisorApprovalThresholdMeters: 500,
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(point1: GeoLocation, point2: GeoLocation): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validate if a check-in location is within the geofence
 *
 * Business Rules (from domain/06-execution-field-operations.md:883-888):
 * 1. GPS accuracy must be within 50 meters for auto check-in
 * 2. Manual check-in requires supervisor approval if >500m from job site
 * 3. Geofence radius configurable per service area (default 100m)
 */
export function validateGeofence(
  checkInLocation: GeoLocation,
  serviceLocation: GeoLocation,
  gpsAccuracy: number | undefined,
  config: Partial<GeofenceConfig> = {},
): GeofenceValidationResult {
  const effectiveConfig: GeofenceConfig = {
    ...DEFAULT_GEOFENCE_CONFIG,
    ...config,
  };

  // Validate GPS accuracy
  if (gpsAccuracy !== undefined && gpsAccuracy > effectiveConfig.minAccuracyMeters) {
    return {
      valid: false,
      distanceMeters: 0,
      requiresSupervisorApproval: false,
      message: `GPS accuracy insufficient for auto check-in. Current accuracy: ${gpsAccuracy}m, required: <${effectiveConfig.minAccuracyMeters}m`,
    };
  }

  // Calculate distance
  const distance = calculateDistance(checkInLocation, serviceLocation);

  // Check if within geofence radius
  if (distance <= effectiveConfig.radiusMeters) {
    return {
      valid: true,
      distanceMeters: distance,
      requiresSupervisorApproval: false,
      message: `Check-in location verified: ${distance.toFixed(1)}m from service location`,
    };
  }

  // Check if requires supervisor approval (>500m)
  if (distance > effectiveConfig.supervisorApprovalThresholdMeters) {
    return {
      valid: false,
      distanceMeters: distance,
      requiresSupervisorApproval: true,
      message: `Manual check-in requires supervisor approval. Distance from service location: ${distance.toFixed(1)}m (threshold: ${effectiveConfig.supervisorApprovalThresholdMeters}m)`,
    };
  }

  // Within manual check-in range (100m-500m)
  return {
    valid: false,
    distanceMeters: distance,
    requiresSupervisorApproval: false,
    message: `Outside geofence radius. Distance from service location: ${distance.toFixed(1)}m (allowed radius: ${effectiveConfig.radiusMeters}m). Manual check-in with justification required.`,
  };
}

/**
 * Validate a polygon geofence (for complex service areas)
 * Uses ray-casting algorithm to determine if point is inside polygon
 */
export function isPointInPolygon(point: GeoLocation, polygon: GeoLocation[]): boolean {
  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Validate geofence using polygon boundary (if available)
 * Falls back to radius-based validation if no polygon is provided
 */
export function validateGeofencePolygon(
  checkInLocation: GeoLocation,
  serviceLocation: GeoLocation,
  gpsAccuracy: number | undefined,
  polygon?: GeoLocation[],
  config: Partial<GeofenceConfig> = {},
): GeofenceValidationResult {
  const effectiveConfig: GeofenceConfig = {
    ...DEFAULT_GEOFENCE_CONFIG,
    ...config,
  };

  // Validate GPS accuracy first
  if (gpsAccuracy !== undefined && gpsAccuracy > effectiveConfig.minAccuracyMeters) {
    return {
      valid: false,
      distanceMeters: 0,
      requiresSupervisorApproval: false,
      message: `GPS accuracy insufficient for auto check-in. Current accuracy: ${gpsAccuracy}m, required: <${effectiveConfig.minAccuracyMeters}m`,
    };
  }

  // Calculate distance for reporting purposes
  const distance = calculateDistance(checkInLocation, serviceLocation);

  // If polygon is provided, use polygon validation
  if (polygon && polygon.length >= 3) {
    const insidePolygon = isPointInPolygon(checkInLocation, polygon);

    if (insidePolygon) {
      return {
        valid: true,
        distanceMeters: distance,
        requiresSupervisorApproval: false,
        message: `Check-in location verified within service area polygon. Distance from service location: ${distance.toFixed(1)}m`,
      };
    }

    // Outside polygon - check if requires supervisor approval
    if (distance > effectiveConfig.supervisorApprovalThresholdMeters) {
      return {
        valid: false,
        distanceMeters: distance,
        requiresSupervisorApproval: true,
        message: `Outside service area polygon. Manual check-in requires supervisor approval. Distance: ${distance.toFixed(1)}m`,
      };
    }

    return {
      valid: false,
      distanceMeters: distance,
      requiresSupervisorApproval: false,
      message: `Outside service area polygon. Distance from service location: ${distance.toFixed(1)}m. Manual check-in with justification required.`,
    };
  }

  // Fall back to radius-based validation
  return validateGeofence(checkInLocation, serviceLocation, gpsAccuracy, config);
}
