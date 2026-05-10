"use client";
import { useEffect, useRef, useState } from "react";
import { reverseGeocode } from "@/lib/geocode";
import { haversineMeters } from "@/lib/format";

const DEBOUNCE_MS = 500;
const ROUND_PRECISION = 4;
const MIN_MOVE_METERS = 100;

function round(n: number, p: number): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

export function useReverseGeocode(lat: number | null, lng: number | null) {
  const [city, setCity] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFetchedRef = useRef<{ lat: number; lng: number } | null>(null);

  const rLat = lat == null ? null : round(lat, ROUND_PRECISION);
  const rLng = lng == null ? null : round(lng, ROUND_PRECISION);

  useEffect(() => {
    if (rLat == null || rLng == null) {
      setCity(null);
      setAddress(null);
      setLoading(false);
      lastFetchedRef.current = null;
      return;
    }
    const last = lastFetchedRef.current;
    if (
      last &&
      haversineMeters(last, { lat: rLat, lng: rLng }) < MIN_MOVE_METERS
    ) {
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const handle = window.setTimeout(() => {
      reverseGeocode(rLat, rLng, { signal: ctrl.signal })
        .then((res) => {
          if (ctrl.signal.aborted) return;
          setCity(res.city);
          setAddress(res.address);
          lastFetchedRef.current = { lat: rLat, lng: rLng };
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          setCity(null);
          setAddress(null);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      ctrl.abort();
      window.clearTimeout(handle);
    };
  }, [rLat, rLng]);

  return { city, address, loading };
}
