"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { usePlaces } from "@/lib/hooks/usePlaces";
import { useReverseGeocode } from "@/lib/hooks/useReverseGeocode";
import {
  ISearch,
  ISettings,
  ILocate,
  IPlus,
  IMapPin,
  IChevDown,
  ICheck,
  ISort,
} from "@/components/Icons";
import { formatDistance, normalizeText } from "@/lib/format";
import BottomSheet, { Snap } from "@/components/BottomSheet";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type SortKey = "distance" | "recent" | "name";
const SORT_LABELS: Record<SortKey, string> = {
  distance: "Distância",
  recent: "Mais recentes",
  name: "Nome (A-Z)",
};

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
  const { city } = useReverseGeocode(userPosition?.lat ?? null, userPosition?.lng ?? null);

  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [autoCentered, setAutoCentered] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(280);
  const [snap, setSnap] = useState<Snap>("mid");
  const [sort, setSort] = useState<SortKey>("distance");
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (autoCentered || !userPosition) return;
    setFlyTo({ ...userPosition, ts: Date.now() });
    setAutoCentered(true);
  }, [userPosition, autoCentered]);

  useEffect(() => {
    router.prefetch("/adicionar");
    router.prefetch("/definicoes");
  }, [router]);

  const onLocate = () => {
    if (!userPosition) return;
    setFlyTo({ ...userPosition, ts: Date.now() });
  };

  const sorted = useMemo(() => {
    const base = query.trim()
      ? places.filter((p) =>
          normalizeText(p.title).includes(normalizeText(query.trim()))
        )
      : places.slice();
    if (sort === "name") {
      base.sort((a, b) => a.title.localeCompare(b.title, "pt"));
    } else if (sort === "recent") {
      base.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sort === "distance" && userPosition) {
      base.sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0));
    }
    return base;
  }, [places, query, sort, userPosition]);

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
        initialCenter={userPosition}
        flyTo={flyTo}
        zoom={15}
        onPinClick={(p) => router.push(`/lugar/${p.id}`)}
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
        <button
          onClick={() => {
            setSnap("max");
            setTimeout(() => {
              const el = document.getElementById("sheet-search-input");
              el?.focus();
            }, 350);
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderRadius: 18,
            background: "var(--card-glass)",
            backdropFilter: "blur(18px) saturate(160%)",
            WebkitBackdropFilter: "blur(18px) saturate(160%)",
            border: "0.5px solid var(--border)",
            boxShadow: "var(--shadow-soft)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <ISearch size={20} color="var(--muted)" />
          <span style={{ flex: 1, color: "var(--muted)", fontSize: 16, letterSpacing: -0.1 }}>
            Pesquisar lugar marcado…
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              router.push("/definicoes");
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#2774AE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ISettings size={16} color="#fff" strokeWidth={2} />
          </span>
        </button>

        <div
          style={{
            marginTop: 10,
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
            }}
          >
            <IMapPin size={11} color="#fff" strokeWidth={2.2} />
          </span>
          <span>
            {loading
              ? "a carregar…"
              : `${places.length} ${places.length === 1 ? "lugar" : "lugares"}${
                  city ? ` em ${city}` : ""
                }`}
          </span>
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
          onClick={() => router.push("/adicionar")}
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
        onSnapChange={setSnap}
        header={
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "var(--text)",
                letterSpacing: -0.3,
              }}
            >
              {places.length === 0 ? "Sem lugares marcados" : "Lugares perto"}
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
                : `${places.length} ${places.length === 1 ? "lugar" : "lugares"} · ${
                    SORT_LABELS[sort].toLowerCase()
                  }`}
            </div>
          </div>
        }
      >
        {snap === "max" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              marginTop: 8,
              borderRadius: 14,
              background: "rgba(20,30,40,0.05)",
              border: "0.5px solid var(--border)",
              position: "relative",
            }}
          >
            <ISearch size={18} color="var(--muted)" />
            <input
              id="sheet-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar pelo nome…"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 15,
                letterSpacing: -0.1,
              }}
            />
            <button
              onClick={() => setSortOpen((o) => !o)}
              aria-label="Ordenar"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                color: "var(--text)",
                display: "flex",
                alignItems: "center",
                gap: 4,
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
                ? "Nenhum lugar para esta pesquisa."
                : "Sem lugares ainda."}
            </div>
          ) : (
            sorted.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/lugar/${p.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 4px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "0.5px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--text)",
                  width: "100%",
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
