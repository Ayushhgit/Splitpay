import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Key } from '@/components/keys';
import { AppBar, Display } from '@/components/panels';
import { MDR } from '@/lib/mdr';
import { formatInrTrim } from '@/lib/money';
import {
  type MonthTotals,
  type Sale,
  monthKey,
  paidPaise,
  repo,
} from '@/lib/store';
import { C, F } from '@/lib/theme';
import { shareLedgerCsv } from './receipt';

const day = (at: number) =>
  new Date(at).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

const monthName = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

/*
  Four clearing choices rather than one button, because "clear the ledger" is
  usually one of the tidier three and only sometimes the whole lot.
*/
const CHOICES = [
  {
    id: 'cancelled',
    label: 'Cancelled memos',
    detail: 'Memos that were called off. No money ever moved against them.',
    pick: (sales: Sale[]) => sales.filter((s) => s.status === 'void'),
  },
  {
    id: 'older',
    label: 'Settled memos before this month',
    detail: 'Already collected and closed in an earlier month. Share the CSV first.',
    pick: (sales: Sale[]) =>
      sales.filter(
        (s) => s.status === 'paid' && monthKey(s.createdAt) !== monthKey()
      ),
  },
  {
    id: 'all',
    label: 'Every memo',
    detail: 'The whole ledger. UPI ID, settings and the next memo number stay.',
    pick: (sales: Sale[]) => sales,
  },
  {
    id: 'reset',
    label: 'Everything, including settings',
    detail: 'Back to a blank device. For handing this phone on.',
    pick: (sales: Sale[]) => sales,
    full: true,
  },
] as const;

export default function Ledger() {
  const insets = useSafeAreaInsets();
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [totals, setTotals] = useState<MonthTotals | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(() => {
    const now = monthKey();
    setMonth(now);
    void repo.listSales(60).then(setSales);
    void repo.monthTotals(now).then(setTotals);
  }, []);

  useFocusEffect(load);

  async function run(choice: (typeof CHOICES)[number]) {
    if (!sales) return;
    const picked = choice.pick(sales);
    if ('full' in choice && choice.full) await repo.resetEverything();
    else if (choice.id === 'all') await repo.clearSales();
    else await repo.deleteSales(picked.map((s) => s.id));
    setConfirming(null);
    setDone(
      'full' in choice && choice.full
        ? 'Device cleared. Add your UPI ID again in settings.'
        : `${picked.length} ${picked.length === 1 ? 'memo' : 'memos'} removed.`
    );
    load();
  }

  const under = (totals?.receivedPaise ?? 0) < MDR.monthlyExemptPaise;
  const pct = Math.min(
    100,
    Math.round(((totals?.receivedPaise ?? 0) / MDR.monthlyExemptPaise) * 100)
  );

  return (
    <View testID="screen-ledger" style={[s.screen, { paddingTop: insets.top + 4 }]}>
      <AppBar heading="Ledger" back={{ href: '/', label: 'Counter' }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 28, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {totals && month ? (
          <Display style={s.panel}>
            <View style={s.row}>
              <Text style={s.memo}>{monthName(month)}</Text>
              <Text style={s.soft}>
                {formatInrTrim(totals.receivedPaise)} of{' '}
                {formatInrTrim(MDR.monthlyExemptPaise)}
              </Text>
            </View>
            <View style={s.rail}>
              <View
                style={[
                  s.railFill,
                  { width: `${pct}%`, backgroundColor: under ? C.cyan : C.magenta },
                ]}
              />
            </View>
            <Text style={s.soft}>
              {under
                ? `Under ${formatInrTrim(MDR.monthlyExemptPaise)} a month, UPI QR receipts into your own account carry no MDR. Splitting is not saving you anything yet.`
                : `Past ${formatInrTrim(MDR.monthlyExemptPaise)} this month, so MDR applies to merchant payments above ${formatInrTrim(MDR.exemptUpToPaise)}.`}{' '}
              This counts only what was recorded here, not every payment the shop
              takes.
            </Text>
            {totals.savedPaise > 0 ? (
              <Text style={s.soft}>
                <Text style={s.kept}>{formatInrTrim(totals.savedPaise)} kept</Text>{' '}
                across {totals.saleCount}{' '}
                {totals.saleCount === 1 ? 'memo' : 'memos'} this month.
              </Text>
            ) : null}
          </Display>
        ) : null}

        <Text style={s.heading}>Memos</Text>

        {sales && sales.length === 0 ? (
          <Text style={s.soft}>
            No memos yet. Enter an amount on the counter screen and the first one
            lands here.
          </Text>
        ) : null}

        {(sales ?? []).map((sale) => {
          const collected = paidPaise(sale);
          return (
            <Pressable
              key={sale.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: sale.status === 'paid' ? '/receipt' : '/sale',
                  params: { id: sale.id },
                })
              }
              style={s.saleRow}
            >
              <View>
                <Text style={s.saleLabel}>{sale.invoiceLabel}</Text>
                <Text style={s.faint}>
                  {day(sale.createdAt)}, {sale.legs.length}{' '}
                  {sale.legs.length === 1 ? 'stub' : 'stubs'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.saleTotal}>{formatInrTrim(sale.totalPaise)}</Text>
                <Text
                  style={[
                    s.faint,
                    sale.status === 'paid'
                      ? { color: C.cyan }
                      : sale.status === 'void'
                        ? null
                        : { color: C.magenta },
                  ]}
                >
                  {sale.status === 'paid'
                    ? 'settled'
                    : sale.status === 'void'
                      ? 'cancelled'
                      : `${formatInrTrim(sale.totalPaise - collected)} left`}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <Text style={[s.heading, { color: C.magenta, marginTop: 20 }]}>
          Clearing the ledger
        </Text>
        <Text style={s.soft}>
          Memos live on this phone and nowhere else, so anything removed here is
          gone for good. Share the CSV first if these records still have to
          answer to anyone.
        </Text>

        <Key
          tone="quiet"
          onPress={() => void shareLedgerCsv()}
          disabled={!sales || sales.length === 0}
          style={{ minHeight: 54 }}
        >
          Share the ledger first
        </Key>

        {CHOICES.map((choice) => {
          const picked = sales ? choice.pick(sales) : [];
          const money = picked.reduce((sum, x) => sum + paidPaise(x), 0);
          const full = 'full' in choice && choice.full;
          const empty = picked.length === 0;
          const isConfirming = confirming === choice.id;
          return (
            <View
              key={choice.id}
              style={[s.choice, isConfirming && { borderColor: C.magenta }]}
            >
              <View style={s.row}>
                <Text style={s.choiceLabel}>{choice.label}</Text>
                <Text style={s.faint}>
                  {empty
                    ? 'nothing to remove'
                    : `${picked.length} memo${picked.length === 1 ? '' : 's'}`}
                </Text>
              </View>
              <Text style={s.faint}>{choice.detail}</Text>

              {isConfirming ? (
                <>
                  <Text style={s.warn}>
                    Removing {picked.length}{' '}
                    {picked.length === 1 ? 'memo' : 'memos'}
                    {money > 0
                      ? ` covering ${formatInrTrim(money)} collected`
                      : ''}
                    {full ? ', along with your UPI ID and memo numbering' : ''}.
                    This cannot be undone.
                  </Text>
                  <View style={s.choiceActions}>
                    <Key
                      tone="danger"
                      onPress={() => run(choice)}
                      style={{ flex: 1, minHeight: 48 }}
                    >
                      Remove
                    </Key>
                    <Key
                      tone="quiet"
                      onPress={() => setConfirming(null)}
                      style={{ flex: 1, minHeight: 48 }}
                    >
                      Keep them
                    </Key>
                  </View>
                </>
              ) : (
                <Key
                  tone="quiet"
                  disabled={empty && !full}
                  onPress={() => {
                    setDone(null);
                    setConfirming(choice.id);
                  }}
                  style={{ minHeight: 48 }}
                >
                  {empty && !full ? 'Nothing to remove' : 'Remove these'}
                </Key>
              )}
            </View>
          );
        })}

        {done ? <Text style={[s.soft, { color: C.cyan }]}>{done}</Text> : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.machine, paddingHorizontal: 12, gap: 10 },
  panel: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  memo: { color: C.cyan, fontFamily: F.machineBold, fontSize: 15 },
  heading: { color: C.chromeSoft, fontFamily: F.machineBold, fontSize: 13 },
  soft: { color: C.chromeSoft, fontFamily: F.machine, fontSize: 14, lineHeight: 21 },
  faint: { color: C.chromeFaint, fontFamily: F.machine, fontSize: 13, lineHeight: 19 },
  kept: { color: C.magenta, fontFamily: F.machineBold },
  rail: { height: 10, borderRadius: 999, backgroundColor: C.machine, overflow: 'hidden' },
  railFill: { height: '100%', borderRadius: 999 },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: C.edge,
    minHeight: 56,
  },
  saleLabel: { color: C.chrome, fontFamily: F.machineBold, fontSize: 16 },
  saleTotal: {
    color: C.chrome,
    fontFamily: F.machineBold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  choice: { borderWidth: 1, borderColor: C.edge, borderRadius: 14, padding: 14, gap: 10 },
  choiceLabel: { color: C.chrome, fontFamily: F.machineBold, fontSize: 15 },
  choiceActions: { flexDirection: 'row', gap: 10 },
  warn: { color: C.magenta, fontFamily: F.machine, fontSize: 13, lineHeight: 19 },
});
