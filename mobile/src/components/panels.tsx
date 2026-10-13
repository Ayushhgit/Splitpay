import { Link } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MDR } from '@/lib/mdr';
import { formatInrTrim } from '@/lib/money';
import type { SplitResult } from '@/lib/split';
import type { Leg } from '@/lib/store';
import { C, F, RADIUS } from '@/lib/theme';

/** A panel sunk into the machine, where the lit figures live. */
export function Display({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[s.display, style]}>{children}</View>;
}

/** Near-invisible chrome: where you are, and the ways out. */
export function AppBar({
  heading,
  back,
}: {
  heading: string;
  back?: { href: string; label: string };
}) {
  return (
    <View style={s.bar}>
      {back ? (
        <Link href={back.href as never} asChild>
          <Pressable accessibilityRole="link" style={s.barTap}>
            <Text style={[s.label, { color: C.cyan }]}>{back.label}</Text>
          </Pressable>
        </Link>
      ) : (
        <Text style={[s.label, s.barTap]}>{heading}</Text>
      )}
      <View style={s.nav}>
        {back?.label === 'Ledger' ? null : (
          <Link href="/ledger" asChild>
            <Pressable accessibilityRole="link" style={s.barTap}>
              <Text style={s.label}>Ledger</Text>
            </Pressable>
          </Link>
        )}
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="link" style={s.barTap}>
            <Text style={s.label}>Settings</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

/**
 * What the split is worth, recomputed on every keystroke. The per-scan figure
 * sits beside the total because past the Rs 300 cap each extra scan is worth
 * less, and the merchant should see that before committing.
 */
export function SavingsStrip({ split }: { split: SplitResult }) {
  if (split.totalPaise === 0) {
    return (
      <Text style={s.soft}>
        Stubs of {formatInrTrim(MDR.exemptUpToPaise)} or less carry no MDR.
      </Text>
    );
  }
  if (!split.isSplit) {
    return (
      <Text style={s.soft}>
        No MDR applies at {formatInrTrim(split.totalPaise)}. One code is enough.
      </Text>
    );
  }

  /*
    A stub tops out at Rs 2,000, so a scan is worth at most 0.4% of that —
    about Rs 8 — however large the sale. Only the Rs 300 cap makes it worse,
    because the saving stops growing while the scans keep coming.
  */
  const capped = split.unsplitMdrPaise >= MDR.capPaise;
  const thin = capped && split.savingPerLegPaise < 500;

  return (
    <View style={{ gap: 4 }}>
      <View style={s.row}>
        <Text style={s.kept}>
          {formatInrTrim(split.savingPaise)}
          <Text style={s.keptWord}> kept</Text>
        </Text>
        <Text style={s.soft}>
          {formatInrTrim(split.savingPerLegPaise)} a scan
        </Text>
      </View>
      {thin ? (
        <Text style={s.faint}>
          MDR stops at {formatInrTrim(MDR.capPaise)} however large the sale, so
          these {split.legCount} scans are worth only{' '}
          {formatInrTrim(split.savingPerLegPaise)} each. Taking this as one
          payment may be worth the fee.
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Everything about the memo in one panel: which memo, what it is worth, how
 * much is in, and which stubs are done.
 *
 * A hundred-thousand-rupee sale is fifty stubs, so the chips scroll sideways
 * rather than wrapping into five rows and eating the screen. Each stays a full
 * thumb target.
 */
export function CollectionStrip({
  invoiceLabel,
  totalPaise,
  paidPaise,
  legs,
  onUndo,
}: {
  invoiceLabel: string;
  totalPaise: number;
  paidPaise: number;
  legs: Leg[];
  onUndo: (leg: Leg) => void;
}) {
  const pct = totalPaise === 0 ? 0 : Math.round((paidPaise / totalPaise) * 100);
  const left = totalPaise - paidPaise;
  const paidLegs = legs.filter((l) => l.status === 'paid').length;

  return (
    <Display style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
      <View style={s.row}>
        <Text style={s.memo}>Memo {invoiceLabel}</Text>
        <Text style={s.total}>{formatInrTrim(totalPaise)}</Text>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ now: pct, min: 0, max: 100 }}
        style={s.rail}
      >
        <View style={[s.railFill, { width: `${pct}%` }]} />
      </View>

      <View style={s.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingRight: 8 }}
          style={{ flexShrink: 1 }}
        >
          {legs.map((leg) => (
            <Pressable
              key={leg.id}
              accessibilityRole="button"
              accessibilityLabel={
                leg.status === 'paid'
                  ? `Stub ${leg.seq} is paid. Undo it`
                  : `Stub ${leg.seq} is not paid yet`
              }
              disabled={leg.status !== 'paid'}
              onPress={() => onUndo(leg)}
              style={[s.pip, leg.status === 'paid' ? s.pipPaid : s.pipOpen]}
            >
              <Text
                style={leg.status === 'paid' ? s.pipTextPaid : s.pipTextOpen}
              >
                {leg.seq}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ marginLeft: 'auto' }}>
          {left > 0 ? (
            <>
              <Text style={s.left}>{formatInrTrim(left)} left</Text>
              <Text style={[s.faint, { textAlign: 'right' }]}>
                {paidLegs} of {legs.length} in
              </Text>
            </>
          ) : (
            <Text style={[s.left, { color: C.cyan }]}>Memo settled</Text>
          )}
        </View>
      </View>
    </Display>
  );
}

const s = StyleSheet.create({
  display: {
    backgroundColor: C.recessed,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: RADIUS.panel,
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barTap: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  nav: { flexDirection: 'row', alignItems: 'center' },
  label: {
    color: C.chromeSoft,
    fontFamily: F.machineBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  memo: { color: C.cyan, fontFamily: F.machineBold, fontSize: 15 },
  total: {
    color: C.chrome,
    fontFamily: F.machineBold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  rail: {
    height: 8,
    borderRadius: 999,
    backgroundColor: C.edge,
    overflow: 'hidden',
  },
  railFill: { height: '100%', borderRadius: 999, backgroundColor: C.cyan },
  pip: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipPaid: { backgroundColor: C.cyan },
  pipOpen: { borderWidth: 1, borderColor: C.edge },
  pipTextPaid: { color: C.machine, fontFamily: F.machineBold, fontSize: 15 },
  pipTextOpen: { color: C.chromeFaint, fontFamily: F.machineBold, fontSize: 15 },
  left: {
    color: C.chromeSoft,
    fontFamily: F.machineBold,
    fontSize: 14,
    textAlign: 'right',
  },
  kept: {
    color: C.magenta,
    fontFamily: F.machineBold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  keptWord: { fontSize: 14, color: C.magenta },
  soft: { color: C.chromeSoft, fontFamily: F.machine, fontSize: 14 },
  faint: { color: C.chromeFaint, fontFamily: F.machine, fontSize: 13 },
});
