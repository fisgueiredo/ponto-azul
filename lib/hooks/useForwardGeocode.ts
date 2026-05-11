"use client";
import { useEffect, useState } from "react";
import { forwardGeocode, ForwardGeocodeResult } from "@/lib/geocode";

const DEBOUNCE_MS = 220;
const MIN_QUERY = 2;

export function useForwardGeocode(
  query: string,
  options: { nearLat?: number | null; nearLng?: number | null } = {}
) {
  const [results, setResults] = useState<ForwardGeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();
  const nearLat = options.nearLat ?? null;
  const nearLng = options.nearLng ?? null;

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const handle = window.setTimeout(() => {
      forwardGeocode(trimmed, { nearLat, nearLng, signal: ctrl.signal })
        .then((rs) => {
          if (ctrl.signal.aborted) return;
          setResults(rs);
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          setResults([]);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      ctrl.abort();
      window.clearTimeout(handle);
    };
  }, [trimmed, nearLat, nearLng]);

  return { results, loading };
}
