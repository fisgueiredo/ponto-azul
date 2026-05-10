type ReverseGeocodeResult = {
  city: string | null;
  address: string | null;
};

const CACHE_PREFIX = "pa:geo:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function cacheKey(lat: number, lng: number) {
  return `${CACHE_PREFIX}${lat.toFixed(4)},${lng.toFixed(4)}`;
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
