import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { PixelRatio, View, type GestureResponderEvent } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { buildVenueThreeScene, computeCameraPosition } from './sceneBuilder';
import { disposeScene } from './sceneResources';
import type { SceneViewportProps } from './SceneViewport.types';

interface NativeScene {
  gl: ExpoWebGLRenderingContext;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  seatMeshes: THREE.Object3D[];
}

/** Metro selects SceneViewport.web.tsx for browsers; this surface is native only. */
export function SceneViewport(props: SceneViewportProps) {
  const propsRef = useRef(props);
  useLayoutEffect(() => {
    propsRef.current = props;
  }, [props]);
  const runtime = useRef<NativeScene | null>(null);
  const alive = useRef(true);
  const layout = useRef({ width: 0, height: props.height });
  const gesture = useRef({ x: 0, y: 0, startX: 0, startY: 0, moved: false });

  const dispose = useCallback(() => {
    const current = runtime.current;
    runtime.current = null;
    if (!current) return;
    disposeScene(current.scene);
    current.renderer.dispose();
  }, []);

  const render = useCallback(() => {
    const current = runtime.current;
    if (!current || !alive.current) return;
    try {
      const { gl, renderer, camera, scene } = current;
      // Expo exposes the initial drawing-buffer size. Layout changes (rotation,
      // split screen) arrive in points, so use their current physical size.
      const width = layout.current.width
        ? Math.round(layout.current.width * PixelRatio.get())
        : gl.drawingBufferWidth;
      const height = layout.current.width
        ? Math.round(layout.current.height * PixelRatio.get())
        : gl.drawingBufferHeight;
      if (!width || !height) return;
      // Size is already in physical pixels; leave the renderer pixel ratio at 1.
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const orbit = propsRef.current.orbit;
      const position = computeCameraPosition(orbit);
      camera.position.set(position.x, position.y, position.z);
      camera.lookAt(orbit.targetX, 0.35, orbit.targetZ);
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
      gl.endFrameEXP();
    } catch {
      dispose();
      propsRef.current.onUnavailable();
    }
  }, [dispose]);

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      if (!alive.current) return;
      dispose();
      let renderer: THREE.WebGLRenderer | undefined;
      try {
        // Three accepts an existing GL context, but still expects a canvas-shaped
        // event target. Native GLView owns the actual surface and its lifecycle.
        const canvas = {
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
          style: {},
          addEventListener() {},
          removeEventListener() {},
          getContext: () => gl,
        } as unknown as HTMLCanvasElement;
        renderer = new THREE.WebGLRenderer({
          canvas,
          context: gl,
          antialias: false,
        });
        const { venue, sessions, selectedSeatId } = propsRef.current;
        const { scene, seatMeshes } = buildVenueThreeScene(
          venue,
          sessions,
          selectedSeatId,
        );
        runtime.current = {
          gl,
          renderer,
          scene,
          seatMeshes,
          camera: new THREE.PerspectiveCamera(42, 1, 0.1, 100),
        };
        render();
      } catch {
        renderer?.dispose();
        propsRef.current.onUnavailable();
      }
    },
    [dispose, render],
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      dispose();
    };
  }, [dispose]);

  useEffect(() => {
    const current = runtime.current;
    if (!current) return;
    try {
      const next = buildVenueThreeScene(
        props.venue,
        props.sessions,
        props.selectedSeatId,
      );
      disposeScene(current.scene);
      current.scene = next.scene;
      current.seatMeshes = next.seatMeshes;
      render();
    } catch {
      dispose();
      propsRef.current.onUnavailable();
    }
  }, [props.venue, props.sessions, props.selectedSeatId, dispose, render]);

  useEffect(() => {
    render();
  }, [props.orbit, render]);

  const begin = (event: GestureResponderEvent) => {
    const { pageX, pageY, touches } = event.nativeEvent;
    gesture.current = {
      x: pageX,
      y: pageY,
      startX: pageX,
      startY: pageY,
      moved: touches.length > 1,
    };
  };
  const move = (event: GestureResponderEvent) => {
    const { pageX, pageY, touches } = event.nativeEvent;
    const drag = gesture.current;
    const dx = pageX - drag.x;
    const dy = pageY - drag.y;
    if (
      Math.hypot(pageX - drag.startX, pageY - drag.startY) > 6 ||
      touches.length > 1
    )
      drag.moved = true;
    drag.x = pageX;
    drag.y = pageY;
    if (!drag.moved || touches.length > 1) return;
    const orbit = propsRef.current.orbit;
    propsRef.current.onOrbitChange({
      ...orbit,
      theta: orbit.theta - dx * 0.007,
      phi: THREE.MathUtils.clamp(orbit.phi - dy * 0.006, 0.1, Math.PI * 0.44),
    });
  };
  const end = (event: GestureResponderEvent) => {
    if (gesture.current.moved) return;
    const current = runtime.current;
    const { width, height } = layout.current;
    if (!current || !width || !height) return;
    const { locationX, locationY } = event.nativeEvent;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(
      new THREE.Vector2(
        (locationX / width) * 2 - 1,
        1 - (locationY / height) * 2,
      ),
      current.camera,
    );
    const hit = raycaster
      .intersectObjects(current.seatMeshes, true)
      .find(
        (intersection) =>
          typeof intersection.object.userData.seatId === 'string',
      );
    if (hit) propsRef.current.onSelect(hit.object.userData.seatId as string);
  };

  return (
    <View
      style={{ width: '100%', height: props.height }}
      onLayout={({ nativeEvent }) => {
        layout.current = nativeEvent.layout;
        render();
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={begin}
      onResponderMove={move}
      onResponderRelease={end}
      onResponderTerminate={() => {
        gesture.current.moved = true;
      }}
      accessibilityLabel={props.canvasLabel}
    >
      <GLView
        style={{ flex: 1 }}
        onContextCreate={onContextCreate}
        pointerEvents="none"
      />
    </View>
  );
}
