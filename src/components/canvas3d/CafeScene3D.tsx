import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatMoney, type Session, type Venue } from '@/core';
import { seatLabelText } from '@/i18n/seatLabel';
import { useT } from '@/i18n/useLanguage';
import { seatMapMessages } from '../messages';
import { colors, radius, styles, useResponsive, Chip, space } from '../ui';
import {
  CAMERA_PRESETS,
  gridToWorld,
  resolveScene3D,
  type CameraPreset,
  type OrbitState,
} from './sceneBuilder';
import { SceneViewport } from './SceneViewport';

export interface CafeScene3DProps {
  venue: Venue;
  sessions: readonly Session[];
  selectedSeatId: string | null;
  onSelect: (seatId: string) => void;
  height?: number;
}

const PRESET_LABELS: {
  id: CameraPreset;
  label: 'presetIsometric' | 'presetTop' | 'presetFront' | 'presetBar';
}[] = [
  { id: 'isometric', label: 'presetIsometric' },
  { id: 'top', label: 'presetTop' },
  { id: 'front', label: 'presetFront' },
  { id: 'bar', label: 'presetBar' },
];

export function CafeScene3D({
  venue,
  sessions,
  selectedSeatId,
  onSelect,
  height: customHeight,
}: CafeScene3DProps) {
  const { isWide } = useResponsive();
  const height = customHeight ?? (isWide ? 320 : 210);
  const sceneCfg = resolveScene3D(venue);
  const [preset, setPreset] = useState<CameraPreset>('isometric');
  const [orbit, setOrbit] = useState<OrbitState>(CAMERA_PRESETS.isometric);
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [webglActive, setWebglActive] = useState(true);
  const onUnavailable = useCallback(() => setWebglActive(false), []);
  const { t, lang } = useT(seatMapMessages);
  const activeSeat =
    venue.seats.find((s) => s.id === (hoveredSeatId ?? selectedSeatId)) ?? null;
  const activeSeatOccupied = activeSeat
    ? sessions.some((s) => s.venueId === venue.id && s.seatId === activeSeat.id)
    : false;

  return (
    <View
      style={{
        width: '100%',
        maxWidth: '100%',
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceSubtle,
      }}
    >
      <View style={{ gap: space.sm }}>
        <Text style={styles.captionStrong}>
          {t('engine', {
            venue: venue.name,
            width: sceneCfg.roomWidth,
            depth: sceneCfg.roomDepth,
            theme: sceneCfg.theme,
          })}
        </Text>
        <View style={styles.row}>
          {PRESET_LABELS.map((item) => (
            <Chip
              key={item.id}
              label={t(item.label)}
              selected={preset === item.id}
              onPress={() => {
                setPreset(item.id);
                setOrbit(CAMERA_PRESETS[item.id]);
              }}
            />
          ))}
          <Chip
            label={t('zoomIn')}
            onPress={() =>
              setOrbit((prev) => ({
                ...prev,
                distance: Math.max(7, prev.distance - 2),
              }))
            }
          />
          <Chip
            label={t('zoomOut')}
            onPress={() =>
              setOrbit((prev) => ({
                ...prev,
                distance: Math.min(24, prev.distance + 2),
              }))
            }
          />
        </View>
      </View>

      {webglActive && (
        <View
          style={{
            width: '100%',
            height,
            overflow: 'hidden',
            borderRadius: radius.md,
          }}
        >
          <SceneViewport
            venue={venue}
            sessions={sessions}
            selectedSeatId={selectedSeatId}
            onSelect={onSelect}
            height={height}
            orbit={orbit}
            canvasLabel={t('canvasA11y', { venue: venue.name })}
            onOrbitChange={setOrbit}
            onHover={setHoveredSeatId}
            onUnavailable={onUnavailable}
          />
        </View>
      )}
      {!webglActive && <Text style={styles.caption}>{t('unavailable3D')}</Text>}

      {/* Interactive Spatial Floor Map (fallback when WebGL is disabled) */}
      {!webglActive && (
        <Text style={styles.caption}>
          {t('blueprint', {
            lighting: sceneCfg.lighting,
            count: sceneCfg.fixtures.length,
          })}
        </Text>
      )}
      {!webglActive && (
        <View
          style={{
            width: '100%',
            height: 200,
            borderRadius: radius.md,
            borderWidth: 2,
            borderColor: sceneCfg.wallColor,
            backgroundColor: sceneCfg.floorColor,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {venue.seats.map((seat) => {
            const { worldX, worldZ } = gridToWorld(
              seat.x,
              seat.z,
              sceneCfg,
              venue.seats,
            );
            const leftPct = Math.min(
              84,
              Math.max(
                4,
                ((worldX + sceneCfg.roomWidth / 2) / sceneCfg.roomWidth) * 100,
              ),
            );
            const topPct = Math.min(
              80,
              Math.max(
                14,
                ((worldZ + sceneCfg.roomDepth / 2) / sceneCfg.roomDepth) * 100,
              ),
            );
            const occupied = sessions.some(
              (s) => s.venueId === venue.id && s.seatId === seat.id,
            );
            const selected = selectedSeatId === seat.id;
            return (
              <Pressable
                key={`blueprint-${seat.id}`}
                accessibilityRole="button"
                accessibilityLabel={t('blueprintSeatA11y', {
                  seat: seatLabelText(seat.label, lang),
                  status: occupied ? t('occupied') : t('available'),
                })}
                accessibilityState={{ selected }}
                onPress={() => onSelect(seat.id)}
                hitSlop={8}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  paddingVertical: space.xs,
                  paddingHorizontal: space.sm,
                  borderRadius: radius.sm,
                  borderWidth: 2,
                  borderColor: selected ? venue.accent : colors.onPrimary,
                  backgroundColor: occupied ? colors.blue : colors.green,
                }}
              >
                <Text
                  style={[styles.captionStrong, { color: colors.onPrimary }]}
                >
                  {seatLabelText(seat.label, lang)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {activeSeat ? (
        <Text style={styles.captionStrong}>
          {t('selected', {
            seat: seatLabelText(activeSeat.label, lang),
            kind: t(activeSeat.kind),
            status: activeSeatOccupied ? t('occupied') : t('available'),
            rate: formatMoney(activeSeat.hourlyRate),
          })}
        </Text>
      ) : null}
    </View>
  );
}
