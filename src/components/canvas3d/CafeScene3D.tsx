import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import * as THREE from 'three';
import { formatMoney, type Session, type Venue } from '@/core';
import { Button, colors, styles } from '../ui';
import {
  buildVenueThreeScene,
  CAMERA_PRESETS,
  computeCameraPosition,
  gridToWorld,
  resolveScene3D,
  type CameraPreset,
  type OrbitState,
} from './sceneBuilder';

export interface CafeScene3DProps {
  venue: Venue;
  sessions: readonly Session[];
  selectedSeatId: string | null;
  onSelect: (seatId: string) => void;
  height?: number;
}

const PRESET_LABELS: { id: CameraPreset; label: string }[] = [
  { id: 'isometric', label: '3D Isometric' },
  { id: 'top', label: 'Top-Down' },
  { id: 'front', label: 'Walk-In View' },
  { id: 'bar', label: 'Bar Angle' },
];

function detectWebGLSupport(): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  try {
    const testCanvas = document.createElement('canvas');
    const gl =
      testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function CafeScene3D({
  venue,
  sessions,
  selectedSeatId,
  onSelect,
  height = 340,
}: CafeScene3DProps) {
  const sceneCfg = resolveScene3D(venue);
  const [preset, setPreset] = useState<CameraPreset>('isometric');
  const [orbit, setOrbit] = useState<OrbitState>(CAMERA_PRESETS.isometric);
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [webglActive] = useState<boolean>(detectWebGLSupport);

  const containerRef = useRef<ComponentRef<typeof View> | null>(null);
  const orbitRef = useRef<OrbitState>(orbit);
  const onSelectRef = useRef(onSelect);
  const renderFrameRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    orbitRef.current = orbit;
    renderFrameRef.current?.();
  }, [orbit]);

  useEffect(() => {
    if (
      !webglActive ||
      Platform.OS !== 'web' ||
      typeof document === 'undefined'
    )
      return;
    const host = containerRef.current as unknown as HTMLElement | null;
    if (!host || typeof host.appendChild !== 'function') return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;
    canvas.style.display = 'block';
    canvas.style.borderRadius = '12px';
    canvas.style.cursor = 'grab';
    canvas.setAttribute('aria-label', `${venue.name} 3D floor canvas`);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      const gl =
        canvas.getContext('webgl2', { antialias: true }) ||
        canvas.getContext('webgl', { antialias: true });
      if (!gl) return;
      renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl as WebGLRenderingContext,
        antialias: true,
      });
    } catch {
      return;
    }

    host.innerHTML = '';
    host.appendChild(canvas);

    const width = Math.max(320, host.clientWidth || 760);
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(
      typeof window !== 'undefined'
        ? Math.min(window.devicePixelRatio || 1, 2)
        : 1,
    );

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const { scene, seatMeshes } = buildVenueThreeScene(
      venue,
      sessions,
      selectedSeatId,
    );

    const renderFrame = () => {
      if (!renderer) return;
      const camPos = computeCameraPosition(orbitRef.current);
      camera.position.set(camPos.x, camPos.y, camPos.z);
      camera.lookAt(orbitRef.current.targetX, 0.35, orbitRef.current.targetZ);
      renderer.render(scene, camera);
    };
    renderFrameRef.current = renderFrame;
    renderFrame();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let dragMoved = false;
    let startX = 0;
    let startY = 0;

    const pickSeatAt = (clientX: number, clientY: number): string | null => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(seatMeshes, true);
      for (const hit of hits) {
        const seatId = hit.object.userData?.seatId as string | undefined;
        if (seatId) return seatId;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      dragMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      canvas.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
        startX = e.clientX;
        startY = e.clientY;
        const next: OrbitState = {
          ...orbitRef.current,
          theta: orbitRef.current.theta - dx * 0.007,
          phi: THREE.MathUtils.clamp(
            orbitRef.current.phi - dy * 0.006,
            0.1,
            Math.PI * 0.44,
          ),
        };
        orbitRef.current = next;
        setOrbit(next);
        renderFrame();
      } else {
        const hitSeat = pickSeatAt(e.clientX, e.clientY);
        setHoveredSeatId(hitSeat);
        canvas.style.cursor = hitSeat ? 'pointer' : 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dragging && !dragMoved) {
        const hitSeat = pickSeatAt(e.clientX, e.clientY);
        if (hitSeat) onSelectRef.current(hitSeat);
      }
      dragging = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      renderFrameRef.current = null;
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer?.dispose();
    };
  }, [webglActive, venue, sessions, selectedSeatId, height]);

  const activeSeat =
    venue.seats.find((s) => s.id === (hoveredSeatId ?? selectedSeatId)) ?? null;
  const activeSeatOccupied = activeSeat
    ? sessions.some((s) => s.venueId === venue.id && s.seatId === activeSeat.id)
    : false;

  const isDarkTheme = sceneCfg.theme === 'cyber';

  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: isDarkTheme ? '#0f172a' : '#f7f4ee',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <View style={{ gap: 2 }}>
          <Text
            style={{
              fontWeight: '700',
              fontSize: 15,
              color: isDarkTheme ? '#f8fafc' : colors.ink,
            }}
          >
            3D Spatial Engine · {venue.name} ({sceneCfg.roomWidth}m ×{' '}
            {sceneCfg.roomDepth}m · {sceneCfg.theme})
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: isDarkTheme ? '#cbd5e1' : colors.muted,
            }}
          >
            {sceneCfg.summary ??
              'Drag to orbit 3D view, or tap a seat in the 3D floor to select.'}
          </Text>
        </View>
        <View style={styles.row}>
          {PRESET_LABELS.map((item) => (
            <Button
              key={item.id}
              label={item.label}
              selected={preset === item.id}
              onPress={() => {
                setPreset(item.id);
                setOrbit(CAMERA_PRESETS[item.id]);
              }}
            />
          ))}
          <Button
            label="Zoom +"
            onPress={() =>
              setOrbit((prev) => ({
                ...prev,
                distance: Math.max(7, prev.distance - 2),
              }))
            }
          />
          <Button
            label="Zoom −"
            onPress={() =>
              setOrbit((prev) => ({
                ...prev,
                distance: Math.min(24, prev.distance + 2),
              }))
            }
          />
        </View>
      </View>

      {/* Three.js WebGL viewport host */}
      <View
        ref={containerRef}
        style={{
          width: '100%',
          height: webglActive ? height : 0,
          overflow: 'hidden',
          borderRadius: 12,
        }}
      />

      {/* Interactive Spatial Floor Map (fallback when WebGL is disabled) */}
      {!webglActive && (
        <View
          style={{
            width: '100%',
            height: 240,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: sceneCfg.wallColor,
            backgroundColor: sceneCfg.floorColor,
            position: 'relative',
            overflow: 'hidden',
            padding: 12,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: isDarkTheme ? '#e2e8f0' : '#1e293b',
            }}
          >
            3D Architectural Blueprint · Lighting: {sceneCfg.lighting} ·{' '}
            {sceneCfg.fixtures.length} fixtures
          </Text>
          {venue.seats.map((seat) => {
            const { worldX, worldZ } = gridToWorld(
              seat.x,
              seat.z,
              sceneCfg,
              venue.seats,
            );
            const leftPct = Math.min(
              86,
              Math.max(
                6,
                ((worldX + sceneCfg.roomWidth / 2) / sceneCfg.roomWidth) * 100,
              ),
            );
            const topPct = Math.min(
              82,
              Math.max(
                14,
                ((worldZ + sceneCfg.roomDepth / 2) / sceneCfg.roomDepth) * 100,
              ),
            );
            const occupied = sessions.some(
              (s) => s.venueId === venue.id && s.seatId === seat.id,
            );
            const selected = selectedSeatId === seat.id;
            return (
              <Pressable
                key={`blueprint-${seat.id}`}
                onPress={() => onSelect(seat.id)}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: selected ? venue.accent : '#ffffff',
                  backgroundColor: occupied ? '#0284c7' : '#15803d',
                }}
              >
                <Text
                  style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}
                >
                  {seat.label} ({seat.kind})
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Scene fixtures & active seat status strip */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: isDarkTheme ? '#cbd5e1' : colors.muted,
          }}
        >
          Fixtures in 3D room:{' '}
          {sceneCfg.fixtures.map((f) => f.label).join(' · ') || 'Standard room'}
        </Text>
        {activeSeat ? (
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: isDarkTheme ? '#f8fafc' : colors.ink,
            }}
          >
            3D Focus: {activeSeat.label} ({activeSeat.kind}
            {activeSeat.zone ? ` · ${activeSeat.zone}` : ''}) ·{' '}
            {activeSeatOccupied ? 'Occupied' : 'Available'} ·{' '}
            {formatMoney(activeSeat.hourlyRate)}/h
          </Text>
        ) : null}
      </View>
    </View>
  );
}
