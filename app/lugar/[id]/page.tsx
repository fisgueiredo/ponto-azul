"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useReverseGeocode } from "@/lib/hooks/useReverseGeocode";
import { usePlace } from "@/lib/hooks/usePlaces";
import {
  IChevLeft,
  IShare,
  INavigate,
  IMapPin,
  IEdit,
  ITrash,
} from "@/components/Icons";
import { formatDistance, haversineMeters } from "@/lib/format";
import { mapsUrl, wazeUrl } from "@/lib/platform";
import { supabase } from "@/lib/supabase";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function PlaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { place, loading, error } = usePlace(params?.id);
  const geo = useGeolocation();
  const userPosition =
    geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null;
  const { address } = useReverseGeocode(place?.lat ?? null, place?.lng ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return <CenteredMessage text="A carregar…" />;
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
        setToast("Link copiado");
        setTimeout(() => setToast(null), 2000);
      }
    } catch {
      // user cancelled — ignore
    }
  };

  const onDelete = async () => {
    if (!supabase) return;
    setDeleting(true);
    const { error } = await supabase.from("places").delete().eq("id", place.id);
    if (error) {
      setToast(`Erro ao eliminar: ${error.message}`);
      setDeleting(false);
      setConfirmDelete(false);
      setTimeout(() => setToast(null), 2500);
      return;
    }
    try {
      window.localStorage.removeItem("pa:places:v1");
    } catch {
      // ignore
    }
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
          top: 0,
          left: 0,
          right: 0,
          height: 320,
          overflow: "hidden",
        }}
      >
        <MapView
          places={[place]}
          initialCenter={{ lat: place.lat, lng: place.lng }}
          zoom={16}
          interactive={false}
          highlightId={place.id}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 60%, var(--bg) 100%)",
            pointerEvents: "none",
          }}
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
          aria-label="Editar"
          onClick={() => router.push(`/lugar/${place.id}/editar`)}
          style={iconBtn()}
        >
          <IEdit size={18} />
        </button>
        <button
          aria-label="Eliminar"
          onClick={() => setConfirmDelete(true)}
          style={iconBtn("danger")}
        >
          <ITrash size={18} />
        </button>
        <button aria-label="Partilhar" onClick={onShare} style={iconBtn()}>
          <IShare size={18} />
        </button>
      </div>

      <div
        className="no-scrollbar"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 280,
          bottom: 0,
          background: "var(--bg)",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          padding:
            "20px 20px calc(env(safe-area-inset-bottom, 0px) + 110px)",
          overflowY: "auto",
          animation: "fadeUp 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)",
        }}
      >
        {distance && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 999,
                background: "rgba(39,116,174,0.10)",
                color: "#2774AE",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              <IMapPin size={12} color="#2774AE" strokeWidth={2.2} />
              {distance} de si
            </span>
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
          position: "absolute",
          left: 16,
          right: 16,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          zIndex: 22,
          display: "flex",
          gap: 10,
        }}
      >
        <a
          href={mapsUrl(place.lat, place.lng)}
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
          href={wazeUrl(place.lat, place.lng)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            padding: "16px 12px",
            borderRadius: 18,
            background: "#33CCFF",
            color: "#0B2940",
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
          <INavigate size={18} color="#0B2940" strokeWidth={2} />
          Waze
        </a>
      </div>

      {toast && (
        <div
          style={{
            position: "absolute",
            bottom:
              "calc(env(safe-area-inset-bottom, 0px) + 110px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--text)",
            color: "var(--bg)",
            padding: "10px 16px",
            borderRadius: 999,
            fontSize: 13,
            zIndex: 30,
            animation: "fadeUp 0.3s ease-out",
          }}
        >
          {toast}
        </div>
      )}

      {confirmDelete && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            animation: "overlayFade 0.22s ease-out both",
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
                "sheetSlideUp 0.36s cubic-bezier(0.32, 0.72, 0, 1) both",
              boxShadow: "0 -12px 40px rgba(0,0,0,0.22)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
              Eliminar “{place.title}”?
            </div>
            <div
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
                  background: "#C2393C",
                  border: "none",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: deleting ? "not-allowed" : "pointer",
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

function iconBtn(variant?: "left" | "danger"): React.CSSProperties {
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
    boxShadow: "0 4px 12px rgba(20,30,50,0.10)",
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
      color: "#C2393C",
      borderColor: "rgba(194,57,60,0.35)",
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
