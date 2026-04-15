import { Injectable } from '@nestjs/common';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeofenceCheckResult {
  isWithinZone: boolean;
  distanceMeters: number;
  radiusMeters: number;
  toleranceMeters: number;
  isWithinTolerance: boolean;
}

@Injectable()
export class GeofenceService {
  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * Returns distance in meters
   */
  calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371000; // Earth radius in meters
    const φ1 = this.toRadians(point1.latitude);
    const φ2 = this.toRadians(point2.latitude);
    const Δφ = this.toRadians(point2.latitude - point1.latitude);
    const Δλ = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if a GPS point is within a geofence
   */
  checkGeofence(
    employeeLocation: GeoPoint,
    centerLocation: GeoPoint,
    radiusMeters: number,
    toleranceMeters: number = 50,
  ): GeofenceCheckResult {
    const distanceMeters = this.calculateDistance(employeeLocation, centerLocation);
    const isWithinZone = distanceMeters <= radiusMeters;
    const isWithinTolerance = distanceMeters <= radiusMeters + toleranceMeters;

    return {
      isWithinZone,
      distanceMeters: Math.round(distanceMeters),
      radiusMeters,
      toleranceMeters,
      isWithinTolerance,
    };
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Find the nearest work center and check if employee is within its zone
   */
  findNearestCenter(
    employeeLocation: GeoPoint,
    centers: Array<{ id: string; latitude: number; longitude: number; radiusMeters: number }>,
  ): { centerId: string; distance: number; isWithinZone: boolean } | null {
    if (!centers.length) return null;

    let nearest = { centerId: '', distance: Infinity, isWithinZone: false };

    for (const center of centers) {
      if (!center.latitude || !center.longitude) continue;
      const distance = this.calculateDistance(employeeLocation, {
        latitude: center.latitude,
        longitude: center.longitude,
      });
      if (distance < nearest.distance) {
        nearest = {
          centerId: center.id,
          distance,
          isWithinZone: distance <= center.radiusMeters,
        };
      }
    }

    return nearest.centerId ? nearest : null;
  }
}
