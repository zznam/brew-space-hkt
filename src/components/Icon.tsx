import { View, type ViewStyle } from 'react-native';
import { colors } from './theme';

export type IconName =
  | 'explore'
  | 'session'
  | 'member'
  | 'assistant'
  | 'floor'
  | 'order'
  | 'tickets'
  | 'studio'
  | 'journeys'
  | 'check'
  | 'chevronDown'
  | 'chevronUp';

const SIZE = 22;
const STROKE = 2;

/**
 * Line icons drawn from plain views, so the app needs no icon font or SVG
 * dependency on any platform. All glyphs share a 22pt box and a 2pt stroke.
 * Icons are decorative: the control that holds one carries the label.
 */
export function Icon({
  name,
  color = colors.ink,
}: {
  name: IconName;
  color?: string;
}) {
  const line = (style: ViewStyle) => (
    <View style={[{ position: 'absolute', backgroundColor: color }, style]} />
  );
  const outline = (style: ViewStyle) => (
    <View
      style={[
        { position: 'absolute', borderWidth: STROKE, borderColor: color },
        style,
      ]}
    />
  );

  let glyph;
  switch (name) {
    case 'explore':
      glyph = (
        <>
          {outline({ left: 2, top: 2, width: 14, height: 14, borderRadius: 7 })}
          {line({
            left: 15,
            top: 12,
            width: STROKE,
            height: 8,
            borderRadius: 1,
            transform: [{ rotate: '-45deg' }],
          })}
        </>
      );
      break;
    case 'session':
      glyph = (
        <>
          {outline({ left: 2, top: 2, width: 18, height: 18, borderRadius: 9 })}
          {line({
            left: 10,
            top: 6,
            width: STROKE,
            height: 6,
            borderRadius: 1,
          })}
          {line({
            left: 10,
            top: 10,
            width: 5,
            height: STROKE,
            borderRadius: 1,
          })}
        </>
      );
      break;
    case 'member':
      glyph = (
        <>
          {outline({ left: 7, top: 2, width: 8, height: 8, borderRadius: 4 })}
          {outline({
            left: 3,
            top: 12,
            width: 16,
            height: 9,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderBottomWidth: 0,
          })}
        </>
      );
      break;
    case 'assistant':
      glyph = (
        <>
          {outline({ left: 2, top: 2, width: 18, height: 14, borderRadius: 5 })}
          <View
            style={{
              position: 'absolute',
              left: 6,
              top: 15,
              width: 0,
              height: 0,
              borderLeftWidth: 0,
              borderRightWidth: 6,
              borderTopWidth: 5,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: color,
            }}
          />
          {line({ left: 6, top: 8, width: 2, height: 2, borderRadius: 1 })}
          {line({ left: 10, top: 8, width: 2, height: 2, borderRadius: 1 })}
          {line({ left: 14, top: 8, width: 2, height: 2, borderRadius: 1 })}
        </>
      );
      break;
    case 'floor':
      glyph = (
        <>
          {outline({ left: 2, top: 2, width: 8, height: 8, borderRadius: 2 })}
          {outline({ left: 12, top: 2, width: 8, height: 8, borderRadius: 2 })}
          {outline({ left: 2, top: 12, width: 8, height: 8, borderRadius: 2 })}
          {outline({ left: 12, top: 12, width: 8, height: 8, borderRadius: 2 })}
        </>
      );
      break;
    case 'order':
      glyph = (
        <>
          {outline({ left: 2, top: 2, width: 18, height: 18, borderRadius: 9 })}
          {line({
            left: 7,
            top: 10,
            width: 8,
            height: STROKE,
            borderRadius: 1,
          })}
          {line({
            left: 10,
            top: 7,
            width: STROKE,
            height: 8,
            borderRadius: 1,
          })}
        </>
      );
      break;
    case 'tickets':
      glyph = (
        <>
          {outline({ left: 4, top: 2, width: 14, height: 18, borderRadius: 3 })}
          {line({ left: 8, top: 7, width: 6, height: STROKE, borderRadius: 1 })}
          {line({
            left: 8,
            top: 11,
            width: 6,
            height: STROKE,
            borderRadius: 1,
          })}
        </>
      );
      break;
    case 'studio':
      glyph = (
        <>
          {outline({
            left: 5,
            top: 5,
            width: 12,
            height: 12,
            borderRadius: 2,
            transform: [{ rotate: '45deg' }],
          })}
          {line({ left: 10, top: 10, width: 2, height: 2, borderRadius: 1 })}
        </>
      );
      break;
    case 'journeys':
      glyph = (
        <>
          {outline({ left: 2, top: 2, width: 7, height: 7, borderRadius: 4 })}
          {outline({ left: 13, top: 13, width: 7, height: 7, borderRadius: 4 })}
          {line({
            left: 10,
            top: 6,
            width: STROKE,
            height: 10,
            borderRadius: 1,
            transform: [{ rotate: '-45deg' }],
          })}
        </>
      );
      break;
    case 'check':
      glyph = (
        <View
          style={{
            position: 'absolute',
            left: 8,
            top: 3,
            width: 7,
            height: 12,
            borderRightWidth: STROKE,
            borderBottomWidth: STROKE,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
          }}
        />
      );
      break;
    case 'chevronDown':
    case 'chevronUp':
      glyph = (
        <View
          style={{
            position: 'absolute',
            left: 7,
            top: name === 'chevronDown' ? 5 : 9,
            width: 8,
            height: 8,
            borderRightWidth: STROKE,
            borderBottomWidth: STROKE,
            borderColor: color,
            transform: [
              { rotate: name === 'chevronDown' ? '45deg' : '-135deg' },
            ],
          }}
        />
      );
      break;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: SIZE, height: SIZE }}
    >
      {glyph}
    </View>
  );
}
