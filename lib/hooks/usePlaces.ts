"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, supabaseConfigured, Place } from "@/lib/supabase";
import { haversineMeters } from "@/lib/format";

const CACHE_KEY = "pa:places:v2";
const CACHE_META_KEY = "pa:places:v2:meta";
const FRESH_TTL_MS = 30_000;

type StoredPlace = {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  spots: number;
  created_at: string;
};

function readCache(): StoredPlace[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as StoredPlace[];
  } catch {
    return null;
  }
}

function readCacheMeta(): { ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { ts: number };
  } catch {
    return null;
  }
}

function writeCache(places: StoredPlace[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(places));
    window.localStorage.setItem(
      CACHE_META_KEY,
      JSON.stringify({ ts: Date.now() })
    );
  } catch {
    // localStorage quota — ignore
  }
}

function placesIdentical(a: StoredPlace[], b: StoredPlace[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.title !== y.title ||
      x.description !== y.description ||
      x.lat !== y.lat ||
      x.lng !== y.lng ||
      x.spots !== y.spots ||
      x.created_at !== y.created_at
    ) {
      return false;
    }
  }
  return true;
}

function withDistance(
  base: StoredPlace[],
  userLat: number | null | undefined,
  userLng: number | null | undefined
): Place[] {
  if (userLat == null || userLng == null) {
    const out = new Array<Place>(base.length);
    for (let i = 0; i < base.length; i++) {
      out[i] = { ...base[i], distance_m: Number.NaN };
    }
    return out;
  }
  const u = { lat: userLat, lng: userLng };
  const out = new Array<Place>(base.length);
  for (let i = 0; i < base.length; i++) {
    const p = base[i];
    out[i] = {
      ...p,
      distance_m: haversineMeters(u, { lat: p.lat, lng: p.lng }),
    };
  }
  return out;
}

export function usePlaces({
  userLat,
  userLng,
}: { userLat?: number | null; userLng?: number | null } = {}) {
  const [base, setBase] = useState<StoredPlace[] | null>(() => readCache());
  const [loading, setLoading] = useState<boolean>(base == null);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refetch = useCallback(async () => {
    if (!supabaseConfigured) {
      setError("Supabase não configurado");
      setLoading(false);
      return;
    }
    if (inFlightRef.current) return inFlightRef.current;
    const p = (async () => {
      setError(null);
      const { data, error } = await supabase!
        .from("places_with_coords")
        .select("id, title, description, lat, lng, spots, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const next = (data ?? []) as StoredPlace[];
      setBase((prev) => (prev && placesIdentical(prev, next) ? prev : next));
      writeCache(next);
      setLoading(false);
    })();
    inFlightRef.current = p;
    try {
      await p;
    } finally {
      inFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    const meta = readCacheMeta();
    if (base && meta && Date.now() - meta.ts < FRESH_TTL_MS) {
      // Cache is fresh — skip refetch on mount.
      setLoading(false);
      return;
    }
    refetch();
  }, [refetch, base]);

  const places = useMemo(
    () => withDistance(base ?? [], userLat, userLng),
    [base, userLat, userLng]
  );

  return {
    places,
    loading: loading && base == null,
    error,
    refetch,
  };
}

export function usePlace(id: string | null | undefined) {
  const cached = useMemo(() => {
    if (!id) return null;
    const all = readCache();
    if (!all) return null;
    const found = all.find((p) => p.id === id);
    return found ?? null;
  }, [id]);

  const [place, setPlace] = useState<Place | null>(
    cached ? { ...cached, distance_m: Number.NaN } : null
  );
  const [loading, setLoading] = useState<boolean>(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setPlace(null);
      setLoading(false);
      return;
    }
    if (!supabaseConfigured) {
      setError("Supabase não configurado");
      setLoading(false);
      return;
    }
    supabase!
      .from("places_with_coords")
      .select("id, title, description, lat, lng, spots, created_at")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        if (data) {
          setPlace({
            ...(data as Omit<Place, "distance_m">),
            distance_m: Number.NaN,
          });
        } else {
          setPlace(null);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { place, loading, error };
}
