"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useReverseGeocode } from "@/lib/hooks/useReverseGeocode";
import { usePlace, invalidatePlacesCache } from "@/lib/hooks/usePlaces";
import {
  IChevLeft,
  IShare,
  INavigate,
  IMapPin,
  IEdit,
  ITrash,
  ICar,
  IStar,
} from "@/components/Icons";
import { formatDistance, haversineMeters } from "@/lib/format";
import { mapsUrl, wazeUrl } from "@/lib/platform";
import { supabase, togglePinned } from "@/lib/supabase";
import type { MapStyleKind } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const MAP_STYLE_KEY = "pa:mapStyle";

export default function PlaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { place, loading, error } = usePlace(params?.id);
  const geo = useGeolocation();
  const userPosition =
    geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null;
  const { address } = useReverseGeocode(place?.lat ?? null, place?.lng ?? null);
  const [toast, setToast] = useState<{ message: string; phase: "in" | "out" } | null>(
    null
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKind>("standard");
  const [pinnedOverride, setPinnedOverride] = useState<boolean | null>(null);
  const [pinning, setPinning] = useState(false);
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);
  const deleteOpenerRef = useRef<HTMLElement | null>(null);
  const toastTimersRef = useRef<{ out?: ReturnType<typeof setTimeout>; clear?: ReturnType<typeof setTimeout> }>({});

  const showToast = (message: string, durationMs = 1800) => {
    if (toastTimersRef.current.out) clearTimeout(toastTimersRef.current.out);
    if (toastTimersRef.current.clear) clearTimeout(toastTimersRef.current.clear);
    setToast({ message, phase: "in" });
    toastTimersRef.current.out = setTimeout(() => {
      setToast((t) => (t ? { ...t, phase: "out" } : t));
    }, durationMs);
    toastTimersRef.current.clear = setTimeout(() => {
      setToast(null);
    }, durationMs + 250);
  };

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      if (timers.out) clearTimeout(timers.out);
      if (timers.clear) clearTimeout(timers.clear);
    };
  }, []);

  useEffect(() => {
    if (!confirmDelete) return;
    cancelDeleteRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        setConfirmDelete(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      deleteOpenerRef.current?.focus();
    };
  }, [confirmDelete, deleting]);

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

  const placeLat = place?.lat;
  const placeLng = place?.lng;
  const navMapsUrl = useMemo(
    () => (placeLat != null && placeLng != null ? mapsUrl(placeLat, placeLng) : ""),
    [placeLat, placeLng]
  );
  const navWazeUrl = useMemo(
    () => (placeLat != null && placeLng != null ? wazeUrl(placeLat, placeLng) : ""),
    [placeLat, placeLng]
  );

  if (loading) {
    return <CenteredMessage text="A carregar lugar…" />;
  }
  if (error || !place) {
    return (
      <CenteredMessage
        text={error || "Lugar não encontrado"}
        action={{ label: "Voltar", onClick: () => router.replace("/") }}
      />
    );
  }

  const distance =
    userPosition &&
    formatDistance(haversineMeters(userPosition, { lat: place.lat, lng: place.lng }));

  const onShare = async () => {
    const shareData = {
      title: `Ponto Azul · ${place.title}`,
      text: place.title,
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/lugar/${place.id}`
          : `/lugar/${place.id}`,
    };
    try {
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
      };
      if (typeof nav.share === "function") {
        await nav.share(shareData);
        return;
      }
      if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(shareData.url);
        showToast("Link copiado");
      }
    } catch {
      // user cancelled — ignore
    }
  };

  const isPinned = pinnedOverride ?? place?.pinned ?? false;

  const onTogglePin = async () => {
    if (!place || pinning) return;
    const next = !isPinned;
    setPinnedOverride(next);
    setPinning(true);
    try {
      const result = await togglePinned(place.id);
      if (typeof result === "boolean") {
        setPinnedOverride(result);
      }
      invalidatePlacesCache();
    } catch (e: unknown) {
      setPinnedOverride(!next);
      const msg = e instanceof Error ? e.message : "Erro ao guardar";
      showToast(msg, 2200);
    } finally {
      setPinning(false);
    }
  };

  const onDelete = async () => {
    if (!supabase) return;
    setDeleting(true);
    // NOTE: RLS policies on `places` are currently fully open (anon DELETE allowed).
    // Future hardening requires Supabase auth + per-user ownership policies or a
    // SECURITY DEFINER `delete_place` RPC. Direct DELETE matches add/update reality.
    const { error } = await supabase.from("places").delete().eq("id", place.id);
    if (error) {
      showToast(`Erro ao eliminar: ${error.message}`, 2500);
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }
    invalidatePlacesCache();
    router.replace("/");
  };

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
      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        <MapView
          places={[place]}
          initialCenter={{ lat: place.lat, lng: place.lng }}
          zoom={16}
          interactive={false}
          highlightId={place.id}
          mapStyle={mapStyle}
        />
      </div>

      <button
        aria-label="Voltar"
        onClick={() => router.back()}
        style={iconBtn("left")}
      >
        <IChevLeft size={22} />
      </button>

      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 16px)",
          right: 16,
          zIndex: 20,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          aria-label={isPinned ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          aria-pressed={isPinned}
          onClick={onTogglePin}
          disabled={pinning}
          style={iconBtn(isPinned ? "active" : undefined)}
        >
          <IStar size={18} filled={isPinned} strokeWidth={isPinned ? 1.6 : 1.75} />
        </button>
        <button
          aria-label="Editar"
          onClick={() => router.push(`/lugar/${place.id}/editar`)}
          style={iconBtn()}
        >
          <IEdit size={18} />
        </button>
        <button
          aria-label="Eliminar"
          onClick={(e) => {
            deleteOpenerRef.current = e.currentTarget;
            setConfirmDelete(true);
          }}
          style={iconBtn("danger")}
        >
          <ITrash size={18} />
        </button>
        <button aria-label="Partilhar" onClick={onShare} style={iconBtn()}>
          <IShare size={18} />
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - 72px)",
          background: "var(--bg)",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          boxShadow: "0 -10px 32px rgba(20,30,50,0.18)",
          display: "flex",
          flexDirection: "column",
          animation: "fadeUp 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)",
          zIndex: 15,
        }}
      >
        <div
          style={{
            padding: "20px 20px 8px",
            minHeight: 0,
          }}
        >
        {(distance || place.spots) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {distance && (
              <span
                className="badge-info"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                <IMapPin size={12} color="currentColor" strokeWidth={2.2} />
                {distance} de si
              </span>
            )}
            {place.spots > 0 && (
              <span
                className="badge-success"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                <ICar size={12} color="currentColor" strokeWidth={2.2} />
                {place.spots} {place.spots === 1 ? "lugar" : "lugares"}
              </span>
            )}
          </div>
        )}

        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: -0.7,
            lineHeight: 1.1,
          }}
        >
          {place.title}
        </h1>
        <div
          style={{
            fontSize: 15,
            color: "var(--muted)",
            marginTop: 6,
            letterSpacing: -0.1,
          }}
        >
          {address || `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`}
        </div>

        {place.description && (
          <p
            style={{
              margin: "20px 0 0",
              fontSize: 15,
              lineHeight: 1.55,
              letterSpacing: -0.1,
              whiteSpace: "pre-wrap",
            }}
          >
            {place.description}
          </p>
        )}
        </div>

        <div
          style={{
            padding:
              "12px 16px calc(env(safe-area-inset-bottom, 16px) + 16px)",
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <a
            href={navMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              padding: "16px 12px",
              borderRadius: 18,
              background: "#2774AE",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: -0.2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <INavigate size={18} color="#fff" strokeWidth={2} />
            Maps
          </a>
          <a
            href={navWazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-waze"
            style={{
              flex: 1,
              padding: "16px 12px",
              borderRadius: 18,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: -0.2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <INavigate size={18} color="currentColor" strokeWidth={2} />
            Waze
          </a>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "fixed",
            bottom:
              "calc(env(safe-area-inset-bottom, 16px) + 110px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--text)",
            color: "var(--bg)",
            padding: "10px 16px",
            borderRadius: 999,
            fontSize: 13,
            zIndex: 40,
            animation:
              toast.phase === "in"
                ? "fadeUp var(--dur-slow) var(--ease-out)"
                : "fadeOut 0.25s var(--ease-out) forwards",
          }}
        >
          {toast.message}
        </div>
      )}

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          aria-describedby="delete-desc"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 30,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            animation: "overlayFade 0.22s var(--ease-out) both",
          }}
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              background: "var(--card)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding:
                "24px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)",
              animation:
                "sheetSlideUp 0.36s var(--ease-spring) both",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              id="delete-title"
              style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}
            >
              Eliminar “{place.title}”?
            </div>
            <div
              id="delete-desc"
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginTop: 6,
                lineHeight: 1.4,
              }}
            >
              Esta ação não pode ser desfeita.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                ref={cancelDeleteRef}
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: 14,
                  background: "transparent",
                  border: "0.5px solid var(--border)",
                  color: "var(--text)",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: 14,
                  background: "var(--error)",
                  border: "none",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: deleting ? "not-allowed" : "pointer",
                  minWidth: 120,
                }}
              >
                {deleting ? "A eliminar…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function iconBtn(variant?: "left" | "danger" | "active"): React.CSSProperties {
  const base: React.CSSProperties = {
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
    boxShadow: "var(--shadow-md)",
    transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)",
  };
  if (variant === "left") {
    return {
      ...base,
      position: "absolute",
      top: "calc(env(safe-area-inset-top, 0px) + 16px)",
      left: 16,
      zIndex: 20,
    };
  }
  if (variant === "danger") {
    return {
      ...base,
      color: "var(--error)",
      borderColor: "rgba(194,57,60,0.35)",
    };
  }
  if (variant === "active") {
    return {
      ...base,
      color: "#E0A82E",
      borderColor: "rgba(224,168,46,0.45)",
      background: "rgba(255,210,90,0.18)",
    };
  }
  return base;
}

function CenteredMessage({
  text,
  action,
}: {
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        background: "var(--bg)",
        color: "var(--text)",
        textAlign: "center",
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 14 }}>{text}</div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            background: "#2774AE",
            color: "#fff",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {action.label}
        </button>
      )}
    </main>
  );
}
