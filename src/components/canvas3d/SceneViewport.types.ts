import type { CafeScene3DProps } from './CafeScene3D';
import type { OrbitState } from './sceneBuilder';

export interface SceneViewportProps extends CafeScene3DProps {
  height: number;
  canvasLabel: string;
  orbit: OrbitState;
  onOrbitChange: (orbit: OrbitState) => void;
  onHover: (seatId: string | null) => void;
  onUnavailable: () => void;
}
