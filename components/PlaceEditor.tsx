"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useReverseGeocode } from "@/lib/hooks/useReverseGeocode";
import { IClose, ICheck, IMove, IMapPin } from "@/components/Icons";
import BottomSheet from "@/components/BottomSheet";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const AVEIRO = { lat: 40.6443, lng: -8.6455 };

type Props = {
  mode: "add" | "edit";
  initial?: {
    id: string;
    title: string;
    description: string | null;
    lat: number;
    lng: number;
  };
};

export default function PlaceEditor({ mode, initial }: Props) {
  const router = useRouter();
  const geo = useGeolocation({ enabled: mode === "add" });
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { city } = useReverseGeocode(pos?.lat ?? null, pos?.lng ?? null);

  useEffect(() => {
    if (pos || mode !== "add") return;
    if (geo.lat != null && geo.lng != null) {
      setPos({ lat: geo.lat, lng: geo.lng });
    } else if (geo.error || geo.permission === "denied") {
      setPos(AVEIRO);
    }
  }, [geo.lat, geo.lng, geo.error, geo.permission, pos, mode]);

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
      });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      setDone(true);
      try {
        window.localStorage.removeItem("pa:places:v1");
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
      });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      setDone(true);
      try {
        window.localStorage.removeItem("pa:places:v1");
      } catch {
        // ignore
      }
      setTimeout(() => router.replace(`/lugar/${initial.id}`), 600);
    }
  };

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
          initialCenter={pos}
          zoom={16}
          interactive
          centerPin
          onCenterChange={(next) => setPos(next)}
        />
      )}

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
