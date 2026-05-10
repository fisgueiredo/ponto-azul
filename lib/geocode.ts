type ReverseGeocodeResult = {
  city: string | null;
  address: string | null;
};

export type ForwardGeocodeResult = {
  id: string;
  name: string;
  context: string | null;
  lat: number;
  lng: number;
  type: string | null;
  category: string | null;
  bbox: [number, number, number, number] | null;
};

const CACHE_PREFIX = "pa:geo:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const FWD_CACHE_PREFIX = "pa:geo:fwd:";
const FWD_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function cacheKey(lat: number, lng: number) {
  return `${CACHE_PREFIX}${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function fwdCacheKey(query: string, nearLat?: number | null, nearLng?: number | null) {
  const near =
    nearLat != null && nearLng != null
      ? `@${nearLat.toFixed(2)},${nearLng.toFixed(2)}`
      : "";
  return `${FWD_CACHE_PREFIX}${query.trim().toLowerCase()}${near}`;
}

function splitDisplayName(displayName: string): { name: string; context: string | null } {
  const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { name: displayName, context: null };
  if (parts.length === 1) return { name: parts[0], context: null };
  const name = parts[0];
  const context = parts.slice(1, Math.min(parts.length, 4)).join(", ");
  return { name, context };
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(cacheKey(lat, lng));
      if (raw) {
        const parsed = JSON.parse(raw) as ReverseGeocodeResult & { t: number };
        if (Date.now() - parsed.t < CACHE_TTL_MS) {
          return { city: parsed.city, address: parsed.address };
        }
      }
    } catch {
      // ignore cache errors
    }
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("accept-language", "pt-PT");
  url.searchParams.set("zoom", "18");

  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "pt-PT" },
  });
  if (!res.ok) return { city: null, address: null };

  const data = (await res.json()) as {
    address?: Record<string, string>;
    display_name?: string;
  };
  const a = data.address ?? {};
  const city =
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.county ||
    a.suburb ||
    null;

  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const locality = a.suburb || a.neighbourhood || a.village || a.town || a.city;
  const address = [street, locality].filter(Boolean).join(", ") || null;

  const result = { city, address };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        cacheKey(lat, lng),
        JSON.stringify({ ...result, t: Date.now() })
      );
    } catch {
      // ignore quota errors
    }
  }
  return result;
}

export async function forwardGeocode(
  query: string,
  options: {
    nearLat?: number | null;
    nearLng?: number | null;
    limit?: number;
    signal?: AbortSignal;
  } = {}
): Promise<ForwardGeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const key = fwdCacheKey(trimmed, options.nearLat, options.nearLng);
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { t: number; results: ForwardGeocodeResult[] };
        if (Date.now() - parsed.t < FWD_CACHE_TTL_MS) {
          return parsed.results;
        }
      }
    } catch {
      // ignore cache errors
    }
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("accept-language", "pt-PT");
  url.searchParams.set("countrycodes", "pt");
  url.searchParams.set("limit", String(options.limit ?? 6));
  url.searchParams.set("addressdetails", "0");

  if (options.nearLat != null && options.nearLng != null) {
    const bias = 1.5;
    const w = options.nearLng - bias;
    const e = options.nearLng + bias;
    const n = options.nearLat + bias;
    const s = options.nearLat - bias;
    url.searchParams.set("viewbox", `${w},${n},${e},${s}`);
    url.searchParams.set("bounded", "0");
  }

  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "pt-PT" },
    signal: options.signal,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    place_id?: number;
    osm_id?: number;
    osm_type?: string;
    lat: string;
    lon: string;
    display_name: string;
    type?: string;
    category?: string;
    boundingbox?: [string, string, string, string];
  }>;

  const results: ForwardGeocodeResult[] = data
    .map((d) => {
      const lat = Number(d.lat);
      const lng = Number(d.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const { name, context } = splitDisplayName(d.display_name);
      const bbox =
        d.boundingbox && d.boundingbox.length === 4
          ? ([
              Number(d.boundingbox[0]),
              Number(d.boundingbox[1]),
              Number(d.boundingbox[2]),
              Number(d.boundingbox[3]),
            ] as [number, number, number, number])
          : null;
      const id = `${d.osm_type ?? "p"}:${d.osm_id ?? d.place_id ?? `${lat},${lng}`}`;
      return {
        id,
        name,
        context,
        lat,
        lng,
        type: d.type ?? null,
        category: d.category ?? null,
        bbox: bbox && bbox.every(Number.isFinite) ? bbox : null,
      };
    })
    .filter((r): r is ForwardGeocodeResult => r !== null);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({ t: Date.now(), results })
      );
    } catch {
      // ignore quota errors
    }
  }
  return results;
}
