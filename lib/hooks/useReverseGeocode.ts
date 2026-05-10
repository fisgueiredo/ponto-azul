"use client";
import { useEffect, useState } from "react";
import { reverseGeocode } from "@/lib/geocode";

export function useReverseGeocode(lat: number | null, lng: number | null) {
  const [city, setCity] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (lat == null || lng == null) {
      setCity(null);
      setAddress(null);
      return;
    }
    setLoading(true);
    reverseGeocode(lat, lng)
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
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return { city, address, loading };
}
