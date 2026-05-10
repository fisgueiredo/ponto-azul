"use client";
import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Place } from "@/lib/supabase";
import { createPinElement } from "./PinElement";

type LatLng = { lat: number; lng: number };

type Props = {
  places?: Place[];
  userPosition?: LatLng | null;
  initialCenter?: LatLng | null;
  flyTo?: { lat: number; lng: number; ts: number } | null;
  zoom?: number;
  interactive?: boolean;
  showAttribution?: boolean;
  onPinClick?: (place: Place) => void;
  draggablePin?: LatLng | null;
  onPinDrag?: (pos: LatLng) => void;
  highlightId?: string | null;
  className?: string;
  style?: React.CSSProperties;
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const AVEIRO: LatLng = { lat: 40.6443, lng: -8.6455 };

export default function MapView({
  places = [],
  userPosition = null,
  initialCenter = null,
  flyTo = null,
  zoom = 14,
  interactive = true,
  showAttribution = false,
  onPinClick,
  draggablePin = null,
  onPinDrag,
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

  useEffect(() => {
    onPinClickRef.current = onPinClick;
    onPinDragRef.current = onPinDrag;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initial = initialCenter ?? userPosition ?? AVEIRO;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [initial.lng, initial.lat],
      zoom,
      interactive,
      attributionControl: showAttribution ? {} : false,
    });
    mapRef.current = map;
    const markers = markersRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
      userMarkerRef.current = null;
      dragMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = markersRef.current;
    const seen = new Set<string>();
    for (const p of places) {
      seen.add(p.id);
      const prev = existing.get(p.id);
      if (prev) {
        prev.setLngLat([p.lng, p.lat]);
        continue;
      }
      const el = createPinElement("place", { active: p.id === highlightId });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onPinClickRef.current?.(p);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
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
      userMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat]);
    }
  }, [userPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({ center: [flyTo.lng, flyTo.lat], zoom, duration: 800 });
  }, [flyTo, zoom]);

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
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}
