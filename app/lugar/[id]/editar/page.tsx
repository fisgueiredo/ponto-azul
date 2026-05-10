"use client";
import { useParams, useRouter } from "next/navigation";
import { usePlace } from "@/lib/hooks/usePlaces";
import PlaceEditor from "@/components/PlaceEditor";

export default function EditarLugarPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { place, loading, error } = usePlace(params?.id);

  if (loading) {
    return <Centered text="A carregar detalhes…" />;
  }
  if (error || !place) {
    return (
      <Centered
        text={error || "Lugar não encontrado"}
        actionLabel="Voltar"
        onAction={() => router.replace("/")}
      />
    );
  }

  return (
    <PlaceEditor
      mode="edit"
      initial={{
        id: place.id,
        title: place.title,
        description: place.description,
        lat: place.lat,
        lng: place.lng,
        spots: place.spots ?? 1,
      }}
    />
  );
}

function Centered({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
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
      {actionLabel && onAction && (
        <button
          onClick={onAction}
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
          {actionLabel}
        </button>
      )}
    </main>
  );
}
