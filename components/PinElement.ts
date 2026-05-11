export type PinKind = "place" | "user";

const placeSvg = (fill: string) => `
<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 1 C 8 1 2 7 2 15 C 2 23 11 32 16 38 C 21 32 30 23 30 15 C 30 7 24 1 16 1 Z M16 10 A 5 5 0 1 0 16 20 A 5 5 0 1 0 16 10 Z" fill="${fill}" fill-rule="evenodd" stroke="#fff" stroke-width="2"/>
</svg>`;

const USER_SVG = `
<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
  <circle cx="11" cy="11" r="9" fill="#2774AE" stroke="#fff" stroke-width="3"/>
</svg>`;

const HALO_ATTR = "data-pin-halo";
const ACTIVE_ATTR = "data-pin-active";
const PINNED_ATTR = "data-pin-pinned";
const PULSE_ATTR = "data-pin-pulse";
const SVG_ATTR = "data-pin-svg";

const colorFor = (pinned: boolean) => (pinned ? "#E0A82E" : "#2774AE");
const haloGradient = (pinned: boolean) =>
  pinned
    ? "radial-gradient(circle, rgba(224,168,46,0.55) 0%, rgba(224,168,46,0.15) 60%, rgba(224,168,46,0) 75%)"
    : "radial-gradient(circle, rgba(39,116,174,0.55) 0%, rgba(39,116,174,0.15) 60%, rgba(39,116,174,0) 75%)";
const dropShadow = (pinned: boolean) =>
  pinned
    ? "drop-shadow(0 8px 14px rgba(224,168,46,0.6))"
    : "drop-shadow(0 8px 14px rgba(39,116,174,0.6))";

function ensureHalo(wrap: HTMLDivElement, pinned: boolean) {
  const existing = wrap.querySelector<HTMLDivElement>(`[${HALO_ATTR}]`);
  if (existing) {
    existing.style.background = haloGradient(pinned);
    return;
  }
  const halo = document.createElement("div");
  halo.setAttribute(HALO_ATTR, "");
  halo.style.cssText = [
    "position:absolute",
    "left:50%",
    "top:18px",
    "width:54px",
    "height:54px",
    "border-radius:50%",
    `background:${haloGradient(pinned)}`,
    "pointer-events:none",
    "z-index:-1",
    "transform:translate(-50%, -50%) scale(0.5)",
    "animation:pinSelectHalo 1.4s ease-out infinite",
  ].join(";");
  wrap.insertBefore(halo, wrap.firstChild);
}

function removeHalo(wrap: HTMLDivElement) {
  wrap.querySelector(`[${HALO_ATTR}]`)?.remove();
}

export function setPinActive(wrap: HTMLDivElement, active: boolean) {
  const prev = wrap.getAttribute(ACTIVE_ATTR);
  const next = active ? "1" : "0";
  if (prev === next) return;
  wrap.setAttribute(ACTIVE_ATTR, next);
  const inner = wrap.lastElementChild as HTMLDivElement | null;
  if (!inner) return;
  const pinned = wrap.getAttribute(PINNED_ATTR) === "1";
  if (active) {
    wrap.style.zIndex = "10";
    inner.style.filter = dropShadow(pinned);
    inner.style.animation =
      "pinSelectIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both, pinSelectIdle 1.8s 0.45s ease-in-out infinite";
    ensureHalo(wrap, pinned);
  } else {
    wrap.style.zIndex = "";
    inner.style.filter = "drop-shadow(0 2px 3px rgba(0,0,0,0.18))";
    inner.style.animation = "pinDrop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both";
    inner.style.transform = "scale(1)";
    removeHalo(wrap);
  }
}

export function setPinPinned(wrap: HTMLDivElement, pinned: boolean) {
  const next = pinned ? "1" : "0";
  if (wrap.getAttribute(PINNED_ATTR) === next) return;
  wrap.setAttribute(PINNED_ATTR, next);
  const pulse = wrap.querySelector<HTMLSpanElement>(`[${PULSE_ATTR}]`);
  if (pulse) pulse.style.background = colorFor(pinned);
  const svgHost = wrap.querySelector<HTMLSpanElement>(`[${SVG_ATTR}]`);
  if (svgHost) svgHost.innerHTML = placeSvg(colorFor(pinned));
  if (wrap.getAttribute(ACTIVE_ATTR) === "1") {
    const inner = wrap.lastElementChild as HTMLDivElement | null;
    if (inner) inner.style.filter = dropShadow(pinned);
    const halo = wrap.querySelector<HTMLDivElement>(`[${HALO_ATTR}]`);
    if (halo) halo.style.background = haloGradient(pinned);
  }
}

export function createPinElement(
  kind: PinKind = "place",
  opts: { active?: boolean; pinned?: boolean } = {}
): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.cursor = "pointer";

  const inner = document.createElement("div");
  inner.style.position = "relative";
  inner.style.pointerEvents = "auto";

  if (kind === "place") {
    const pinned = !!opts.pinned;
    wrap.setAttribute(PINNED_ATTR, pinned ? "1" : "0");
    inner.style.width = "32px";
    inner.style.height = "40px";
    inner.style.transformOrigin = "50% 100%";
    inner.style.transition = "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)";
    inner.style.filter = "drop-shadow(0 2px 3px rgba(0,0,0,0.18))";
    inner.style.animation =
      "pinDrop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both";
    inner.innerHTML = `
      <span ${PULSE_ATTR} style="position:absolute;left:4px;top:4px;width:24px;height:24px;border-radius:50%;background:${colorFor(pinned)};opacity:.35;animation:pingPulse 1.8s ease-out infinite;display:block;pointer-events:none;"></span>
      <span ${SVG_ATTR} style="display:block;">${placeSvg(colorFor(pinned))}</span>
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
  if (kind === "place" && opts.active) setPinActive(wrap, true);
  return wrap;
}
