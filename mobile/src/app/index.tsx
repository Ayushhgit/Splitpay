import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountPad } from '@/components/amount-pad';
import { Key } from '@/components/keys';
import { AppBar, Display, SavingsStrip } from '@/components/panels';
import { MDR } from '@/lib/mdr';
import {
  type AmountDraft,
  backspace,
  draftDisplay,
  draftToPaise,
  emptyDraft,
  formatInrTrim,
  pushDecimal,
  pushDigit,
} from '@/lib/money';
import { type SplitMode, splitSale } from '@/lib/split';
import { type Settings, repo } from '@/lib/store';
import { C, F } from '@/lib/theme';
import { isValidVpa } from '@/lib/upi';

export default function Counter() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<AmountDraft>(emptyDraft);
  const [mode, setMode] = useState<SplitMode>('maxfill');
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState<string | null>(null);

  // Re-read on focus: the invoice number moves on when a memo is made, and
  // settings may have changed while this screen sat in the stack.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void repo.getSettings().then((s) => {
        if (!alive) return;
        setSettings(s);
        setMode(s.defaultSplitMode);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  const totalPaise = draftToPaise(draft);
  const split = useMemo(() => splitSale(totalPaise, mode), [totalPaise, mode]);
  const ready = settings !== null && isValidVpa(settings.vpa);

  async function startSale() {
    if (!ready || totalPaise === 0 || busy) return;
    setBusy(true);
    setFault(null);
    try {
      const sale = await repo.createSale({ totalPaise, splitMode: mode });
      setDraft(emptyDraft);
      router.push({ pathname: '/sale', params: { id: sale.id } });
    } catch (e) {
      // A memo that cannot be written must say so. Silently doing nothing
      // leaves the merchant tapping a dead key with a customer waiting.
      setFault(e instanceof Error ? e.message : 'Could not start this memo.');
    } finally {
      setBusy(false);
    }
  }

  const shown = draftDisplay(draft);
  const [whole, paise] = shown.split('.');

  return (
    <View
      testID="screen-counter"
      style={[
        s.screen,
        { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <AppBar heading="Counter" />

      <View style={s.middle}>
        <Display style={s.panel}>
          <View style={s.headRow}>
            <Text style={s.memo}>
              {settings
                ? `Memo ${settings.invoicePrefix}${settings.nextInvoiceNo}`
                : 'Memo'}
            </Text>
            {split.isSplit ? (
              <Text style={s.soft}>
                {split.legCount} stubs of {formatInrTrim(MDR.exemptUpToPaise)} or
                less
              </Text>
            ) : null}
          </View>

          <View style={s.amountRow}>
            <Text style={s.rupee}>₹</Text>
            <Text style={s.figure} numberOfLines={1} adjustsFontSizeToFit>
              {whole}
              {paise !== undefined ? <Text style={s.paise}>.{paise}</Text> : null}
            </Text>
          </View>

          <View style={s.rule} />
          {fault ? <Text style={s.fault}>{fault}</Text> : null}
          <SavingsStrip split={split} />

          {split.isSplit ? (
            <View style={s.divideRow}>
              <Text style={s.label}>Divide</Text>
              {(
                [
                  ['maxfill', 'into 2,000s'],
                  ['equal', 'evenly'],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode === value }}
                  onPress={() => setMode(value)}
                  style={[s.toggle, mode === value && s.toggleOn]}
                >
                  <Text style={mode === value ? s.toggleTextOn : s.toggleText}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Display>

        <AmountPad
          onDigit={(d) => setDraft((p) => pushDigit(p, d))}
          onDecimal={() => setDraft(pushDecimal)}
          onBackspace={() => setDraft(backspace)}
          onClear={() => setDraft(emptyDraft)}
        />

        <Key
          tone="commit"
          disabled={!ready || totalPaise === 0 || busy}
          onPress={ready ? startSale : () => router.push('/settings')}
          style={{ minHeight: 60 }}
          label={ready ? 'Tear into stubs' : 'Add your UPI ID to start'}
        >
          {!ready
            ? 'Add your UPI ID to start'
            : totalPaise === 0
              ? 'Enter an amount'
              : split.isSplit
                ? `Tear into ${split.legCount} stubs`
                : 'Show one code'}
        </Key>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.machine, paddingHorizontal: 12 },
  middle: { flex: 1, justifyContent: 'center', gap: 10 },
  panel: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  memo: { color: C.cyan, fontFamily: F.machineBold, fontSize: 15 },
  soft: { color: C.chromeSoft, fontFamily: F.machine, fontSize: 13, flexShrink: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  rupee: {
    color: C.cyan,
    fontFamily: F.machineBold,
    fontSize: 22,
    marginTop: 10,
  },
  figure: {
    flex: 1,
    color: C.paper,
    fontFamily: F.machineBold,
    fontSize: 56,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  paise: { color: C.chromeSoft, fontSize: 28 },
  rule: { borderTopWidth: 1, borderColor: C.edge },
  divideRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: C.chromeSoft, fontFamily: F.machineBold, fontSize: 13 },
  toggle: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.edge,
  },
  toggleOn: { borderColor: C.cyan },
  toggleText: { color: C.chromeSoft, fontFamily: F.machine, fontSize: 14 },
  toggleTextOn: { color: C.cyan, fontFamily: F.machineBold, fontSize: 14 },
  fault: { color: C.magenta, fontFamily: F.machine, fontSize: 13, lineHeight: 19 },
});
