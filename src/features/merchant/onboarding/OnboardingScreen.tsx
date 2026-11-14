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
  type Session,
  type Venue,
} from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { CafeScene3D } from '@/components/canvas3d/CafeScene3D';
import { seatLabelText } from '@/i18n/seatLabel';
import { useT } from '@/i18n/useLanguage';
import { onboardingMessages } from './messages';
import {
  Banner,
  Button,
  Card,
  Chip,
  CollapsibleSection,
  colors,
  Divider,
  Heading,
  Screen,
  ScreenHeader,
  space,
  styles,
  useResponsive,
} from '@/components/ui';
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
type MessageKey = keyof typeof onboardingMessages.en;
/** `label` names the placed fixture in venue data; `key` is the button copy. */
const QUICK_FIXTURES: {
  kind: Scene3DFixtureKind;
  label: string;
  key: MessageKey;
}[] = [
  { kind: 'plant', label: 'Tropical Planter', key: 'fixturePlant' },
  { kind: 'window', label: 'Daylight Window', key: 'fixtureWindow' },
  { kind: 'bookshelf', label: 'Library Shelf', key: 'fixtureBookshelf' },
  { kind: 'pendant-light', label: 'Pendant Lamp', key: 'fixturePendant' },
  { kind: 'partition', label: 'Acoustic Divider', key: 'fixturePartition' },
  { kind: 'sofa-lounge', label: 'Lounge Sofa', key: 'fixtureSofa' },
];
const FEEDBACK_CHIPS: string[] = [
  'Add 2 focus pods and a partition',
  'Add 2 plants and a bookshelf',
  'Expand room to 16m x 11m',
  'Switch lighting to cozy-amber',
  'Add Matcha Cheesecake for 58000',
];

const SEAT_KINDS: Seat['kind'][] = ['desk', 'pod', 'booth'];
// Stable identity: the 3D viewer rebuilds its scene when `sessions` changes.
const NO_SESSIONS: Session[] = [];
const fieldStyle = { gap: space.sm };

type NoticePlace = 'setup' | 'refine' | 'publish';

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
  const customVenues = useAppStore((state) => state.customVenues);
  const upsertVenue = useAppStore((state) => state.upsertVenue);
  const setRole = useAppStore((state) => state.setRole);
  const { isWide } = useResponsive();
  const { t, lang } = useT(onboardingMessages);
  const allVenues = getAllVenues(customVenues);

  const [targetVenueId, setTargetVenueId] = useState<string>('new');
  const [ownerVenueName, setOwnerVenueName] = useState<string>('');
  const [ownerNotes, setOwnerNotes] = useState<string>('');
  const [uploads, setUploads] = useState<OnboardingUploadItem[]>([]);
  const [apiKey, setApiKey] = useState<string>('');

  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [noticeAt, setNoticeAt] = useState<NoticePlace>('setup');
  const [aiSourceLabel, setAiSourceLabel] = useState<string>('');

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
    setNoticeAt('setup');
    setError('');
    setStatusMessage(t('stSample', { label: bundle.label }));
    setOwnerVenueName(bundle.venueName);
    setOwnerNotes(bundle.ownerNotes);
    setUploads(bundle.uploads);
  }

  function loadExistingVenueIntoDraft(venueId: string) {
    setTargetVenueId(venueId);
    setNoticeAt('setup');
    setError('');
    if (venueId === 'new') {
      setDraftVenue(null);
      setIterations([]);
      setChatMessages([]);
      setActiveIteration(0);
      return;
    }
    const existing = getVenue(venueId, customVenues);
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
    setStatusMessage(t('stLoaded', { venue: existing.name }));
  }

  async function handleFileSelection(files: FileList | null) {
    if (!files || files.length === 0) return;
    setNoticeAt('setup');
    // Clearing the picker also clears its live FileList, so copy it before awaiting.
    const selectedFiles = Array.from(files);
    setError('');
    const added: OnboardingUploadItem[] = [];
    for (const file of selectedFiles) {
      try {
        const processed = await processUploadedFile(file);
        added.push(processed);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errFile'));
      }
    }
    if (added.length > 0) {
      setUploads((prev) => [...prev, ...added]);
      setStatusMessage(t('stProcessed', { n: added.length }));
    }
  }

  async function handleGenerate() {
    setNoticeAt('setup');
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
        t(result.source === 'openai' ? 'sourceOpenAI' : 'sourceLocal', {
          model: result.modelUsed,
        }),
      );

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
        t('stGenerated', {
          venue: result.venue.name,
          seats: result.venue.seats.length,
          items: result.venue.menu.length,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errGenerate'));
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefine(customInstruction?: string) {
    if (!draftVenue) return;
    const instruction = (customInstruction ?? refinementPrompt).trim();
    if (!instruction) return;
    setNoticeAt('refine');
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
        t(result.source === 'openai' ? 'sourceOpenAI' : 'sourceLocal', {
          model: result.modelUsed,
        }),
      );

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
        t('stRefined', {
          n: nextIterNum,
          changes: newIteration.diffSummary.join(' · '),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errRefine'));
    } finally {
      setGenerating(false);
    }
  }

  function restoreIteration(iter: OnboardingIteration) {
    const restored = cloneVenue(iter.venueSnapshot);
    setNoticeAt('refine');
    setDraftVenue(restored);
    setActiveIteration(iter.iteration);
    setPreviewSeatId(restored.seats[0]?.id ?? null);
    setStatusMessage(
      t('stRestored', {
        n: iter.iteration,
        seats: restored.seats.length,
        lighting: restored.scene3d?.lighting ?? 'default',
      }),
    );
  }

  function handlePublish() {
    if (!draftVenue) return;
    setNoticeAt('publish');
    setError('');
    const result = upsertVenue(draftVenue);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStatusMessage(
      t('stPublished', { venue: draftVenue.name, n: activeIteration || 1 }),
    );
  }

  const notice = (
    <>
      {error ? (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      ) : null}
      {statusMessage ? (
        <Banner tone="success" role="alert">
          {statusMessage}
        </Banner>
      ) : null}
    </>
  );
  const scene = draftVenue?.scene3d;

  return (
    <Screen>
      <ScreenHeader
        overline={t('overline')}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <Card>
        <Heading level={2}>{t('step1')}</Heading>

        <View style={fieldStyle}>
          <Text style={styles.sectionLabel}>{t('sample')}</Text>
          <View style={styles.row}>
            {SAMPLE_ONBOARDING_BUNDLES.map((bundle) => (
              <Chip
                key={bundle.id}
                label={bundle.label}
                onPress={() => applySampleBundle(bundle)}
              />
            ))}
          </View>
        </View>

        <View style={fieldStyle}>
          <Text style={styles.sectionLabel}>{t('venue')}</Text>
          <View style={styles.row}>
            <Chip
              label={t('newCafe')}
              selected={targetVenueId === 'new'}
              onPress={() => loadExistingVenueIntoDraft('new')}
            />
            {allVenues.map((v) => (
              <Chip
                key={v.id}
                label={v.name}
                accessibilityLabel={t('editVenueA11y', { venue: v.name })}
                selected={targetVenueId === v.id}
                onPress={() => loadExistingVenueIntoDraft(v.id)}
              />
            ))}
          </View>
        </View>

        <View style={fieldStyle}>
          <Text style={styles.sectionLabel}>{t('cafeName')}</Text>
          <TextInput
            placeholderTextColor={colors.subtle}
            accessibilityLabel={t('cafeName')}
            value={ownerVenueName}
            onChangeText={setOwnerVenueName}
            placeholder={t('cafeNamePlaceholder')}
            style={styles.input}
          />
        </View>

        <View style={fieldStyle}>
          <Text style={styles.sectionLabel}>{t('notes')}</Text>
          <TextInput
            placeholderTextColor={colors.subtle}
            accessibilityLabel={t('notesA11y')}
            value={ownerNotes}
            onChangeText={setOwnerNotes}
            multiline
            placeholder={t('notesPlaceholder')}
            style={[styles.input, { minHeight: 88 }]}
          />
        </View>

        <View style={fieldStyle}>
          <Text style={styles.sectionLabel}>
            {t('uploads', { n: uploads.length })}
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
          {uploads.length === 0 ? (
            <Text style={styles.caption}>{t('uploadsEmpty')}</Text>
          ) : (
            uploads.map((item) => (
              <View key={item.id} style={[styles.inset, styles.insetRow]}>
                <View style={{ flex: 1, gap: space.xxs }}>
                  <Text style={styles.textStrong}>
                    [{item.kind.toUpperCase()}] {item.name}
                  </Text>
                  <Text style={styles.caption}>{item.summary}</Text>
                </View>
                <Button
                  size="sm"
                  variant="ghost"
                  label={t('remove')}
                  accessibilityLabel={t('removeA11y', { name: item.name })}
                  onPress={() =>
                    setUploads((prev) =>
                      prev.filter((entry) => entry.id !== item.id),
                    )
                  }
                />
              </View>
            ))
          )}
          <View style={styles.row}>
            {Platform.OS === 'web' && (
              <Button
                size="sm"
                label={t('uploadFiles')}
                accessibilityLabel={t('uploadFilesA11y')}
                onPress={() => fileInputRef.current?.click()}
              />
            )}
            {uploads.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                label={t('clearUploads')}
                onPress={() => {
                  setUploads([]);
                }}
              />
            )}
          </View>
        </View>

        <CollapsibleSection
          title={t('apiKeyTitle')}
          summary={apiKey ? t('apiKeyEntered') : t('apiKeyOptional')}
        >
          <TextInput
            placeholderTextColor={colors.subtle}
            accessibilityLabel={t('apiKeyA11y')}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            placeholder="sk-…"
            style={styles.input}
          />
          <Text style={styles.caption}>{t('apiKeyHelp')}</Text>
        </CollapsibleSection>

        <Button
          variant={draftVenue ? 'secondary' : 'primary'}
          fullWidth={!isWide}
          label={generating ? t('generating') : t('generate')}
          disabled={generating}
          onPress={() => void handleGenerate()}
        />
        {noticeAt === 'setup' ? notice : null}
      </Card>

      {draftVenue ? (
        <>
          <Card>
            <Heading level={2}>{t('step2')}</Heading>
            {aiSourceLabel ? (
              <Text style={styles.caption}>
                {t('engineLine', {
                  source: aiSourceLabel,
                  n: activeIteration,
                  total: iterations.length,
                })}
              </Text>
            ) : null}

            {iterations.length > 0 ? (
              <View style={fieldStyle}>
                <Text style={styles.sectionLabel}>
                  {t('iterations', { n: iterations.length })}
                </Text>
                <View style={styles.row}>
                  {iterations.map((iter) => (
                    <Chip
                      key={`iter-pill-${iter.iteration}`}
                      label={t('iterationChip', { n: iter.iteration })}
                      selected={activeIteration === iter.iteration}
                      onPress={() => restoreIteration(iter)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <CafeScene3D
              venue={draftVenue}
              sessions={NO_SESSIONS}
              selectedSeatId={previewSeatId}
              onSelect={setPreviewSeatId}
            />

            <Divider />

            <View style={fieldStyle}>
              <Text style={styles.sectionLabel}>
                {t('conversation', { n: chatMessages.length })}
              </Text>
              {chatMessages.map((msg) => {
                const isOwner = msg.role === 'owner';
                const matchingIter = iterations.find(
                  (it) => it.iteration === msg.iteration,
                );
                const canRestore =
                  !isOwner &&
                  matchingIter &&
                  iterations.length > 1 &&
                  activeIteration !== msg.iteration;
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.inset,
                      isOwner && {
                        backgroundColor: colors.paperAlt,
                        marginLeft: space.xxl,
                        width: 'auto',
                      },
                    ]}
                  >
                    <Text style={styles.sectionLabel}>
                      {t(isOwner ? 'msgYou' : 'msgArchitect', {
                        n: msg.iteration,
                      })}
                    </Text>
                    <Text style={[styles.text, { color: colors.ink }]}>
                      {msg.text}
                    </Text>
                    {msg.diffSummary && msg.diffSummary.length > 0 ? (
                      <Text style={styles.captionStrong}>
                        {t('changes', { list: msg.diffSummary.join(' · ') })}
                      </Text>
                    ) : null}
                    {canRestore ? (
                      <View style={styles.row}>
                        <Button
                          size="sm"
                          label={t('restore', { n: msg.iteration })}
                          onPress={() => restoreIteration(matchingIter)}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View style={fieldStyle}>
              <Text style={styles.sectionLabel}>{t('tellAi')}</Text>
              <View style={styles.row}>
                {FEEDBACK_CHIPS.map((chip) => (
                  <Chip
                    key={chip}
                    label={chip}
                    onPress={() => setRefinementPrompt(chip)}
                  />
                ))}
              </View>
              <TextInput
                placeholderTextColor={colors.subtle}
                accessibilityLabel={t('refineA11y')}
                value={refinementPrompt}
                onChangeText={setRefinementPrompt}
                placeholder={t('refinePlaceholder')}
                style={styles.input}
              />
              <Button
                fullWidth={!isWide}
                label={generating ? t('applying') : t('refine')}
                disabled={generating || !refinementPrompt.trim()}
                onPress={() => void handleRefine()}
              />
            </View>
            {noticeAt === 'refine' ? notice : null}
          </Card>

          <Card>
            <Heading level={2}>{t('step3')}</Heading>

            {scene ? (
              <CollapsibleSection
                title={t('roomLook')}
                summary={t('roomSummary', {
                  theme: scene.theme,
                  lighting: scene.lighting,
                  n: scene.fixtures.length,
                })}
              >
                <View style={fieldStyle}>
                  <Text style={styles.sectionLabel}>{t('theme')}</Text>
                  <View style={styles.row}>
                    {THEMES.map((theme) => (
                      <Chip
                        key={theme}
                        label={theme}
                        accessibilityLabel={t('themeA11y', { value: theme })}
                        selected={scene.theme === theme}
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

                <View style={fieldStyle}>
                  <Text style={styles.sectionLabel}>{t('lighting')}</Text>
                  <View style={styles.row}>
                    {LIGHTINGS.map((lighting) => (
                      <Chip
                        key={lighting}
                        label={lighting}
                        accessibilityLabel={t('lightingA11y', {
                          value: lighting,
                        })}
                        selected={scene.lighting === lighting}
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

                <View style={fieldStyle}>
                  <Text style={styles.sectionLabel}>
                    {t('addFixture', { n: scene.fixtures.length })}
                  </Text>
                  <View style={styles.row}>
                    {QUICK_FIXTURES.map((item) => (
                      <Button
                        key={item.kind}
                        size="sm"
                        label={`+ ${t(item.key)}`}
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
              </CollapsibleSection>
            ) : null}

            <CollapsibleSection
              title={t('seatsTitle', { n: draftVenue.seats.length })}
              summary={t('seatsSummary')}
            >
              {draftVenue.seats.map((seat) => (
                <View key={seat.id} style={styles.inset}>
                  <View style={styles.insetRow}>
                    <Text style={[styles.textStrong, { flex: 1 }]}>
                      {seatLabelText(seat.label, lang)}
                    </Text>
                    <Text style={styles.caption}>
                      {t('seatMeta', {
                        rate: formatMoney(seat.hourlyRate),
                        x: seat.x,
                        z: seat.z,
                      })}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    {SEAT_KINDS.map((kind) => (
                      <Chip
                        key={kind}
                        label={t(kind)}
                        accessibilityLabel={t('seatTypeA11y', {
                          seat: seatLabelText(seat.label, lang),
                          kind: t(kind),
                        })}
                        selected={seat.kind === kind}
                        onPress={() =>
                          setDraftVenue((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  seats: prev.seats.map((s) =>
                                    s.id === seat.id ? { ...s, kind } : s,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                    ))}
                  </View>
                  <View style={styles.row}>
                    <Button
                      size="sm"
                      label={t('raiseRate')}
                      accessibilityLabel={t('raiseRateA11y', {
                        seat: seatLabelText(seat.label, lang),
                      })}
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
                        size="sm"
                        variant="ghost"
                        label={t('remove')}
                        accessibilityLabel={t('removeA11y', {
                          name: seatLabelText(seat.label, lang),
                        })}
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
              <Button
                fullWidth={!isWide}
                label={t('addSeat')}
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
            </CollapsibleSection>

            <CollapsibleSection
              title={t('menuTitle', { n: draftVenue.menu.length })}
              summary={t('menuSummary')}
            >
              {draftVenue.menu.map((item) => (
                <View key={item.id} style={[styles.inset, styles.insetRow]}>
                  <View style={{ flex: 1, gap: space.xxs }}>
                    <Text style={styles.textStrong}>{item.name}</Text>
                    <Text style={styles.caption}>
                      {formatMoney(item.price)}
                    </Text>
                  </View>
                  {draftVenue.menu.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      label={t('remove')}
                      accessibilityLabel={t('removeA11y', { name: item.name })}
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
              <View
                style={{
                  flexDirection: isWide ? 'row' : 'column',
                  gap: space.sm,
                  alignItems: isWide ? 'flex-end' : 'stretch',
                }}
              >
                <View style={[fieldStyle, isWide && { flex: 1 }]}>
                  <Text style={styles.sectionLabel}>{t('newItemName')}</Text>
                  <TextInput
                    placeholderTextColor={colors.subtle}
                    accessibilityLabel={t('newItemNameA11y')}
                    value={newMenuName}
                    onChangeText={setNewMenuName}
                    placeholder={t('newItemPlaceholder')}
                    style={styles.input}
                  />
                </View>
                <View style={[fieldStyle, isWide && { width: 160 }]}>
                  <Text style={styles.sectionLabel}>{t('price')}</Text>
                  <TextInput
                    placeholderTextColor={colors.subtle}
                    accessibilityLabel={t('priceA11y')}
                    value={newMenuPrice}
                    onChangeText={setNewMenuPrice}
                    inputMode="numeric"
                    placeholder="45000"
                    style={styles.input}
                  />
                </View>
                <Button
                  label={t('addItem')}
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
            </CollapsibleSection>

            <Button
              variant="primary"
              fullWidth={!isWide}
              label={t('publish')}
              onPress={handlePublish}
            />
            {noticeAt === 'publish' ? notice : null}
            <View style={styles.row}>
              <Button
                style={isWide ? undefined : { flex: 1 }}
                label={t('openFloor')}
                onPress={() => router.push('/merchant/live-floor')}
              />
              <Button
                style={isWide ? undefined : { flex: 1 }}
                label={t('previewCustomer')}
                onPress={() => {
                  setRole('customer');
                  router.push('/customer/explore');
                }}
              />
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
