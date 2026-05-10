"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase, supabaseConfigured, Place } from "@/lib/supabase";

export type UsePlacesOpts = {
  userLat?: number | null;
  userLng?: number | null;
};

export function usePlaces({ userLat, userLng }: UsePlacesOpts = {}) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setError("Supabase não configurado");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    if (userLat != null && userLng != null) {
      const { data, error } = await supabase!.rpc("places_near", {
        user_lat: userLat,
        user_lng: userLng,
      });
      if (error) setError(error.message);
      else setPlaces((data ?? []) as Place[]);
    } else {
      const { data, error } = await supabase!
        .from("places_with_coords")
        .select("id, title, description, lat, lng, created_at")
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      else
        setPlaces(
          (data ?? []).map((row) => ({
            ...(row as Omit<Place, "distance_m">),
            distance_m: Number.NaN,
          }))
        );
    }
    setLoading(false);
  }, [userLat, userLng]);

  useEffect(() => {
    load();
  }, [load]);

  return { places, loading, error, refetch: load };
}

export function usePlace(id: string | null | undefined) {
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    supabase!
      .from("places_with_coords")
      .select("id, title, description, lat, lng, created_at")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else if (data)
          setPlace({ ...(data as Omit<Place, "distance_m">), distance_m: Number.NaN });
        else setPlace(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { place, loading, error };
}
