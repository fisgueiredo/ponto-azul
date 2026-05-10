"use client";
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        animation:
          "pageEnter 0.22s cubic-bezier(0.32, 0.72, 0, 1) both",
        height: "100%",
      }}
    >
      {children}
    </div>
  );
}
