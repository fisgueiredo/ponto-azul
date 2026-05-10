"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { usePlaces } from "@/lib/hooks/usePlaces";
import { useReverseGeocode } from "@/lib/hooks/useReverseGeocode";
import { ISearch, ISettings, ILocate, IPlus, IMapPin } from "@/components/Icons";
import { formatDistance } from "@/lib/format";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const geo = useGeolocation();
  const userPosition =
    geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null;
  const { places, loading } = usePlaces({
    userLat: userPosition?.lat,
    userLng: userPosition?.lng,
  });
  const { city } = useReverseGeocode(userPosition?.lat ?? null, userPosition?.lng ?? null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; ts: number } | null>(null);

  const onLocate = () => {
    if (!userPosition) return;
    setFlyTo({ ...userPosition, ts: Date.now() });
  };

  const peek = places.slice(0, 2);

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
          top: 0,
          left: 0,
          right: 0,
          height: 110,
          background:
            "linear-gradient(to bottom, var(--card-glass), rgba(0,0,0,0))",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          zIndex: 8,
          pointerEvents: "none",
        }}
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
          onClick={() => router.push("/lugares")}
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
              ? "a carregar lugares…"
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
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 240px)",
          zIndex: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "center",
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
          }}
        >
          <ILocate size={22} color="var(--text)" />
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

      <button
        onClick={() => router.push("/lugares")}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding:
            "10px 16px calc(env(safe-area-inset-bottom, 0px) + 30px)",
          background: "var(--card-glass)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTop: "0.5px solid var(--border)",
          boxShadow: "0 -8px 28px rgba(20,30,50,0.08)",
          zIndex: 14,
          cursor: "pointer",
          textAlign: "left",
          border: "none",
          display: "block",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 12px" }}>
          <div
            style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              background: "rgba(0,0,0,0.18)",
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
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
              fontSize: 13,
              color: "var(--muted)",
              marginTop: 2,
              fontFamily: "var(--font-geist-mono)",
              letterSpacing: -0.1,
            }}
          >
            {places.length === 0
              ? "Toca em + para marcar o primeiro"
              : `${places.length} ${places.length === 1 ? "lugar" : "lugares"} · ordenado por distância`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {peek.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 4px",
                color: "var(--text)",
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
            </div>
          ))}
        </div>
      </button>
    </main>
  );
}
