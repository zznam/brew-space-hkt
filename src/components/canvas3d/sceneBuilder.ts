import * as THREE from 'three';
import type {
  Scene3DConfig,
  Scene3DFixture,
  Seat,
  Session,
  Venue,
} from '@/core';

export type CameraPreset = 'isometric' | 'top' | 'front' | 'bar';

export interface OrbitState {
  theta: number;
  phi: number;
  distance: number;
  targetX: number;
  targetZ: number;
}

export const CAMERA_PRESETS: Record<CameraPreset, OrbitState> = {
  isometric: {
    theta: Math.PI * 0.22,
    phi: Math.PI * 0.31,
    distance: 14.5,
    targetX: 0,
    targetZ: 0.3,
  },
  top: {
    theta: 0,
    phi: 0.12,
    distance: 15.5,
    targetX: 0,
    targetZ: 0,
  },
  front: {
    theta: 0,
    phi: Math.PI * 0.36,
    distance: 13.5,
    targetX: 0,
    targetZ: 0.4,
  },
  bar: {
    theta: -Math.PI * 0.26,
    phi: Math.PI * 0.33,
    distance: 11.5,
    targetX: -1.4,
    targetZ: -0.8,
  },
};

export function resolveScene3D(venue: Venue): Scene3DConfig {
  if (venue.scene3d) return venue.scene3d;
  return {
    roomWidth: 12,
    roomDepth: 9,
    wallColor: '#ebe5dc',
    floorColor: '#c7a987',
    ceilingColor: '#f8f5f0',
    theme: 'warm-minimal',
    lighting: 'warm-daylight',
    summary: `${venue.name} interactive 3D floorplan.`,
    fixtures: [
      {
        id: `${venue.id}-default-bar`,
        kind: 'bar',
        label: 'Main Cafe Bar',
        x: 0.5,
        z: -0.2,
        width: 2.5,
        depth: 1.0,
        color: venue.accent,
      },
      {
        id: `${venue.id}-default-window`,
        kind: 'window',
        label: 'Front Window',
        x: 2.2,
        z: -0.6,
        width: 2.4,
      },
      {
        id: `${venue.id}-default-plant`,
        kind: 'plant',
        label: 'Corner Planter',
        x: 3.3,
        z: 1.2,
      },
    ],
  };
}

export function gridToWorld(
  x: number,
  z: number,
  scene: Scene3DConfig,
  seats: readonly Seat[],
): { worldX: number; worldZ: number } {
  const xs = seats.map((s) => s.x);
  const zs = seats.map((s) => s.z);
  const minX = xs.length ? Math.min(0, ...xs) : 0;
  const maxX = xs.length ? Math.max(3, ...xs) : 3;
  const minZ = zs.length ? Math.min(0, ...zs) : 0;
  const maxZ = zs.length ? Math.max(1.5, ...zs) : 1.5;

  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const usableW = Math.max(4, scene.roomWidth - 3.6);
  const usableD = Math.max(3.5, scene.roomDepth - 3.4);

  const normX = (x - (minX + maxX) / 2) / spanX;
  const normZ = (z - (minZ + maxZ) / 2) / spanZ;

  const worldX = THREE.MathUtils.clamp(
    normX * usableW,
    -scene.roomWidth / 2 + 0.9,
    scene.roomWidth / 2 - 0.9,
  );
  const worldZ = THREE.MathUtils.clamp(
    normZ * usableD + 0.6,
    -scene.roomDepth / 2 + 0.7,
    scene.roomDepth / 2 - 0.9,
  );
  return { worldX, worldZ };
}

export function computeCameraPosition(orbit: OrbitState): {
  x: number;
  y: number;
  z: number;
} {
  const phi = THREE.MathUtils.clamp(orbit.phi, 0.08, Math.PI * 0.45);
  const dist = THREE.MathUtils.clamp(orbit.distance, 6, 26);
  const x = orbit.targetX + dist * Math.sin(phi) * Math.sin(orbit.theta);
  const y = dist * Math.cos(phi);
  const z = orbit.targetZ + dist * Math.sin(phi) * Math.cos(orbit.theta);
  return { x, y, z };
}

function tagSeatChildren(group: THREE.Object3D, seatId: string) {
  group.userData.seatId = seatId;
  group.traverse((child) => {
    child.userData.seatId = seatId;
  });
}

function buildFixtureMesh(
  fixture: Scene3DFixture,
  sceneCfg: Scene3DConfig,
  seats: readonly Seat[],
  accent: string,
): THREE.Group {
  const group = new THREE.Group();
  const { worldX, worldZ } = gridToWorld(fixture.x, fixture.z, sceneCfg, seats);
  group.position.set(worldX, 0, worldZ);
  if (fixture.rotationY) {
    group.rotation.y = THREE.MathUtils.degToRad(fixture.rotationY);
  }
  const primaryColor = fixture.color || accent;

  switch (fixture.kind) {
    case 'bar': {
      const w = fixture.width ?? 2.6;
      const d = fixture.depth ?? 1.0;
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(w, 1.05, d),
        new THREE.MeshStandardMaterial({
          color: primaryColor,
          roughness: 0.65,
        }),
      );
      base.position.set(0, 0.525, -sceneCfg.roomDepth * 0.22);
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.16, 0.08, d + 0.14),
        new THREE.MeshStandardMaterial({
          color: sceneCfg.theme === 'cyber' ? '#38bdf8' : '#f3ece3',
          roughness: 0.35,
        }),
      );
      top.position.set(0, 1.09, -sceneCfg.roomDepth * 0.22);
      const machine = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.42, 0.42),
        new THREE.MeshStandardMaterial({
          color: '#334155',
          metalness: 0.5,
          roughness: 0.3,
        }),
      );
      machine.position.set(-w * 0.22, 1.34, -sceneCfg.roomDepth * 0.22);
      group.add(base, top, machine);
      break;
    }
    case 'coffee-machine': {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.45, 0.4),
        new THREE.MeshStandardMaterial({
          color: primaryColor,
          metalness: 0.45,
          roughness: 0.35,
        }),
      );
      body.position.set(0, 1.32, -sceneCfg.roomDepth * 0.22);
      group.add(body);
      break;
    }
    case 'window': {
      const w = fixture.width ?? 2.2;
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(w, 1.65, 0.08),
        new THREE.MeshStandardMaterial({
          color: sceneCfg.lighting === 'neon-night' ? '#38bdf8' : '#bae6fd',
          transparent: true,
          opacity: 0.55,
          emissive: sceneCfg.lighting === 'neon-night' ? '#0284c7' : '#e0f2fe',
          emissiveIntensity: 0.35,
        }),
      );
      glass.position.set(0, 1.45, -sceneCfg.roomDepth / 2 - worldZ + 0.08);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.12, 1.75, 0.05),
        new THREE.MeshStandardMaterial({ color: '#475569' }),
      );
      frame.position.set(0, 1.45, -sceneCfg.roomDepth / 2 - worldZ + 0.05);
      group.add(frame, glass);
      break;
    }
    case 'door': {
      const doorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 2.1, 1.15),
        new THREE.MeshStandardMaterial({
          color: '#78350f',
          roughness: 0.6,
        }),
      );
      doorPanel.position.set(-sceneCfg.roomWidth / 2 - worldX + 0.08, 1.05, 0);
      const mat = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.02, 1.1),
        new THREE.MeshStandardMaterial({ color: '#475569' }),
      );
      mat.position.set(-sceneCfg.roomWidth / 2 - worldX + 0.45, 0.01, 0);
      group.add(doorPanel, mat);
      break;
    }
    case 'plant': {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.18, 0.42, 12),
        new THREE.MeshStandardMaterial({
          color: '#b45309',
          roughness: 0.8,
        }),
      );
      pot.position.y = 0.21;
      const foliageBottom = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 12, 10),
        new THREE.MeshStandardMaterial({
          color: '#15803d',
          roughness: 0.7,
        }),
      );
      foliageBottom.position.y = 0.68;
      const foliageTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 8),
        new THREE.MeshStandardMaterial({
          color: '#22c55e',
          roughness: 0.65,
        }),
      );
      foliageTop.position.set(0.06, 0.98, 0.04);
      group.add(pot, foliageBottom, foliageTop);
      break;
    }
    case 'bookshelf': {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 1.85, 1.35),
        new THREE.MeshStandardMaterial({
          color: primaryColor,
          roughness: 0.7,
        }),
      );
      shelf.position.y = 0.925;
      group.add(shelf);
      break;
    }
    case 'pendant-light': {
      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: '#1e293b' }),
      );
      cord.position.y = 2.55;
      const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.22, 14),
        new THREE.MeshStandardMaterial({
          color: primaryColor,
          roughness: 0.4,
        }),
      );
      shade.position.y = 2.12;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 10, 10),
        new THREE.MeshStandardMaterial({
          color: '#fef08a',
          emissive: '#facc15',
          emissiveIntensity: 0.9,
        }),
      );
      bulb.position.y = 2.02;
      group.add(cord, shade, bulb);
      break;
    }
    case 'partition': {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.35, 0.08),
        new THREE.MeshStandardMaterial({
          color: primaryColor,
          transparent: true,
          opacity: 0.72,
        }),
      );
      panel.position.y = 0.68;
      group.add(panel);
      break;
    }
    case 'rug': {
      const w = fixture.width ?? 2.4;
      const d = fixture.depth ?? 1.6;
      const rug = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.018, d),
        new THREE.MeshStandardMaterial({
          color: primaryColor,
          roughness: 0.95,
        }),
      );
      rug.position.y = 0.01;
      group.add(rug);
      break;
    }
    case 'sofa-lounge': {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.42, 0.75),
        new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.8 }),
      );
      base.position.y = 0.21;
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.48, 0.18),
        new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.8 }),
      );
      back.position.set(0, 0.55, -0.28);
      group.add(base, back);
      break;
    }
  }
  return group;
}

function buildSeatMesh(
  seat: Seat,
  occupied: boolean,
  selected: boolean,
  sceneCfg: Scene3DConfig,
  allSeats: readonly Seat[],
  accent: string,
): THREE.Group {
  const group = new THREE.Group();
  const { worldX, worldZ } = gridToWorld(seat.x, seat.z, sceneCfg, allSeats);
  group.position.set(worldX, 0, worldZ);
  if (seat.rotationY) {
    group.rotation.y = THREE.MathUtils.degToRad(seat.rotationY);
  }

  const statusColor = selected ? accent : occupied ? '#0284c7' : '#16a34a';

  // Status base ring
  const ringRadius =
    seat.kind === 'booth' ? 0.92 : seat.kind === 'pod' ? 0.82 : 0.68;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ringRadius * 0.78, ringRadius, 28),
    new THREE.MeshBasicMaterial({
      color: statusColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: selected ? 0.95 : 0.72,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);

  if (selected) {
    const outerHalo = new THREE.Mesh(
      new THREE.RingGeometry(ringRadius * 1.04, ringRadius * 1.18, 28),
      new THREE.MeshBasicMaterial({
        color: accent,
        side: THREE.DoubleSide,
      }),
    );
    outerHalo.rotation.x = -Math.PI / 2;
    outerHalo.position.y = 0.025;
    group.add(outerHalo);
  }

  const woodColor =
    sceneCfg.theme === 'cyber'
      ? '#334155'
      : sceneCfg.theme === 'botanical'
        ? '#d6c7b2'
        : '#8b5a2b';
  const seatFabricColor = occupied ? '#0369a1' : '#475569';

  if (seat.kind === 'desk') {
    const tabletop = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.06, 0.68),
      new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.55 }),
    );
    tabletop.position.y = 0.74;
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });
    for (const [lx, lz] of [
      [-0.44, -0.26],
      [0.44, -0.26],
      [-0.44, 0.26],
      [0.44, 0.26],
    ] as const) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.36, lz);
      group.add(leg);
    }
    const chairSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.06, 0.44),
      new THREE.MeshStandardMaterial({ color: seatFabricColor }),
    );
    chairSeat.position.set(0, 0.45, 0.42);
    const chairBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.42, 0.06),
      new THREE.MeshStandardMaterial({ color: seatFabricColor }),
    );
    chairBack.position.set(0, 0.68, 0.62);
    group.add(tabletop, chairSeat, chairBack);

    if (occupied) {
      const laptopBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.02, 0.22),
        new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.6 }),
      );
      laptopBase.position.set(0, 0.78, 0.04);
      const laptopScreen = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.2, 0.02),
        new THREE.MeshStandardMaterial({
          color: '#0f172a',
          emissive: '#38bdf8',
          emissiveIntensity: 0.5,
        }),
      );
      laptopScreen.position.set(0, 0.88, -0.06);
      group.add(laptopBase, laptopScreen);
    }
  } else if (seat.kind === 'pod') {
    const podWallMat = new THREE.MeshStandardMaterial({
      color: sceneCfg.theme === 'cyber' ? '#1e293b' : '#64748b',
      roughness: 0.6,
    });
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 1.45, 0.08),
      podWallMat,
    );
    backWall.position.set(0, 0.725, -0.52);
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.45, 1.08),
      podWallMat,
    );
    leftWall.position.set(-0.6, 0.725, 0);
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.45, 1.08),
      podWallMat,
    );
    rightWall.position.set(0.6, 0.725, 0);
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(1.06, 0.05, 0.55),
      new THREE.MeshStandardMaterial({ color: woodColor }),
    );
    desk.position.set(0, 0.72, -0.18);
    const chair = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.45, 12),
      new THREE.MeshStandardMaterial({ color: seatFabricColor }),
    );
    chair.position.set(0, 0.23, 0.22);
    group.add(backWall, leftWall, rightWall, desk, chair);
  } else {
    // booth
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.06, 0.65),
      new THREE.MeshStandardMaterial({ color: woodColor }),
    );
    table.position.set(0, 0.72, 0);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.22, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: '#334155' }),
    );
    pedestal.position.set(0, 0.35, 0);
    const benchMat = new THREE.MeshStandardMaterial({
      color: selected ? accent : occupied ? '#0284c7' : '#7c2d12',
      roughness: 0.75,
    });
    const benchNorth = new THREE.Mesh(
      new THREE.BoxGeometry(1.28, 0.48, 0.42),
      benchMat,
    );
    benchNorth.position.set(0, 0.24, -0.58);
    const benchSouth = new THREE.Mesh(
      new THREE.BoxGeometry(1.28, 0.48, 0.42),
      benchMat,
    );
    benchSouth.position.set(0, 0.24, 0.58);
    group.add(table, pedestal, benchNorth, benchSouth);
  }

  // Floating status beacon above the seat
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(selected ? 0.14 : 0.1, 14, 14),
    new THREE.MeshStandardMaterial({
      color: statusColor,
      emissive: statusColor,
      emissiveIntensity: selected ? 0.85 : 0.45,
    }),
  );
  beacon.position.y = seat.kind === 'pod' ? 1.65 : 1.32;
  group.add(beacon);

  tagSeatChildren(group, seat.id);
  return group;
}

export function buildVenueThreeScene(
  venue: Venue,
  sessions: readonly Session[],
  selectedSeatId: string | null,
): {
  scene: THREE.Scene;
  seatMeshes: THREE.Object3D[];
} {
  const cfg = resolveScene3D(venue);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(
    cfg.theme === 'cyber' ? '#0b1120' : '#f4f1ea',
  );

  // Lighting
  const ambientColor =
    cfg.lighting === 'neon-night'
      ? '#38bdf8'
      : cfg.lighting === 'cozy-amber'
        ? '#fde68a'
        : '#ffffff';
  const ambientIntensity = cfg.lighting === 'neon-night' ? 0.65 : 0.85;
  scene.add(new THREE.AmbientLight(ambientColor, ambientIntensity));

  const dirLight = new THREE.DirectionalLight(
    cfg.lighting === 'cozy-amber' ? '#fef08a' : '#ffffff',
    cfg.lighting === 'neon-night' ? 0.75 : 1.1,
  );
  dirLight.position.set(8, 14, 9);
  scene.add(dirLight);

  if (cfg.lighting === 'neon-night' || cfg.lighting === 'cozy-amber') {
    const accentLight = new THREE.PointLight(venue.accent, 1.4, 16);
    accentLight.position.set(0, 4.5, 0);
    scene.add(accentLight);
  }

  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(cfg.roomWidth, 0.14, cfg.roomDepth),
    new THREE.MeshStandardMaterial({
      color: cfg.floorColor,
      roughness: 0.8,
    }),
  );
  floor.position.set(0, -0.07, 0);
  scene.add(floor);

  const gridHelper = new THREE.GridHelper(
    Math.max(cfg.roomWidth, cfg.roomDepth),
    Math.round(Math.max(cfg.roomWidth, cfg.roomDepth)),
    venue.accent,
    cfg.theme === 'cyber' ? '#1e293b' : '#d6d3cd',
  );
  gridHelper.position.y = 0.005;
  gridHelper.scale.set(
    cfg.roomWidth / Math.max(cfg.roomWidth, cfg.roomDepth),
    1,
    cfg.roomDepth / Math.max(cfg.roomWidth, cfg.roomDepth),
  );
  scene.add(gridHelper);

  // Cutaway back and left walls
  const wallHeight = 2.8;
  const wallMat = new THREE.MeshStandardMaterial({
    color: cfg.wallColor,
    roughness: 0.85,
  });
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(cfg.roomWidth, wallHeight, 0.14),
    wallMat,
  );
  backWall.position.set(0, wallHeight / 2, -cfg.roomDepth / 2);
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, wallHeight, cfg.roomDepth),
    wallMat,
  );
  leftWall.position.set(-cfg.roomWidth / 2, wallHeight / 2, 0);
  scene.add(backWall, leftWall);

  // Architectural & decor fixtures
  for (const fixture of cfg.fixtures) {
    scene.add(buildFixtureMesh(fixture, cfg, venue.seats, venue.accent));
  }

  // Bookable seats
  const seatMeshes: THREE.Object3D[] = [];
  for (const seat of venue.seats) {
    const occupied = sessions.some(
      (s) => s.venueId === venue.id && s.seatId === seat.id,
    );
    const selected = selectedSeatId === seat.id;
    const seatGroup = buildSeatMesh(
      seat,
      occupied,
      selected,
      cfg,
      venue.seats,
      venue.accent,
    );
    scene.add(seatGroup);
    seatMeshes.push(seatGroup);
  }

  return { scene, seatMeshes };
}
