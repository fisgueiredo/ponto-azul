"use client";
import { Place } from "@/lib/supabase";
import { formatDistance } from "@/lib/format";
import { IMapPin, IChevRight } from "./Icons";

type Props = {
  place: Place;
  onClick?: () => void;
  showChevron?: boolean;
  address?: string | null;
  compact?: boolean;
};

export default function ListItem({
  place,
  onClick,
  showChevron = false,
  address,
  compact = false,
}: Props) {
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
        gap: compact ? 12 : 14,
        padding: compact ? "10px 4px" : "14px 12px",
        background: "transparent",
        border: "none",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        fontFamily: "inherit",
        color: "var(--text)",
      }}
    >
      <div
        style={{
          width: compact ? 36 : 44,
          height: compact ? 36 : 44,
          borderRadius: compact ? 12 : 14,
          background: compact ? "rgba(39,116,174,0.12)" : "#2774AE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <IMapPin
          size={compact ? 18 : 22}
          color={compact ? "#2774AE" : "#fff"}
          strokeWidth={2}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: compact ? 15 : 16,
            fontWeight: compact ? 500 : 600,
            color: "var(--text)",
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
            fontFamily: "var(--font-geist-mono)",
            fontSize: 12,
          }}
        >
          {distance && <span>{distance}</span>}
          {distance && address && <span>·</span>}
          {address && (
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                letterSpacing: -0.1,
              }}
            >
              {address}
            </span>
          )}
        </div>
      </div>
      {showChevron && <IChevRight size={18} color="var(--muted)" />}
    </button>
  );
}
