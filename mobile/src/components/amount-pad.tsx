import { StyleSheet, Text, View } from 'react-native';
import { C, F } from '@/lib/theme';
import { Key } from './keys';

const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

/**
 * Calculator order, the way a card terminal is laid out, not phone-dialer
 * order. A long press on the back key clears the amount.
 */
export function AmountPad({
  onDigit,
  onDecimal,
  onBackspace,
  onClear,
}: {
  onDigit: (d: string) => void;
  onDecimal: () => void;
  onBackspace: () => void;
  onClear: () => void;
}) {
  return (
    <View style={s.grid}>
      {DIGITS.map((d) => (
        <Key key={d} label={d} onPress={() => onDigit(d)} style={s.cell}>
          {d}
        </Key>
      ))}
      <Key label="Decimal point" onPress={onDecimal} style={s.cell}>
        <Text style={s.dim}>.</Text>
      </Key>
      <Key label="0" onPress={() => onDigit('0')} style={s.cell}>
        0
      </Key>
      <Key
        label="Delete last digit, hold to clear"
        onPress={onBackspace}
        onLongPress={onClear}
        style={s.cell}
      >
        <Text style={s.dim}>⌫</Text>
      </Key>
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Three to a row, sized off the row rather than a fixed width, so the pad
  // fills a 360px Android and a Pro Max alike.
  cell: { width: '31.5%', flexGrow: 1, minHeight: 60 },
  dim: { color: C.chromeSoft, fontSize: 26, fontFamily: F.machine },
});
