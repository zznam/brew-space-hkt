import { Pressable, Text, TextInput, View } from 'react-native';
import { formatMoney, type Session } from '@/core';
import { Button, colors, Heading, styles } from '@/components/ui';
import {
  getPreferences,
  isMember,
  MILK_OPTIONS,
  SWEETNESS_OPTIONS,
} from '../loyalty/loyaltyModel';
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
        { paddingHorizontal: 12, paddingVertical: 10 },
        selected && styles.selected,
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <Text
        style={{ color: selected ? 'white' : colors.ink, fontWeight: '600' }}
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
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.text}>{title}</Text>
      <View style={styles.row}>
        {options.map((option) => (
          <ChoiceButton
            key={option}
            label={label(option)}
            selected={option === value}
            onPress={() => onChange(option)}
            accessibilityLabel={`${title} ${label(option)} for ${itemName}`}
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
  return (
    <View style={{ gap: 8 }}>
      <OptionRow
        title="Milk"
        itemName={itemName}
        options={MILK_OPTIONS}
        value={modifiers.milk}
        label={milkLabel}
        onChange={(milk) => onChange({ milk })}
      />
      <OptionRow
        title="Sweetness"
        itemName={itemName}
        options={SWEETNESS_OPTIONS}
        value={modifiers.sweetness}
        label={sweetnessLabel}
        onChange={(sweetness) => onChange({ sweetness })}
      />
      <OptionRow
        title="Ice"
        itemName={itemName}
        options={ICE_OPTIONS}
        value={modifiers.ice}
        label={iceLabel}
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
  const error = useCart((state) => state.error);
  const notice = useCart((state) => state.notice);
  const warning = useCart((state) => state.warning);
  const prefilled = useCart((state) => state.prefilled);
  const { setQuantity, setNote, setModifiers, removeLine, submit } = useCart(
    (s) => s,
  );
  const { ready } = useLoyaltyReady();
  // Saved allergy comes from the loyalty state (read-only). Members only.
  const allergyNote = useLoyalty((state) =>
    isMember(state, session.venueId)
      ? getPreferences(state, session.venueId).allergyNote.trim()
      : '',
  );
  return (
    <View style={{ gap: 10 }}>
      <Heading>Your cart</Heading>
      {allergyNote !== '' && (
        <Text accessibilityRole="alert" style={{ color: colors.ink }}>
          Your allergy note is sent to staff with every order.
        </Text>
      )}
      {prefilled && lines.length > 0 && (
        <Text style={styles.text}>Prefilled from your saved preferences</Text>
      )}
      {lines.length === 0 && (
        <Text style={styles.text}>
          Your cart is empty. Add something from the menu.
        </Text>
      )}
      {lines.map((line) => {
        const key = lineKey(line);
        return (
          <View
            key={key}
            style={{
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 10,
            }}
          >
            <Text style={{ color: colors.ink, fontWeight: '600' }}>
              {line.name} · {formatMoney(line.unitPrice * line.quantity)}
            </Text>
            {line.modifiers && (
              <>
                <Text style={styles.text}>
                  {formatModifiers(line.modifiers)}
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
                label="−"
                onPress={() => setQuantity(key, line.quantity - 1)}
              />
              <Text
                accessibilityLabel={`Quantity ${line.quantity}`}
                style={{ color: colors.ink, minWidth: 24, textAlign: 'center' }}
              >
                {line.quantity}
              </Text>
              <Button
                label="+"
                disabled={line.quantity >= MAX_LINE_QUANTITY}
                onPress={() => setQuantity(key, line.quantity + 1)}
              />
              <Button
                label={`Remove ${line.name}`}
                onPress={() => removeLine(key)}
              />
            </View>
            <TextInput
              accessibilityLabel={`Note for ${line.name}`}
              placeholder="Note (e.g. less sugar)"
              maxLength={MAX_NOTE_LENGTH}
              defaultValue={line.note}
              onChangeText={(text) => setNote(key, text)}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: colors.ink,
              }}
            />
          </View>
        );
      })}
      {lines.length > 0 && (
        <>
          <Text style={styles.text}>Estimated total</Text>
          <Heading>{formatMoney(cartTotal(lines))}</Heading>
          <Text style={styles.text}>
            Options do not change the price. The bill is calculated by the demo
            core.
          </Text>
        </>
      )}
      {error && (
        <Text accessibilityRole="alert" style={{ color: '#a23b2a' }}>
          {error}
        </Text>
      )}
      {warning && (
        <Text accessibilityRole="alert" style={{ color: '#a23b2a' }}>
          {warning}
        </Text>
      )}
      {notice && !error && (
        <Text accessibilityRole="alert" style={styles.text}>
          {notice}
        </Text>
      )}
      {!ready && (
        <Text style={styles.text}>Loading your saved member data…</Text>
      )}
      {disabledReason ? (
        <Text style={styles.text}>{disabledReason}</Text>
      ) : null}
      <Button
        label="Place order"
        disabled={lines.length === 0 || !ready || disabledReason !== null}
        onPress={() => submit(session)}
      />
    </View>
  );
}
