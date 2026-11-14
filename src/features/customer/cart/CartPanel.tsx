import { Text, TextInput, View } from 'react-native';
import { formatMoney, type Session } from '@/core';
import { Button, colors, Heading, styles } from '@/components/ui';
import { cartTotal, MAX_LINE_QUANTITY, MAX_NOTE_LENGTH } from './cartModel';
import { useCart } from './useCart';

export function CartPanel({ session }: { session: Session }) {
  const lines = useCart((state) => state.lines);
  const error = useCart((state) => state.error);
  const notice = useCart((state) => state.notice);
  const { setQuantity, setNote, removeLine, submit } = useCart((s) => s);
  return (
    <View style={{ gap: 10 }}>
      <Heading>Your cart</Heading>
      {lines.length === 0 && (
        <Text style={styles.text}>
          Your cart is empty. Add something from the menu.
        </Text>
      )}
      {lines.map((line) => (
        <View
          key={line.menuItemId}
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
          <View style={styles.row}>
            <Button
              label="−"
              onPress={() => setQuantity(line.menuItemId, line.quantity - 1)}
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
              onPress={() => setQuantity(line.menuItemId, line.quantity + 1)}
            />
            <Button
              label={`Remove ${line.name}`}
              onPress={() => removeLine(line.menuItemId)}
            />
          </View>
          <TextInput
            accessibilityLabel={`Note for ${line.name}`}
            placeholder="Note (e.g. less sugar)"
            maxLength={MAX_NOTE_LENGTH}
            defaultValue={line.note}
            onChangeText={(text) => setNote(line.menuItemId, text)}
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
      ))}
      {lines.length > 0 && (
        <>
          <Text style={styles.text}>Estimated total</Text>
          <Heading>{formatMoney(cartTotal(lines))}</Heading>
        </>
      )}
      {error && (
        <Text accessibilityRole="alert" style={{ color: '#a23b2a' }}>
          {error}
        </Text>
      )}
      {notice && !error && (
        <Text accessibilityRole="alert" style={styles.text}>
          {notice}
        </Text>
      )}
      <Button
        label="Place order"
        disabled={lines.length === 0}
        onPress={() => submit(session)}
      />
    </View>
  );
}
