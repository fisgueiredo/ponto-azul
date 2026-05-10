export type PinKind = "place" | "user";

const PLACE_SVG = `
<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 1 C 8 1 2 7 2 15 C 2 23 11 32 16 38 C 21 32 30 23 30 15 C 30 7 24 1 16 1 Z" fill="#2774AE" stroke="#fff" stroke-width="2"/>
  <circle cx="16" cy="11" r="2.2" fill="#fff"/>
  <path d="M12.5 17 L19.5 17 L18.2 22 L13.8 22 Z" fill="#fff"/>
</svg>`;

const USER_SVG = `
<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
  <circle cx="11" cy="11" r="9" fill="#2774AE" stroke="#fff" stroke-width="3"/>
</svg>`;

export function setPinActive(wrap: HTMLDivElement, active: boolean) {
  const inner = wrap.firstElementChild as HTMLDivElement | null;
  if (!inner) return;
  inner.style.filter = active
    ? "drop-shadow(0 6px 12px rgba(39,116,174,0.55))"
    : "drop-shadow(0 2px 3px rgba(0,0,0,0.18))";
  inner.style.transform = active ? "scale(1.18)" : "scale(1)";
  inner.style.transition = "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)";
}

export function createPinElement(
  kind: PinKind = "place",
  opts: { active?: boolean } = {}
): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.cursor = "pointer";

  const inner = document.createElement("div");
  inner.style.position = "relative";
  inner.style.pointerEvents = "auto";

  if (kind === "place") {
    inner.style.width = "32px";
    inner.style.height = "40px";
    inner.style.transformOrigin = "50% 100%";
    inner.style.transition = "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)";
    inner.style.filter = opts.active
      ? "drop-shadow(0 6px 12px rgba(39,116,174,0.55))"
      : "drop-shadow(0 2px 3px rgba(0,0,0,0.18))";
    if (opts.active) inner.style.transform = "scale(1.18)";
    inner.style.animation =
      "pinDrop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both";
    inner.innerHTML = `
      <span style="position:absolute;left:4px;top:4px;width:24px;height:24px;border-radius:50%;background:#2774AE;opacity:.35;animation:pingPulse 1.8s ease-out infinite;display:block;pointer-events:none;"></span>
      ${PLACE_SVG}
    `;
  } else {
    inner.style.width = "22px";
    inner.style.height = "22px";
    inner.style.transformOrigin = "50% 50%";
    inner.style.filter = "drop-shadow(0 2px 6px rgba(39,116,174,0.45))";
    inner.style.animation =
      "fadeUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) both";
    inner.innerHTML = `
      <span style="position:absolute;left:-4px;top:-4px;width:30px;height:30px;border-radius:50%;background:#2774AE;opacity:.32;animation:pingPulse 1.8s ease-out infinite;display:block;pointer-events:none;"></span>
      ${USER_SVG}
    `;
  }

  wrap.appendChild(inner);
  return wrap;
}
