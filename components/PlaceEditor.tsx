"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useReverseGeocode } from "@/lib/hooks/useReverseGeocode";
import { usePlaces } from "@/lib/hooks/usePlaces";
import {
  IClose,
  ICheck,
  IMove,
  IMapPin,
  ILocate,
  ILayers,
  IPlus,
  IMinus,
  ICar,
} from "@/components/Icons";
import BottomSheet from "@/components/BottomSheet";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { MapStyleKind } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const AVEIRO = { lat: 40.6443, lng: -8.6455 };
const MAP_STYLE_KEY = "pa:mapStyle";
const MAP_STYLE_LABELS: Record<MapStyleKind, string> = {
  standard: "Normal",
  satellite: "Satélite",
};
const SHOW_PLACES_KEY = "pa:editorShowPlaces";

type Props = {
  mode: "add" | "edit";
  initial?: {
    id: string;
    title: string;
    description: string | null;
    lat: number;
    lng: number;
    spots: number;
  };
};

const MIN_SPOTS = 1;
const MAX_SPOTS = 20;

export default function PlaceEditor({ mode, initial }: Props) {
  const router = useRouter();
  const geo = useGeolocation();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null
  );
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [initialZoom, setInitialZoom] = useState<number>(18);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [spots, setSpots] = useState<number>(initial?.spots ?? 1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [mapStyle, setMapStyle] = useState<MapStyleKind>("standard");
  const [layersOpen, setLayersOpen] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);
  const { city } = useReverseGeocode(pos?.lat ?? null, pos?.lng ?? null);
  const { places } = usePlaces();
  const otherPlaces =
    mode === "edit" && initial
      ? places.filter((p) => p.id !== initial.id)
      : places;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(MAP_STYLE_KEY);
      if (saved === "standard" || saved === "satellite") {
        setMapStyle(saved);
      }
      const savedShow = window.localStorage.getItem(SHOW_PLACES_KEY);
      if (savedShow === "0") setShowPlaces(false);
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
    try {
      window.localStorage.setItem(SHOW_PLACES_KEY, showPlaces ? "1" : "0");
    } catch {
      // ignore
    }
  }, [showPlaces]);

  useEffect(() => {
    if (pos || mode !== "add") return;
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat") ?? "");
    const lng = parseFloat(params.get("lng") ?? "");
    const z = parseFloat(params.get("z") ?? "");
    if (Number.isFinite(z)) {
      setInitialZoom(Math.max(18, Math.min(20, z)));
    }
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setPos({ lat, lng });
      return;
    }
    if (geo.lat != null && geo.lng != null) {
      setPos({ lat: geo.lat, lng: geo.lng });
    } else if (geo.error || geo.permission === "denied") {
      setPos(AVEIRO);
    }
  }, [geo.lat, geo.lng, geo.error, geo.permission, pos, mode]);

  const onLocateMe = () => {
    if (geo.lat == null || geo.lng == null) return;
    setFlyTo({ lat: geo.lat, lng: geo.lng, ts: Date.now() });
  };

  const valid =
    title.trim().length > 0 && pos !== null && !submitting && !done;

  const onSubmit = async () => {
    if (!valid || !pos) return;
    if (!supabaseConfigured) {
      setError("Supabase não configurado");
      return;
    }
    setSubmitting(true);
    setError(null);

    if (mode === "add") {
      const { data, error } = await supabase!.rpc("add_place", {
        p_title: title.trim(),
        p_description: description.trim(),
        p_lat: pos.lat,
        p_lng: pos.lng,
        p_spots: spots,
      });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      setDone(true);
      try {
        window.localStorage.removeItem("pa:places:v2");
      } catch {
        // ignore
      }
      setTimeout(() => router.replace(`/lugar/${data}`), 700);
    } else if (mode === "edit" && initial) {
      const { error } = await supabase!.rpc("update_place", {
        p_id: initial.id,
        p_title: title.trim(),
        p_description: description.trim(),
        p_lat: pos.lat,
        p_lng: pos.lng,
        p_spots: spots,
      });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      setDone(true);
      try {
        window.localStorage.removeItem("pa:places:v2");
      } catch {
        // ignore
      }
      setTimeout(() => router.replace(`/lugar/${initial.id}`), 600);
    }
  };

  const midHeightFn = useMemo(
    () =>
      mode === "add"
        ? (vh: number) => Math.max(440, Math.round(vh * 0.55))
        : undefined,
    [mode]
  );

  const headerLabel = mode === "add" ? "Novo lugar" : "Editar lugar";
  const submitLabel =
    mode === "add" ? "Confirmar marcação" : "Guardar alterações";
  const doneLabel =
    mode === "add" ? "Lugar marcado · obrigado!" : "Alterações guardadas";

  return (
    <main
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {pos && (
        <MapView
          places={showPlaces ? otherPlaces : []}
          initialCenter={pos}
          flyTo={flyTo}
          zoom={initialZoom}
          interactive
          mapStyle={mapStyle}
          centerPin
          onCenterChange={(next) => setPos(next)}
          viewportPadding={{ bottom: sheetHeight }}
        />
      )}

      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: sheetHeight + 16,
          zIndex: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "flex-end",
          transition: "bottom 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            aria-label="Estilo do mapa"
            aria-expanded={layersOpen}
            onClick={() => setLayersOpen((o) => !o)}
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
              cursor: "pointer",
              color: layersOpen ? "#2774AE" : "var(--text)",
            }}
          >
            <ILayers size={22} />
          </button>
          {layersOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                right: 0,
                background: "var(--card)",
                borderRadius: 14,
                boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                border: "0.5px solid var(--border)",
                overflow: "hidden",
                minWidth: 180,
                zIndex: 30,
              }}
            >
              {(Object.keys(MAP_STYLE_LABELS) as MapStyleKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setMapStyle(k);
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
                    borderBottom: "0.5px solid var(--border)",
                    fontSize: 14,
                    color: "var(--text)",
                    textAlign: "left",
                  }}
                >
                  <span>{MAP_STYLE_LABELS[k]}</span>
                  {mapStyle === k && <ICheck size={16} color="#2774AE" />}
                </button>
              ))}
              <button
                onClick={() => setShowPlaces((s) => !s)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "12px 14px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--text)",
                  textAlign: "left",
                }}
              >
                <span>Mostrar lugares</span>
                {showPlaces && <ICheck size={16} color="#2774AE" />}
              </button>
            </div>
          )}
        </div>

        {mode === "add" && (
          <button
            aria-label="Centrar na minha localização"
            onClick={onLocateMe}
            disabled={geo.lat == null || geo.lng == null}
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
              cursor:
                geo.lat != null && geo.lng != null ? "pointer" : "default",
              opacity: geo.lat != null && geo.lng != null ? 1 : 0.5,
              color: "var(--text)",
            }}
          >
            <ILocate size={22} />
          </button>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 16px)",
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 20,
        }}
      >
        <button
          aria-label="Cancelar"
          onClick={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            background: "var(--card-glass)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "0.5px solid var(--border)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text)",
            boxShadow: "0 4px 12px rgba(20,30,50,0.10)",
          }}
        >
          <IClose size={20} />
        </button>
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            background: "var(--card-glass)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "0.5px solid var(--border)",
            fontSize: 13,
            color: "var(--text)",
            fontWeight: 600,
            letterSpacing: -0.1,
            boxShadow: "0 4px 12px rgba(20,30,50,0.08)",
            whiteSpace: "nowrap",
          }}
        >
          {headerLabel}
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 70px)",
          left: "50%",
          transform: "translateX(-50%)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 999,
          background: "var(--card-glass)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "0.5px solid var(--border)",
          fontSize: 12,
          color: "var(--text)",
          fontWeight: 500,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(20,30,50,0.08)",
          animation: "fadeUp 0.5s ease-out",
          zIndex: 20,
        }}
      >
        <IMove size={13} color="var(--muted)" />
        {pos
          ? "Mexe o mapa para ajustar"
          : geo.loading
            ? "A obter localização…"
            : "Define localização"}
      </div>

      <BottomSheet
        defaultSnap="mid"
        midHeight={midHeightFn}
        onHeightChange={setSheetHeight}
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
              {mode === "add" ? "Detalhes do lugar" : "Alterar detalhes"}
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
              dá um nome curto e claro
            </div>
          </div>
        }
        footer={
          <button
            onClick={onSubmit}
            disabled={!valid}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 18,
              background: done
                ? "#0E8E45"
                : valid
                  ? "#00AF54"
                  : "rgba(20,30,40,0.10)",
              border: "none",
              color: valid || done ? "#fff" : "var(--muted)",
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: -0.2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              cursor: valid ? "pointer" : "not-allowed",
              boxShadow: "none",
              transition: "all 0.25s ease",
            }}
          >
            <ICheck
              size={20}
              color={valid || done ? "#fff" : "var(--muted)"}
              strokeWidth={2.4}
            />
            {done ? doneLabel : submitting ? "A guardar…" : submitLabel}
          </button>
        }
      >
        <div style={{ paddingTop: 8 }}>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <label
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontWeight: 500,
                }}
              >
                Título <span style={{ color: "#C2393C" }}>·</span>
              </label>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  fontFamily: "var(--font-geist-mono)",
                }}
              >
                {title.length}/80
              </span>
            </div>
            <input
              type="text"
              placeholder="Ex.: Praça do Município, entrada norte"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(20,30,40,0.04)",
                border: "0.5px solid var(--border)",
                fontSize: 15,
                letterSpacing: -0.1,
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 12,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 500,
                display: "block",
                marginBottom: 6,
              }}
            >
              Descrição{" "}
              <span
                style={{
                  textTransform: "none",
                  letterSpacing: 0,
                  color: "var(--muted)",
                }}
              >
                (opcional)
              </span>
            </label>
            <textarea
              placeholder="Detalhes úteis: piso, rebaixe de passeio, horário, sinalização…"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 400))}
              rows={3}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(20,30,40,0.04)",
                border: "0.5px solid var(--border)",
                fontSize: 14,
                letterSpacing: -0.1,
                outline: "none",
                resize: "none",
                lineHeight: 1.4,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(20,30,40,0.04)",
              border: "0.5px solid var(--border)",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "rgba(39,116,174,0.12)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ICar size={16} color="#2774AE" />
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: -0.1 }}>
                  Número de lugares
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                  vagas acessíveis no local
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                aria-label="Diminuir lugares"
                onClick={() =>
                  setSpots((s) => Math.max(MIN_SPOTS, s - 1))
                }
                disabled={spots <= MIN_SPOTS}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "var(--card)",
                  border: "0.5px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: spots > MIN_SPOTS ? "pointer" : "not-allowed",
                  opacity: spots > MIN_SPOTS ? 1 : 0.45,
                  color: "var(--text)",
                }}
              >
                <IMinus size={16} />
              </button>
              <span
                style={{
                  minWidth: 28,
                  textAlign: "center",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: -0.2,
                }}
              >
                {spots}
              </span>
              <button
                aria-label="Aumentar lugares"
                onClick={() =>
                  setSpots((s) => Math.min(MAX_SPOTS, s + 1))
                }
                disabled={spots >= MAX_SPOTS}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "var(--card)",
                  border: "0.5px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: spots < MAX_SPOTS ? "pointer" : "not-allowed",
                  opacity: spots < MAX_SPOTS ? 1 : 0.45,
                  color: "var(--text)",
                }}
              >
                <IPlus size={16} />
              </button>
            </div>
          </div>

          {city && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(39,116,174,0.06)",
                border: "0.5px solid rgba(39,116,174,0.18)",
                marginBottom: 14,
              }}
            >
              <IMapPin size={16} color="#2774AE" />
              <div style={{ flex: 1, fontSize: 13, letterSpacing: -0.1 }}>
                <span style={{ fontWeight: 500 }}>{city}</span>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(194,57,60,0.08)",
                color: "#C2393C",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </BottomSheet>
    </main>
  );
}
