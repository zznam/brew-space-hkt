import type {
  MenuItem,
  Scene3DConfig,
  Scene3DFixture,
  Scene3DFixtureKind,
  Scene3DLighting,
  Scene3DTheme,
  Seat,
  Venue,
} from '@/core';
import type {
  OnboardingChatMessage,
  OnboardingGenerationResult,
  OnboardingInputContext,
  OnboardingUploadItem,
} from './onboardingTypes';

export const OPENAI_CHAT_COMPLETIONS_URL =
  'https://api.openai.com/v1/chat/completions';

export const OPENAI_VENUE_JSON_SCHEMA = {
  name: 'cafe_3d_onboarding_schema',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'name',
      'description',
      'accent',
      'reasoningSummary',
      'scene3d',
      'seats',
      'menu',
    ],
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      accent: { type: 'string' },
      reasoningSummary: { type: 'string' },
      scene3d: {
        type: 'object',
        additionalProperties: false,
        required: [
          'roomWidth',
          'roomDepth',
          'wallColor',
          'floorColor',
          'ceilingColor',
          'theme',
          'lighting',
          'summary',
          'fixtures',
        ],
        properties: {
          roomWidth: { type: 'number' },
          roomDepth: { type: 'number' },
          wallColor: { type: 'string' },
          floorColor: { type: 'string' },
          ceilingColor: { type: 'string' },
          theme: {
            type: 'string',
            enum: ['industrial', 'botanical', 'cyber', 'warm-minimal'],
          },
          lighting: {
            type: 'string',
            enum: [
              'warm-daylight',
              'cozy-amber',
              'neon-night',
              'bright-studio',
            ],
          },
          summary: { type: 'string' },
          fixtures: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'kind',
                'label',
                'x',
                'z',
                'width',
                'depth',
                'rotationY',
                'color',
              ],
              properties: {
                kind: {
                  type: 'string',
                  enum: [
                    'bar',
                    'window',
                    'door',
                    'plant',
                    'bookshelf',
                    'pendant-light',
                    'partition',
                    'rug',
                    'coffee-machine',
                    'sofa-lounge',
                  ],
                },
                label: { type: 'string' },
                x: { type: 'number' },
                z: { type: 'number' },
                width: { type: 'number' },
                depth: { type: 'number' },
                rotationY: { type: 'number' },
                color: { type: 'string' },
              },
            },
          },
        },
      },
      seats: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'label',
            'kind',
            'x',
            'z',
            'hourlyRate',
            'rotationY',
            'zone',
          ],
          properties: {
            label: { type: 'string' },
            kind: { type: 'string', enum: ['desk', 'booth', 'pod'] },
            x: { type: 'number' },
            z: { type: 'number' },
            hourlyRate: { type: 'number' },
            rotationY: { type: 'number' },
            zone: { type: 'string' },
          },
        },
      },
      menu: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'price'],
          properties: {
            name: { type: 'string' },
            price: { type: 'number' },
          },
        },
      },
    },
  },
} as const;

export function slugifyVenueId(name: string, targetVenueId: string): string {
  if (targetVenueId && targetVenueId !== 'new') return targetVenueId;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return slug ? `cafe-${slug}` : `cafe-${Date.now()}`;
}

function isSupportedOpenAIVisionUrl(dataUrl: string | undefined): boolean {
  if (!dataUrl) return false;
  return /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(dataUrl);
}

export function computeVenueDiffSummary(
  prevVenue: Venue,
  nextVenue: Venue,
): string[] {
  const diffs: string[] = [];
  if (prevVenue.name !== nextVenue.name) {
    diffs.push(`Name: ${prevVenue.name} → ${nextVenue.name}`);
  }
  const prevScene = prevVenue.scene3d;
  const nextScene = nextVenue.scene3d;
  if (prevScene && nextScene) {
    if (
      prevScene.roomWidth !== nextScene.roomWidth ||
      prevScene.roomDepth !== nextScene.roomDepth
    ) {
      diffs.push(
        `Room: ${prevScene.roomWidth}m×${prevScene.roomDepth}m → ${nextScene.roomWidth}m×${nextScene.roomDepth}m`,
      );
    }
    if (prevScene.theme !== nextScene.theme) {
      diffs.push(`Theme: ${prevScene.theme} → ${nextScene.theme}`);
    }
    if (prevScene.lighting !== nextScene.lighting) {
      diffs.push(`Lighting: ${prevScene.lighting} → ${nextScene.lighting}`);
    }
    if (prevScene.fixtures.length !== nextScene.fixtures.length) {
      const delta = nextScene.fixtures.length - prevScene.fixtures.length;
      diffs.push(
        `Fixtures: ${prevScene.fixtures.length} → ${nextScene.fixtures.length} (${delta > 0 ? `+${delta}` : delta})`,
      );
    }
  }
  if (prevVenue.seats.length !== nextVenue.seats.length) {
    const delta = nextVenue.seats.length - prevVenue.seats.length;
    diffs.push(
      `Seats: ${prevVenue.seats.length} → ${nextVenue.seats.length} (${delta > 0 ? `+${delta}` : delta})`,
    );
  }
  if (prevVenue.menu.length !== nextVenue.menu.length) {
    const delta = nextVenue.menu.length - prevVenue.menu.length;
    diffs.push(
      `Menu items: ${prevVenue.menu.length} → ${nextVenue.menu.length} (${delta > 0 ? `+${delta}` : delta})`,
    );
  }
  if (diffs.length === 0) {
    diffs.push('Updated 3D scene parameters');
  }
  return diffs;
}

export function buildOpenAIMessages(context: OnboardingInputContext) {
  const docBlocks = context.uploads
    .filter((u) => u.kind === 'document' && u.extractedText)
    .map((u) => `--- Document: ${u.name} ---\n${u.extractedText}`)
    .join('\n\n');

  const uploadInventory = context.uploads
    .map((u) => `- [${u.kind.toUpperCase()}] ${u.name}: ${u.summary}`)
    .join('\n');

  const userContent: Record<string, unknown>[] = [
    {
      type: 'text',
      text: [
        `Generate a complete 3D cafe & coworking venue from this cafe owner's onboarding context.`,
        `Cafe Name Hint: ${context.ownerVenueName || 'Infer from documents/photos'}`,
        `Owner Notes: ${context.ownerNotes || 'None provided'}`,
        `Uploaded Media Inventory:\n${uploadInventory || 'No files uploaded'}`,
        docBlocks ? `\nExtracted Document Contents:\n${docBlocks}` : '',
        `\nRequirements:`,
        `1. All prices and hourlyRates must be positive integer VND (e.g., 35000, 45000, 55000).`,
        `2. Place between 6 and 12 bookable seats (desk, pod, booth) on logical grid coordinates x (0..3) and z (0..2).`,
        `3. Include realistic 3D architectural fixtures (bar, window, door, plant, bookshelf, pendant-light, partition, rug, coffee-machine, sofa-lounge) matching the photos, video keyframes, and notes.`,
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];

  // Attach photo vision blocks and video keyframe vision blocks
  for (const upload of context.uploads) {
    if (upload.kind === 'photo' && isSupportedOpenAIVisionUrl(upload.dataUrl)) {
      userContent.push({
        type: 'image_url',
        image_url: { url: upload.dataUrl, detail: 'low' },
      });
    } else if (upload.kind === 'video' && upload.extractedFrames?.length) {
      for (const frame of upload.extractedFrames.slice(0, 4)) {
        if (isSupportedOpenAIVisionUrl(frame)) {
          userContent.push({
            type: 'image_url',
            image_url: { url: frame, detail: 'low' },
          });
        }
      }
    }
  }

  return [
    {
      role: 'system',
      content:
        'You are an architectural 3D cafe designer and POS onboarding specialist. Analyze all uploaded cafe photos, walkthrough video keyframes, and menu/floorplan documents to output a strict JSON 3D cafe environment and venue configuration.',
    },
    {
      role: 'user',
      content: userContent,
    },
  ];
}

function normalizeIntVnd(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  const scaled = num < 500 ? Math.round(num * 1000) : Math.round(num);
  return Math.max(5000, scaled);
}

export function normalizeGeneratedVenue(
  raw: Record<string, unknown>,
  venueId: string,
): { venue: Venue; reasoningSummary: string } {
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim()
      : 'Custom AI Cafe';
  const description =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description.trim()
      : 'AI-onboarded 3D cafe and coworking space.';
  const accent =
    typeof raw.accent === 'string' &&
    /^#[0-9a-fA-F]{6}$/.test(raw.accent.trim())
      ? raw.accent.trim()
      : '#88502d';
  const reasoningSummary =
    typeof raw.reasoningSummary === 'string' && raw.reasoningSummary.trim()
      ? raw.reasoningSummary.trim()
      : 'Synthesized 3D architecture, seating zones, and VND menu from uploaded context.';

  const rawScene =
    raw.scene3d && typeof raw.scene3d === 'object'
      ? (raw.scene3d as Record<string, unknown>)
      : {};

  const theme: Scene3DTheme = [
    'industrial',
    'botanical',
    'cyber',
    'warm-minimal',
  ].includes(String(rawScene.theme))
    ? (rawScene.theme as Scene3DTheme)
    : 'industrial';

  const lighting: Scene3DLighting = [
    'warm-daylight',
    'cozy-amber',
    'neon-night',
    'bright-studio',
  ].includes(String(rawScene.lighting))
    ? (rawScene.lighting as Scene3DLighting)
    : 'warm-daylight';

  const rawFixtures = Array.isArray(rawScene.fixtures) ? rawScene.fixtures : [];
  const validKinds: Scene3DFixtureKind[] = [
    'bar',
    'window',
    'door',
    'plant',
    'bookshelf',
    'pendant-light',
    'partition',
    'rug',
    'coffee-machine',
    'sofa-lounge',
  ];

  const fixtures: Scene3DFixture[] = rawFixtures
    .map((item, idx): Scene3DFixture | null => {
      if (!item || typeof item !== 'object') return null;
      const f = item as Record<string, unknown>;
      const kind: Scene3DFixtureKind = validKinds.includes(
        f.kind as Scene3DFixtureKind,
      )
        ? (f.kind as Scene3DFixtureKind)
        : 'plant';
      return {
        id: `${venueId}-fix-${idx + 1}`,
        kind,
        label:
          typeof f.label === 'string' && f.label.trim()
            ? f.label.trim()
            : `${kind} ${idx + 1}`,
        x: Number.isFinite(Number(f.x)) ? Number(f.x) : idx % 4,
        z: Number.isFinite(Number(f.z)) ? Number(f.z) : 0,
        width: Number.isFinite(Number(f.width)) ? Number(f.width) : undefined,
        depth: Number.isFinite(Number(f.depth)) ? Number(f.depth) : undefined,
        rotationY: Number.isFinite(Number(f.rotationY))
          ? Number(f.rotationY)
          : 0,
        color:
          typeof f.color === 'string' && f.color.trim()
            ? f.color.trim()
            : accent,
      };
    })
    .filter((f): f is Scene3DFixture => f !== null);

  const scene3d: Scene3DConfig = {
    roomWidth: Math.min(24, Math.max(8, Number(rawScene.roomWidth) || 13)),
    roomDepth: Math.min(20, Math.max(7, Number(rawScene.roomDepth) || 9)),
    wallColor:
      typeof rawScene.wallColor === 'string' && rawScene.wallColor.trim()
        ? rawScene.wallColor.trim()
        : '#e8ddd3',
    floorColor:
      typeof rawScene.floorColor === 'string' && rawScene.floorColor.trim()
        ? rawScene.floorColor.trim()
        : '#b9936c',
    ceilingColor:
      typeof rawScene.ceilingColor === 'string' && rawScene.ceilingColor.trim()
        ? rawScene.ceilingColor.trim()
        : '#f6f2ec',
    theme,
    lighting,
    summary:
      typeof rawScene.summary === 'string' && rawScene.summary.trim()
        ? rawScene.summary.trim()
        : `${name} 3D environment (${theme}, ${lighting})`,
    fixtures:
      fixtures.length > 0
        ? fixtures
        : [
            {
              id: `${venueId}-fix-bar`,
              kind: 'bar',
              label: 'Specialty Bar Counter',
              x: 0.5,
              z: -0.2,
              width: 2.6,
              depth: 1.0,
              color: accent,
            },
            {
              id: `${venueId}-fix-win`,
              kind: 'window',
              label: 'Panoramic Street Window',
              x: 2.0,
              z: -0.6,
              width: 2.4,
            },
            {
              id: `${venueId}-fix-plant`,
              kind: 'plant',
              label: 'Indoor Tropical Planter',
              x: 3.3,
              z: 1.2,
            },
          ],
  };

  const rawSeats = Array.isArray(raw.seats) ? raw.seats : [];
  const seats: Seat[] = rawSeats
    .map((item, idx): Seat | null => {
      if (!item || typeof item !== 'object') return null;
      const s = item as Record<string, unknown>;
      const kind: Seat['kind'] = ['desk', 'booth', 'pod'].includes(
        String(s.kind),
      )
        ? (s.kind as Seat['kind'])
        : idx > 5
          ? 'booth'
          : idx > 3
            ? 'pod'
            : 'desk';
      return {
        id: `${venueId}-seat-${idx + 1}`,
        venueId,
        label:
          typeof s.label === 'string' && s.label.trim()
            ? s.label.trim()
            : `Seat ${idx + 1}`,
        kind,
        x: Number.isFinite(Number(s.x)) ? Number(s.x) : idx % 4,
        z: Number.isFinite(Number(s.z)) ? Number(s.z) : Math.floor(idx / 4),
        hourlyRate: normalizeIntVnd(
          s.hourlyRate,
          kind === 'booth' ? 50000 : kind === 'pod' ? 45000 : 35000,
        ),
        rotationY: Number.isFinite(Number(s.rotationY))
          ? Number(s.rotationY)
          : 0,
        zone:
          typeof s.zone === 'string' && s.zone.trim()
            ? s.zone.trim()
            : kind === 'pod'
              ? 'Quiet Zone'
              : 'Main Floor',
      };
    })
    .filter((s): s is Seat => s !== null);

  const finalSeats: Seat[] =
    seats.length > 0
      ? seats
      : Array.from({ length: 8 }, (_, i) => ({
          id: `${venueId}-seat-${i + 1}`,
          venueId,
          label: `Seat ${i + 1}`,
          kind: i === 7 ? 'booth' : i > 4 ? 'pod' : 'desk',
          x: i % 4,
          z: Math.floor(i / 4),
          hourlyRate: i > 4 ? 45000 : 35000,
          zone: i > 4 ? 'Focus Zone' : 'Window Row',
        }));

  const rawMenu = Array.isArray(raw.menu) ? raw.menu : [];
  const menu: MenuItem[] = rawMenu
    .map((item, idx): MenuItem | null => {
      if (!item || typeof item !== 'object') return null;
      const m = item as Record<string, unknown>;
      const itemName =
        typeof m.name === 'string' && m.name.trim() ? m.name.trim() : '';
      if (!itemName) return null;
      return {
        id: `${venueId}-item-${idx + 1}`,
        name: itemName,
        price: normalizeIntVnd(m.price, 45000),
      };
    })
    .filter((m): m is MenuItem => m !== null);

  const finalMenu: MenuItem[] =
    menu.length > 0
      ? menu
      : [
          {
            id: `${venueId}-item-1`,
            name: 'Signature Cold Brew',
            price: 45000,
          },
          { id: `${venueId}-item-2`, name: 'Artisan Croissant', price: 38000 },
        ];

  return {
    venue: {
      id: venueId,
      name,
      accent,
      description,
      seats: finalSeats,
      menu: finalMenu,
      scene3d,
      isCustom: true,
    },
    reasoningSummary,
  };
}

/**
 * Deterministic Context-Aware AI Synthesizer:
 * Parses uploaded documents, photos, video keyframes, and owner notes when no OpenAI key is set.
 */
export function synthesizeVenueLocally(
  context: OnboardingInputContext,
): OnboardingGenerationResult {
  const venueId = slugifyVenueId(
    context.ownerVenueName || 'Custom Cafe',
    context.targetVenueId,
  );
  const combinedText = [
    context.ownerVenueName,
    context.ownerNotes,
    ...context.uploads.map(
      (u) => `${u.name}\n${u.extractedText ?? ''}\n${u.summary}`,
    ),
  ].join('\n');

  const lower = combinedText.toLowerCase();

  const theme: Scene3DTheme =
    lower.includes('cyber') ||
    lower.includes('neon') ||
    lower.includes('gaming')
      ? 'cyber'
      : lower.includes('botanical') ||
          lower.includes('matcha') ||
          lower.includes('garden') ||
          lower.includes('lotus') ||
          lower.includes('plant')
        ? 'botanical'
        : lower.includes('minimal') || lower.includes('nordic')
          ? 'warm-minimal'
          : 'industrial';

  const lighting: Scene3DLighting =
    theme === 'cyber'
      ? 'neon-night'
      : lower.includes('amber') ||
          lower.includes('cozy') ||
          lower.includes('roastery')
        ? 'cozy-amber'
        : theme === 'botanical'
          ? 'bright-studio'
          : 'warm-daylight';

  const dimMatch = combinedText.match(
    /(\d{1,2})\s*m?\s*[x×]\s*(\d{1,2})\s*m?/i,
  );
  const roomWidth = dimMatch ? Number(dimMatch[1]) : 13;
  const roomDepth = dimMatch ? Number(dimMatch[2]) : 9;

  const accentMatch = combinedText.match(/Accent Color:\s*(#[0-9a-fA-F]{6})/i);
  const wallMatch = combinedText.match(/Wall Color:\s*(#[0-9a-fA-F]{6})/i);
  const floorMatch = combinedText.match(/Floor Color:\s*(#[0-9a-fA-F]{6})/i);

  const accent =
    accentMatch?.[1] ??
    (theme === 'botanical'
      ? '#2f6f4e'
      : theme === 'cyber'
        ? '#0284c7'
        : '#9a4622');
  const wallColor =
    wallMatch?.[1] ??
    (theme === 'cyber'
      ? '#1e293b'
      : theme === 'botanical'
        ? '#e3ece5'
        : '#e9dcd0');
  const floorColor =
    floorMatch?.[1] ??
    (theme === 'cyber'
      ? '#0f172a'
      : theme === 'botanical'
        ? '#d5cfc0'
        : '#b88b61');

  const parsedMenu: { name: string; price: number }[] = [];
  for (const rawLine of combinedText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (/rate:|seat|desk|pod|booth|room|theme|lighting/i.test(line)) continue;
    const m = line.match(
      /^[-*•]?\s*([A-Za-zÀ-ỹ0-9 &'/()-]{3,42}?)\s*[:–-]\s*([0-9]{2,3}[.,]?[0-9]{3})\s*(?:VND|₫)?$/i,
    );
    if (m && m[1] && m[2]) {
      const price = Number(m[2].replace(/[.,]/g, ''));
      if (Number.isSafeInteger(price) && price >= 10000 && price <= 500000) {
        parsedMenu.push({ name: m[1].trim(), price });
      }
    }
  }

  const parsedSeats: Record<string, unknown>[] = [];
  for (const rawLine of combinedText.split(/\r?\n/)) {
    const seatMatch = rawLine.match(
      /^[-*•]\s*([^(]+)\((desk|pod|booth),\s*x:\s*([\d.-]+),\s*z:\s*([\d.-]+),\s*rate:\s*(\d+)/i,
    );
    if (seatMatch) {
      const zoneMatch = rawLine.match(/zone:\s*([^)]+)/i);
      parsedSeats.push({
        label: seatMatch[1]!.trim(),
        kind: seatMatch[2]!.toLowerCase(),
        x: Number(seatMatch[3]),
        z: Number(seatMatch[4]),
        hourlyRate: Number(seatMatch[5]),
        zone: zoneMatch ? zoneMatch[1]!.trim() : 'Main Floor',
      });
    }
  }

  const photoCount = context.uploads.filter((u) => u.kind === 'photo').length;
  const videoCount = context.uploads.filter((u) => u.kind === 'video').length;
  const frameCount = context.uploads.reduce(
    (sum, u) => sum + (u.extractedFrames?.length ?? 0),
    0,
  );
  const docCount = context.uploads.filter((u) => u.kind === 'document').length;

  const fixtures: Record<string, unknown>[] = [
    {
      kind: 'bar',
      label:
        theme === 'botanical'
          ? 'Ceremonial Tea & Espresso Bar'
          : 'Specialty Espresso & Pour-Over Bar',
      x: 0.5,
      z: -0.2,
      width: 2.8,
      depth: 1.0,
      color: accent,
    },
    {
      kind: 'coffee-machine',
      label: 'Commercial Espresso Station',
      x: 0.9,
      z: -0.2,
      color: '#334155',
    },
    {
      kind: 'window',
      label: 'North Street Light Window',
      x: 0.8,
      z: -0.6,
      width: 2.3,
    },
    {
      kind: 'window',
      label: 'East Daylight Window',
      x: 2.6,
      z: -0.6,
      width: 2.3,
    },
    {
      kind: 'door',
      label: 'Main Cafe Entrance',
      x: -0.6,
      z: 0.5,
    },
    {
      kind: 'plant',
      label: 'Corner Tropical Planter',
      x: -0.2,
      z: -0.3,
    },
    {
      kind: 'plant',
      label: 'Foliage Divider Planter',
      x: 3.3,
      z: 1.3,
    },
    {
      kind: 'pendant-light',
      label: 'Warm Overhead Pendant',
      x: 1.2,
      z: 0.4,
      color: accent,
    },
    {
      kind: 'pendant-light',
      label: 'Lounge Pendant Light',
      x: 2.6,
      z: 0.8,
      color: accent,
    },
  ];

  if (
    lower.includes('bookshelf') ||
    lower.includes('library') ||
    lower.includes('roastery')
  ) {
    fixtures.push({
      kind: 'bookshelf',
      label: 'Roastery Library & Bean Wall',
      x: 3.4,
      z: 0.1,
      color: accent,
    });
  }
  if (
    lower.includes('rug') ||
    lower.includes('tatami') ||
    theme === 'botanical'
  ) {
    fixtures.push({
      kind: 'rug',
      label: 'Woven Lounge Area Rug',
      x: 2.4,
      z: 1.0,
      width: 2.6,
      depth: 1.6,
      color: '#cbd5c0',
    });
  }
  if (
    lower.includes('partition') ||
    lower.includes('screen') ||
    lower.includes('quiet')
  ) {
    fixtures.push({
      kind: 'partition',
      label: 'Acoustic Zone Divider',
      x: 1.5,
      z: 0.8,
      color: accent,
    });
  }

  const inferredName =
    context.ownerVenueName.trim() ||
    combinedText.match(/^#\s+([^\n—-]+)/m)?.[1]?.trim() ||
    'Onboarded AI Studio Cafe';

  const summaryParts = [
    `Analyzed ${photoCount} photo(s), ${videoCount} video(s) (${frameCount} extracted vision frame(s)), and ${docCount} document(s).`,
    `Configured a ${roomWidth}m × ${roomDepth}m ${theme} 3D space with ${lighting} lighting, ${fixtures.length} architectural fixtures, and ${parsedMenu.length || 2} menu items.`,
  ];

  const { venue, reasoningSummary } = normalizeGeneratedVenue(
    {
      name: inferredName,
      description:
        context.ownerNotes.trim().slice(0, 140) ||
        `AI-generated ${theme} 3D cafe & coworking floorplan.`,
      accent,
      reasoningSummary: summaryParts.join(' '),
      scene3d: {
        roomWidth,
        roomDepth,
        wallColor,
        floorColor,
        ceilingColor: '#f8f5f0',
        theme,
        lighting,
        summary: `${inferredName} · ${roomWidth}m × ${roomDepth}m ${theme} 3D environment (${lighting})`,
        fixtures,
      },
      seats: parsedSeats,
      menu: parsedMenu,
    },
    venueId,
  );

  return {
    venue,
    source: 'local-ai-synthesizer',
    modelUsed: 'context-synthesizer-v1 (OpenAI schema compatible)',
    reasoningSummary,
    diffSummary: [
      `Initial 3D generation: ${venue.scene3d?.roomWidth}m×${venue.scene3d?.roomDepth}m ${venue.scene3d?.theme}`,
      `${venue.seats.length} seats · ${venue.scene3d?.fixtures.length ?? 0} fixtures · ${venue.menu.length} menu items`,
    ],
  };
}

export interface GenerateOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  chatHistory?: readonly OnboardingChatMessage[];
  uploads?: readonly OnboardingUploadItem[];
}

export async function generateVenueFromContext(
  context: OnboardingInputContext,
  options: GenerateOptions = {},
): Promise<OnboardingGenerationResult> {
  const venueId = slugifyVenueId(
    context.ownerVenueName || 'Custom Cafe',
    context.targetVenueId,
  );
  const fetcher =
    options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  const trimmedKey = options.apiKey?.trim();

  if (fetcher && trimmedKey) {
    const response = await fetcher(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trimmedKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        messages: buildOpenAIMessages(context),
        response_format: {
          type: 'json_schema',
          json_schema: OPENAI_VENUE_JSON_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `OpenAI API error (${response.status}): ${errText.slice(0, 180) || 'Check your OPENAI_API_KEY.'}`,
      );
    }

    const data = (await response.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const normalized = normalizeGeneratedVenue(parsed, venueId);
    return {
      venue: normalized.venue,
      source: 'openai',
      modelUsed: data.model || 'gpt-4o',
      reasoningSummary: normalized.reasoningSummary,
      diffSummary: [
        `Initial OpenAI generation: ${normalized.venue.scene3d?.roomWidth}m×${normalized.venue.scene3d?.roomDepth}m ${normalized.venue.scene3d?.theme}`,
        `${normalized.venue.seats.length} seats · ${normalized.venue.scene3d?.fixtures.length ?? 0} fixtures · ${normalized.venue.menu.length} menu items`,
      ],
    };
  }

  return synthesizeVenueLocally(context);
}

export async function refineVenueWithAI(
  currentVenue: Venue,
  instruction: string,
  options: GenerateOptions = {},
): Promise<OnboardingGenerationResult> {
  const cleanPrompt = instruction.trim();
  if (!cleanPrompt) {
    throw new Error('Enter a feedback message first.');
  }

  const fetcher =
    options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  const trimmedKey = options.apiKey?.trim();

  if (fetcher && trimmedKey) {
    const historyMessages = (options.chatHistory ?? []).map((msg) => ({
      role: msg.role === 'owner' ? ('user' as const) : ('assistant' as const),
      content: msg.text,
    }));

    const response = await fetcher(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trimmedKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are an interactive 3D cafe architect in a multi-turn feedback loop with the cafe owner. Given the conversation history, current Venue JSON state, and latest owner feedback message, output the updated Venue JSON adhering strictly to the schema.',
          },
          ...historyMessages,
          {
            role: 'user',
            content: `Current Venue JSON (latest iteration):\n${JSON.stringify(currentVenue)}\n\nCafe Owner Feedback:\n${cleanPrompt}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: OPENAI_VENUE_JSON_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `OpenAI API error (${response.status}): ${errText.slice(0, 180)}`,
      );
    }
    const data = (await response.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned an empty refinement.');
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const normalized = normalizeGeneratedVenue(parsed, currentVenue.id);
    return {
      venue: normalized.venue,
      source: 'openai',
      modelUsed: data.model || 'gpt-4o',
      reasoningSummary: normalized.reasoningSummary,
      diffSummary: computeVenueDiffSummary(currentVenue, normalized.venue),
    };
  }

  // Deterministic multi-turn conversational feedback engine
  const lower = cleanPrompt.toLowerCase();
  const prevScene: Scene3DConfig = currentVenue.scene3d ?? {
    roomWidth: 12,
    roomDepth: 9,
    wallColor: '#e8ddd3',
    floorColor: '#b9936c',
    theme: 'industrial',
    lighting: 'warm-daylight',
    fixtures: [],
  };

  let nextName = currentVenue.name;
  const renameMatch = cleanPrompt.match(
    /rename\s+(?:cafe|venue|it)?\s*to\s+([A-Za-z0-9 &'’-]{3,40})/i,
  );
  if (renameMatch && renameMatch[1]) {
    nextName = renameMatch[1].trim();
  }

  let nextRoomWidth = prevScene.roomWidth;
  let nextRoomDepth = prevScene.roomDepth;
  const dimMatch = cleanPrompt.match(/(\d{1,2})\s*m?\s*[x×]\s*(\d{1,2})\s*m?/i);
  if (dimMatch) {
    nextRoomWidth = Math.min(24, Math.max(8, Number(dimMatch[1])));
    nextRoomDepth = Math.min(20, Math.max(7, Number(dimMatch[2])));
  } else if (lower.includes('larger') || lower.includes('expand')) {
    nextRoomWidth = Math.min(24, prevScene.roomWidth + 2);
    nextRoomDepth = Math.min(20, prevScene.roomDepth + 1);
  }

  let nextTheme = prevScene.theme;
  if (lower.includes('cyber')) nextTheme = 'cyber';
  else if (lower.includes('botanical') || lower.includes('garden'))
    nextTheme = 'botanical';
  else if (lower.includes('industrial') || lower.includes('brick'))
    nextTheme = 'industrial';
  else if (lower.includes('minimal')) nextTheme = 'warm-minimal';

  let nextLighting = prevScene.lighting;
  if (lower.includes('neon')) nextLighting = 'neon-night';
  else if (
    lower.includes('amber') ||
    lower.includes('warm') ||
    lower.includes('cozy')
  )
    nextLighting = 'cozy-amber';
  else if (lower.includes('bright') || lower.includes('studio'))
    nextLighting = 'bright-studio';
  else if (lower.includes('daylight')) nextLighting = 'warm-daylight';

  let nextSeats = [...currentVenue.seats];
  const nextFixtures = [...prevScene.fixtures];
  const nextMenu = [...currentVenue.menu];

  // Add seats (e.g. "add 2 focus pods", "add 3 window desks", "add 1 booth")
  const addSeatRegex =
    /add\s+(\d+)\s+(?:more\s+|quiet\s+|focus\s+|window\s+|group\s+)?(pod|booth|desk)s?/gi;
  let addMatch: RegExpExecArray | null;
  let addedSeats = false;
  while ((addMatch = addSeatRegex.exec(cleanPrompt)) !== null) {
    addedSeats = true;
    const count = Math.min(6, Math.max(1, Number(addMatch[1])));
    const kind = addMatch[2]!.toLowerCase() as Seat['kind'];
    for (let i = 0; i < count; i++) {
      const idx = nextSeats.length + 1;
      nextSeats.push({
        id: `${currentVenue.id}-seat-${Date.now()}-${idx}`,
        venueId: currentVenue.id,
        label: `${kind === 'pod' ? 'Focus Pod' : kind === 'booth' ? 'Booth' : 'Desk'} ${idx}`,
        kind,
        x: (idx - 1) % 4,
        z: Math.floor((idx - 1) / 4),
        hourlyRate: kind === 'booth' ? 50000 : kind === 'pod' ? 45000 : 35000,
        zone: kind === 'pod' ? 'Quiet Focus Zone' : 'Main Floor',
      });
    }
  }
  if (!addedSeats && lower.includes('add') && lower.includes('pod')) {
    const idx = nextSeats.length + 1;
    nextSeats.push({
      id: `${currentVenue.id}-seat-${Date.now()}-${idx}`,
      venueId: currentVenue.id,
      label: `Focus Pod ${idx}`,
      kind: 'pod',
      x: (idx - 1) % 4,
      z: Math.floor((idx - 1) / 4),
      hourlyRate: 45000,
      zone: 'Quiet Focus Zone',
    });
  }

  // Remove seats (e.g. "remove 2 desks", "remove 1 pod")
  const removeSeatMatch = lower.match(
    /remove\s+(\d+)\s+(desk|pod|booth|seat)s?/i,
  );
  if (removeSeatMatch && nextSeats.length > 1) {
    const count = Math.min(
      nextSeats.length - 1,
      Math.max(1, Number(removeSeatMatch[1])),
    );
    const targetKind = removeSeatMatch[2]!.toLowerCase();
    let removed = 0;
    nextSeats = nextSeats.filter((s) => {
      if (
        removed < count &&
        (targetKind === 'seat' || s.kind === targetKind) &&
        nextSeats.length - removed > 1
      ) {
        removed++;
        return false;
      }
      return true;
    });
  }

  // Rate adjustments (e.g. "increase seat prices by 5000" or "decrease seat prices by 5000")
  const priceDeltaMatch = lower.match(
    /(increase|raise|decrease|lower)\s+(?:all\s+)?(?:seat\s+)?(?:prices|rates)\s+by\s+(\d{3,5})/i,
  );
  if (priceDeltaMatch) {
    const sign =
      priceDeltaMatch[1] === 'decrease' || priceDeltaMatch[1] === 'lower'
        ? -1
        : 1;
    const delta = Number(priceDeltaMatch[2]) * sign;
    nextSeats = nextSeats.map((s) => ({
      ...s,
      hourlyRate: Math.max(10000, s.hourlyRate + delta),
    }));
  }

  if (lower.includes('plant')) {
    const plantCountMatch = lower.match(/(\d+)\s+plants?/);
    const count = plantCountMatch
      ? Math.min(4, Math.max(1, Number(plantCountMatch[1])))
      : 1;
    for (let i = 0; i < count; i++) {
      nextFixtures.push({
        id: `${currentVenue.id}-fix-${Date.now()}-plant-${i}`,
        kind: 'plant',
        label: `Added Tropical Planter ${nextFixtures.length + 1}`,
        x: (nextFixtures.length % 4) * 0.9,
        z: 0.8 + i * 0.3,
      });
    }
  }
  if (lower.includes('bookshelf') || lower.includes('shelf')) {
    nextFixtures.push({
      id: `${currentVenue.id}-fix-${Date.now()}-shelf`,
      kind: 'bookshelf',
      label: 'Added Library Shelf',
      x: 3.4,
      z: 0.3,
      color: currentVenue.accent,
    });
  }
  if (lower.includes('sofa') || lower.includes('lounge')) {
    nextFixtures.push({
      id: `${currentVenue.id}-fix-${Date.now()}-sofa`,
      kind: 'sofa-lounge',
      label: 'Added Lounge Sofa',
      x: 2.2,
      z: 1.3,
      color: currentVenue.accent,
    });
  }
  if (lower.includes('partition') || lower.includes('divider')) {
    nextFixtures.push({
      id: `${currentVenue.id}-fix-${Date.now()}-part`,
      kind: 'partition',
      label: 'Added Acoustic Partition',
      x: 1.6,
      z: 0.7,
      color: currentVenue.accent,
    });
  }
  if (lower.includes('rug')) {
    nextFixtures.push({
      id: `${currentVenue.id}-fix-${Date.now()}-rug`,
      kind: 'rug',
      label: 'Added Woven Lounge Rug',
      x: 2.0,
      z: 1.0,
      width: 2.5,
      depth: 1.6,
    });
  }

  // Menu additions like "add Matcha Cake for 55000"
  const menuAddMatch = cleanPrompt.match(
    /add\s+([A-Za-z0-9 &'-]+?)\s+(?:for|at)\s+(\d{4,6})/i,
  );
  if (menuAddMatch && menuAddMatch[1] && menuAddMatch[2]) {
    nextMenu.push({
      id: `${currentVenue.id}-item-${Date.now()}-${nextMenu.length + 1}`,
      name: menuAddMatch[1].trim(),
      price: Number(menuAddMatch[2]),
    });
  }

  const updatedVenue: Venue = {
    ...currentVenue,
    name: nextName,
    seats: nextSeats,
    menu: nextMenu,
    scene3d: {
      ...prevScene,
      roomWidth: nextRoomWidth,
      roomDepth: nextRoomDepth,
      theme: nextTheme,
      lighting: nextLighting,
      wallColor:
        nextTheme === 'cyber'
          ? '#1e293b'
          : nextTheme === 'botanical'
            ? '#e3ece5'
            : prevScene.wallColor,
      floorColor:
        nextTheme === 'cyber'
          ? '#0f172a'
          : nextTheme === 'botanical'
            ? '#d5cfc0'
            : prevScene.floorColor,
      summary: `${nextName} · Iteration updated: "${cleanPrompt}"`,
      fixtures: nextFixtures,
    },
    isCustom: true,
  };

  const diffSummary = computeVenueDiffSummary(currentVenue, updatedVenue);

  return {
    venue: updatedVenue,
    source: 'local-ai-synthesizer',
    modelUsed: 'context-synthesizer-v1',
    reasoningSummary: `Applied owner feedback "${cleanPrompt}" (${diffSummary.join(', ')}).`,
    diffSummary,
  };
}
