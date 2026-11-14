import type { OnboardingUploadItem, UploadKind } from './onboardingTypes';

export function classifyFileKind(
  fileName: string,
  mimeType: string,
): UploadKind {
  const lower = fileName.toLowerCase();
  const mime = mimeType.toLowerCase();
  if (
    mime.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/.test(lower)
  ) {
    return 'photo';
  }
  if (
    mime.startsWith('video/') ||
    /\.(mp4|webm|mov|m4v|avi|mkv)$/.test(lower)
  ) {
    return 'video';
  }
  return 'document';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function extractVideoKeyframes(
  file: File,
  frameCount = 4,
): Promise<{ frames: string[]; durationSeconds: number }> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return { frames: [], durationSeconds: 0 };
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const frames: string[] = [];

    const cleanup = (duration = 0) => {
      URL.revokeObjectURL(url);
      resolve({ frames, durationSeconds: Math.round(duration) });
    };

    const timeout = setTimeout(() => cleanup(0), 6000);

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup(0);
    };

    video.onloadedmetadata = async () => {
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : 4;
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 270;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        clearTimeout(timeout);
        cleanup(duration);
        return;
      }

      const ratios = Array.from(
        { length: frameCount },
        (_, i) => (i + 1) / (frameCount + 1),
      );

      for (const ratio of ratios) {
        const targetTime = Math.min(
          duration - 0.05,
          Math.max(0.1, duration * ratio),
        );
        await new Promise<void>((seekResolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              frames.push(canvas.toDataURL('image/jpeg', 0.75));
            } catch {
              // ignore frame draw errors
            }
            seekResolve();
          };
          video.addEventListener('seeked', onSeeked);
          try {
            video.currentTime = targetTime;
          } catch {
            video.removeEventListener('seeked', onSeeked);
            seekResolve();
          }
        });
      }

      clearTimeout(timeout);
      cleanup(duration);
    };

    video.src = url;
  });
}

function extractReadableStringsFromBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  let current = '';
  for (let i = 0; i < Math.min(bytes.length, 150000); i++) {
    const code = bytes[i]!;
    if (code >= 32 && code <= 126) {
      current += String.fromCharCode(code);
    } else {
      if (current.trim().length >= 5) {
        chunks.push(current.trim());
      }
      current = '';
    }
  }
  if (current.trim().length >= 5) chunks.push(current.trim());
  return chunks.slice(0, 200).join('\n');
}

export async function processUploadedFile(
  file: File,
): Promise<OnboardingUploadItem> {
  const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const kind = classifyFileKind(file.name, file.type);

  if (kind === 'photo') {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      id,
      name: file.name,
      kind: 'photo',
      mimeType: file.type || 'image/jpeg',
      sizeBytes: file.size,
      dataUrl,
      summary: `Photo ready for GPT-4o Vision (${Math.max(1, Math.round(file.size / 1024))} KB)`,
    };
  }

  if (kind === 'video') {
    const { frames, durationSeconds } = await extractVideoKeyframes(file, 4);
    return {
      id,
      name: file.name,
      kind: 'video',
      mimeType: file.type || 'video/mp4',
      sizeBytes: file.size,
      extractedFrames: frames,
      durationSeconds,
      summary:
        frames.length > 0
          ? `Extracted ${frames.length} keyframes across ${durationSeconds || 4}s walkthrough video for GPT-4o Vision`
          : `Walkthrough video attached (${Math.max(1, Math.round(file.size / 1024))} KB)`,
    };
  }

  // Document (.pdf, .txt, .md, .csv, .json)
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    const dataUrl = await readFileAsDataUrl(file);
    const buffer = await file.arrayBuffer();
    const fallbackText = extractReadableStringsFromBuffer(buffer);
    return {
      id,
      name: file.name,
      kind: 'document',
      mimeType: 'application/pdf',
      sizeBytes: file.size,
      dataUrl,
      extractedText: fallbackText.slice(0, 6000),
      summary: `PDF document parsed (${Math.max(1, Math.round(file.size / 1024))} KB)`,
    };
  }

  const text = (await file.text()).slice(0, 12000);
  return {
    id,
    name: file.name,
    kind: 'document',
    mimeType: file.type || 'text/plain',
    sizeBytes: file.size,
    extractedText: text,
    summary: `Text document extracted (${text.split(/\r?\n/).length} lines)`,
  };
}

function makeSvgDataUrl(
  bgColor: string,
  accent: string,
  title: string,
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
    <rect width="480" height="270" fill="${bgColor}"/>
    <rect x="24" y="24" width="432" height="222" rx="14" fill="none" stroke="${accent}" stroke-width="4"/>
    <rect x="48" y="150" width="140" height="65" rx="8" fill="${accent}" opacity="0.85"/>
    <circle cx="320" cy="110" r="42" fill="${accent}" opacity="0.45"/>
    <text x="48" y="76" font-family="sans-serif" font-size="20" font-weight="bold" fill="${accent}">${title}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface SampleOnboardingBundle {
  id: string;
  label: string;
  venueName: string;
  ownerNotes: string;
  uploads: OnboardingUploadItem[];
}

export const SAMPLE_ONBOARDING_BUNDLES: SampleOnboardingBundle[] = [
  {
    id: 'saigon-roastery',
    label: 'Sample 1: Saigon Roastery & Brick Loft',
    venueName: 'Saigon Roastery & Loft',
    ownerNotes:
      'Two-zone specialty coffee roastery and coworking loft. Warm terracotta brick walls, oak flooring, a central espresso bar with La Marzocco machine, 4 sunlit street-window desks, 2 soundproof focus pods, and 2 group collaboration booths.',
    uploads: [
      {
        id: 'sample-photo-roastery-1',
        name: 'interior-espresso-bar.jpg',
        kind: 'photo',
        mimeType: 'image/svg+xml',
        sizeBytes: 48200,
        dataUrl: makeSvgDataUrl(
          '#f2e6d8',
          '#9a4622',
          'Saigon Roastery Espresso Bar',
        ),
        summary:
          'Interior photo: Central oak espresso bar & brass pendant lamps',
      },
      {
        id: 'sample-photo-roastery-2',
        name: 'window-cowork-zone.jpg',
        kind: 'photo',
        mimeType: 'image/svg+xml',
        sizeBytes: 51400,
        dataUrl: makeSvgDataUrl(
          '#ebdccb',
          '#7c3a1d',
          'North Window Desks & Focus Pods',
        ),
        summary: 'Interior photo: Sunlit window desks and acoustic coding pods',
      },
      {
        id: 'sample-video-roastery',
        name: 'cafe-walkthrough-tour.mp4',
        kind: 'video',
        mimeType: 'video/mp4',
        sizeBytes: 2450000,
        durationSeconds: 12,
        extractedFrames: [
          makeSvgDataUrl(
            '#f2e6d8',
            '#9a4622',
            'Frame 1: Entrance & Welcome Mat',
          ),
          makeSvgDataUrl(
            '#e8d5c0',
            '#884020',
            'Frame 2: Pour-Over Bar & Library',
          ),
          makeSvgDataUrl(
            '#dfc8b0',
            '#6e3219',
            'Frame 3: Quiet Pods & Group Booths',
          ),
        ],
        summary:
          'Extracted 3 keyframes across 12s walkthrough video for GPT-4o Vision',
      },
      {
        id: 'sample-doc-roastery',
        name: 'saigon-roastery-menu-and-floorplan.md',
        kind: 'document',
        mimeType: 'text/markdown',
        sizeBytes: 3400,
        extractedText: `# Saigon Roastery & Loft — Floorplan & Menu Spec
Theme: industrial
Lighting: cozy-amber
Room Dimensions: 14m x 10m
Accent Color: #9a4622
Wall Color: #e9dcd0
Floor Color: #b88b61

## Seating Layout (8 Seats)
- Window Desk 1 (desk, x: 0, z: 0, rate: 35000 VND/h, zone: Window Row)
- Window Desk 2 (desk, x: 1, z: 0, rate: 35000 VND/h, zone: Window Row)
- Window Desk 3 (desk, x: 2, z: 0, rate: 35000 VND/h, zone: Window Row)
- Window Desk 4 (desk, x: 3, z: 0, rate: 35000 VND/h, zone: Window Row)
- Focus Pod 5 (pod, x: 0, z: 1, rate: 45000 VND/h, zone: Quiet Zone)
- Focus Pod 6 (pod, x: 1, z: 1, rate: 45000 VND/h, zone: Quiet Zone)
- Roaster Booth 7 (booth, x: 2, z: 1, rate: 50000 VND/h, zone: Collaboration Lounge)
- Roaster Booth 8 (booth, x: 3, z: 1, rate: 50000 VND/h, zone: Collaboration Lounge)

## Menu Items (VND)
- Saigon Phin Cold Brew: 45000
- Salted Caramel Cortado: 55000
- Smoked Cinnamon Latte: 52000
- Almond Butter Croissant: 40000
- Roasted Banana Walnut Loaf: 38000`,
        summary: 'Text document extracted (24 lines: floorplan + VND menu)',
      },
    ],
  },
  {
    id: 'lotus-botanical',
    label: 'Sample 2: Lotus Botanical Tea & Studio',
    venueName: 'Lotus Botanical Studio',
    ownerNotes:
      'Serene botanical garden cafe and design studio. Soft sage walls, pale ash wood floor, ceremonial tea counter, hanging planters, shoji acoustic screens, 4 garden desks, 2 quiet pods, and 2 tatami booths.',
    uploads: [
      {
        id: 'sample-photo-lotus-1',
        name: 'botanical-tea-bar.jpg',
        kind: 'photo',
        mimeType: 'image/svg+xml',
        sizeBytes: 44100,
        dataUrl: makeSvgDataUrl(
          '#e3efe6',
          '#2f6f4e',
          'Ceremonial Tea Bar & Bamboo',
        ),
        summary: 'Interior photo: Ceremonial tea counter with bamboo planters',
      },
      {
        id: 'sample-video-lotus',
        name: 'garden-studio-pan.mp4',
        kind: 'video',
        mimeType: 'video/mp4',
        sizeBytes: 1980000,
        durationSeconds: 9,
        extractedFrames: [
          makeSvgDataUrl('#e3efe6', '#2f6f4e', 'Frame 1: Skylight Windows'),
          makeSvgDataUrl(
            '#d4e7d9',
            '#255c40',
            'Frame 2: Tatami Booths & Plants',
          ),
        ],
        summary:
          'Extracted 2 keyframes across 9s walkthrough video for GPT-4o Vision',
      },
      {
        id: 'sample-doc-lotus',
        name: 'lotus-botanical-spec.md',
        kind: 'document',
        mimeType: 'text/markdown',
        sizeBytes: 2900,
        extractedText: `# Lotus Botanical Studio — Space & Menu
Theme: botanical
Lighting: bright-studio
Room Dimensions: 13m x 9m
Accent Color: #2f6f4e
Wall Color: #e3ece5
Floor Color: #d5cfc0

## Menu Items (VND)
- Ceremonial Uji Matcha Whisk: 55000
- Lotus Blossom Cold Oolong: 48000
- Black Sesame Oat Latte: 52000
- Yuzu Honey Tart: 42000
- Matcha Cream Croissant: 40000`,
        summary: 'Text document extracted (16 lines: botanical studio + menu)',
      },
    ],
  },
];
