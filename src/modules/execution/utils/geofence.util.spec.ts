import {
  calculateDistance,
  validateGeofence,
  isPointInPolygon,
  validateGeofencePolygon,
  type GeoLocation,
} from './geofence.util';

describe('GeofenceUtil', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      const madrid: GeoLocation = { lat: 40.4168, lng: -3.7038 };
      const barcelona: GeoLocation = { lat: 41.3851, lng: 2.1734 };

      const distance = calculateDistance(madrid, barcelona);

      // Distance should be approximately 504km
      expect(distance).toBeGreaterThan(500000);
      expect(distance).toBeLessThan(510000);
    });

    it('should return 0 for identical coordinates', () => {
      const point: GeoLocation = { lat: 40.4168, lng: -3.7038 };

      const distance = calculateDistance(point, point);

      expect(distance).toBe(0);
    });

    it('should calculate small distances accurately', () => {
      const point1: GeoLocation = { lat: 40.4168, lng: -3.7038 };
      const point2: GeoLocation = { lat: 40.4178, lng: -3.7048 }; // ~140m away

      const distance = calculateDistance(point1, point2);

      // Should be approximately 140 meters
      expect(distance).toBeGreaterThan(130);
      expect(distance).toBeLessThan(150);
    });
  });

  describe('validateGeofence', () => {
    const serviceLocation: GeoLocation = { lat: 40.4168, lng: -3.7038 };

    it('should validate successful check-in within geofence radius', () => {
      const checkInLocation: GeoLocation = { lat: 40.4169, lng: -3.7039 }; // ~15m away

      const result = validateGeofence(checkInLocation, serviceLocation, 10);

      expect(result.valid).toBe(true);
      expect(result.requiresSupervisorApproval).toBe(false);
      expect(result.distanceMeters).toBeLessThan(20);
      expect(result.message).toContain('verified');
    });

    it('should reject check-in with poor GPS accuracy', () => {
      const checkInLocation: GeoLocation = { lat: 40.4169, lng: -3.7039 };

      const result = validateGeofence(checkInLocation, serviceLocation, 60); // 60m accuracy > 50m threshold

      expect(result.valid).toBe(false);
      expect(result.requiresSupervisorApproval).toBe(false);
      expect(result.message).toContain('GPS accuracy insufficient');
      expect(result.message).toContain('60m');
    });

    it('should reject check-in outside geofence radius but within manual range', () => {
      const checkInLocation: GeoLocation = { lat: 40.4188, lng: -3.7058 }; // ~250m away

      const result = validateGeofence(checkInLocation, serviceLocation, 10);

      expect(result.valid).toBe(false);
      expect(result.requiresSupervisorApproval).toBe(false);
      expect(result.distanceMeters).toBeGreaterThan(200);
      expect(result.distanceMeters).toBeLessThan(300);
      expect(result.message).toContain('Outside geofence radius');
      expect(result.message).toContain('Manual check-in with justification required');
    });

    it('should require supervisor approval for check-in >500m away', () => {
      const checkInLocation: GeoLocation = { lat: 40.4218, lng: -3.7138 }; // ~1013m away

      const result = validateGeofence(checkInLocation, serviceLocation, 10);

      expect(result.valid).toBe(false);
      expect(result.requiresSupervisorApproval).toBe(true);
      expect(result.distanceMeters).toBeGreaterThan(900);
      expect(result.distanceMeters).toBeLessThan(1100);
      expect(result.message).toContain('supervisor approval');
    });

    it('should accept check-in with undefined GPS accuracy', () => {
      const checkInLocation: GeoLocation = { lat: 40.4169, lng: -3.7039 };

      const result = validateGeofence(checkInLocation, serviceLocation, undefined);

      expect(result.valid).toBe(true);
      expect(result.message).toContain('verified');
    });

    it('should use custom geofence config', () => {
      const checkInLocation: GeoLocation = { lat: 40.4188, lng: -3.7058 }; // ~250m away

      const result = validateGeofence(checkInLocation, serviceLocation, 10, {
        radiusMeters: 300, // Larger radius
      });

      expect(result.valid).toBe(true);
      expect(result.message).toContain('verified');
    });

    it('should use custom supervisor approval threshold', () => {
      const checkInLocation: GeoLocation = { lat: 40.4198, lng: -3.7098 }; // ~600m away

      const result = validateGeofence(checkInLocation, serviceLocation, 10, {
        supervisorApprovalThresholdMeters: 800, // Higher threshold (600m < 800m, so no supervisor approval)
      });

      expect(result.valid).toBe(false);
      expect(result.requiresSupervisorApproval).toBe(false);
      expect(result.message).toContain('Manual check-in with justification required');
    });
  });

  describe('isPointInPolygon', () => {
    it('should return true for point inside polygon', () => {
      const polygon: GeoLocation[] = [
        { lat: 40.0, lng: -3.0 },
        { lat: 41.0, lng: -3.0 },
        { lat: 41.0, lng: -2.0 },
        { lat: 40.0, lng: -2.0 },
      ];
      const point: GeoLocation = { lat: 40.5, lng: -2.5 };

      const result = isPointInPolygon(point, polygon);

      expect(result).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      const polygon: GeoLocation[] = [
        { lat: 40.0, lng: -3.0 },
        { lat: 41.0, lng: -3.0 },
        { lat: 41.0, lng: -2.0 },
        { lat: 40.0, lng: -2.0 },
      ];
      const point: GeoLocation = { lat: 39.5, lng: -2.5 };

      const result = isPointInPolygon(point, polygon);

      expect(result).toBe(false);
    });

    it('should handle complex polygon shapes', () => {
      const polygon: GeoLocation[] = [
        { lat: 40.0, lng: -3.0 },
        { lat: 40.5, lng: -2.5 },
        { lat: 41.0, lng: -3.0 },
        { lat: 40.5, lng: -3.5 },
      ];
      const insidePoint: GeoLocation = { lat: 40.5, lng: -3.0 };
      const outsidePoint: GeoLocation = { lat: 41.0, lng: -2.0 };

      expect(isPointInPolygon(insidePoint, polygon)).toBe(true);
      expect(isPointInPolygon(outsidePoint, polygon)).toBe(false);
    });

    it('should handle point on polygon edge', () => {
      const polygon: GeoLocation[] = [
        { lat: 40.0, lng: -3.0 },
        { lat: 41.0, lng: -3.0 },
        { lat: 41.0, lng: -2.0 },
        { lat: 40.0, lng: -2.0 },
      ];
      const edgePoint: GeoLocation = { lat: 40.5, lng: -3.0 };

      // Edge points may be considered inside or outside depending on algorithm
      const result = isPointInPolygon(edgePoint, polygon);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('validateGeofencePolygon', () => {
    const serviceLocation: GeoLocation = { lat: 40.4168, lng: -3.7038 };

    it('should validate check-in inside polygon geofence', () => {
      const polygon: GeoLocation[] = [
        { lat: 40.416, lng: -3.705 },
        { lat: 40.417, lng: -3.705 },
        { lat: 40.417, lng: -3.702 },
        { lat: 40.416, lng: -3.702 },
      ];
      const checkInLocation: GeoLocation = { lat: 40.4165, lng: -3.7035 };

      const result = validateGeofencePolygon(checkInLocation, serviceLocation, 10, polygon);

      expect(result.valid).toBe(true);
      expect(result.message).toContain('service area polygon');
    });

    it('should reject check-in outside polygon geofence', () => {
      const polygon: GeoLocation[] = [
        { lat: 40.416, lng: -3.705 },
        { lat: 40.417, lng: -3.705 },
        { lat: 40.417, lng: -3.702 },
        { lat: 40.416, lng: -3.702 },
      ];
      const checkInLocation: GeoLocation = { lat: 40.4188, lng: -3.7058 }; // Outside polygon

      const result = validateGeofencePolygon(checkInLocation, serviceLocation, 10, polygon);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Outside service area polygon');
    });

    it('should require supervisor approval for check-in far outside polygon', () => {
      const polygon: GeoLocation[] = [
        { lat: 40.416, lng: -3.705 },
        { lat: 40.417, lng: -3.705 },
        { lat: 40.417, lng: -3.702 },
        { lat: 40.416, lng: -3.702 },
      ];
      const checkInLocation: GeoLocation = { lat: 40.4218, lng: -3.7138 }; // >500m away

      const result = validateGeofencePolygon(checkInLocation, serviceLocation, 10, polygon);

      expect(result.valid).toBe(false);
      expect(result.requiresSupervisorApproval).toBe(true);
      expect(result.message).toContain('supervisor approval');
    });

    it('should fall back to radius validation if no polygon provided', () => {
      const checkInLocation: GeoLocation = { lat: 40.4169, lng: -3.7039 };

      const result = validateGeofencePolygon(checkInLocation, serviceLocation, 10, undefined);

      expect(result.valid).toBe(true);
      expect(result.message).toContain('verified');
    });

    it('should fall back to radius validation if polygon has <3 points', () => {
      const checkInLocation: GeoLocation = { lat: 40.4169, lng: -3.7039 };
      const invalidPolygon: GeoLocation[] = [
        { lat: 40.416, lng: -3.705 },
        { lat: 40.417, lng: -3.705 },
      ];

      const result = validateGeofencePolygon(checkInLocation, serviceLocation, 10, invalidPolygon);

      expect(result.valid).toBe(true);
      expect(result.message).toContain('verified');
    });

    it('should reject check-in with poor GPS accuracy even with valid polygon', () => {
      const polygon: GeoLocation[] = [
        { lat: 40.416, lng: -3.705 },
        { lat: 40.417, lng: -3.705 },
        { lat: 40.417, lng: -3.702 },
        { lat: 40.416, lng: -3.702 },
      ];
      const checkInLocation: GeoLocation = { lat: 40.4165, lng: -3.7035 };

      const result = validateGeofencePolygon(checkInLocation, serviceLocation, 60, polygon);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('GPS accuracy insufficient');
    });
  });
});
