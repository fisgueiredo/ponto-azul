"use client";
import { memo, useEffect, useRef } from "react";
import maplibregl, {
  Map as MLMap,
  Marker,
  StyleSpecification,
  setMaxParallelImageRequests,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Place } from "@/lib/supabase";
import { createPinElement, setPinActive } from "./PinElement";

// Bump the default (16) to fan out tile requests faster on initial map paint.
setMaxParallelImageRequests(32);

type LatLng = { lat: number; lng: number };

type Padding = { top?: number; bottom?: number; left?: number; right?: number };

export type MapStyleKind = "standard" | "satellite";

export type Bounds = { south: number; north: number; west: number; east: number };

type Props = {
  places?: Place[];
  userPosition?: LatLng | null;
  initialCenter?: LatLng | null;
  flyTo?: {
    lat: number;
    lng: number;
    ts: number;
    zoom?: number;
    mode?: "fly" | "ease";
    duration?: number;
  } | null;
  zoom?: number;
  interactive?: boolean;
  showAttribution?: boolean;
  mapStyle?: MapStyleKind;
  onPinClick?: (place: Place) => void;
  onLongPress?: (pos: LatLng) => void;
  onUserDrag?: () => void;
  draggablePin?: LatLng | null;
  onPinDrag?: (pos: LatLng) => void;
  centerPin?: boolean;
  pressFeedback?: { lat: number; lng: number; ts: number } | null;
  onCenterChange?: (pos: LatLng) => void;
  onViewportChange?: (v: { center: LatLng; bounds: Bounds }) => void;
  onBearingChange?: (bearing: number) => void;
  resetBearing?: { ts: number } | null;
  viewportPadding?: Padding;
  highlightId?: string | null;
  className?: string;
  style?: React.CSSProperties;
};

const STANDARD_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "google-satellite": {
      type: "raster",
      tiles: [
        "https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        "https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        "https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      ],
      tileSize: 256,
      maxzoom: 20,
      attribution: "&copy; Google",
    },
  },
  layers: [
    // Background fill avoids a flash of empty canvas while tiles load.
    {
      id: "satellite-bg",
      type: "background",
      paint: { "background-color": "#1b1f26" },
    },
    {
      id: "google-satellite",
      type: "raster",
      source: "google-satellite",
      paint: { "raster-fade-duration": 0 },
    },
  ],
};

function styleFor(kind: MapStyleKind): string | StyleSpecification {
  return kind === "satellite" ? SATELLITE_STYLE : STANDARD_STYLE_URL;
}

const AVEIRO: LatLng = { lat: 40.6443, lng: -8.6455 };

function MapViewImpl({
  places = [],
  userPosition = null,
  initialCenter = null,
  flyTo = null,
  zoom = 14,
  interactive = true,
  showAttribution = false,
  mapStyle = "standard",
  onPinClick,
  onLongPress,
  onUserDrag,
  draggablePin = null,
  onPinDrag,
  centerPin = false,
  pressFeedback = null,
  onCenterChange,
  onViewportChange,
  onBearingChange,
  resetBearing = null,
  viewportPadding,
  highlightId = null,
  className,
  style,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const userMarkerRef = useRef<Marker | null>(null);
  const dragMarkerRef = useRef<Marker | null>(null);
  const pressMarkerRef = useRef<Marker | null>(null);
  const onPinClickRef = useRef(onPinClick);
  const onPinDragRef = useRef(onPinDrag);
  const onCenterChangeRef = useRef(onCenterChange);
  const onViewportChangeRef = useRef(onViewportChange);
  const onBearingChangeRef = useRef(onBearingChange);
  const onLongPressRef = useRef(onLongPress);
  const onUserDragRef = useRef(onUserDrag);

  onPinClickRef.current = onPinClick;
  onPinDragRef.current = onPinDrag;
  onCenterChangeRef.current = onCenterChange;
  onViewportChangeRef.current = onViewportChange;
  onBearingChangeRef.current = onBearingChange;
  onLongPressRef.current = onLongPress;
  onUserDragRef.current = onUserDrag;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initial = initialCenter ?? userPosition ?? AVEIRO;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleFor(mapStyle),
      center: [initial.lng, initial.lat],
      zoom,
      interactive,
      attributionControl: showAttribution ? {} : false,
      fadeDuration: 0,
      refreshExpiredTiles: false,
    });
    mapRef.current = map;
    const markers = markersRef.current;
    let moveRaf = 0;
    const handleMoveEnd = () => {
      if (moveRaf) cancelAnimationFrame(moveRaf);
      moveRaf = requestAnimationFrame(() => {
        moveRaf = 0;
        const c = map.getCenter();
        onCenterChangeRef.current?.({ lat: c.lat, lng: c.lng });
      });
    };
    map.on("moveend", handleMoveEnd);

    const VIEWPORT_THROTTLE_MS = 150;
    let viewRaf = 0;
    let viewTimer: ReturnType<typeof setTimeout> | null = null;
    let lastViewAt = 0;
    let viewPending = false;
    const emitViewport = () => {
      lastViewAt = Date.now();
      viewPending = false;
      if (viewRaf) return;
      viewRaf = requestAnimationFrame(() => {
        viewRaf = 0;
        if (!onViewportChangeRef.current) return;
        const c = map.getCenter();
        const b = map.getBounds();
        onViewportChangeRef.current({
          center: { lat: c.lat, lng: c.lng },
          bounds: {
            south: b.getSouth(),
            north: b.getNorth(),
            west: b.getWest(),
            east: b.getEast(),
          },
        });
      });
    };
    const scheduleViewport = () => {
      const now = Date.now();
      const since = now - lastViewAt;
      if (since >= VIEWPORT_THROTTLE_MS) {
        emitViewport();
        return;
      }
      if (viewPending) return;
      viewPending = true;
      if (viewTimer) clearTimeout(viewTimer);
      viewTimer = setTimeout(() => {
        viewTimer = null;
        emitViewport();
      }, VIEWPORT_THROTTLE_MS - since);
    };
    map.on("move", scheduleViewport);
    map.on("moveend", emitViewport);
    map.once("load", emitViewport);
    let rotateRaf = 0;
    const handleRotate = () => {
      if (rotateRaf) return;
      rotateRaf = requestAnimationFrame(() => {
        rotateRaf = 0;
        onBearingChangeRef.current?.(map.getBearing());
      });
    };
    map.on("rotate", handleRotate);
    map.on("rotateend", handleRotate);

    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let pressOrigin: { x: number; y: number; lat: number; lng: number } | null =
      null;
    let pressPulseEl: HTMLDivElement | null = null;
    const removePulse = () => {
      if (pressPulseEl && pressPulseEl.parentNode) {
        pressPulseEl.parentNode.removeChild(pressPulseEl);
      }
      pressPulseEl = null;
    };
    const cancelPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      pressOrigin = null;
      removePulse();
    };
    const spawnPulse = (x: number, y: number) => {
      const c = containerRef.current;
      if (!c) return;
      removePulse();
      const el = document.createElement("div");
      el.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(39,116,174,0.35) 0%, rgba(39,116,174,0) 70%);
        pointer-events: none;
        transform: translate(-50%, -50%);
        z-index: 5;
        animation: longPressPulse 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
      `;
      c.appendChild(el);
      pressPulseEl = el;
    };
    const handleTouchStart = (e: maplibregl.MapTouchEvent) => {
      if (e.originalEvent.touches.length !== 1) {
        cancelPress();
        return;
      }
      pressOrigin = {
        x: e.point.x,
        y: e.point.y,
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      };
      spawnPulse(e.point.x, e.point.y);
      pressTimer = setTimeout(() => {
        if (pressOrigin) {
          onLongPressRef.current?.({
            lat: pressOrigin.lat,
            lng: pressOrigin.lng,
          });
          pressOrigin = null;
        }
        removePulse();
      }, 500);
    };
    const handleTouchMove = (e: maplibregl.MapTouchEvent) => {
      if (!pressOrigin) return;
      const dx = e.point.x - pressOrigin.x;
      const dy = e.point.y - pressOrigin.y;
      if (Math.hypot(dx, dy) > 10) cancelPress();
    };
    const handleContextMenu = (e: maplibregl.MapMouseEvent) => {
      onLongPressRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
    const handleDragStart = () => {
      onUserDragRef.current?.();
    };
    map.on("touchstart", handleTouchStart);
    map.on("touchmove", handleTouchMove);
    map.on("touchend", cancelPress);
    map.on("touchcancel", cancelPress);
    map.on("contextmenu", handleContextMenu);
    map.on("dragstart", handleDragStart);

    return () => {
      cancelPress();
      if (moveRaf) cancelAnimationFrame(moveRaf);
      if (viewRaf) cancelAnimationFrame(viewRaf);
      if (viewTimer) clearTimeout(viewTimer);
      if (rotateRaf) cancelAnimationFrame(rotateRaf);
      map.off("moveend", handleMoveEnd);
      map.off("move", scheduleViewport);
      map.off("moveend", emitViewport);
      map.off("rotate", handleRotate);
      map.off("rotateend", handleRotate);
      map.off("touchstart", handleTouchStart);
      map.off("touchmove", handleTouchMove);
      map.off("touchend", cancelPress);
      map.off("touchcancel", cancelPress);
      map.off("contextmenu", handleContextMenu);
      map.off("dragstart", handleDragStart);
      map.remove();
      mapRef.current = null;
      markers.clear();
      userMarkerRef.current = null;
      dragMarkerRef.current = null;
      pressMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFirstStyleRef = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (isFirstStyleRef.current) {
      isFirstStyleRef.current = false;
      return;
    }
    map.setStyle(styleFor(mapStyle));
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = markersRef.current;
    const seen = new Set<string>();
    for (const p of places) {
      seen.add(p.id);
      const prev = existing.get(p.id);
      if (prev) {
        const ll = prev.getLngLat();
        if (ll.lng !== p.lng || ll.lat !== p.lat) {
          prev.setLngLat([p.lng, p.lat]);
        }
        setPinActive(prev.getElement() as HTMLDivElement, p.id === highlightId);
        continue;
      }
      const el = createPinElement("place", { active: p.id === highlightId });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onPinClickRef.current?.(p);
      });
      const marker = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
        offset: [0, 2],
      })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      existing.set(p.id, marker);
    }
    for (const [id, marker] of existing) {
      if (!seen.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }
  }, [places, highlightId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userPosition) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const el = createPinElement("user");
      userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([userPosition.lng, userPosition.lat])
        .addTo(map);
    } else {
      const ll = userMarkerRef.current.getLngLat();
      if (ll.lng !== userPosition.lng || ll.lat !== userPosition.lat) {
        userMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat]);
      }
    }
  }, [userPosition]);

  const padTop = viewportPadding?.top ?? 0;
  const padBottom = viewportPadding?.bottom ?? 0;
  const padLeft = viewportPadding?.left ?? 0;
  const padRight = viewportPadding?.right ?? 0;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setPadding({ top: padTop, bottom: padBottom, left: padLeft, right: padRight });
  }, [padTop, padBottom, padLeft, padRight]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    const padding = { top: padTop, right: padRight, bottom: padBottom, left: padLeft };
    // Lock user gestures so a lingering finger after a long-press doesn't
    // cancel the camera animation midway.
    map.dragPan.disable();
    map.dragRotate.disable();
    map.scrollZoom.disable();
    map.touchZoomRotate.disable();
    map.doubleClickZoom.disable();
    const reenable = () => {
      map.dragPan.enable();
      map.dragRotate.enable();
      map.scrollZoom.enable();
      map.touchZoomRotate.enable();
      map.doubleClickZoom.enable();
    };
    const duration =
      flyTo.duration ?? (flyTo.mode === "ease" ? 600 : 520);
    if (flyTo.mode === "ease") {
      map.easeTo({
        center: [flyTo.lng, flyTo.lat],
        zoom: flyTo.zoom ?? map.getZoom(),
        bearing: 0,
        pitch: 0,
        duration,
        padding,
        essential: true,
      });
    } else {
      map.flyTo({
        center: [flyTo.lng, flyTo.lat],
        zoom: flyTo.zoom ?? zoom,
        bearing: 0,
        pitch: 0,
        duration,
        padding,
        essential: true,
      });
    }
    const t = window.setTimeout(reenable, duration + 40);
    return () => {
      window.clearTimeout(t);
      reenable();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !resetBearing) return;
    map.easeTo({ bearing: 0, pitch: 0, duration: 320 });
  }, [resetBearing]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pressFeedback) return;
    const ring = document.createElement("div");
    ring.style.cssText = [
      "width:14px",
      "height:14px",
      "border-radius:50%",
      "border:2.5px solid #2774AE",
      "background:rgba(39,116,174,0.25)",
      "pointer-events:none",
      "transform-origin:50% 50%",
      "animation:pressRing 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) both",
    ].join(";");
    const marker = new maplibregl.Marker({
      element: ring,
      anchor: "center",
    })
      .setLngLat([pressFeedback.lng, pressFeedback.lat])
      .addTo(map);
    pressMarkerRef.current?.remove();
    pressMarkerRef.current = marker;
    const timeout = setTimeout(() => {
      marker.remove();
      if (pressMarkerRef.current === marker) pressMarkerRef.current = null;
    }, 600);
    return () => {
      clearTimeout(timeout);
      marker.remove();
      if (pressMarkerRef.current === marker) pressMarkerRef.current = null;
    };
  }, [pressFeedback]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!draggablePin) {
      dragMarkerRef.current?.remove();
      dragMarkerRef.current = null;
      return;
    }
    if (!dragMarkerRef.current) {
      const el = createPinElement("place");
      el.style.transform = "scale(1.25)";
      const marker = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
        offset: [0, 2],
        draggable: true,
      })
        .setLngLat([draggablePin.lng, draggablePin.lat])
        .addTo(map);
      marker.on("dragend", () => {
        const ll = marker.getLngLat();
        onPinDragRef.current?.({ lat: ll.lat, lng: ll.lng });
      });
      dragMarkerRef.current = marker;
    } else {
      dragMarkerRef.current.setLngLat([draggablePin.lng, draggablePin.lat]);
    }
  }, [draggablePin]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0 }}
      />
      {centerPin && (
        <div
          style={{
            position: "absolute",
            top: `calc(50% + ${(padTop - padBottom) / 2}px)`,
            left: `calc(50% + ${(padLeft - padRight) / 2}px)`,
            transform: "translate(-50%, calc(-100% + 2.8px))",
            pointerEvents: "none",
            zIndex: 5,
            width: 44,
            height: 56,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              filter: "drop-shadow(0 8px 14px rgba(39,116,174,0.5))",
              animation: "float 2s ease-in-out infinite",
            }}
          >
            <svg
              width="44"
              height="56"
              viewBox="0 0 32 40"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 1 C 8 1 2 7 2 15 C 2 23 11 32 16 38 C 21 32 30 23 30 15 C 30 7 24 1 16 1 Z"
                fill="#2774AE"
                stroke="#fff"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

const MapView = memo(MapViewImpl);
export default MapView;
