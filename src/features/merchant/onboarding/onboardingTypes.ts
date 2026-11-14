import type { Venue } from '@/core';

export type UploadKind = 'photo' | 'video' | 'document';

export interface OnboardingUploadItem {
  id: string;
  name: string;
  kind: UploadKind;
  mimeType: string;
  sizeBytes: number;
  /** Image or PDF data URL for vision/file context */
  dataUrl?: string;
  /** Extracted JPEG base64 frames from an uploaded video */
  extractedFrames?: string[];
  /** Video duration in seconds if available */
  durationSeconds?: number;
  /** Extracted text content from uploaded documents (.txt, .md, .csv, .json, .pdf) */
  extractedText?: string;
  /** Human-readable summary of what was extracted from this file */
  summary: string;
}

export interface OnboardingInputContext {
  targetVenueId: string;
  ownerVenueName: string;
  ownerNotes: string;
  uploads: OnboardingUploadItem[];
}

export interface OnboardingGenerationResult {
  venue: Venue;
  source: 'openai' | 'local-ai-synthesizer';
  modelUsed: string;
  reasoningSummary: string;
  diffSummary?: string[];
}

export interface OnboardingIteration {
  iteration: number;
  prompt: string;
  reasoningSummary: string;
  diffSummary: string[];
  source: 'openai' | 'local-ai-synthesizer';
  modelUsed: string;
  venueSnapshot: Venue;
}

export interface OnboardingChatMessage {
  id: string;
  role: 'owner' | 'assistant';
  text: string;
  iteration: number;
  diffSummary?: string[];
  source?: 'openai' | 'local-ai-synthesizer';
}
