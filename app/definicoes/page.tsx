"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme, ThemeChoice } from "@/lib/hooks/useTheme";
import {
  IChevLeft,
  ISun,
  IMoon,
  IMonitor,
  ICheck,
  IMapPin,
} from "@/components/Icons";

const OPTIONS: {
  id: ThemeChoice;
  label: string;
  desc: string;
  Icon: (p: { size?: number; color?: string; strokeWidth?: number }) => React.ReactElement;
}[] = [
  { id: "light", label: "Claro", desc: "Sempre com tema claro", Icon: ISun },
  { id: "dark", label: "Escuro", desc: "Sempre com tema escuro", Icon: IMoon },
  {
    id: "system",
    label: "Sistema",
    desc: "Acompanha as definições do dispositivo",
    Icon: IMonitor,
  },
];

export default function DefinicoesPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const onRadioKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      return;
    }
    e.preventDefault();
    const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    const next = (index + dir + OPTIONS.length) % OPTIONS.length;
    const target = optionRefs.current[next];
    if (target) {
      target.focus();
      setTheme(OPTIONS[next].id);
    }
  };

  return (
    <main
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <button
        aria-label="Voltar"
        onClick={() => router.back()}
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 16px)",
          left: 16,
          zIndex: 20,
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
        }}
      >
        <IChevLeft size={22} />
      </button>

      <div
        className="no-scrollbar"
        style={{
          padding:
            "calc(env(safe-area-inset-top, 0px) + 80px) 20px calc(env(safe-area-inset-bottom, 0px) + 60px)",
          animation: "fadeUp 0.4s cubic-bezier(0.34, 1.4, 0.64, 1)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: -0.7,
            lineHeight: 1.05,
          }}
        >
          Definições
        </h1>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 15,
            color: "var(--muted)",
            letterSpacing: -0.1,
            lineHeight: 1.5,
            maxWidth: 320,
          }}
        >
          Personaliza a aparência do Ponto Azul. As preferências ficam guardadas neste dispositivo.
        </p>

        <SectionLabel id="theme-label">Aparência</SectionLabel>

        <div
          role="radiogroup"
          aria-labelledby="theme-label"
          style={{
            background: "var(--card)",
            borderRadius: 20,
            border: "0.5px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {OPTIONS.map((opt, i) => {
            const active = theme === opt.id;
            const { Icon } = opt;
            return (
              <button
                key={opt.id}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onKeyDown={(e) => onRadioKeyDown(e, i)}
                onClick={() => setTheme(opt.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    i < OPTIONS.length - 1 ? "0.5px solid var(--border)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--text)",
                  transition: "background var(--dur-base) var(--ease-out)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(39,116,174,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: active ? "#2774AE" : "rgba(39,116,174,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background var(--dur-base) var(--ease-out)",
                  }}
                >
                  <Icon size={18} color={active ? "#fff" : "#2774AE"} strokeWidth={1.9} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}
                  >
                    {opt.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 2,
                      letterSpacing: -0.1,
                    }}
                  >
                    {opt.desc}
                  </div>
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: active
                      ? "none"
                      : "1.5px solid rgba(20,30,40,0.18)",
                    background: active ? "#2774AE" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {active && (
                    <span
                      key={opt.id + "-tick"}
                      style={{
                        display: "flex",
                        animation: "popIn var(--dur-base) var(--ease-pop)",
                      }}
                    >
                      <ICheck size={13} color="#fff" strokeWidth={2.6} />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <SectionLabel>Sobre</SectionLabel>

        <div
          style={{
            background: "var(--card)",
            borderRadius: 20,
            border: "0.5px solid var(--border)",
            padding: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "#2774AE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IMapPin size={18} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}
              >
                Ponto Azul
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginTop: 2,
                  fontFamily: "var(--font-geist-mono)",
                }}
              >
                v1.0 · uso pessoal
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionLabel({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div
      id={id}
      style={{
        marginTop: 28,
        fontSize: 11,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        fontWeight: 600,
        paddingLeft: 4,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}
