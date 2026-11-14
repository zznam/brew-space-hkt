import { Pressable, Text, TextInput, View } from 'react-native';
import { formatMoney, type Session } from '@/core';
import {
  Badge,
  Button,
  Card,
  colors,
  Divider,
  Heading,
  radius,
  styles,
  Banner,
  space,
} from '@/components/ui';
import {
  getPreferences,
  isMember,
  MILK_OPTIONS,
  SWEETNESS_OPTIONS,
} from '../loyalty/loyaltyModel';
import { useT } from '../../../i18n/useLanguage';
import { useLoyalty, useLoyaltyReady } from '../loyalty/useLoyalty';
import {
  cartTotal,
  formatModifiers,
  ICE_OPTIONS,
  iceLabel,
  lineKey,
  MAX_LINE_QUANTITY,
  MAX_NOTE_LENGTH,
  milkLabel,
  sweetnessLabel,
  type Modifiers,
} from './cartModel';
import { cartMessages, cartText } from './messages';
import { useCart } from './useCart';

/** Same look as the shared Button, but with its own accessibility label so
 * the same option on two lines stays distinguishable. */
function ChoiceButton({
  label,
  accessibilityLabel,
  selected,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles.buttonSm,
        selected && styles.selected,
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          styles.buttonTextSm,
          selected && { color: colors.onPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OptionRow<T extends string | number>({
  title,
  itemName,
  options,
  value,
  label,
  onChange,
}: {
  title: string;
  itemName: string;
  options: readonly T[];
  value: T;
  label: (option: T) => string;
  onChange: (option: T) => void;
}) {
  const { t } = useT(cartMessages);
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.row}>
        {options.map((option) => (
          <ChoiceButton
            key={option}
            label={label(option)}
            selected={option === value}
            onPress={() => onChange(option)}
            accessibilityLabel={t('optionFor', {
              title,
              option: label(option),
              item: itemName,
            })}
          />
        ))}
      </View>
    </View>
  );
}

function ModifierPicker({
  itemName,
  modifiers,
  onChange,
}: {
  itemName: string;
  modifiers: Modifiers;
  onChange: (patch: Partial<Modifiers>) => void;
}) {
  const { t, lang } = useT(cartMessages);
  return (
    <View style={{ gap: space.sm }}>
      <OptionRow
        title={t('milk')}
        itemName={itemName}
        options={MILK_OPTIONS}
        value={modifiers.milk}
        label={(milk) => milkLabel(milk, lang)}
        onChange={(milk) => onChange({ milk })}
      />
      <OptionRow
        title={t('sweetness')}
        itemName={itemName}
        options={SWEETNESS_OPTIONS}
        value={modifiers.sweetness}
        label={(sweetness) => sweetnessLabel(sweetness, lang)}
        onChange={(sweetness) => onChange({ sweetness })}
      />
      <OptionRow
        title={t('ice')}
        itemName={itemName}
        options={ICE_OPTIONS}
        value={modifiers.ice}
        label={(ice) => iceLabel(ice, lang)}
        onChange={(ice) => onChange({ ice })}
      />
    </View>
  );
}

/** `disabledReason` (e.g. offline) blocks placing orders and is shown as text. */
export function CartPanel({
  session,
  disabledReason = null,
}: {
  session: Session;
  disabledReason?: string | null;
}) {
  const lines = useCart((state) => state.lines);
  const error = useCart((state) => state.errorMessage);
  const notice = useCart((state) => state.noticeMessage);
  const warning = useCart((state) => state.warningMessage);
  const prefilled = useCart((state) => state.prefilled);
  const { setQuantity, setNote, setModifiers, removeLine, submit } = useCart(
    (s) => s,
  );
  const { t, lang } = useT(cartMessages);
  const { ready } = useLoyaltyReady();
  // Saved allergy comes from the loyalty state (read-only). Members only.
  const allergyNote = useLoyalty((state) =>
    isMember(state, session.venueId)
      ? getPreferences(state, session.venueId).allergyNote.trim()
      : '',
  );
  return (
    <Card variant="subtle">
      <View style={styles.rowBetween}>
        <Heading>{t('cartTitle')}</Heading>
        <Badge label={`${lines.length} line(s)`} tone="info" />
      </View>

      {allergyNote !== '' && (
        <Banner tone="warning" role="alert">
          {t('allergySent')}
        </Banner>
      )}

      {prefilled && lines.length > 0 && (
        <Text style={[styles.textStrong, { color: colors.green }]}>
          {t('prefilled')}
        </Text>
      )}

      {lines.length === 0 && (
        <Text style={styles.text}>{t('cartEmptyHint')}</Text>
      )}

      {lines.map((line) => {
        const key = lineKey(line);
        return (
          <View
            key={key}
            style={{
              gap: space.md,
              padding: space.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={styles.subheading}>
              {line.name} · {formatMoney(line.unitPrice * line.quantity)}
            </Text>
            {line.modifiers && (
              <>
                <Text style={styles.caption}>
                  {formatModifiers(line.modifiers, lang)}
                </Text>
                <ModifierPicker
                  itemName={line.name}
                  modifiers={line.modifiers}
                  onChange={(patch) => setModifiers(key, patch)}
                />
              </>
            )}
            <View style={styles.row}>
              <Button
                size="sm"
                label="−"
                onPress={() => setQuantity(key, line.quantity - 1)}
              />
              <Text
                accessibilityLabel={t('quantity', { n: line.quantity })}
                style={[
                  styles.textStrong,
                  {
                    minWidth: 28,
                    textAlign: 'center',
                    fontVariant: ['tabular-nums'],
                  },
                ]}
              >
                {line.quantity}
              </Text>
              <Button
                size="sm"
                label="+"
                disabled={line.quantity >= MAX_LINE_QUANTITY}
                onPress={() => setQuantity(key, line.quantity + 1)}
              />
              <Button
                size="sm"
                variant="danger"
                label={t('removeItem', { name: line.name })}
                onPress={() => removeLine(key)}
              />
            </View>
            <TextInput
              placeholderTextColor={colors.subtle}
              accessibilityLabel={t('noteLabel', { name: line.name })}
              placeholder={t('notePlaceholder')}
              maxLength={MAX_NOTE_LENGTH}
              defaultValue={line.note}
              onChangeText={(text) => setNote(key, text)}
              style={styles.input}
            />
          </View>
        );
      })}

      {lines.length > 0 && (
        <>
          <Divider />
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>{t('estimatedTotal')}</Text>
            <Heading>{formatMoney(cartTotal(lines))}</Heading>
          </View>
          <Text style={styles.caption}>{t('optionsNote')}</Text>
        </>
      )}

      {error && (
        <Text
          accessibilityRole="alert"
          style={[styles.textStrong, { color: colors.danger }]}
        >
          {cartText(error, lang)}
        </Text>
      )}
      {warning && (
        <Text
          accessibilityRole="alert"
          style={[styles.textStrong, { color: colors.danger }]}
        >
          {cartText(warning, lang)}
        </Text>
      )}
      {notice && !error && (
        <Text
          accessibilityRole="alert"
          style={[styles.textStrong, { color: colors.green }]}
        >
          {cartText(notice, lang)}
        </Text>
      )}
      {!ready && <Text style={styles.text}>{t('loadingMember')}</Text>}
      {disabledReason ? (
        <Text style={styles.text}>{disabledReason}</Text>
      ) : null}

      <Button
        variant="primary"
        fullWidth
        label={t('placeOrder')}
        disabled={lines.length === 0 || !ready || disabledReason !== null}
        onPress={() => submit(session)}
      />
    </Card>
  );
}
