"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { usePlaces } from "@/lib/hooks/usePlaces";
import { useReverseGeocode } from "@/lib/hooks/useReverseGeocode";
import { useForwardGeocode } from "@/lib/hooks/useForwardGeocode";
import { ForwardGeocodeResult } from "@/lib/geocode";
import {
  ISearch,
  ISettings,
  ILocate,
  IPlus,
  IMapPin,
  IChevDown,
  ICheck,
  ISort,
  ILayers,
  ICompass,
} from "@/components/Icons";
import { formatDistance, haversineMeters, normalizeText } from "@/lib/format";
import BottomSheet from "@/components/BottomSheet";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type SortKey = "distance" | "recent" | "name";
const SORT_LABELS: Record<SortKey, string> = {
  distance: "Distância",
  recent: "Mais recentes",
  name: "Nome (A-Z)",
};

type MapStyleKind = "standard" | "satellite";
const MAP_STYLE_LABELS: Record<MapStyleKind, string> = {
  standard: "Normal",
  satellite: "Satélite",
};
const MAP_STYLE_KEY = "pa:mapStyle";

type Bounds = { south: number; north: number; west: number; east: number };

function isInBounds(p: { lat: number; lng: number }, b: Bounds) {
  return p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east;
}

export default function HomePage() {
  const router = useRouter();
  const geo = useGeolocation();
  const userPosition = useMemo(
    () =>
      geo.lat != null && geo.lng != null
        ? { lat: geo.lat, lng: geo.lng }
        : null,
    [geo.lat, geo.lng]
  );
  const { places, loading } = usePlaces({
    userLat: userPosition?.lat,
    userLng: userPosition?.lng,
  });

  const restoredCenter = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem("pa:mapCenter");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { lat: number; lng: number };
      if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [autoCentered, setAutoCentered] = useState(restoredCenter !== null);
  const [sheetHeight, setSheetHeight] = useState(280);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(
    restoredCenter
  );
  const [viewport, setViewport] = useState<{
    center: { lat: number; lng: number };
    bounds: Bounds;
  } | null>(null);
  const [sort, setSort] = useState<SortKey>("distance");
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mapStyle, setMapStyle] = useState<MapStyleKind>("standard");
  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bearing, setBearing] = useState(0);
  const [resetBearing, setResetBearing] = useState<{ ts: number } | null>(null);
  const [searchOrigin, setSearchOrigin] = useState<
    { lat: number; lng: number; label: string } | null
  >(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const referencePoint = viewport?.center ?? mapCenter ?? searchOrigin ?? userPosition;
  const { city } = useReverseGeocode(
    referencePoint?.lat ?? null,
    referencePoint?.lng ?? null
  );
  const { results: geoResults, loading: geoLoading } = useForwardGeocode(query, {
    nearLat: referencePoint?.lat ?? null,
    nearLng: referencePoint?.lng ?? null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(MAP_STYLE_KEY);
      if (saved === "standard" || saved === "satellite") {
        setMapStyle(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(MAP_STYLE_KEY, mapStyle);
    } catch {
      // ignore
    }
  }, [mapStyle]);

  useEffect(() => {
    if (autoCentered || !userPosition) return;
    setFlyTo({ ...userPosition, ts: Date.now() });
    setAutoCentered(true);
  }, [userPosition, autoCentered]);

  useEffect(() => {
    if (!mapCenter) return;
    try {
      window.sessionStorage.setItem("pa:mapCenter", JSON.stringify(mapCenter));
    } catch {
      // ignore
    }
  }, [mapCenter]);

  useEffect(() => {
    router.prefetch("/adicionar");
    router.prefetch("/definicoes");
  }, [router]);

  const onLocate = () => {
    if (!userPosition) return;
    setFlyTo({ ...userPosition, ts: Date.now() });
  };

  const placesWithRefDistance = useMemo(() => {
    if (!referencePoint) return places;
    return places.map((p) => ({
      ...p,
      distance_m: haversineMeters(
        { lat: referencePoint.lat, lng: referencePoint.lng },
        { lat: p.lat, lng: p.lng }
      ),
    }));
  }, [places, referencePoint]);

  const queryMatchedIds = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    const n = normalizeText(q);
    const ids = new Set<string>();
    for (const p of placesWithRefDistance) {
      if (normalizeText(p.title).includes(n)) ids.add(p.id);
    }
    if (geoResults.length > 0) {
      for (const r of geoResults) {
        if (!r.bbox) continue;
        const [latS, latN, lonW, lonE] = r.bbox;
        const dLat = latN - latS;
        const dLng = lonE - lonW;
        if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) continue;
        // Skip absurdly large boxes (e.g. country-level matches) — keep matching practical.
        if (dLat > 1.5 || dLng > 1.5) continue;
        for (const p of placesWithRefDistance) {
          if (ids.has(p.id)) continue;
          if (
            p.lat >= latS &&
            p.lat <= latN &&
            p.lng >= lonW &&
            p.lng <= lonE
          ) {
            ids.add(p.id);
          }
        }
      }
    }
    return ids;
  }, [placesWithRefDistance, query, geoResults]);

  const localMatches = useMemo(() => {
    if (!queryMatchedIds || queryMatchedIds.size === 0) return [];
    return placesWithRefDistance
      .filter((p) => queryMatchedIds.has(p.id))
      .slice()
      .sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0))
      .slice(0, 8);
  }, [placesWithRefDistance, queryMatchedIds]);

  const sorted = useMemo(() => {
    const base = queryMatchedIds
      ? placesWithRefDistance.filter((p) => queryMatchedIds.has(p.id))
      : placesWithRefDistance.slice();
    if (sort === "name") {
      base.sort((a, b) => a.title.localeCompare(b.title, "pt"));
    } else if (sort === "recent") {
      base.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sort === "distance" && referencePoint) {
      base.sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0));
    }
    return base;
  }, [placesWithRefDistance, queryMatchedIds, sort, referencePoint]);

  const NEAR_RADIUS_M = 5000;
  const expandedBounds = useMemo<Bounds | null>(() => {
    if (!viewport) return null;
    const b = viewport.bounds;
    const dLat = (b.north - b.south) * 0.6;
    const dLng = (b.east - b.west) * 0.6;
    return {
      south: b.south - dLat,
      north: b.north + dLat,
      west: b.west - dLng,
      east: b.east + dLng,
    };
  }, [viewport]);

  const visibleCount = useMemo(() => {
    if (!viewport) return 0;
    const list = queryMatchedIds
      ? placesWithRefDistance.filter((p) => queryMatchedIds.has(p.id))
      : placesWithRefDistance;
    let n = 0;
    for (const p of list) {
      if (isInBounds(p, viewport.bounds)) n++;
    }
    return n;
  }, [viewport, placesWithRefDistance, queryMatchedIds]);

  const nearbyExtraCount = useMemo(() => {
    if (!viewport || !expandedBounds) return 0;
    const list = queryMatchedIds
      ? placesWithRefDistance.filter((p) => queryMatchedIds.has(p.id))
      : placesWithRefDistance;
    let n = 0;
    for (const p of list) {
      if (isInBounds(p, viewport.bounds)) continue;
      if (isInBounds(p, expandedBounds)) n++;
    }
    return n;
  }, [viewport, expandedBounds, placesWithRefDistance, queryMatchedIds]);

  const radiusFallbackCount = useMemo(() => {
    if (!referencePoint) return placesWithRefDistance.length;
    const list = queryMatchedIds
      ? placesWithRefDistance.filter((p) => queryMatchedIds.has(p.id))
      : placesWithRefDistance;
    let n = 0;
    for (const p of list) {
      if (Number.isFinite(p.distance_m) && p.distance_m <= NEAR_RADIUS_M) n++;
    }
    return n;
  }, [referencePoint, placesWithRefDistance, queryMatchedIds]);

  const handlePickGeocoded = (r: ForwardGeocodeResult) => {
    const origin = { lat: r.lat, lng: r.lng, label: r.name };
    setSearchOrigin(origin);
    setFlyTo({ lat: r.lat, lng: r.lng, ts: Date.now() });
    setQuery("");
    setSearchFocused(false);
    setSort("distance");
    setSelectedId(null);
    const el = document.getElementById("top-search-input") as HTMLInputElement | null;
    el?.blur();
  };

  const clearSearchOrigin = () => {
    setSearchOrigin(null);
    if (userPosition) {
      setFlyTo({ ...userPosition, ts: Date.now() });
    }
  };

  return (
    <main
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <MapView
        places={places}
        userPosition={userPosition}
        initialCenter={restoredCenter ?? userPosition}
        flyTo={flyTo}
        zoom={15}
        mapStyle={mapStyle}
        highlightId={selectedId}
        onPinClick={(p) => router.push(`/lugar/${p.id}`)}
        onCenterChange={setMapCenter}
        onViewportChange={setViewport}
        onUserDrag={() => setSelectedId(null)}
        onBearingChange={setBearing}
        resetBearing={resetBearing}
        onLongPress={(pos) =>
          router.push(`/adicionar?lat=${pos.lat}&lng=${pos.lng}&z=19`)
        }
      />

      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 16px)",
          left: 16,
          right: 16,
          zIndex: 12,
          animation: "fadeUp 0.5s ease-out",
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 10px 10px 18px",
              borderRadius: 18,
              background: "var(--card-glass)",
              backdropFilter: "blur(18px) saturate(160%)",
              WebkitBackdropFilter: "blur(18px) saturate(160%)",
              border: "0.5px solid var(--border)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <ISearch size={20} color="var(--muted)" />
            <input
              id="top-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setSearchFocused(false), 180);
              }}
              placeholder="Pesquisar nome, cidade ou local…"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 16,
                letterSpacing: -0.1,
                color: "var(--text)",
                padding: "8px 0",
              }}
            />
            {query ? (
              <button
                aria-label="Limpar"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  const el = document.getElementById("top-search-input") as HTMLInputElement | null;
                  el?.focus();
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(20,30,40,0.08)",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            ) : (
              <button
                aria-label="Definições"
                onClick={() => router.push("/definicoes")}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#2774AE",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <ISettings size={16} color="#fff" strokeWidth={2} />
              </button>
            )}
          </div>

          {searchFocused && query.trim().length >= 2 && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                background: "var(--card)",
                borderRadius: 16,
                border: "0.5px solid var(--border)",
                boxShadow: "0 12px 32px rgba(20,30,50,0.18)",
                overflow: "hidden",
                maxHeight: "60vh",
                overflowY: "auto",
                zIndex: 30,
              }}
            >
              {localMatches.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      padding: "10px 14px 4px",
                    }}
                  >
                    Lugares marcados
                  </div>
                  {localMatches.map((p) => (
                    <button
                      key={`local-${p.id}`}
                      onClick={() => {
                        setSelectedId(p.id);
                        setFlyTo({ lat: p.lat, lng: p.lng, ts: Date.now() });
                        setQuery("");
                        setSearchFocused(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        color: "var(--text)",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: "rgba(39,116,174,0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IMapPin size={16} color="#2774AE" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--muted)",
                            marginTop: 2,
                          }}
                        >
                          {Number.isFinite(p.distance_m)
                            ? formatDistance(p.distance_m)
                            : "Lugar marcado"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    padding: "10px 14px 4px",
                    borderTop:
                      localMatches.length > 0
                        ? "0.5px solid var(--border)"
                        : "none",
                  }}
                >
                  Locais{" "}
                  {geoLoading && (
                    <span style={{ opacity: 0.7, fontWeight: 400 }}>
                      · a procurar…
                    </span>
                  )}
                </div>
                {geoResults.length === 0 && !geoLoading ? (
                  <div
                    style={{
                      padding: "10px 14px 14px",
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
                    Sem sugestões.
                  </div>
                ) : (
                  geoResults.map((r) => {
                    const dist = referencePoint
                      ? haversineMeters(referencePoint, {
                          lat: r.lat,
                          lng: r.lng,
                        })
                      : null;
                    return (
                      <button
                        key={`geo-${r.id}`}
                        onClick={() => handlePickGeocoded(r)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          color: "var(--text)",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            background: "rgba(39,116,174,0.10)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <ISearch size={15} color="#2774AE" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 500,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--muted)",
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.context ?? r.type ?? ""}
                            {dist != null ? ` · ${formatDistance(dist)}` : ""}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px 6px 8px",
              borderRadius: 999,
              background: "var(--card-glass)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "0.5px solid var(--border)",
              fontSize: 12,
              color: "var(--text)",
              fontWeight: 500,
              maxWidth: "calc(100% - 110px)",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#2774AE",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IMapPin size={11} color="#fff" strokeWidth={2.2} />
            </span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {geo.permission === "denied" && !mapCenter && !viewport
                ? "GPS desativado"
                : !referencePoint && geo.error
                  ? "Sem GPS"
                  : loading
                    ? "a carregar…"
                    : (() => {
                        if (searchOrigin) {
                          const n = radiusFallbackCount;
                          return `${n} ${n === 1 ? "lugar" : "lugares"} perto de ${searchOrigin.label}`;
                        }
                        const primary = viewport ? visibleCount : radiusFallbackCount;
                        const word = primary === 1 ? "lugar" : "lugares";
                        const where = viewport
                          ? city
                            ? ` em ${city}`
                            : " aqui"
                          : city
                            ? ` em ${city}`
                            : "";
                        const extra =
                          viewport && nearbyExtraCount > 0
                            ? ` · +${nearbyExtraCount} perto`
                            : "";
                        return `${primary} ${word}${where}${extra}`;
                      })()}
            </span>
            {searchOrigin && (
              <button
                aria-label="Limpar local"
                onClick={clearSearchOrigin}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "rgba(20,30,40,0.10)",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                  marginLeft: 2,
                }}
              >
                ×
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              aria-label="Orientar a norte"
              onClick={() => setResetBearing({ ts: Date.now() })}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: "var(--card-glass)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: "0.5px solid var(--border)",
                boxShadow: "0 4px 12px rgba(20,30,50,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text)",
                padding: 0,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  transform: `rotate(${-bearing}deg)`,
                  transition: "transform 0.2s",
                }}
              >
                <ICompass size={20} />
              </span>
            </button>
            <div style={{ position: "relative" }}>
            <button
              aria-label="Estilo do mapa"
              aria-expanded={layersOpen}
              onClick={() => setLayersOpen((o) => !o)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: "var(--card-glass)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: "0.5px solid var(--border)",
                boxShadow: "0 4px 12px rgba(20,30,50,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: layersOpen ? "#2774AE" : "var(--text)",
              }}
            >
              <ILayers size={20} />
            </button>
            {layersOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "var(--card)",
                  borderRadius: 14,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                  border: "0.5px solid var(--border)",
                  overflow: "hidden",
                  minWidth: 160,
                  zIndex: 30,
                }}
              >
                {(Object.keys(MAP_STYLE_LABELS) as MapStyleKind[]).map((k, i, arr) => (
                  <button
                    key={k}
                    onClick={() => {
                      setMapStyle(k);
                      setLayersOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "12px 14px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      borderBottom:
                        i < arr.length - 1
                          ? "0.5px solid var(--border)"
                          : "none",
                      fontSize: 14,
                      color: "var(--text)",
                      textAlign: "left",
                    }}
                  >
                    <span>{MAP_STYLE_LABELS[k]}</span>
                    {mapStyle === k && <ICheck size={16} color="#2774AE" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: sheetHeight + 16,
          zIndex: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "center",
          transition: "bottom 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <button
          aria-label="Centrar na minha localização"
          onClick={onLocate}
          disabled={!userPosition}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "var(--card-glass)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "0.5px solid var(--border)",
            boxShadow: "0 4px 12px rgba(20,30,50,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: userPosition ? "pointer" : "default",
            opacity: userPosition ? 1 : 0.5,
            color: "var(--text)",
          }}
        >
          <ILocate size={22} />
        </button>
        <button
          aria-label="Adicionar lugar"
          onClick={() => {
            const c = mapCenter ?? userPosition;
            router.push(
              c ? `/adicionar?lat=${c.lat}&lng=${c.lng}` : "/adicionar"
            );
          }}
          style={{
            width: 60,
            height: 60,
            borderRadius: 20,
            background: "#2774AE",
            border: "none",
            boxShadow: "var(--shadow-fab)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IPlus size={28} color="#fff" strokeWidth={2.2} />
        </button>
      </div>

      <BottomSheet
        defaultSnap="mid"
        onHeightChange={setSheetHeight}
        header={
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--text)",
                  letterSpacing: -0.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={searchOrigin?.label}
              >
                {places.length === 0
                  ? "Sem lugares marcados"
                  : searchOrigin
                    ? `Lugares perto de ${searchOrigin.label}`
                    : "Lugares perto"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginTop: 2,
                  fontFamily: "var(--font-geist-mono)",
                  letterSpacing: -0.1,
                }}
              >
                {places.length === 0
                  ? "toca em + para marcar o primeiro"
                  : `${sorted.length} ${sorted.length === 1 ? "lugar" : "lugares"} · ${
                      SORT_LABELS[sort].toLowerCase()
                    }`}
              </div>
            </div>
            {places.length > 0 && (
              <div
                style={{ position: "relative", flexShrink: 0 }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSortOpen((o) => !o)}
                  aria-label="Ordenar"
                  aria-expanded={sortOpen}
                  style={{
                    background: "var(--card-glass)",
                    border: "0.5px solid var(--border)",
                    borderRadius: 12,
                    cursor: "pointer",
                    padding: "8px 10px",
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ISort size={16} />
                  <IChevDown
                    size={12}
                    color="var(--muted)"
                    style={{
                      transform: sortOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>
                {sortOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      zIndex: 30,
                      background: "var(--card)",
                      borderRadius: 14,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                      border: "0.5px solid var(--border)",
                      overflow: "hidden",
                      minWidth: 180,
                    }}
                  >
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((s, i, arr) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSort(s);
                          setSortOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "12px 14px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          borderBottom:
                            i < arr.length - 1
                              ? "0.5px solid var(--border)"
                              : "none",
                          fontSize: 14,
                          color: "var(--text)",
                          textAlign: "left",
                        }}
                      >
                        <span>{SORT_LABELS[s]}</span>
                        {sort === s && <ICheck size={16} color="#2774AE" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {sorted.length === 0 ? (
            <div
              style={{
                padding: "20px 8px",
                color: "var(--muted)",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              {query
                ? "Nenhum lugar marcado para esta pesquisa."
                : searchOrigin
                  ? `Sem lugares marcados perto de ${searchOrigin.label}.`
                  : "Sem lugares nesta zona."}
            </div>
          ) : (
            sorted.map((p, i) => (
              <button
                key={p.id}
                onClick={() => {
                  if (selectedId === p.id) {
                    router.push(`/lugar/${p.id}`);
                    return;
                  }
                  setSelectedId(p.id);
                  setFlyTo({ lat: p.lat, lng: p.lng, ts: Date.now() });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 8px",
                  background:
                    selectedId === p.id ? "rgba(39,116,174,0.10)" : "transparent",
                  borderRadius: 12,
                  border: "none",
                  borderBottom: "0.5px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--text)",
                  width: "100%",
                  animation: `staggerIn 0.22s cubic-bezier(0.32, 0.72, 0, 1) both`,
                  animationDelay: `${Math.min(i, 8) * 18}ms`,
                  transition: "background 0.18s ease",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: "rgba(39,116,174,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IMapPin size={18} color="#2774AE" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--text)",
                      letterSpacing: -0.2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      fontFamily: "var(--font-geist-mono)",
                      marginTop: 2,
                    }}
                  >
                    {Number.isFinite(p.distance_m) ? formatDistance(p.distance_m) : "—"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </BottomSheet>
    </main>
  );
}
