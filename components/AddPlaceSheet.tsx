"use client";
import { useEffect, useMemo, useState } from "react";
import {
  IClose,
  ICheck,
  IMove,
  IMapPin,
  IPlus,
  IMinus,
  ICar,
} from "@/components/Icons";
import BottomSheet from "@/components/BottomSheet";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { invalidatePlacesCache } from "@/lib/hooks/usePlaces";

const MIN_SPOTS = 1;
const MAX_SPOTS = 20;

type Props = {
  pos: { lat: number; lng: number };
  city: string | null;
  onCancel: () => void;
  onSubmitted: (id: string) => void;
  onHeightChange?: (h: number) => void;
};

export default function AddPlaceSheet({
  pos,
  city,
  onCancel,
  onSubmitted,
  onHeightChange,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [spots, setSpots] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [pos.lat, pos.lng]);

  const valid =
    title.trim().length > 0 && !submitting && !done;

  const onSubmit = async () => {
    if (!valid) return;
    if (!supabaseConfigured) {
      setError("Supabase não configurado");
      return;
    }
    setSubmitting(true);
    setError(null);
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
    invalidatePlacesCache();
    setTimeout(() => onSubmitted(data as string), 480);
  };

  const midHeightFn = useMemo(
    () => (vh: number) => Math.max(440, Math.round(vh * 0.55)),
    []
  );

  return (
    <>
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
          animation: "fadeUp 0.5s cubic-bezier(0.32, 0.72, 0, 1) both",
        }}
      >
        <button
          aria-label="Cancelar"
          onClick={onCancel}
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
          Novo lugar
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 70px)",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        <div
          style={{
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
            animation: "fadeUp 0.6s cubic-bezier(0.32, 0.72, 0, 1) both",
          }}
        >
          <IMove size={13} color="var(--muted)" />
          Move o mapa para ajustar
        </div>
      </div>

      <BottomSheet
        defaultSnap="mid"
        midHeight={midHeightFn}
        onHeightChange={onHeightChange}
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
              Detalhes do lugar
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
            {done
              ? "Lugar marcado · obrigado!"
              : submitting
                ? "A guardar…"
                : "Confirmar marcação"}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
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
                onClick={() => setSpots((s) => Math.max(MIN_SPOTS, s - 1))}
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
                key={spots}
                aria-live="polite"
                style={{
                  minWidth: 28,
                  textAlign: "center",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: -0.2,
                  display: "inline-block",
                  animation: "popIn var(--dur-base) var(--ease-pop)",
                }}
              >
                {spots}
              </span>
              <button
                aria-label="Aumentar lugares"
                onClick={() => setSpots((s) => Math.min(MAX_SPOTS, s + 1))}
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
    </>
  );
}
