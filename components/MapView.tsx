"use client";
import { memo, useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, Marker, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Place } from "@/lib/supabase";
import { createPinElement, setPinActive } from "./PinElement";

type LatLng = { lat: number; lng: number };

type Padding = { top?: number; bottom?: number; left?: number; right?: number };

export type MapStyleKind = "standard" | "satellite";

export type Bounds = { south: number; north: number; west: number; east: number };

type Props = {
  places?: Place[];
  userPosition?: LatLng | null;
  initialCenter?: LatLng | null;
  flyTo?: { lat: number; lng: number; ts: number; zoom?: number } | null;
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
      tileSize: 128,
      maxzoom: 22,
      attribution: "&copy; Google",
    },
  },
  layers: [
    {
      id: "google-satellite",
      type: "raster",
      source: "google-satellite",
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

    let viewRaf = 0;
    const fireViewport = () => {
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
    map.on("move", fireViewport);
    map.once("load", fireViewport);
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
    const cancelPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      pressOrigin = null;
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
      pressTimer = setTimeout(() => {
        if (pressOrigin) {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate(20);
            } catch {
              // ignore
            }
          }
          onLongPressRef.current?.({
            lat: pressOrigin.lat,
            lng: pressOrigin.lng,
          });
          pressOrigin = null;
        }
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
      if (rotateRaf) cancelAnimationFrame(rotateRaf);
      map.off("moveend", handleMoveEnd);
      map.off("move", fireViewport);
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: flyTo.zoom ?? zoom,
      bearing: 0,
      pitch: 0,
      duration: 520,
      essential: true,
    });
  }, [flyTo, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !resetBearing) return;
    map.easeTo({ bearing: 0, pitch: 0, duration: 320 });
  }, [resetBearing]);

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
              strokeWidth="2.2"
            />
            <circle cx="16" cy="11" r="2.4" fill="#fff" />
            <path d="M12.5 17 L19.5 17 L18.2 22 L13.8 22 Z" fill="#fff" />
          </svg>
        </div>
      )}
    </div>
  );
}

const MapView = memo(MapViewImpl);
export default MapView;
