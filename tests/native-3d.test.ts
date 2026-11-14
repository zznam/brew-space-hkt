import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { getVenue } from '../src/core';
import type { Messages } from '../src/i18n/i18n';
import { CafeScene3D } from '../src/components/canvas3d/CafeScene3D';

vi.mock('../src/i18n/useLanguage', async () => {
  const { translator } = await import('../src/i18n/i18n');
  return {
    useT: (messages: Messages<string>) => ({
      t: translator(messages, 'en'),
      lang: 'en',
    }),
  };
});
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  PixelRatio: { get: () => 2 },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
}));
vi.mock('../src/components/ui', () => ({
  colors: {},
  radius: {},
  space: {},
  styles: {},
  type: { caption: {}, overline: {} },
  useResponsive: () => ({ isWide: false }),
  Chip: 'Chip',
}));
vi.mock('expo-gl', () => ({ GLView: 'GLView' }));

const gpu = vi.hoisted(() => ({
  fail: false,
  render: vi.fn(),
  dispose: vi.fn(),
  setSize: vi.fn(),
}));
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
      constructor() {
        if (gpu.fail) throw new Error('GPU unavailable');
      }
      setSize = gpu.setSize;
      dispose = gpu.dispose;
      render(
        scene: InstanceType<typeof actual.Scene>,
        camera: InstanceType<typeof actual.Camera>,
      ) {
        scene.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);
        gpu.render(scene, camera);
      }
    },
  };
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  await act(() => tree?.unmount());
  gpu.fail = false;
  vi.clearAllMocks();
});

describe('native cafe 3D viewport', () => {
  it('mounts a native GL surface instead of always falling back to 2D', async () => {
    await act(() => {
      tree = create(
        createElement(CafeScene3D, {
          venue: getVenue('grind'),
          sessions: [],
          selectedSeatId: null,
          onSelect: vi.fn(),
        }),
      );
    });
    expect(tree!.root.findAllByType('GLView' as never)).toHaveLength(1);
  });
  it('presents frames, raycasts taps in layout points, updates scenes and disposes the GPU', async () => {
    const venue = getVenue('grind');
    const onSelect = vi.fn();
    await act(() => {
      tree = create(
        createElement(CafeScene3D, {
          venue,
          sessions: [],
          selectedSeatId: null,
          onSelect,
        }),
      );
    });
    const gl = {
      drawingBufferWidth: 780,
      drawingBufferHeight: 420,
      endFrameEXP: vi.fn(),
    };
    await act(() =>
      tree!.root
        .findByType('GLView' as never)
        .props.onContextCreate(gl as unknown as ExpoWebGLRenderingContext),
    );
    expect(gpu.setSize).toHaveBeenCalledWith(780, 420, false);
    expect(gl.endFrameEXP).toHaveBeenCalledTimes(1);
    const [scene, camera] = gpu.render.mock.calls[0] as [
      THREE.Scene,
      THREE.PerspectiveCamera,
    ];
    const surface = tree!.root
      .findAllByType('View' as never)
      .find((view) => view.props.onResponderRelease)!;
    await act(() =>
      surface.props.onLayout({
        nativeEvent: { layout: { width: 390, height: 210 } },
      }),
    );
    const seat = scene.children.find((object) => object.userData.seatId)!;
    const point = seat
      .getWorldPosition(new THREE.Vector3())
      .add(new THREE.Vector3(0, 0.74, 0))
      .project(camera);
    const tap = {
      nativeEvent: {
        locationX: (point.x + 1) * 195,
        locationY: (1 - point.y) * 105,
        pageX: 10,
        pageY: 10,
        touches: [{}],
      },
    };
    await act(() => {
      surface.props.onResponderGrant(tap);
      surface.props.onResponderRelease(tap);
    });
    expect(onSelect).toHaveBeenCalledWith(seat.userData.seatId);

    onSelect.mockClear();
    await act(() => {
      surface.props.onResponderGrant(tap);
      surface.props.onResponderMove({
        nativeEvent: { ...tap.nativeEvent, pageX: 50 },
      });
      surface.props.onResponderRelease(tap);
    });
    expect(onSelect).not.toHaveBeenCalled();
    expect(gpu.render.mock.calls.length).toBeGreaterThan(2);

    await act(() =>
      surface.props.onLayout({
        nativeEvent: { layout: { width: 600, height: 320 } },
      }),
    );
    expect(gpu.setSize).toHaveBeenLastCalledWith(1200, 640, false);
    expect(camera.aspect).toBe(600 / 320);

    const geometry = (seat.children[0] as THREE.Mesh).geometry;
    const disposeGeometry = vi.spyOn(geometry, 'dispose');
    await act(() =>
      tree!.update(
        createElement(CafeScene3D, {
          venue: getVenue('matcha'),
          sessions: [],
          selectedSeatId: null,
          onSelect,
        }),
      ),
    );
    expect(disposeGeometry).toHaveBeenCalled();
    expect(gpu.dispose).not.toHaveBeenCalled();
    await act(() => tree!.unmount());
    tree = undefined;
    expect(gpu.dispose).toHaveBeenCalledTimes(1);
  });

  it('shows the usable 2D fallback when native GL initialization fails', async () => {
    gpu.fail = true;
    const onSelect = vi.fn();
    await act(() => {
      tree = create(
        createElement(CafeScene3D, {
          venue: getVenue('grind'),
          sessions: [],
          selectedSeatId: null,
          onSelect,
        }),
      );
    });
    await act(() =>
      tree!.root.findByType('GLView' as never).props.onContextCreate({}),
    );
    expect(tree!.root.findAllByType('GLView' as never)).toHaveLength(0);
    const seat = tree!.root.findAllByType('Pressable' as never)[0]!;
    await act(() => seat.props.onPress());
    expect(onSelect).toHaveBeenCalledWith(getVenue('grind').seats[0]!.id);
  });
});
