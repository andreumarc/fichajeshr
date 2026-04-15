import { Test } from '@nestjs/testing';
import { GeofenceService } from './geofence.service';

describe('GeofenceService', () => {
  let service: GeofenceService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [GeofenceService],
    }).compile();
    service = module.get<GeofenceService>(GeofenceService);
  });

  describe('calculateDistance', () => {
    it('should return 0 for identical points', () => {
      const point = { latitude: 40.416775, longitude: -3.703790 };
      expect(service.calculateDistance(point, point)).toBe(0);
    });

    it('should calculate distance between Madrid and Barcelona (~505km)', () => {
      const madrid    = { latitude: 40.416775, longitude: -3.703790 };
      const barcelona = { latitude: 41.385064, longitude: 2.173404 };
      const dist = service.calculateDistance(madrid, barcelona);
      // Should be approximately 505,000 meters ± 5km
      expect(dist).toBeGreaterThan(500_000);
      expect(dist).toBeLessThan(510_000);
    });

    it('should calculate short distance accurately', () => {
      // Two points ~141m apart in Madrid (roughly sqrt(100²+100²))
      const p1 = { latitude: 40.416775, longitude: -3.703790 };
      const p2 = { latitude: 40.417673, longitude: -3.702537 }; // ~150m NE
      const dist = service.calculateDistance(p1, p2);
      expect(dist).toBeGreaterThan(100);
      expect(dist).toBeLessThan(200);
    });

    it('should be symmetric', () => {
      const a = { latitude: 40.416775, longitude: -3.703790 };
      const b = { latitude: 40.420000, longitude: -3.710000 };
      expect(service.calculateDistance(a, b)).toBeCloseTo(service.calculateDistance(b, a), 0);
    });
  });

  describe('checkGeofence', () => {
    const center = { latitude: 40.416775, longitude: -3.703790 };

    it('should return isWithinZone=true for point at center', () => {
      const result = service.checkGeofence(center, center, 200, 50);
      expect(result.isWithinZone).toBe(true);
      expect(result.isWithinTolerance).toBe(true);
      expect(result.distanceMeters).toBe(0);
    });

    it('should return isWithinZone=true for point inside radius', () => {
      // Point ~50m from center
      const nearby = { latitude: 40.417225, longitude: -3.703790 }; // ~50m north
      const result = service.checkGeofence(nearby, center, 200, 50);
      expect(result.isWithinZone).toBe(true);
    });

    it('should return isWithinZone=false but isWithinTolerance=true for point in tolerance band', () => {
      // Point ~220m from center (outside 200m radius, inside 200+50=250m tolerance)
      const outside = { latitude: 40.418747, longitude: -3.703790 }; // ~220m north
      const result = service.checkGeofence(outside, center, 200, 50);
      if (result.distanceMeters > 200 && result.distanceMeters <= 250) {
        expect(result.isWithinZone).toBe(false);
        expect(result.isWithinTolerance).toBe(true);
      }
    });

    it('should return isWithinZone=false and isWithinTolerance=false for far point', () => {
      const far = { latitude: 40.430000, longitude: -3.703790 }; // ~1.4km north
      const result = service.checkGeofence(far, center, 200, 50);
      expect(result.isWithinZone).toBe(false);
      expect(result.isWithinTolerance).toBe(false);
      expect(result.distanceMeters).toBeGreaterThan(1_000);
    });

    it('should return correct radius and tolerance in result', () => {
      const result = service.checkGeofence(center, center, 300, 75);
      expect(result.radiusMeters).toBe(300);
      expect(result.toleranceMeters).toBe(75);
    });
  });

  describe('findNearestCenter', () => {
    const employee = { latitude: 40.416775, longitude: -3.703790 };

    it('should return null for empty centers array', () => {
      expect(service.findNearestCenter(employee, [])).toBeNull();
    });

    it('should find the nearest of multiple centers', () => {
      const centers = [
        { id: 'madrid',    latitude: 40.416775, longitude: -3.703790, radiusMeters: 200 }, // same point
        { id: 'barcelona', latitude: 41.385064, longitude: 2.173404,  radiusMeters: 200 }, // far
        { id: 'getafe',    latitude: 40.305168, longitude: -3.731246, radiusMeters: 200 }, // ~13km
      ];
      const result = service.findNearestCenter(employee, centers);
      expect(result).not.toBeNull();
      expect(result!.centerId).toBe('madrid');
      expect(result!.isWithinZone).toBe(true);
    });

    it('should skip centers without coordinates', () => {
      const centers = [
        { id: 'no-coords', latitude: null as any, longitude: null as any, radiusMeters: 200 },
        { id: 'madrid',    latitude: 40.416775,   longitude: -3.703790,   radiusMeters: 200 },
      ];
      const result = service.findNearestCenter(employee, centers);
      expect(result?.centerId).toBe('madrid');
    });

    it('should return isWithinZone=false if outside nearest center radius', () => {
      const centers = [
        { id: 'barcelona', latitude: 41.385064, longitude: 2.173404, radiusMeters: 200 },
      ];
      const result = service.findNearestCenter(employee, centers);
      expect(result!.isWithinZone).toBe(false);
    });
  });
});
