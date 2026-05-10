import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FBF8EF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="120" height="150" viewBox="0 0 32 40">
          <path
            d="M16 1 C 8 1 2 7 2 15 C 2 23 11 32 16 38 C 21 32 30 23 30 15 C 30 7 24 1 16 1 Z"
            fill="#2774AE"
            stroke="#FBF8EF"
            strokeWidth="2"
          />
          <circle cx="16" cy="11" r="2.4" fill="#fff" />
          <path d="M12.5 17 L19.5 17 L18.2 22 L13.8 22 Z" fill="#fff" />
        </svg>
      </div>
    ),
    size
  );
}
