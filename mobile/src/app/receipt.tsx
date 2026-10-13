import { File, Paths } from 'expo-file-system';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Key } from '@/components/keys';
import { AppBar } from '@/components/panels';
import { MDR } from '@/lib/mdr';
import { formatInr, formatInrTrim } from '@/lib/money';
import { type Sale, paidPaise, repo } from '@/lib/store';
import { C, F } from '@/lib/theme';

const when = (at: number) =>
  new Date(at).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/**
 * Write the ledger to a file and hand it to the system share sheet.
 *
 * expo-file-system's current API is the File class; the legacy
 * writeAsStringAsync throws at runtime in this SDK.
 */
export async function shareLedgerCsv(): Promise<string | null> {
  const csv = await repo.exportCsv();
  const file = new File(Paths.cache, 'counter-ledger.csv');
  file.create({ overwrite: true });
  file.write(csv);
  if (!(await Sharing.isAvailableAsync())) return 'Sharing is not available here.';
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Counter ledger',
    UTI: 'public.comma-separated-values-text',
  });
  return null;
}

export default function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [sale, setSale] = useState<Sale | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void repo.getSale(String(id)).then(setSale);
  }, [id]);

  if (!sale) {
    return (
      <View testID="screen-receipt" style={[s.screen, { paddingTop: insets.top + 4 }]}>
        <AppBar heading="Memo" back={{ href: '/ledger', label: 'Ledger' }} />
      </View>
    );
  }

  const collected = paidPaise(sale);

  return (
    <View testID="screen-receipt" style={[s.screen, { paddingTop: insets.top + 4 }]}>
      <AppBar heading="Memo" back={{ href: '/ledger', label: 'Ledger' }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 28, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.paper}>
          <View style={s.row}>
            <Text style={s.invoice}>{sale.invoiceLabel}</Text>
            <Text style={s.when}>{when(sale.createdAt)}</Text>
          </View>

          <Text style={s.total}>{formatInr(sale.totalPaise)}</Text>

          <Text style={s.lede}>
            One sale, one memo number, collected as {sale.legs.length}{' '}
            {sale.legs.length === 1 ? 'payment' : 'payments'}. Each stub below
            carries this memo number, so a bank statement traces back to this one
            entry.
          </Text>

          <View style={s.rule} />

          <View style={s.thead}>
            <Text style={[s.th, { flex: 1.4 }]}>Stub</Text>
            <Text style={[s.th, s.right, { flex: 1 }]}>Amount</Text>
            <Text style={[s.th, s.right, { flex: 1.2 }]}>Reference</Text>
          </View>

          {sale.legs.map((leg) => (
            <View key={leg.id} style={s.tr}>
              <View style={{ flex: 1.4 }}>
                <Text style={s.cell}>
                  {leg.seq}/{sale.legs.length}{' '}
                  <Text
                    style={leg.status === 'paid' ? s.paid : s.unpaid}
                  >
                    {leg.status === 'paid' ? 'paid' : 'unpaid'}
                  </Text>
                </Text>
                {leg.paidAt ? (
                  <Text style={s.when}>{when(leg.paidAt)}</Text>
                ) : null}
              </View>
              <Text style={[s.cell, s.right, { flex: 1 }]}>
                {formatInrTrim(leg.amountPaise)}
              </Text>
              <Text style={[s.ref, s.right, { flex: 1.2 }]}>{leg.ref}</Text>
            </View>
          ))}

          <View style={[s.tr, s.totalRow]}>
            <Text style={[s.cell, { flex: 1.4 }]}>Collected</Text>
            <Text style={[s.cell, s.right, { flex: 1, fontSize: 18 }]}>
              {formatInrTrim(collected)}
            </Text>
            <View style={{ flex: 1.2 }} />
          </View>

          {sale.savingPaise > 0 ? (
            <View style={s.saved}>
              <Text style={s.savedText}>
                <Text style={s.savedLead}>
                  {formatInrTrim(sale.savingPaise)} of MDR not charged
                </Text>{' '}
                by keeping every stub at {formatInrTrim(MDR.exemptUpToPaise)} or
                below. The {Math.round(MDR.gstRateOnMdr * 100)}% GST on that fee,{' '}
                {formatInrTrim(Math.round(sale.savingPaise * MDR.gstRateOnMdr))},
                would have been reclaimable as input tax credit, so it is not a
                saving on its own.
              </Text>
            </View>
          ) : null}

          {sale.status === 'void' ? (
            <Text style={s.voided}>
              This memo was cancelled. The number stays used so the sequence has
              no gap.
            </Text>
          ) : null}
        </View>

        <Key
          tone="quiet"
          onPress={async () => setNote(await shareLedgerCsv())}
          style={{ minHeight: 56 }}
        >
          Share the ledger
        </Key>
        {note ? <Text style={s.note}>{note}</Text> : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.machine, paddingHorizontal: 12, gap: 10 },
  paper: { backgroundColor: C.paper, padding: 20, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  invoice: { color: C.cyanDeep, fontFamily: F.paperBold, fontSize: 22 },
  when: { color: C.inkFaint, fontFamily: F.paper, fontSize: 12 },
  total: { color: C.ink, fontFamily: F.paperBold, fontSize: 44 },
  lede: { color: C.inkSoft, fontFamily: F.paper, fontSize: 14, lineHeight: 21 },
  rule: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.paperRule,
    marginVertical: 6,
  },
  thead: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
  th: { color: C.inkFaint, fontFamily: F.paper, fontSize: 13 },
  tr: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: C.paperRule,
  },
  totalRow: { borderTopWidth: 2, borderColor: C.ink },
  cell: { color: C.ink, fontFamily: F.paperBold, fontSize: 15 },
  right: { textAlign: 'right' },
  paid: { color: C.violet, fontFamily: F.paperBold },
  unpaid: { color: C.inkFaint, fontFamily: F.paper },
  ref: { color: C.inkFaint, fontSize: 12, letterSpacing: 0.5 },
  saved: { borderLeftWidth: 4, borderColor: C.magentaInk, paddingLeft: 12, marginTop: 10 },
  savedText: { color: C.ink, fontFamily: F.paper, fontSize: 14, lineHeight: 21 },
  savedLead: { color: C.magentaInk, fontFamily: F.paperBold },
  voided: { color: C.magentaInk, fontFamily: F.paperBold, fontSize: 14, marginTop: 10 },
  note: { color: C.chromeSoft, fontFamily: F.machine, fontSize: 14 },
});
