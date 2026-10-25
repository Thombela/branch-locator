import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLibreEvent,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef, useState } from 'react';
import type { BranchSummary, LatLng } from '@/api/schemas';
import { useDarkAppearance } from '@/app/theme';
import { env } from '@/config/env';
import { distanceKm } from '@/domain/geo';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { clusterPoints } from './clusters';
import './BranchMap.css';

// Serve the worker from our own origin, so the CSP needs neither `blob:` nor `unsafe-eval`.
setWorkerUrl(workerUrl);

export interface BranchMapProps {
  origin: LatLng;
  radiusKm: number;
  branches: readonly BranchSummary[];
  /** Changes when a new result set should be framed; `null` while the current search loads. */
  fitKey: string | null;
  selected: { id: string; location: LatLng } | null;
  highlightedId: string | null;
  user: { location: LatLng; accuracyM: number } | null;
  /** Space covered by floating UI, so framing keeps pins visible. */
  insetTop: number;
  insetBottom: number;
  onSelect: (id: string) => void;
  onHighlight: (id: string | null) => void;
  /** Gets the map centre when the customer pans away from the search, or `null` when back. */
  onAreaChange: (center: LatLng | null) => void;
}

const ACCURACY_SOURCE = 'user-accuracy';
/** Pins closer than this on screen are shown as one numbered cluster. */
const CLUSTER_RADIUS_PX = 28;
/** From this zoom, pins are always shown on their own. */
const CLUSTER_MAX_ZOOM = 16;

type Pin = { marker: Marker; el: HTMLButtonElement };

/** A polygon close to a circle of `radiusM` metres, for the location accuracy halo. */
function circle(center: LatLng, radiusM: number, steps = 48): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    coords.push([center.lng + dLng * Math.cos(angle), center.lat + dLat * Math.sin(angle)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

function pinElement(): HTMLButtonElement {
  // Built with DOM APIs so branch data doesn't go through innerHTML.
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'branch-pin';
  const body = document.createElement('span');
  body.className = 'branch-pin__body';
  const dot = document.createElement('span');
  dot.className = 'branch-pin__dot';
  body.append(dot);
  button.append(body);
  return button;
}

function clusterElement(count: number): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'branch-cluster';
  button.textContent = String(count);
  const label = `${count} branches here. Zoom in to see them`;
  button.setAttribute('aria-label', label);
  button.title = label;
  return button;
}

/**
 * Hides pins that would overlap and shows a cluster for each group instead. A cluster whose
 * branches haven't changed keeps its marker, so focus and clicks survive a zoom.
 */
function recluster(
  map: MapLibreMap,
  pins: Map<string, Pin>,
  clusters: Map<string, Pin>,
  { branches, selected, highlightedId, insetTop, insetBottom }: BranchMapProps,
): Map<string, Pin> {
  const radius = map.getZoom() >= CLUSTER_MAX_ZOOM ? 0 : CLUSTER_RADIUS_PX;
  const points = branches.map((branch) => {
    const { x, y } = map.project([branch.location.lng, branch.location.lat]);
    return { id: branch.id, x, y };
  });
  const keep = new Set(selected ? [selected.id] : []);
  const next = new Map<string, Pin>();
  for (const cluster of clusterPoints(points, radius, keep)) {
    const grouped = cluster.ids.length > 1;
    for (const id of cluster.ids) pins.get(id)?.el.classList.toggle('is-clustered', grouped);
    if (!grouped) continue;

    const key = [...cluster.ids].sort().join('|');
    let pin = clusters.get(key);
    if (!pin) {
      const el = clusterElement(cluster.ids.length);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        const bounds = new LngLatBounds();
        for (const branch of branches) {
          if (cluster.ids.includes(branch.id)) {
            bounds.extend([branch.location.lng, branch.location.lat]);
          }
        }
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        map.fitBounds(bounds, {
          padding: { top: 48 + insetTop, left: 48, right: 48, bottom: 48 + insetBottom },
          maxZoom: CLUSTER_MAX_ZOOM + 1,
          duration: reduce ? 0 : 600,
        });
      });
      pin = { marker: new Marker({ element: el }).setLngLat([0, 0]).addTo(map), el };
    }
    pin.marker.setLngLat(map.unproject([cluster.x, cluster.y]));
    pin.el.classList.toggle(
      'is-highlighted',
      highlightedId !== null && cluster.ids.includes(highlightedId),
    );
    next.set(key, pin);
  }
  for (const [key, pin] of clusters) if (!next.has(key)) pin.marker.remove();
  return next;
}

function userElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'user-dot';
  el.setAttribute('aria-hidden', 'true');
  const pulse = document.createElement('span');
  pulse.className = 'user-dot__pulse';
  const core = document.createElement('span');
  core.className = 'user-dot__core';
  el.append(pulse, core);
  return el;
}

/**
 * MapLibre map with pins as real buttons. React owns the data and this component owns the
 * map: creating it once, syncing pins, framing results and following the selection.
 */
export function BranchMap(props: BranchMapProps) {
  const { origin, branches, fitKey, selected, highlightedId, user, insetTop, insetBottom } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pinsRef = useRef(new Map<string, Pin>());
  const clustersRef = useRef(new Map<string, Pin>());
  const userMarkerRef = useRef<Marker | null>(null);
  const callbacks = useRef(props);
  const { dark } = useDarkAppearance();
  const finePointer = useMediaQuery('(pointer: fine)');
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const styleUrl = dark ? env.mapStyles.dark : env.mapStyles.light;
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    callbacks.current = props;
  });

  const reclusterPins = () => {
    const map = mapRef.current;
    if (map)
      clustersRef.current = recluster(map, pinsRef.current, clustersRef.current, callbacks.current);
  };

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleUrl,
      center: [origin.lng, origin.lat],
      zoom: 12,
      minZoom: 4,
      attributionControl: false,
      dragRotate: true,
      pitchWithRotate: false,
    });
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    map.on('zoomend', reclusterPins);
    // A failed tile is fine; a failed style means there is no map to show.
    map.on('error', () => {
      if (!map.isStyleLoaded()) setUnavailable(true);
    });
    map.on('styledata', () => setUnavailable(false));
    map.on('moveend', (event: MapLibreEvent<MouseEvent | TouchEvent | WheelEvent | undefined>) => {
      // Only the customer's own pans count; camera moves made in code have no originalEvent.
      if (!event.originalEvent) return;
      const { origin: o, radiusKm, onAreaChange } = callbacks.current;
      const center = map.getCenter();
      const moved = distanceKm(o, { lat: center.lat, lng: center.lng });
      onAreaChange(
        moved > Math.max(1, radiusKm * 0.35) ? { lat: center.lat, lng: center.lng } : null,
      );
    });
    mapRef.current = map;
    const pins = pinsRef.current;
    return () => {
      // Clear the ref first: other effects' cleanups run after this one and must not touch a removed map.
      mapRef.current = null;
      pins.clear();
      clustersRef.current = new Map();
      userMarkerRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; later changes are applied below
  }, []);

  // Zoom and compass buttons for mouse users; touch users pinch and rotate.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !finePointer) return;
    const control = new NavigationControl({ showCompass: true, visualizePitch: false });
    map.addControl(control, 'top-right');
    return () => {
      mapRef.current?.removeControl(control);
    };
  }, [finePointer]);

  // Follow light/dark appearance.
  useEffect(() => {
    mapRef.current?.setStyle(styleUrl);
  }, [styleUrl]);

  // Sync branch pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pins = pinsRef.current;
    const ids = new Set(branches.map((b) => b.id));
    for (const [id, pin] of pins) {
      if (!ids.has(id)) {
        pin.marker.remove();
        pins.delete(id);
      }
    }
    for (const branch of branches) {
      let pin = pins.get(branch.id);
      if (!pin) {
        const el = pinElement();
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          callbacks.current.onSelect(branch.id);
        });
        el.addEventListener('mouseenter', () => callbacks.current.onHighlight(branch.id));
        el.addEventListener('mouseleave', () => callbacks.current.onHighlight(null));
        el.addEventListener('focus', () => callbacks.current.onHighlight(branch.id));
        el.addEventListener('blur', () => callbacks.current.onHighlight(null));
        const marker = new Marker({ element: el, anchor: 'bottom' })
          .setLngLat([branch.location.lng, branch.location.lat])
          .addTo(map);
        pin = { marker, el };
        pins.set(branch.id, pin);
      }
      pin.el.setAttribute(
        'aria-label',
        `${branch.name}, ${branch.openStatus.isOpen ? 'open' : 'closed'}`,
      );
      pin.el.classList.toggle('is-closed', !branch.openStatus.isOpen);
    }
    reclusterPins();
  }, [branches]);

  // Reflect selection and hover on the pins.
  useEffect(() => {
    for (const [id, { el }] of pinsRef.current) {
      const isSelected = id === selected?.id;
      el.classList.toggle('is-selected', isSelected);
      el.classList.toggle('is-highlighted', id === highlightedId);
      el.setAttribute('aria-pressed', String(isSelected));
    }
    reclusterPins();
  }, [selected?.id, highlightedId, branches]);

  // The customer's location: a dot plus an accuracy halo.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    const drawHalo = () => {
      const data: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: user ? [circle(user.location, Math.min(user.accuracyM, 2000))] : [],
      };
      const source = map.getSource<GeoJSONSource>(ACCURACY_SOURCE);
      if (source) void source.setData(data);
      else {
        map.addSource(ACCURACY_SOURCE, { type: 'geojson', data });
        map.addLayer({
          id: 'user-accuracy-fill',
          type: 'fill',
          source: ACCURACY_SOURCE,
          paint: { 'fill-color': '#0a84ff', 'fill-opacity': 0.1 },
        });
      }
    };
    if (map.isStyleLoaded()) drawHalo();
    map.on('style.load', drawHalo); // re-add after a light/dark style swap

    if (user) {
      userMarkerRef.current = new Marker({ element: userElement() })
        .setLngLat([user.location.lng, user.location.lat])
        .addTo(map);
    }
    return () => {
      mapRef.current?.off('style.load', drawHalo);
    };
  }, [user]);

  const padding = { top: 24 + insetTop, left: 24, right: 24, bottom: 24 + insetBottom };

  // Frame the origin and its results whenever a new search lands.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitKey === null) return;
    const duration = reduceMotion ? 0 : 700;
    if (branches.length === 0) {
      map.easeTo({ center: [origin.lng, origin.lat], zoom: 12, padding, duration });
      return;
    }
    const bounds = new LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
    for (const b of branches) bounds.extend([b.location.lng, b.location.lat]);
    map.fitBounds(bounds, { padding, maxZoom: 15, duration });
    callbacks.current.onAreaChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reframe only when the result set changes
  }, [fitKey]);

  // Bring the selected branch into view (above the sheet on phones).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    map.easeTo({
      center: [selected.location.lng, selected.location.lat],
      zoom: Math.max(map.getZoom(), 15),
      padding,
      duration: reduceMotion ? 0 : 600,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follow the selection, not every layout change
  }, [selected?.id]);

  return (
    <>
      <div
        ref={containerRef}
        role="region"
        aria-label="Map of nearby branches"
        className="branch-map"
      />
      {unavailable && (
        <p className="branch-map__notice" role="status">
          The map couldn’t load. You can still use the list of branches.
        </p>
      )}
    </>
  );
}
