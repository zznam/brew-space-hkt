import { useRef, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  formatMoney,
  getAllVenues,
  getVenue,
  type Scene3DFixtureKind,
  type Scene3DLighting,
  type Scene3DTheme,
  type Seat,
  type Venue,
} from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { CafeScene3D } from '@/components/canvas3d/CafeScene3D';
import {
  Badge,
  Button,
  Card,
  colors,
  Eyebrow,
  Heading,
  styles,
} from '@/components/ui';
import { MerchantNav } from '../MerchantNav';
import {
  processUploadedFile,
  SAMPLE_ONBOARDING_BUNDLES,
  type SampleOnboardingBundle,
} from './mediaProcessor';
import type {
  OnboardingChatMessage,
  OnboardingIteration,
  OnboardingUploadItem,
} from './onboardingTypes';
import {
  generateVenueFromContext,
  refineVenueWithAI,
} from './openaiOnboarding';

const THEMES: Scene3DTheme[] = [
  'industrial',
  'botanical',
  'cyber',
  'warm-minimal',
];
const LIGHTINGS: Scene3DLighting[] = [
  'warm-daylight',
  'cozy-amber',
  'neon-night',
  'bright-studio',
];
const QUICK_FIXTURES: { kind: Scene3DFixtureKind; label: string }[] = [
  { kind: 'plant', label: 'Tropical Planter' },
  { kind: 'window', label: 'Daylight Window' },
  { kind: 'bookshelf', label: 'Library Shelf' },
  { kind: 'pendant-light', label: 'Pendant Lamp' },
  { kind: 'partition', label: 'Acoustic Divider' },
  { kind: 'sofa-lounge', label: 'Lounge Sofa' },
];
const FEEDBACK_CHIPS: string[] = [
  'Add 2 focus pods and a partition',
  'Add 2 plants and a bookshelf',
  'Expand room to 16m x 11m',
  'Switch lighting to cozy-amber',
  'Add Matcha Cheesecake for 58000',
];

function cloneVenue(venue: Venue): Venue {
  return {
    ...venue,
    seats: venue.seats.map((s) => ({ ...s })),
    menu: venue.menu.map((m) => ({ ...m })),
    scene3d: venue.scene3d
      ? {
          ...venue.scene3d,
          fixtures: venue.scene3d.fixtures.map((f) => ({ ...f })),
        }
      : undefined,
  };
}

export function OnboardingScreen() {
  const store = useAppStore((state) => state);
  const allVenues = getAllVenues(store.customVenues);

  const [targetVenueId, setTargetVenueId] = useState<string>('new');
  const [ownerVenueName, setOwnerVenueName] = useState<string>('');
  const [ownerNotes, setOwnerNotes] = useState<string>('');
  const [uploads, setUploads] = useState<OnboardingUploadItem[]>([]);
  const [apiKey, setApiKey] = useState<string>('');

  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [aiSourceLabel, setAiSourceLabel] = useState<string>('');
  const [reasoningSummary, setReasoningSummary] = useState<string>('');

  const [draftVenue, setDraftVenue] = useState<Venue | null>(null);
  const [previewSeatId, setPreviewSeatId] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');

  const [iterations, setIterations] = useState<OnboardingIteration[]>([]);
  const [activeIteration, setActiveIteration] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<OnboardingChatMessage[]>([]);

  const [newMenuName, setNewMenuName] = useState<string>('');
  const [newMenuPrice, setNewMenuPrice] = useState<string>('45000');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function applySampleBundle(bundle: SampleOnboardingBundle) {
    setError('');
    setStatusMessage(`Loaded sample upload bundle: ${bundle.label}`);
    setOwnerVenueName(bundle.venueName);
    setOwnerNotes(bundle.ownerNotes);
    setUploads(bundle.uploads);
  }

  function loadExistingVenueIntoDraft(venueId: string) {
    setTargetVenueId(venueId);
    setError('');
    if (venueId === 'new') {
      setDraftVenue(null);
      setIterations([]);
      setChatMessages([]);
      setActiveIteration(0);
      return;
    }
    const existing = getVenue(venueId, store.customVenues);
    const snapshot = cloneVenue(existing);
    setOwnerVenueName(existing.name);
    setOwnerNotes(existing.description);
    setDraftVenue(snapshot);
    setPreviewSeatId(snapshot.seats[0]?.id ?? null);
    const initialIter: OnboardingIteration = {
      iteration: 1,
      prompt: `Loaded existing venue: ${existing.name}`,
      reasoningSummary: `Baseline 3D layout for ${existing.name}. Chat below to iterate on the 3D space.`,
      diffSummary: [
        `${snapshot.seats.length} seats · ${snapshot.scene3d?.fixtures.length ?? 0} fixtures · ${snapshot.menu.length} menu items`,
      ],
      source: 'local-ai-synthesizer',
      modelUsed: 'venue-snapshot',
      venueSnapshot: cloneVenue(snapshot),
    };
    setIterations([initialIter]);
    setActiveIteration(1);
    setChatMessages([
      {
        id: `msg-init-${Date.now()}`,
        role: 'assistant',
        text: initialIter.reasoningSummary,
        iteration: 1,
        diffSummary: initialIter.diffSummary,
        source: initialIter.source,
      },
    ]);
    setStatusMessage(`Loaded ${existing.name} into 3D Studio for editing.`);
  }

  async function handleFileSelection(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError('');
    const added: OnboardingUploadItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      try {
        const processed = await processUploadedFile(file);
        added.push(processed);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not process uploaded file.',
        );
      }
    }
    if (added.length > 0) {
      setUploads((prev) => [...prev, ...added]);
      setStatusMessage(`Processed ${added.length} uploaded file(s).`);
    }
  }

  async function handleGenerate() {
    setError('');
    setStatusMessage('');
    setGenerating(true);
    try {
      const result = await generateVenueFromContext(
        {
          targetVenueId,
          ownerVenueName,
          ownerNotes,
          uploads,
        },
        { apiKey },
      );
      const snapshot = cloneVenue(result.venue);
      setDraftVenue(snapshot);
      setPreviewSeatId(snapshot.seats[0]?.id ?? null);
      setAiSourceLabel(
        result.source === 'openai'
          ? `OpenAI API (${result.modelUsed})`
          : `Context-Aware AI Synthesizer (${result.modelUsed})`,
      );
      setReasoningSummary(result.reasoningSummary);

      const firstIteration: OnboardingIteration = {
        iteration: 1,
        prompt:
          'Initial generation from uploaded photos, videos, and documents',
        reasoningSummary: result.reasoningSummary,
        diffSummary: result.diffSummary ?? [
          `${snapshot.seats.length} seats · ${snapshot.menu.length} menu items`,
        ],
        source: result.source,
        modelUsed: result.modelUsed,
        venueSnapshot: cloneVenue(snapshot),
      };
      setIterations([firstIteration]);
      setActiveIteration(1);
      setChatMessages([
        {
          id: `chat-owner-1-${Date.now()}`,
          role: 'owner',
          text: `Generate initial 3D cafe from ${uploads.length} uploaded file(s)${ownerVenueName ? ` for "${ownerVenueName}"` : ''}.`,
          iteration: 1,
        },
        {
          id: `chat-ai-1-${Date.now()}`,
          role: 'assistant',
          text: result.reasoningSummary,
          iteration: 1,
          diffSummary: firstIteration.diffSummary,
          source: result.source,
        },
      ]);

      setStatusMessage(
        `Generated Iteration #1 for "${result.venue.name}" with ${result.venue.seats.length} seats and ${result.venue.menu.length} menu items.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate 3D environment.',
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefine(customInstruction?: string) {
    if (!draftVenue) return;
    const instruction = (customInstruction ?? refinementPrompt).trim();
    if (!instruction) return;
    setError('');
    setGenerating(true);
    const nextIterNum = iterations.length + 1;
    const ownerMsg: OnboardingChatMessage = {
      id: `chat-owner-${nextIterNum}-${Date.now()}`,
      role: 'owner',
      text: instruction,
      iteration: nextIterNum,
    };

    try {
      const result = await refineVenueWithAI(draftVenue, instruction, {
        apiKey,
        chatHistory: chatMessages,
        uploads,
      });
      const snapshot = cloneVenue(result.venue);
      setDraftVenue(snapshot);
      setAiSourceLabel(
        result.source === 'openai'
          ? `OpenAI API (${result.modelUsed})`
          : `Context-Aware AI Synthesizer (${result.modelUsed})`,
      );
      setReasoningSummary(result.reasoningSummary);

      const newIteration: OnboardingIteration = {
        iteration: nextIterNum,
        prompt: instruction,
        reasoningSummary: result.reasoningSummary,
        diffSummary: result.diffSummary ?? ['Updated 3D environment'],
        source: result.source,
        modelUsed: result.modelUsed,
        venueSnapshot: cloneVenue(snapshot),
      };

      const aiMsg: OnboardingChatMessage = {
        id: `chat-ai-${nextIterNum}-${Date.now()}`,
        role: 'assistant',
        text: result.reasoningSummary,
        iteration: nextIterNum,
        diffSummary: newIteration.diffSummary,
        source: result.source,
      };

      setIterations((prev) => [...prev, newIteration]);
      setActiveIteration(nextIterNum);
      setChatMessages((prev) => [...prev, ownerMsg, aiMsg]);
      setRefinementPrompt('');
      setStatusMessage(
        `Iteration #${nextIterNum} applied: ${newIteration.diffSummary.join(' · ')}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not refine 3D scene.',
      );
    } finally {
      setGenerating(false);
    }
  }

  function restoreIteration(iter: OnboardingIteration) {
    const restored = cloneVenue(iter.venueSnapshot);
    setDraftVenue(restored);
    setActiveIteration(iter.iteration);
    setReasoningSummary(iter.reasoningSummary);
    setPreviewSeatId(restored.seats[0]?.id ?? null);
    setStatusMessage(
      `Restored Iteration #${iter.iteration} (${restored.seats.length} seats, ${restored.scene3d?.lighting ?? 'default'} lighting).`,
    );
  }

  function handlePublish() {
    if (!draftVenue) return;
    setError('');
    const result = store.upsertVenue(draftVenue);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStatusMessage(
      `Published! ${draftVenue.name} (Iteration #${activeIteration || 1}) is now active across Merchant and Customer 3D views.`,
    );
  }

  return (
    <>
      <MerchantNav current="onboarding" />

      <Card>
        <View style={styles.rowBetween}>
          <Eyebrow>MERCHANT / AI 3D CAFE ONBOARDING & STUDIO</Eyebrow>
          <Badge label="OpenAI Vision + 3D Engine" tone="info" />
        </View>
        <Heading>Onboard Your Cafe with OpenAI & 3D Engine</Heading>
        <Text style={styles.text}>
          Upload photos, walkthrough videos, and menu or floorplan documents. AI
          analyzes all visual and document context to generate your interactive
          3D cafe environment, then lets you chat in a multi-turn feedback loop
          to iterate on the space.
        </Text>
        <View style={styles.row}>
          <Button
            label="Back to live floor"
            onPress={() => router.push('/merchant/live-floor')}
          />
          {SAMPLE_ONBOARDING_BUNDLES.map((bundle) => (
            <Button
              key={bundle.id}
              label={bundle.label}
              onPress={() => applySampleBundle(bundle)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Heading>1. Target Venue & Multimodal Context Uploads</Heading>
        <Text style={{ fontWeight: '700' }}>Onboarding mode</Text>
        <View style={styles.row}>
          <Button
            label="Create New Cafe Venue"
            selected={targetVenueId === 'new'}
            onPress={() => loadExistingVenueIntoDraft('new')}
          />
          {allVenues.map((v) => (
            <Button
              key={v.id}
              label={`Edit: ${v.name}`}
              selected={targetVenueId === v.id}
              onPress={() => loadExistingVenueIntoDraft(v.id)}
            />
          ))}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.sectionLabel}>Cafe name</Text>
          <TextInput
            accessibilityLabel="Cafe name"
            value={ownerVenueName}
            onChangeText={setOwnerVenueName}
            placeholder="e.g. Saigon Roastery & Loft"
            style={styles.input}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.sectionLabel}>Owner context & spatial notes</Text>
          <TextInput
            accessibilityLabel="Owner context & spatial notes"
            value={ownerNotes}
            onChangeText={setOwnerNotes}
            multiline
            placeholder="Describe room layout, seating zones, lighting mood, or special amenities..."
            style={[styles.input, { minHeight: 72 }]}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.sectionLabel}>
            OpenAI API Key (optional · runtime memory only)
          </Text>
          <TextInput
            accessibilityLabel="OpenAI API Key"
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            placeholder="sk-... (leave blank to use deterministic context-aware AI synthesizer)"
            style={styles.input}
          />
          <Text style={{ fontSize: 12, color: colors.muted }}>
            Uses OpenAI gpt-4o Structured JSON Outputs when a key is provided;
            never persisted to disk or EXPO_PUBLIC_*.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '700' }}>
            Photos, Walkthrough Videos & Documents ({uploads.length} attached)
          </Text>
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.txt,.md,.csv,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                void handleFileSelection(e.target.files);
                e.target.value = '';
              }}
            />
          )}
          <View style={styles.row}>
            {Platform.OS === 'web' && (
              <Button
                label="Upload Photos / Videos / Documents"
                onPress={() => fileInputRef.current?.click()}
              />
            )}
            {uploads.length > 0 && (
              <Button label="Clear uploads" onPress={() => setUploads([])} />
            )}
          </View>

          {uploads.length === 0 ? (
            <Text style={styles.text}>
              No files uploaded yet. Upload your own cafe photos, videos, and
              documents or click a Sample Bundle above.
            </Text>
          ) : (
            <View style={{ gap: 6 }}>
              {uploads.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.paper,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: '700' }}>
                      [{item.kind.toUpperCase()}] {item.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.muted }}>
                      {item.summary}
                    </Text>
                  </View>
                  <Button
                    label={`Remove ${item.name}`}
                    onPress={() =>
                      setUploads((prev) =>
                        prev.filter((entry) => entry.id !== item.id),
                      )
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.row}>
          <Button
            variant="primary"
            label={
              generating
                ? 'Generating 3D Environment…'
                : 'Generate 3D Cafe Environment'
            }
            disabled={generating}
            onPress={() => void handleGenerate()}
          />
        </View>

        {error ? (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.dangerSurface,
              borderWidth: 1,
              borderColor: colors.dangerBorder,
            }}
          >
            <Text
              accessibilityRole="alert"
              style={{ color: colors.danger, fontWeight: '700' }}
            >
              {error}
            </Text>
          </View>
        ) : null}
        {statusMessage ? (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.greenSurface,
              borderWidth: 1,
              borderColor: colors.greenBorder,
            }}
          >
            <Text
              accessibilityRole="alert"
              style={{ color: colors.green, fontWeight: '700' }}
            >
              {statusMessage}
            </Text>
          </View>
        ) : null}
      </Card>

      {draftVenue ? (
        <>
          <Card>
            <Heading>
              2. Live 3D Environment Preview & Conversational AI Feedback Loop
            </Heading>
            {aiSourceLabel ? (
              <Text style={{ fontWeight: '700', color: draftVenue.accent }}>
                Engine: {aiSourceLabel} · Active Iteration #{activeIteration} of{' '}
                {iterations.length}
              </Text>
            ) : null}
            {reasoningSummary ? (
              <Text style={styles.text}>{reasoningSummary}</Text>
            ) : null}

            {/* Iteration History Switcher */}
            {iterations.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text style={{ fontWeight: '700' }}>
                  Generated Iterations ({iterations.length})
                </Text>
                <View style={styles.row}>
                  {iterations.map((iter) => (
                    <Button
                      key={`iter-pill-${iter.iteration}`}
                      label={`Iteration #${iter.iteration}`}
                      selected={activeIteration === iter.iteration}
                      onPress={() => restoreIteration(iter)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <CafeScene3D
              venue={draftVenue}
              sessions={[]}
              selectedSeatId={previewSeatId}
              onSelect={setPreviewSeatId}
            />

            {/* Conversational Feedback Loop Transcript */}
            <View
              style={{
                gap: 10,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.paper,
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 16 }}>
                Owner ↔ AI Architect Feedback Chat ({chatMessages.length}{' '}
                messages)
              </Text>

              <View style={{ gap: 8 }}>
                {chatMessages.map((msg) => {
                  const isOwner = msg.role === 'owner';
                  const matchingIter = iterations.find(
                    (it) => it.iteration === msg.iteration,
                  );
                  return (
                    <View
                      key={msg.id}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: isOwner
                          ? draftVenue.accent
                          : colors.border,
                        backgroundColor: isOwner ? '#fdf8f3' : '#f4f7f4',
                        gap: 4,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        <Text style={{ fontWeight: '700', fontSize: 13 }}>
                          {isOwner
                            ? `CAFE OWNER · Iteration #${msg.iteration}`
                            : `AI ARCHITECT · Iteration #${msg.iteration}`}
                        </Text>
                        {!isOwner &&
                        matchingIter &&
                        iterations.length > 1 &&
                        activeIteration !== msg.iteration ? (
                          <Button
                            label={`Restore Iteration #${msg.iteration}`}
                            onPress={() => restoreIteration(matchingIter)}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.text}>{msg.text}</Text>
                      {msg.diffSummary && msg.diffSummary.length > 0 ? (
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: draftVenue.accent,
                          }}
                        >
                          Changes: {msg.diffSummary.join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontWeight: '700', fontSize: 13 }}>
                  Quick feedback ideas
                </Text>
                <View style={styles.row}>
                  {FEEDBACK_CHIPS.map((chip) => (
                    <Button
                      key={chip}
                      label={chip}
                      onPress={() => setRefinementPrompt(chip)}
                    />
                  ))}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: '700' }}>
                  Chat with AI to iterate on the 3D environment
                </Text>
                <TextInput
                  accessibilityLabel="Refinement instruction for AI"
                  value={refinementPrompt}
                  onChangeText={setRefinementPrompt}
                  placeholder="Tell AI what to adjust next (e.g. 'Add 2 focus pods, add 2 plants, and switch lighting to cozy-amber')..."
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    padding: 10,
                    backgroundColor: '#ffffff',
                  }}
                />
                <View style={styles.row}>
                  <Button
                    label={
                      generating
                        ? 'Applying Feedback Iteration…'
                        : 'Refine 3D Scene with AI'
                    }
                    disabled={generating || !refinementPrompt.trim()}
                    onPress={() => void handleRefine()}
                  />
                </View>
              </View>
            </View>
          </Card>

          <Card>
            <Heading>
              3. Studio Editor: Room Theme, Fixtures, Seats & Menu
            </Heading>

            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '700' }}>3D Architectural Theme</Text>
              <View style={styles.row}>
                {THEMES.map((theme) => (
                  <Button
                    key={theme}
                    label={`Theme: ${theme}`}
                    selected={draftVenue.scene3d?.theme === theme}
                    onPress={() =>
                      setDraftVenue((prev) =>
                        prev && prev.scene3d
                          ? {
                              ...prev,
                              scene3d: { ...prev.scene3d, theme },
                            }
                          : prev,
                      )
                    }
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '700' }}>Lighting Mood</Text>
              <View style={styles.row}>
                {LIGHTINGS.map((lighting) => (
                  <Button
                    key={lighting}
                    label={`Light: ${lighting}`}
                    selected={draftVenue.scene3d?.lighting === lighting}
                    onPress={() =>
                      setDraftVenue((prev) =>
                        prev && prev.scene3d
                          ? {
                              ...prev,
                              scene3d: { ...prev.scene3d, lighting },
                            }
                          : prev,
                      )
                    }
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '700' }}>
                Add 3D Fixtures & Decor (
                {draftVenue.scene3d?.fixtures.length ?? 0} placed)
              </Text>
              <View style={styles.row}>
                {QUICK_FIXTURES.map((item) => (
                  <Button
                    key={item.kind}
                    label={`+ ${item.label}`}
                    onPress={() =>
                      setDraftVenue((prev) => {
                        if (!prev || !prev.scene3d) return prev;
                        const idx = prev.scene3d.fixtures.length + 1;
                        return {
                          ...prev,
                          scene3d: {
                            ...prev.scene3d,
                            fixtures: [
                              ...prev.scene3d.fixtures,
                              {
                                id: `${prev.id}-fix-${Date.now()}-${idx}`,
                                kind: item.kind,
                                label: `${item.label} ${idx}`,
                                x: (idx - 1) % 4,
                                z: (idx % 2) * 0.8,
                                color: prev.accent,
                              },
                            ],
                          },
                        };
                      })
                    }
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <Text style={{ fontWeight: '700' }}>
                  Bookable Seats ({draftVenue.seats.length})
                </Text>
                <Button
                  label="+ Add Seat"
                  onPress={() =>
                    setDraftVenue((prev) => {
                      if (!prev) return prev;
                      const idx = prev.seats.length + 1;
                      const newSeat: Seat = {
                        id: `${prev.id}-seat-${Date.now()}-${idx}`,
                        venueId: prev.id,
                        label: `Seat ${idx}`,
                        kind: 'desk',
                        x: (idx - 1) % 4,
                        z: Math.floor((idx - 1) / 4),
                        hourlyRate: 35000,
                        zone: 'Main Floor',
                      };
                      return {
                        ...prev,
                        seats: [...prev.seats, newSeat],
                      };
                    })
                  }
                />
              </View>
              {draftVenue.seats.map((seat) => (
                <View
                  key={seat.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.paper,
                  }}
                >
                  <Text style={{ fontWeight: '700' }}>
                    {seat.label} · {seat.kind} · ({seat.x}, {seat.z}) ·{' '}
                    {formatMoney(seat.hourlyRate)}/h
                  </Text>
                  <View style={styles.row}>
                    <Button
                      label={`Cycle kind (${seat.label})`}
                      onPress={() =>
                        setDraftVenue((prev) => {
                          if (!prev) return prev;
                          const nextKind: Seat['kind'] =
                            seat.kind === 'desk'
                              ? 'pod'
                              : seat.kind === 'pod'
                                ? 'booth'
                                : 'desk';
                          return {
                            ...prev,
                            seats: prev.seats.map((s) =>
                              s.id === seat.id ? { ...s, kind: nextKind } : s,
                            ),
                          };
                        })
                      }
                    />
                    <Button
                      label={`+5k/h (${seat.label})`}
                      onPress={() =>
                        setDraftVenue((prev) =>
                          prev
                            ? {
                                ...prev,
                                seats: prev.seats.map((s) =>
                                  s.id === seat.id
                                    ? { ...s, hourlyRate: s.hourlyRate + 5000 }
                                    : s,
                                ),
                              }
                            : prev,
                        )
                      }
                    />
                    {draftVenue.seats.length > 1 && (
                      <Button
                        label={`Remove ${seat.label}`}
                        onPress={() =>
                          setDraftVenue((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  seats: prev.seats.filter(
                                    (s) => s.id !== seat.id,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '700' }}>
                AI-Extracted Menu Items ({draftVenue.menu.length})
              </Text>
              {draftVenue.menu.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.paper,
                  }}
                >
                  <Text style={{ fontWeight: '700' }}>
                    {item.name} · {formatMoney(item.price)}
                  </Text>
                  {draftVenue.menu.length > 1 && (
                    <Button
                      label={`Remove ${item.name}`}
                      onPress={() =>
                        setDraftVenue((prev) =>
                          prev
                            ? {
                                ...prev,
                                menu: prev.menu.filter((m) => m.id !== item.id),
                              }
                            : prev,
                        )
                      }
                    />
                  )}
                </View>
              ))}
              <View style={styles.row}>
                <TextInput
                  accessibilityLabel="New menu item name"
                  value={newMenuName}
                  onChangeText={setNewMenuName}
                  placeholder="New item name (e.g. Matcha Basque Cheesecake)"
                  style={{
                    flex: 1,
                    minWidth: 200,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    padding: 10,
                    backgroundColor: colors.paper,
                  }}
                />
                <TextInput
                  accessibilityLabel="New menu item price"
                  value={newMenuPrice}
                  onChangeText={setNewMenuPrice}
                  placeholder="Price VND"
                  style={{
                    width: 120,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    padding: 10,
                    backgroundColor: colors.paper,
                  }}
                />
                <Button
                  label="+ Add Menu Item"
                  onPress={() => {
                    const cleanName = newMenuName.trim();
                    const price = Number(newMenuPrice.replace(/[^0-9]/g, ''));
                    if (
                      !cleanName ||
                      !Number.isSafeInteger(price) ||
                      price <= 0
                    )
                      return;
                    setDraftVenue((prev) =>
                      prev
                        ? {
                            ...prev,
                            menu: [
                              ...prev.menu,
                              {
                                id: `${prev.id}-item-${Date.now()}`,
                                name: cleanName,
                                price,
                              },
                            ],
                          }
                        : prev,
                    );
                    setNewMenuName('');
                  }}
                />
              </View>
            </View>

            <View style={styles.row}>
              <Button
                variant="primary"
                label="Publish 3D Cafe to Live App"
                onPress={handlePublish}
              />
              <Button
                label="Open Live Floor"
                onPress={() => router.push('/merchant/live-floor')}
              />
              <Button
                label="Preview as Customer"
                onPress={() => {
                  store.setRole('customer');
                  router.push('/customer/explore');
                }}
              />
            </View>
          </Card>
        </>
      ) : null}
    </>
  );
}
