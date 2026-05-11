"use client";
import { useEffect, useRef, useState } from "react";

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

const CACHE_KEY = "pa:lastFix";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type CachedFix = {
  lat: number;
  lng: number;
  accuracy: number | null;
  ts: number;
};

function readCachedFix(): CachedFix | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFix;
    if (
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lng) ||
      !Number.isFinite(parsed.ts)
    ) {
      return null;
    }
    if (Date.now() - parsed.ts > CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedFix(fix: CachedFix) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(fix));
  } catch {
    // ignore
  }
}

export function useGeolocation(
  opts: { watch?: boolean; enabled?: boolean; useCache?: boolean } = {}
) {
  const { watch = true, enabled = true, useCache = true } = opts;
  const [state, setState] = useState<GeolocationState>(() => {
    if (!useCache) return DEFAULT;
    const cached = readCachedFix();
    if (!cached) return DEFAULT;
    return {
      ...DEFAULT,
      lat: cached.lat,
      lng: cached.lng,
      accuracy: cached.accuracy,
    };
  });
  const retryRef = useRef<{ attempt: number; timer: number | null }>({
    attempt: 0,
    timer: null,
  });

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: "geolocation indisponível",
        loading: false,
      }));
      return;
    }

    let cancelled = false;
    let watchId: number | null = null;
    const retry = retryRef.current;

    const clearTimer = () => {
      if (retry.timer != null) {
        window.clearTimeout(retry.timer);
        retry.timer = null;
      }
    };

    // Start with a high-accuracy fix so we centre the map precisely, then
    // downgrade to network-based fixes — they arrive faster, drain less
    // battery, and the ~30-100 m precision is plenty for showing distances
    // and "lugares perto".
    let highAccuracyDone = false;
    let currentOnError: ((err: GeolocationPositionError) => void) | null = null;

    const onSuccess = (pos: GeolocationPosition) => {
      if (cancelled) return;
      retry.attempt = 0;
      clearTimer();
      const next: GeolocationState = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        error: null,
        loading: false,
        permission: "granted",
      };
      setState(next);
      writeCachedFix({
        lat: next.lat!,
        lng: next.lng!,
        accuracy: next.accuracy,
        ts: Date.now(),
      });

      if (watch && !highAccuracyDone && currentOnError) {
        highAccuracyDone = true;
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
        watchId = navigator.geolocation.watchPosition(onSuccess, currentOnError, {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 10 * 60 * 1000,
        });
      }
    };

    const start = () => {
      if (cancelled) return;
      setState((s) => ({ ...s, loading: true, error: null }));
      const options: PositionOptions = {
        enableHighAccuracy: !highAccuracyDone,
        timeout: 15000,
        maximumAge: 5 * 60 * 1000,
      };

      const onError = (err: GeolocationPositionError) => {
        if (cancelled) return;
        const denied = err.code === err.PERMISSION_DENIED;
        let message: string;
        if (denied) {
          message = "permissão de localização negada";
        } else if (err.code === err.TIMEOUT) {
          message = "tempo esgotado a obter localização";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = "localização indisponível";
        } else {
          message = err.message || "não foi possível obter localização";
        }
        setState((s) => ({
          ...s,
          error: message,
          loading: false,
          permission: denied ? "denied" : s.permission,
        }));
        if (denied) return;
        retry.attempt = Math.min(retry.attempt + 1, 6);
        const delay = Math.min(30_000, 2_000 * 2 ** (retry.attempt - 1));
        clearTimer();
        retry.timer = window.setTimeout(() => {
          if (cancelled) return;
          if (watch) {
            // re-arm the watcher on persistent failure
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
            }
            watchId = navigator.geolocation.watchPosition(
              onSuccess,
              onError,
              options
            );
          } else {
            navigator.geolocation.getCurrentPosition(
              onSuccess,
              onError,
              options
            );
          }
        }, delay);
      };
      currentOnError = onError;

      if (watch) {
        watchId = navigator.geolocation.watchPosition(
          onSuccess,
          onError,
          options
        );
      } else {
        navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
      }
    };

    start();

    let permStatus: PermissionStatus | null = null;
    const onPermChange = () => {
      if (!permStatus || cancelled) return;
      const next = permStatus.state;
      setState((s) => ({ ...s, permission: next }));
      if (next === "granted") {
        retry.attempt = 0;
        clearTimer();
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
        start();
      }
    };
    const permissions = (
      navigator as Navigator & {
        permissions?: {
          query: (d: { name: PermissionName }) => Promise<PermissionStatus>;
        };
      }
    ).permissions;
    if (permissions?.query) {
      permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          if (cancelled) return;
          permStatus = status;
          setState((s) => ({ ...s, permission: status.state }));
          status.addEventListener?.("change", onPermChange);
        })
        .catch(() => {
          // permissions API unavailable — ignore
        });
    }

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      // user came back — refresh fix; watcher may have paused on mobile
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        () => {
          // swallow — main watcher / retry loop handles errors
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
      );
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimer();
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      document.removeEventListener("visibilitychange", onVisibility);
      if (permStatus) {
        permStatus.removeEventListener?.("change", onPermChange);
      }
    };
  }, [watch, enabled]);

  return state;
}
