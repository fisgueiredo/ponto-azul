import { supabase, supabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  let count: number | null = null;
  let error: { message: string } | null = null;

  if (!supabaseConfigured) {
    error = { message: "env vars em falta" };
  } else {
    const res = await supabase!
      .from("places")
      .select("*", { count: "exact", head: true });
    count = res.count;
    error = res.error;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.5, margin: 0 }}>
        Ponto Azul
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
        Setup verificado. Os ecrãs vêm na próxima fase.
      </p>
      <div
        style={{
          fontFamily: "var(--font-geist-mono)",
          fontSize: 12,
          padding: "8px 14px",
          borderRadius: 999,
          background: error ? "rgba(194,57,60,0.12)" : "rgba(0,175,84,0.12)",
          color: error ? "#C2393C" : "#00AF54",
        }}
      >
        {error
          ? `Supabase: ${error.message}`
          : `Supabase ligado · ${count ?? 0} lugares na base`}
      </div>
    </main>
  );
}
