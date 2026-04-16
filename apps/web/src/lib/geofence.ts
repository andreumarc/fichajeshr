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

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371000;
  const p1 = toRadians(point1.latitude);
  const p2 = toRadians(point2.latitude);
  const dp = toRadians(point2.latitude - point1.latitude);
  const dl = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function checkGeofence(
  employeeLocation: GeoPoint,
  centerLocation: GeoPoint,
  radiusMeters: number,
  toleranceMeters: number = 50,
): GeofenceCheckResult {
  const distanceMeters = calculateDistance(employeeLocation, centerLocation);
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
