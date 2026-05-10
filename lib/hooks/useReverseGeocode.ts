"use client";
import { useEffect, useState } from "react";
import { reverseGeocode } from "@/lib/geocode";

const DEBOUNCE_MS = 350;
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
    let cancelled = false;
    if (rLat == null || rLng == null) {
      setCity(null);
      setAddress(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = window.setTimeout(() => {
      reverseGeocode(rLat, rLng)
        .then((res) => {
          if (cancelled) return;
          setCity(res.city);
          setAddress(res.address);
        })
        .catch(() => {
          if (cancelled) return;
          setCity(null);
          setAddress(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [rLat, rLng]);

  return { city, address, loading };
}
