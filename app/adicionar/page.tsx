"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useReverseGeocode } from "@/lib/hooks/useReverseGeocode";
import { IClose, ICheck, IMove, IMapPin } from "@/components/Icons";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const AVEIRO = { lat: 40.6443, lng: -8.6455 };

export default function AdicionarPage() {
  const router = useRouter();
  const geo = useGeolocation();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { city } = useReverseGeocode(pos?.lat ?? null, pos?.lng ?? null);

  useEffect(() => {
    if (pos) return;
    if (geo.lat != null && geo.lng != null) {
      setPos({ lat: geo.lat, lng: geo.lng });
    } else if (geo.error || geo.permission === "denied") {
      setPos(AVEIRO);
    }
  }, [geo.lat, geo.lng, geo.error, geo.permission, pos]);

  const valid = title.trim().length > 0 && pos !== null && !submitting;

  const onConfirm = async () => {
    if (!valid || !pos) return;
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
    });
    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace(`/lugar/${data}`), 700);
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
          height: 460,
          overflow: "hidden",
        }}
      >
        {pos && (
          <MapView
            initialCenter={pos}
            zoom={16}
            interactive
            draggablePin={pos}
            onPinDrag={(next) => setPos(next)}
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
            Novo lugar
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
            ? "Arraste o pin para ajustar"
            : geo.loading
              ? "A obter localização…"
              : "Define localização"}
        </div>

        {pos && (
          <div
            style={{
              position: "absolute",
              left: 16,
              bottom: 12,
              padding: "5px 10px",
              borderRadius: 8,
              background: "var(--card-glass)",
              fontFamily: "var(--font-geist-mono)",
              fontSize: 10,
              color: "var(--muted)",
              letterSpacing: -0.1,
              border: "0.5px solid var(--border)",
              zIndex: 20,
            }}
          >
            {pos.lat.toFixed(4)}°, {pos.lng.toFixed(4)}°
          </div>
        )}
      </div>

      <div
        className="no-scrollbar"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 440,
          bottom: 0,
          background: "var(--bg)",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          boxShadow: "0 -8px 24px rgba(20,30,50,0.08)",
          padding:
            "12px 20px calc(env(safe-area-inset-bottom, 0px) + 110px)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflowY: "auto",
        }}
      >
        <div
          style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}
        >
          <div
            style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              background: "rgba(0,0,0,0.18)",
            }}
          />
        </div>

        <div>
          <div
            style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}
          >
            Detalhes do lugar
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--muted)",
              marginTop: 4,
              letterSpacing: -0.1,
            }}
          >
            Dá um nome curto e claro para reconheceres depois.
          </div>
        </div>

        <div>
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

        <div>
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
            gap: 10,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(39,116,174,0.06)",
            border: "0.5px solid rgba(39,116,174,0.18)",
          }}
        >
          <IMapPin size={16} color="#2774AE" />
          <div
            style={{ flex: 1, fontSize: 12, letterSpacing: -0.1 }}
          >
            <span style={{ fontWeight: 500 }}>{city || "Localização"}</span>
            {pos && (
              <span
                style={{
                  color: "var(--muted)",
                  marginLeft: 6,
                  fontFamily: "var(--font-geist-mono)",
                }}
              >
                ({pos.lat.toFixed(4)}, {pos.lng.toFixed(4)})
              </span>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(194,57,60,0.08)",
              color: "#C2393C",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          zIndex: 30,
        }}
      >
        <button
          onClick={onConfirm}
          disabled={!valid || done}
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
            cursor: valid && !done ? "pointer" : "not-allowed",
            boxShadow: valid ? "0 10px 24px rgba(0,175,84,0.35)" : "none",
            transition: "all 0.25s ease",
          }}
        >
          <ICheck size={20} color={valid || done ? "#fff" : "var(--muted)"} strokeWidth={2.4} />
          {done
            ? "Lugar marcado · obrigado!"
            : submitting
              ? "A guardar…"
              : "Confirmar marcação"}
        </button>
      </div>
    </main>
  );
}
