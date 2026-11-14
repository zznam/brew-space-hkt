import { useEffect, useRef, type ComponentRef } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { radius } from '../ui';
import {
  buildVenueThreeScene,
  computeCameraPosition,
  type OrbitState,
} from './sceneBuilder';
import { disposeScene } from './sceneResources';
import type { SceneViewportProps } from './SceneViewport.types';

export function SceneViewport({
  venue,
  sessions,
  selectedSeatId,
  onSelect,
  height,
  orbit,
  canvasLabel,
  onOrbitChange: setOrbit,
  onHover: setHoveredSeatId,
  onUnavailable,
}: SceneViewportProps) {
  const containerRef = useRef<ComponentRef<typeof View> | null>(null);
  const orbitRef = useRef<OrbitState>(orbit);
  const onSelectRef = useRef(onSelect);
  const canvasLabelRef = useRef(canvasLabel);
  const renderFrameRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    canvasLabelRef.current = canvasLabel;
    const host = containerRef.current as unknown as HTMLElement | null;
    host?.querySelector('canvas')?.setAttribute('aria-label', canvasLabel);
  }, [canvasLabel]);
  useEffect(() => {
    orbitRef.current = orbit;
    renderFrameRef.current?.();
  }, [orbit]);
  useEffect(() => {
    if (typeof document === 'undefined') return;
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
      if (!gl) {
        onUnavailable();
        return;
      }
      renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl as WebGLRenderingContext,
        antialias: true,
      });
    } catch {
      onUnavailable();
      return;
    }

    host.innerHTML = '';
    host.appendChild(canvas);

    const width = Math.max(1, host.clientWidth || 350);
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
      try {
        renderer.render(scene, camera);
      } catch {
        onUnavailable();
      }
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
      disposeScene(scene);
      renderer?.dispose();
      renderer?.forceContextLoss();
      canvas.remove();
    };
  }, [
    venue,
    sessions,
    selectedSeatId,
    height,
    onUnavailable,
    setOrbit,
    setHoveredSeatId,
  ]);

  return <View ref={containerRef} style={{ width: '100%', height }} />;
}
