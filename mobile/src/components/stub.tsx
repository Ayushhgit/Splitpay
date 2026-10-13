import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Path } from 'react-native-svg';
import { formatInrTrim } from '@/lib/money';
import type { Leg } from '@/lib/store';
import { C, F } from '@/lib/theme';

const TOOTH = 11;

/**
 * The torn edge of the paper.
 *
 * On the web this is a CSS mask; here it is a run of triangles drawn in SVG
 * over the body colour, which gets the same read without the paper needing to
 * be a clipped layer.
 */
function TornEdge({ flip = false }: { flip?: boolean }) {
  const teeth = 40;
  const w = 100 / teeth;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const x = i * w;
    d += `M${x} 0 L${x + w / 2} 1 L${x + w} 0 Z`;
  }
  return (
    <Svg
      width="100%"
      height={TOOTH}
      viewBox={`0 0 100 1`}
      preserveAspectRatio="none"
      style={flip ? s.edgeTop : s.edgeBottom}
    >
      <Path d={d} fill={C.machine} />
    </Svg>
  );
}

/**
 * One stub, torn from one memo: its position, its amount, the code to scan,
 * and the reference that will show up on the bank statement.
 *
 * Bright paper on the dark machine. This is held up across a counter and is
 * the only thing the customer is asked to look at.
 */
export function Stub({
  leg,
  count,
  upiUri,
  invoiceLabel,
  size,
  feeding = false,
}: {
  leg: Leg;
  count: number;
  upiUri: string;
  invoiceLabel: string;
  /** Side of the code in points, measured from the space the stub was given. */
  size: number;
  /** The stub that just advanced into place feeds up out of the book. */
  feeding?: boolean;
}) {
  const [rise] = useState(() => new Animated.Value(feeding ? 1 : 0));

  useEffect(() => {
    if (!feeding) return;
    rise.setValue(1);
    Animated.timing(rise, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [feeding, leg.id, rise]);

  return (
    <Animated.View
      style={[
        s.wrap,
        {
          opacity: rise.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            {
              translateY: rise.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 22],
              }),
            },
          ],
        },
      ]}
    >
      <TornEdge flip />
      <View style={s.paper}>
        <View style={s.head}>
          <Text style={s.seq}>
            Stub {leg.seq} of {count}
          </Text>
          <Text style={s.amount}>{formatInrTrim(leg.amountPaise)}</Text>
        </View>

        <View style={s.rule} />

        <View
          style={s.codeBox}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Scan to pay ${formatInrTrim(leg.amountPaise)}, stub ${leg.seq} of ${count} of memo ${invoiceLabel}`}
        >
          <QRCode
            value={upiUri}
            size={size}
            color={C.ink}
            backgroundColor={C.paper}
            ecl="M"
          />
        </View>

        <View style={s.foot}>
          <Text style={s.ref}>{leg.ref}</Text>
          <Text style={s.ref}>{leg.note}</Text>
        </View>
      </View>
      <TornEdge />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%' },
  paper: { backgroundColor: C.paper, paddingHorizontal: 20, paddingVertical: 4 },
  edgeTop: { backgroundColor: C.paper, transform: [{ scaleY: -1 }] },
  edgeBottom: { backgroundColor: C.paper },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  seq: { color: C.cyanDeep, fontFamily: F.paperBold, fontSize: 15 },
  amount: { color: C.ink, fontFamily: F.paperBold, fontSize: 30 },
  rule: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.paperRule,
    marginVertical: 12,
  },
  codeBox: { alignItems: 'center', justifyContent: 'center' },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  ref: {
    color: C.inkFaint,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
});
