'use client';
import { useState, useCallback } from 'react';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
}

export interface GeoError {
  code: number;
  message: string;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<GeoError | null>(null);
  const [loading, setLoading] = useState(false);

  const getPosition = useCallback((): Promise<GeoPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = { code: 0, message: 'Geolocalización no soportada en este dispositivo' };
        setError(err);
        reject(err);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geoPos: GeoPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
          };
          setPosition(geoPos);
          setLoading(false);
          resolve(geoPos);
        },
        (err) => {
          const geoError: GeoError = {
            code: err.code,
            message: getGeoErrorMessage(err.code),
          };
          setError(geoError);
          setLoading(false);
          reject(geoError);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        },
      );
    });
  }, []);

  return { position, error, loading, getPosition };
}

function getGeoErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Permiso de ubicación denegado. Ve a los ajustes del navegador y permite el acceso a la ubicación.';
    case 2:
      return 'No se pudo obtener la ubicación. Comprueba tu conexión GPS o de red.';
    case 3:
      return 'Tiempo de espera agotado al obtener la ubicación. Inténtalo de nuevo.';
    default:
      return 'Error desconocido al obtener la ubicación.';
  }
}
