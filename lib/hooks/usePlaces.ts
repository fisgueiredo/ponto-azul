"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigured, Place } from "@/lib/supabase";
import { haversineMeters } from "@/lib/format";

const CACHE_KEY = "pa:places:v1";

type StoredPlace = {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
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

function writeCache(places: StoredPlace[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(places));
  } catch {
    // localStorage quota — ignore
  }
}

function withDistance(
  base: StoredPlace[],
  userLat: number | null | undefined,
  userLng: number | null | undefined
): Place[] {
  if (userLat == null || userLng == null) {
    return base.map((p) => ({ ...p, distance_m: Number.NaN }));
  }
  const u = { lat: userLat, lng: userLng };
  return base
    .map((p) => ({
      ...p,
      distance_m: haversineMeters(u, { lat: p.lat, lng: p.lng }),
    }))
    .sort((a, b) => a.distance_m - b.distance_m);
}

export function usePlaces({
  userLat,
  userLng,
}: { userLat?: number | null; userLng?: number | null } = {}) {
  const [base, setBase] = useState<StoredPlace[] | null>(() => readCache());
  const [loading, setLoading] = useState<boolean>(base == null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!supabaseConfigured) {
      setError("Supabase não configurado");
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error } = await supabase!
      .from("places_with_coords")
      .select("id, title, description, lat, lng, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const next = (data ?? []) as StoredPlace[];
    setBase(next);
    writeCache(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

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
      .select("id, title, description, lat, lng, created_at")
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
