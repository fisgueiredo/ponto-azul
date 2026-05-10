"use client";
import { useEffect, useState } from "react";

export type GeolocationState = {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  permission: PermissionState | "unknown";
};

const DEFAULT: GeolocationState = {
  lat: null,
  lng: null,
  accuracy: null,
  error: null,
  loading: false,
  permission: "unknown",
};

export function useGeolocation(opts: { watch?: boolean; enabled?: boolean } = {}) {
  const { watch = false, enabled = true } = opts;
  const [state, setState] = useState<GeolocationState>(DEFAULT);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({ ...s, error: "geolocation indisponível", loading: false }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    let watchId: number | null = null;

    const onSuccess = (pos: GeolocationPosition) =>
      setState({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        error: null,
        loading: false,
        permission: "granted",
      });

    const onError = (err: GeolocationPositionError) =>
      setState((s) => ({
        ...s,
        error: err.message,
        loading: false,
        permission: err.code === err.PERMISSION_DENIED ? "denied" : s.permission,
      }));

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    };

    if (watch) {
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watch, enabled]);

  return state;
}
