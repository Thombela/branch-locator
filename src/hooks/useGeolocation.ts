import { useCallback, useState } from 'react';
import type { LatLng } from '@/api/schemas';

export type GeolocationProblem = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export type GeolocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'located'; location: LatLng; accuracyM: number }
  | { status: 'error'; problem: GeolocationProblem };

export const GEOLOCATION_MESSAGES: Record<GeolocationProblem, string> = {
  denied:
    'Location access is off for this site. You can turn it on in your browser settings, or search for a place instead.',
  unavailable: 'We couldn’t work out where you are right now. Try searching for a place instead.',
  timeout: 'Finding your location took too long. Try again, or search for a place.',
  unsupported: 'This browser can’t share your location. Search for a place instead.',
};

/**
 * Asks for the device location only when the customer taps "Use my location", not on page
 * load, so the permission prompt makes sense.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: 'idle' });

  const request = useCallback((): Promise<{ location: LatLng; accuracyM: number } | null> => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', problem: 'unsupported' });
      return Promise.resolve(null);
    }
    setState({ status: 'locating' });
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const result = {
            location: { lat: coords.latitude, lng: coords.longitude },
            accuracyM: coords.accuracy,
          };
          setState({ status: 'located', ...result });
          resolve(result);
        },
        (error) => {
          const problem: GeolocationProblem =
            error.code === error.PERMISSION_DENIED
              ? 'denied'
              : error.code === error.TIMEOUT
                ? 'timeout'
                : 'unavailable';
          setState({ status: 'error', problem });
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
      );
    });
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, request, reset };
}
