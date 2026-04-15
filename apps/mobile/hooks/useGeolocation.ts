import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getPosition = useCallback(async (): Promise<GeoPosition> => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const msg = 'Permiso de ubicación denegado. Ve a Ajustes > Aplicaciones > Fichaje y activa la ubicación.';
        setError(msg);
        throw new Error(msg);
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const pos: GeoPosition = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
      };
      setPosition(pos);
      return pos;
    } catch (err: any) {
      const msg = err.message ?? 'Error al obtener ubicación';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { position, error, loading, getPosition };
}
