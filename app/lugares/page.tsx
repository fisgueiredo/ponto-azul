"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { usePlaces } from "@/lib/hooks/usePlaces";
import { useReverseGeocode } from "@/lib/hooks/useReverseGeocode";
import {
  IChevDown,
  IChevLeft,
  ICheck,
  ISearch,
  ISort,
  IMapPin,
} from "@/components/Icons";
import { formatDistance, normalizeText } from "@/lib/format";
import type { Place } from "@/lib/supabase";

type SortKey = "distance" | "recent" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  distance: "Distância",
  recent: "Mais recentes",
  name: "Nome (A-Z)",
};

export default function LugaresPage() {
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

  const [sort, setSort] = useState<SortKey>("distance");
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const filtered = query.trim()
      ? places.filter((p) =>
          normalizeText(p.title).includes(normalizeText(query.trim()))
        )
      : places.slice();
    if (sort === "name") {
      filtered.sort((a, b) => a.title.localeCompare(b.title, "pt"));
    } else if (sort === "recent") {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sort === "distance" && userPosition) {
      filtered.sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0));
    }
    return filtered;
  }, [places, query, sort, userPosition]);

  return (
    <main
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
          padding:
            "calc(env(safe-area-inset-top, 0px) + 16px) 20px 8px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          aria-label="Voltar"
          onClick={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            background: "var(--card-glass)",
            border: "0.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <IChevLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: -0.5,
              lineHeight: 1.1,
            }}
          >
            Lugares marcados
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
            {sorted.length} {sorted.length === 1 ? "resultado" : "resultados"}
            {city ? ` · ${city}` : ""}
          </div>
        </div>
      </header>

      <div style={{ padding: "8px 16px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 16,
            background: "var(--card-glass)",
            border: "0.5px solid var(--border)",
          }}
        >
          <ISearch size={18} color="var(--muted)" />
          <input
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
            autoFocus
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px 8px",
          borderBottom: "0.5px solid var(--border)",
          marginTop: 8,
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
            fontWeight: 500,
          }}
        >
          Resultados
        </div>
        <button
          onClick={() => setSortOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text)",
            fontWeight: 500,
            padding: 4,
          }}
        >
          <ISort size={14} />
          <span>{SORT_LABELS[sort]}</span>
          <IChevDown
            size={14}
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
              top: "calc(100% + 4px)",
              right: 12,
              zIndex: 30,
              background: "var(--card)",
              borderRadius: 14,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
              border: "0.5px solid var(--border)",
              overflow: "hidden",
              minWidth: 200,
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
                    i < arr.length - 1 ? "0.5px solid var(--border)" : "none",
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

      <div
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 12px calc(env(safe-area-inset-bottom, 0px) + 40px)",
        }}
      >
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            A carregar lugares…
          </div>
        ) : sorted.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 14,
            }}
          >
            {query
              ? "Nenhum lugar encontrado para esta pesquisa."
              : "Ainda não há lugares marcados. Volta ao mapa e toca em + para marcar o primeiro."}
          </div>
        ) : (
          sorted.map((p, i) => (
            <PlaceRow
              key={p.id}
              place={p}
              isLast={i === sorted.length - 1}
              onClick={() => router.push(`/lugar/${p.id}`)}
            />
          ))
        )}
      </div>
    </main>
  );
}

function PlaceRow({
  place,
  isLast,
  onClick,
}: {
  place: Place;
  isLast: boolean;
  onClick: () => void;
}) {
  const distance = Number.isFinite(place.distance_m)
    ? formatDistance(place.distance_m)
    : null;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 12px",
        background: "transparent",
        border: "none",
        borderBottom: isLast ? "none" : "0.5px solid var(--border)",
        cursor: "pointer",
        textAlign: "left",
        color: "var(--text)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: "#2774AE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <IMapPin size={22} color="#fff" strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: -0.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {place.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 3,
            color: "var(--muted)",
            fontSize: 12,
            fontFamily: "var(--font-geist-mono)",
          }}
        >
          {distance && <span>{distance}</span>}
          {distance && place.description && <span>·</span>}
          {place.description && (
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                letterSpacing: -0.1,
              }}
            >
              {place.description}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
