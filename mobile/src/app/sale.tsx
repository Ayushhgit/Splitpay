import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Key } from '@/components/keys';
import { AppBar, CollectionStrip } from '@/components/panels';
import { Stub } from '@/components/stub';
import { formatInrTrim } from '@/lib/money';
import { type Leg, type Sale, type Settings, paidPaise, repo } from '@/lib/store';
import { C, F } from '@/lib/theme';
import { buildUpiUri } from '@/lib/upi';

export default function SaleDeck() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [missing, setMissing] = useState(false);
  const [tearing, setTearing] = useState<Leg | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const [stamp] = useState(() => new Animated.Value(0));
  const [tear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    void Promise.all([repo.getSale(String(id)), repo.getSettings()]).then(
      ([s, cfg]) => {
        setSettings(cfg);
        if (s) setSale(s);
        else setMissing(true);
      }
    );
  }, [id]);

  const focused = useMemo(
    () => sale?.legs.find((l) => l.status === 'pending') ?? null,
    [sale]
  );

  const markPaid = useCallback(async () => {
    if (!sale || !focused || tearing) return;
    const leg = focused;
    setTearing(leg);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const next = await repo.confirmLeg({
      saleId: sale.id,
      legId: leg.id,
      status: 'paid',
      confirmedBy: 'manual',
    });
    setSale(next);

    // Stamped, then torn off: the one moment the app makes a show of, because
    // it is the one that means a payment landed.
    stamp.setValue(0);
    tear.setValue(0);
    Animated.sequence([
      Animated.timing(stamp, {
        toValue: 1,
        duration: 210,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(tear, {
        toValue: 1,
        duration: 330,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      tear.setValue(0);
      stamp.setValue(0);
      setTearing(null);
    });
  }, [sale, focused, tearing, stamp, tear]);

  async function undoLeg(leg: Leg) {
    if (!sale || leg.status !== 'paid' || tearing) return;
    setSale(
      await repo.confirmLeg({
        saleId: sale.id,
        legId: leg.id,
        status: 'pending',
        confirmedBy: 'manual',
      })
    );
  }

  async function cancelMemo() {
    if (!sale) return;
    await repo.voidSale(sale.id);
    router.replace('/ledger');
  }

  const onBox = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ w: width, h: height });
  };

  if (missing) {
    return (
      <View testID="screen-sale" style={[s.screen, { paddingTop: insets.top + 4 }]}>
        <AppBar heading="Memo" back={{ href: '/', label: 'Counter' }} />
        <Text style={s.body}>
          This memo is not on this device. The ledger is kept per device, so a
          memo made on another phone will not appear here.
        </Text>
      </View>
    );
  }

  if (!sale || !settings) {
    return (
      <View testID="screen-sale" style={[s.screen, { paddingTop: insets.top + 4 }]}>
        <AppBar heading="Memo" back={{ href: '/', label: 'Counter' }} />
      </View>
    );
  }

  const collected = paidPaise(sale);
  const settled = sale.status === 'paid';

  // The code takes the space the stub was given, less its own furniture.
  const codeSize = Math.max(
    140,
    Math.min(Math.floor(box.w) - 72, Math.floor(box.h) - 170, 360)
  );

  const uriFor = (leg: Leg) =>
    buildUpiUri({
      payee: { vpa: settings.vpa, payeeName: settings.payeeName },
      amountPaise: leg.amountPaise,
      note: leg.note,
      ref: leg.ref,
    });

  return (
    <View
      testID="screen-sale"
      style={[
        s.screen,
        { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <AppBar heading="Memo" back={{ href: '/', label: 'Counter' }} />

      <CollectionStrip
        invoiceLabel={sale.invoiceLabel}
        totalPaise={sale.totalPaise}
        paidPaise={collected}
        legs={sale.legs}
        onUndo={undoLeg}
      />

      {settled && !tearing ? (
        <View style={s.settled}>
          <View style={s.settledPaper}>
            <Text style={s.stampText}>PAID</Text>
            <Text style={s.settledNote}>
              {formatInrTrim(sale.totalPaise)} collected across{' '}
              {sale.legs.length} stubs of memo {sale.invoiceLabel}.
              {sale.savingPaise > 0
                ? ` ${formatInrTrim(sale.savingPaise)} kept.`
                : ''}
            </Text>
          </View>
          <Key
            tone="commit"
            onPress={() =>
              router.replace({ pathname: '/receipt', params: { id: sale.id } })
            }
            style={{ minHeight: 56 }}
          >
            See the memo
          </Key>
          <Key tone="quiet" onPress={() => router.replace('/')} style={{ minHeight: 56 }}>
            Next sale
          </Key>
        </View>
      ) : (
        <>
          {/*
            Two layers, as on the web. The stub that was just paid tears away
            on top; the next one is already in place underneath, so the tear
            reveals it rather than replacing it.

            Collapsing these into one layer animated the wrong stub: the ledger
            is written before the animation runs, so `focused` has already moved
            on by the time the tear starts.
          */}
          <View style={s.stage} onLayout={onBox}>
            {focused && box.w > 0 ? (
              <Stub
                key={focused.id}
                leg={focused}
                count={sale.legs.length}
                invoiceLabel={sale.invoiceLabel}
                upiUri={uriFor(focused)}
                size={codeSize}
                feeding={focused.seq > 1}
              />
            ) : null}

            {tearing && box.w > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  s.tearLayer,
                  {
                    opacity: tear.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                    transform: [
                      {
                        translateY: tear.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -260],
                        }),
                      },
                      {
                        rotate: tear.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '-3deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Stub
                  leg={tearing}
                  count={sale.legs.length}
                  invoiceLabel={sale.invoiceLabel}
                  upiUri={uriFor(tearing)}
                  size={codeSize}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    s.stampLayer,
                    {
                      opacity: stamp,
                      transform: [
                        { rotate: '-8deg' },
                        {
                          scale: stamp.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1.7, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={s.stampText}>PAID</Text>
                </Animated.View>
              </Animated.View>
            ) : null}
          </View>

          <Key
            tone="commit"
            onPress={markPaid}
            disabled={!focused || tearing !== null}
            style={{ minHeight: 60 }}
          >
            {focused ? `Mark stub ${focused.seq} paid` : 'All stubs marked'}
          </Key>
          <Key
            tone="quiet"
            onPress={() => (confirmCancel ? cancelMemo() : setConfirmCancel(true))}
            style={s.cancel}
          >
            <Text style={s.cancelText}>
              {confirmCancel ? 'Tap again to cancel this memo' : 'Cancel memo'}
            </Text>
          </Key>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.machine,
    paddingHorizontal: 12,
    gap: 10,
  },
  stage: { flex: 1, justifyContent: 'center' },
  tearLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
  },
  body: {
    color: C.chromeSoft,
    fontFamily: F.machine,
    fontSize: 15,
    marginTop: 24,
    lineHeight: 22,
  },
  stampLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampText: {
    color: C.violet,
    fontFamily: F.machineBold,
    fontSize: 30,
    letterSpacing: 6,
    borderWidth: 4,
    borderColor: C.violet,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(252,250,244,0.72)',
  },
  settled: { flex: 1, justifyContent: 'center', gap: 12 },
  settledPaper: {
    backgroundColor: C.paper,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 16,
  },
  settledNote: {
    color: C.inkSoft,
    fontFamily: F.paper,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  cancel: { minHeight: 44, borderWidth: 0, borderBottomWidth: 0 },
  cancelText: { color: C.chromeFaint, fontFamily: F.machineBold, fontSize: 14 },
});
