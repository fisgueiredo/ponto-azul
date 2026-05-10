"use client";
import { useEffect, useState } from "react";
import { reverseGeocode } from "@/lib/geocode";

const DEBOUNCE_MS = 500;
const ROUND_PRECISION = 4;

function round(n: number, p: number): number {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

export function useReverseGeocode(lat: number | null, lng: number | null) {
  const [city, setCity] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rLat = lat == null ? null : round(lat, ROUND_PRECISION);
  const rLng = lng == null ? null : round(lng, ROUND_PRECISION);

  useEffect(() => {
    if (rLat == null || rLng == null) {
      setCity(null);
      setAddress(null);
      setLoading(false);
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
