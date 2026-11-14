import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import * as THREE from 'three';
import { formatMoney, type Session, type Venue } from '@/core';
import { seatLabelText } from '@/i18n/seatLabel';
import { useT } from '@/i18n/useLanguage';
import { seatMapMessages } from '../messages';
import { colors, radius, styles, useResponsive, Chip, space } from '../ui';
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

const PRESET_LABELS: {
  id: CameraPreset;
  label: 'presetIsometric' | 'presetTop' | 'presetFront' | 'presetBar';
}[] = [
  { id: 'isometric', label: 'presetIsometric' },
  { id: 'top', label: 'presetTop' },
  { id: 'front', label: 'presetFront' },
  { id: 'bar', label: 'presetBar' },
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
  height: customHeight,
}: CafeScene3DProps) {
  const { isWide } = useResponsive();
  const height = customHeight ?? (isWide ? 320 : 210);
  const sceneCfg = resolveScene3D(venue);
  const [preset, setPreset] = useState<CameraPreset>('isometric');
  const [orbit, setOrbit] = useState<OrbitState>(CAMERA_PRESETS.isometric);
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [webglActive] = useState<boolean>(detectWebGLSupport);

  const containerRef = useRef<ComponentRef<typeof View> | null>(null);
  const orbitRef = useRef<OrbitState>(orbit);
  const onSelectRef = useRef(onSelect);
  const { t, lang } = useT(seatMapMessages);
  const canvasLabel = t('canvasA11y', { venue: venue.name });
  const canvasLabelRef = useRef(canvasLabel);
  const renderFrameRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    canvasLabelRef.current = canvasLabel;
    const host = containerRef.current as unknown as HTMLElement | null;
    if (host && typeof host.querySelector === 'function')
      host.querySelector('canvas')?.setAttribute('aria-label', canvasLabel);
  }, [canvasLabel]);

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
    canvas.style.borderRadius = `${radius.md}px`;
    canvas.style.cursor = 'grab';
    // Vertical swipes keep scrolling the page; horizontal drags orbit the room.
    canvas.style.touchAction = 'pan-y';
    canvas.setAttribute('aria-label', canvasLabelRef.current);

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

    const width = Math.max(280, host.clientWidth || 350);
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

    let activePointerId: number | null = null;
    let downX = 0;
    let downY = 0;

    const endDrag = () => {
      if (activePointerId === null) return;
      activePointerId = null;
      dragging = false;
      canvas.style.cursor = 'grab';
      // React state only needs the orbit once the gesture settles.
      if (dragMoved) setOrbit(orbitRef.current);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (activePointerId !== null || !e.isPrimary) return;
      activePointerId = e.pointerId;
      dragging = true;
      dragMoved = false;
      startX = downX = e.clientX;
      startY = downY = e.clientY;
      canvas.style.cursor = 'grabbing';
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Capture is an enhancement; the drag still works over the canvas.
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (dragging) {
        if (e.pointerId !== activePointerId) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const slop = e.pointerType === 'mouse' ? 3 : 8;
        if (
          Math.abs(e.clientX - downX) > slop ||
          Math.abs(e.clientY - downY) > slop
        )
          dragMoved = true;
        if (!dragMoved) return;
        startX = e.clientX;
        startY = e.clientY;
        orbitRef.current = {
          ...orbitRef.current,
          theta: orbitRef.current.theta - dx * 0.007,
          phi: THREE.MathUtils.clamp(
            orbitRef.current.phi - dy * 0.006,
            0.1,
            Math.PI * 0.44,
          ),
        };
        renderFrame();
      } else if (e.pointerType === 'mouse') {
        const hitSeat = pickSeatAt(e.clientX, e.clientY);
        setHoveredSeatId(hitSeat);
        canvas.style.cursor = hitSeat ? 'pointer' : 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return;
      if (!dragMoved) {
        const hitSeat = pickSeatAt(e.clientX, e.clientY);
        if (hitSeat) onSelectRef.current(hitSeat);
      }
      endDrag();
    };

    // The browser cancels the pointer when it takes the gesture for page scroll.
    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerId === activePointerId) endDrag();
    };

    const onPointerLeave = () => {
      if (!dragging) setHoveredSeatId(null);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('lostpointercapture', onPointerCancel);
    canvas.addEventListener('pointerleave', onPointerLeave);

    return () => {
      renderFrameRef.current = null;
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('lostpointercapture', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      renderer?.dispose();
      renderer?.forceContextLoss();
    };
  }, [webglActive, venue, sessions, selectedSeatId, height]);

  const activeSeat =
    venue.seats.find((s) => s.id === (hoveredSeatId ?? selectedSeatId)) ?? null;
  const activeSeatOccupied = activeSeat
    ? sessions.some((s) => s.venueId === venue.id && s.seatId === activeSeat.id)
    : false;

  return (
    <View
      style={{
        width: '100%',
        maxWidth: '100%',
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceSubtle,
      }}
    >
      <View style={{ gap: space.sm }}>
        <Text style={styles.captionStrong}>
          {t('engine', {
            venue: venue.name,
            width: sceneCfg.roomWidth,
            depth: sceneCfg.roomDepth,
            theme: sceneCfg.theme,
          })}
        </Text>
        <View style={styles.row}>
          {PRESET_LABELS.map((item) => (
            <Chip
              key={item.id}
              label={t(item.label)}
              selected={preset === item.id}
              onPress={() => {
                setPreset(item.id);
                setOrbit(CAMERA_PRESETS[item.id]);
              }}
            />
          ))}
          <Chip
            label={t('zoomIn')}
            onPress={() =>
              setOrbit((prev) => ({
                ...prev,
                distance: Math.max(7, prev.distance - 2),
              }))
            }
          />
          <Chip
            label={t('zoomOut')}
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
          borderRadius: radius.md,
        }}
      />

      {/* Interactive Spatial Floor Map (fallback when WebGL is disabled) */}
      {!webglActive && (
        <Text style={styles.caption}>
          {t('blueprint', {
            lighting: sceneCfg.lighting,
            count: sceneCfg.fixtures.length,
          })}
        </Text>
      )}
      {!webglActive && (
        <View
          style={{
            width: '100%',
            height: 200,
            borderRadius: radius.md,
            borderWidth: 2,
            borderColor: sceneCfg.wallColor,
            backgroundColor: sceneCfg.floorColor,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {venue.seats.map((seat) => {
            const { worldX, worldZ } = gridToWorld(
              seat.x,
              seat.z,
              sceneCfg,
              venue.seats,
            );
            const leftPct = Math.min(
              84,
              Math.max(
                4,
                ((worldX + sceneCfg.roomWidth / 2) / sceneCfg.roomWidth) * 100,
              ),
            );
            const topPct = Math.min(
              80,
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
                hitSlop={8}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  paddingVertical: space.xs,
                  paddingHorizontal: space.sm,
                  borderRadius: radius.sm,
                  borderWidth: 2,
                  borderColor: selected ? venue.accent : colors.onPrimary,
                  backgroundColor: occupied ? colors.blue : colors.green,
                }}
              >
                <Text
                  style={[styles.captionStrong, { color: colors.onPrimary }]}
                >
                  {seatLabelText(seat.label, lang)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {activeSeat ? (
        <Text style={styles.captionStrong}>
          {t('selected', {
            seat: seatLabelText(activeSeat.label, lang),
            kind: t(activeSeat.kind),
            status: activeSeatOccupied ? t('occupied') : t('available'),
            rate: formatMoney(activeSeat.hourlyRate),
          })}
        </Text>
      ) : null}
    </View>
  );
}
