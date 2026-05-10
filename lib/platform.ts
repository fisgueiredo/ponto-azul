export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1)
  );
}

export function mapsUrl(lat: number, lng: number): string {
  if (isIOS()) return `maps://?daddr=${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}`;
}
