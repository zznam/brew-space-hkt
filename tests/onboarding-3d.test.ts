import { describe, expect, it, vi } from 'vitest';
import {
  calculateBill,
  createAppStore,
  getAllVenues,
  getVenue,
  initialState,
  isDemoState,
  isValidVenue,
} from '../src/core';
import {
  buildVenueThreeScene,
  CAMERA_PRESETS,
  computeCameraPosition,
  gridToWorld,
  resolveScene3D,
} from '../src/components/canvas3d/sceneBuilder';
import {
  classifyFileKind,
  SAMPLE_ONBOARDING_BUNDLES,
} from '../src/features/merchant/onboarding/mediaProcessor';
import {
  buildOpenAIMessages,
  computeVenueDiffSummary,
  generateVenueFromContext,
  OPENAI_CHAT_COMPLETIONS_URL,
  refineVenueWithAI,
} from '../src/features/merchant/onboarding/openaiOnboarding';

describe('3D scene builder and spatial coordinate mapping', () => {
  it('provides seeded 3D scenes for all default venues and builds Three.js meshes', () => {
    for (const id of ['grind', 'matcha', 'cyber'] as const) {
      const venue = getVenue(id);
      const cfg = resolveScene3D(venue);
      expect(cfg.roomWidth).toBeGreaterThanOrEqual(8);
      expect(cfg.roomDepth).toBeGreaterThanOrEqual(7);
      expect(cfg.fixtures.length).toBeGreaterThan(0);

      const { scene, seatMeshes } = buildVenueThreeScene(
        venue,
        [],
        venue.seats[0]!.id,
      );
      expect(seatMeshes).toHaveLength(venue.seats.length);
      expect(seatMeshes[0]?.userData?.seatId).toBe(venue.seats[0]?.id);
      expect(scene.children.length).toBeGreaterThan(venue.seats.length);
    }
  });

  it('maps seat grid coordinates within room boundaries and computes valid camera positions', () => {
    const venue = getVenue('grind');
    const cfg = resolveScene3D(venue);
    for (const seat of venue.seats) {
      const { worldX, worldZ } = gridToWorld(seat.x, seat.z, cfg, venue.seats);
      expect(Math.abs(worldX)).toBeLessThan(cfg.roomWidth / 2);
      expect(Math.abs(worldZ)).toBeLessThan(cfg.roomDepth / 2);
    }
    for (const preset of Object.values(CAMERA_PRESETS)) {
      const pos = computeCameraPosition(preset);
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(pos.y).toBeGreaterThan(0);
      expect(Number.isFinite(pos.z)).toBe(true);
    }
  });
});

describe('multimodal onboarding and OpenAI 3D generation', () => {
  it('classifies uploaded photos, videos, and documents accurately', () => {
    expect(classifyFileKind('bar.jpg', 'image/jpeg')).toBe('photo');
    expect(classifyFileKind('floor.png', '')).toBe('photo');
    expect(classifyFileKind('tour.mp4', 'video/mp4')).toBe('video');
    expect(classifyFileKind('walkthrough.mov', '')).toBe('video');
    expect(classifyFileKind('menu.pdf', 'application/pdf')).toBe('document');
    expect(classifyFileKind('notes.md', 'text/markdown')).toBe('document');
  });

  it('includes photo and extracted video keyframe image_url blocks for OpenAI Vision', () => {
    const messages = buildOpenAIMessages({
      targetVenueId: 'new',
      ownerVenueName: 'Test Vision Cafe',
      ownerNotes: 'Cozy brick interior',
      uploads: [
        {
          id: 'p1',
          name: 'room.jpg',
          kind: 'photo',
          mimeType: 'image/jpeg',
          sizeBytes: 1200,
          dataUrl: 'data:image/jpeg;base64,AAECAw==',
          summary: 'Photo',
        },
        {
          id: 'v1',
          name: 'tour.mp4',
          kind: 'video',
          mimeType: 'video/mp4',
          sizeBytes: 9000,
          extractedFrames: [
            'data:image/jpeg;base64,BAUGBw==',
            'data:image/jpeg;base64,CAkK==',
          ],
          summary: 'Video keyframes',
        },
        {
          id: 'd1',
          name: 'menu.md',
          kind: 'document',
          mimeType: 'text/markdown',
          sizeBytes: 300,
          extractedText: '- Espresso: 40000',
          summary: 'Doc',
        },
      ],
    });
    const userContent = messages[1]!.content as { type: string }[];
    const imageParts = userContent.filter((part) => part.type === 'image_url');
    expect(imageParts).toHaveLength(3);
  });

  it('calls OpenAI Chat Completions with structured JSON schema and multi-turn chat history', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'gpt-4o-2024-08-06',
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: 'OpenAI Roastery',
                description: 'AI generated 3D roastery.',
                accent: '#8b4513',
                reasoningSummary:
                  'Generated from uploaded photos and PDF menu.',
                scene3d: {
                  roomWidth: 14,
                  roomDepth: 10,
                  wallColor: '#e8ddd3',
                  floorColor: '#b9936c',
                  ceilingColor: '#f6f2ec',
                  theme: 'industrial',
                  lighting: 'cozy-amber',
                  summary: '14x10 industrial loft',
                  fixtures: [
                    {
                      kind: 'bar',
                      label: 'Main Espresso Bar',
                      x: 0.5,
                      z: -0.2,
                      width: 2.8,
                      depth: 1.0,
                      rotationY: 0,
                      color: '#8b4513',
                    },
                  ],
                },
                seats: [
                  {
                    label: 'Window Desk 1',
                    kind: 'desk',
                    x: 0,
                    z: 0,
                    hourlyRate: 35000,
                    rotationY: 0,
                    zone: 'Window Zone',
                  },
                  {
                    label: 'Quiet Pod 2',
                    kind: 'pod',
                    x: 1,
                    z: 1,
                    hourlyRate: 45000,
                    rotationY: 0,
                    zone: 'Quiet Zone',
                  },
                ],
                menu: [
                  { name: 'Pour Over V60', price: 55000 },
                  { name: 'Cinnamon Roll', price: 42000 },
                ],
              }),
            },
          },
        ],
      }),
    });

    const bundle = SAMPLE_ONBOARDING_BUNDLES[0]!;
    const result = await generateVenueFromContext(
      {
        targetVenueId: 'new',
        ownerVenueName: bundle.venueName,
        ownerNotes: bundle.ownerNotes,
        uploads: bundle.uploads,
      },
      {
        apiKey: 'sk-test-openai-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
      },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0]).toBe(OPENAI_CHAT_COMPLETIONS_URL);
    expect(result.source).toBe('openai');
    expect(result.venue.name).toBe('OpenAI Roastery');
    expect(result.venue.seats).toHaveLength(2);
    expect(result.venue.menu[0]?.price).toBe(55000);
    expect(isValidVenue(result.venue)).toBe(true);

    // Multi-turn chat feedback call with history
    await refineVenueWithAI(
      result.venue,
      'Add 1 booth and make room 16m x 12m',
      {
        apiKey: 'sk-test-openai-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        chatHistory: [
          {
            id: 'm1',
            role: 'owner',
            text: 'Initial generation',
            iteration: 1,
          },
          {
            id: 'm2',
            role: 'assistant',
            text: result.reasoningSummary,
            iteration: 1,
          },
        ],
      },
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(
      String(mockFetch.mock.calls[1]?.[1]?.body ?? '{}'),
    ) as { messages: { role: string }[] };
    expect(secondBody.messages.length).toBe(4);
  });

  it('supports multi-turn conversational feedback iterations and computes structured diffs', async () => {
    const bundle = SAMPLE_ONBOARDING_BUNDLES[0]!;
    const iter1 = await generateVenueFromContext({
      targetVenueId: 'new',
      ownerVenueName: bundle.venueName,
      ownerNotes: bundle.ownerNotes,
      uploads: bundle.uploads,
    });

    expect(iter1.source).toBe('local-ai-synthesizer');
    expect(iter1.venue.name).toBe('Saigon Roastery & Loft');
    expect(iter1.venue.seats).toHaveLength(8);

    // Iteration #2: Add seats, fixtures, lighting, and menu item
    const iter2 = await refineVenueWithAI(
      iter1.venue,
      'Add 2 focus pods, add a sofa, switch lighting to neon-night, and add Matcha Cheesecake for 58000',
    );
    expect(iter2.venue.seats).toHaveLength(10);
    expect(iter2.venue.scene3d?.lighting).toBe('neon-night');
    expect(
      iter2.venue.menu.some(
        (m) => m.name === 'Matcha Cheesecake' && m.price === 58000,
      ),
    ).toBe(true);
    expect(iter2.diffSummary).toContain('Seats: 8 → 10 (+2)');
    expect(iter2.diffSummary).toContain('Lighting: cozy-amber → neon-night');

    // Iteration #3: Expand room, remove 1 desk, and rename cafe
    const iter3 = await refineVenueWithAI(
      iter2.venue,
      'Expand room to 16m x 12m, remove 1 desk, and rename cafe to District 1 Roastery',
    );
    expect(iter3.venue.name).toBe('District 1 Roastery');
    expect(iter3.venue.scene3d?.roomWidth).toBe(16);
    expect(iter3.venue.scene3d?.roomDepth).toBe(12);
    expect(iter3.venue.seats).toHaveLength(9);
    const diffs = computeVenueDiffSummary(iter2.venue, iter3.venue);
    expect(diffs).toContain(
      'Name: Saigon Roastery & Loft → District 1 Roastery',
    );
    expect(diffs).toContain('Room: 14m×10m → 16m×12m');
    expect(diffs).toContain('Seats: 10 → 9 (-1)');
  });
});

describe('custom onboarded venue store integration', () => {
  it('registers an onboarded 3D venue, supports sessions and billing, and validates state', async () => {
    const store = createAppStore();
    const bundle = SAMPLE_ONBOARDING_BUNDLES[1]!;
    const generated = await generateVenueFromContext({
      targetVenueId: 'new',
      ownerVenueName: bundle.venueName,
      ownerNotes: bundle.ownerNotes,
      uploads: bundle.uploads,
    });

    const upsertRes = store.getState().upsertVenue(generated.venue);
    expect(upsertRes).toEqual({ ok: true });
    expect(store.getState().venueId).toBe(generated.venue.id);
    expect(getAllVenues(store.getState().customVenues)).toHaveLength(4);

    // Select a free seat in the new custom venue and start a session
    const occupiedIds = new Set(
      store
        .getState()
        .sessions.filter((s) => s.venueId === generated.venue.id)
        .map((s) => s.seatId),
    );
    const freeSeat = generated.venue.seats.find((s) => !occupiedIds.has(s.id))!;
    store.getState().selectSeat(freeSeat.id);
    expect(store.getState().startSession('METERED_OPEN')).toEqual({ ok: true });

    const demoSession = store
      .getState()
      .sessions.find(
        (s) =>
          s.venueId === generated.venue.id && s.customerId === 'demo-guest',
      )!;
    const firstMenu = generated.venue.menu[0]!;
    expect(store.getState().addItem(demoSession.id, firstMenu.id)).toEqual({
      ok: true,
    });
    store.getState().advanceTime();

    const updatedSession = store
      .getState()
      .sessions.find((s) => s.id === demoSession.id)!;
    expect(calculateBill(updatedSession).total).toBe(
      freeSeat.hourlyRate / 2 + firstMenu.price,
    );
    expect(isDemoState(store.getState())).toBe(true);

    // Rejects invalid venue
    expect(
      store.getState().upsertVenue({
        ...generated.venue,
        seats: [],
      }).ok,
    ).toBe(false);

    store.getState().reset();
    expect(store.getState().customVenues).toBeUndefined();
    expect(store.getState().venueId).toBe(initialState().venueId);
  });
});
