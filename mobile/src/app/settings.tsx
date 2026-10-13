import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Key } from '@/components/keys';
import { AppBar } from '@/components/panels';
import { lockNow } from '@/lib/auth';
import { MDR } from '@/lib/mdr';
import { formatInrTrim } from '@/lib/money';
import type { SplitMode } from '@/lib/split';
import { type Settings, repo } from '@/lib/store';
import { C, F } from '@/lib/theme';
import { isValidVpa } from '@/lib/upi';

const effective = new Date(MDR.effectiveFrom).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void repo.getSettings().then(setSettings);
    }, [])
  );

  if (!settings) {
    return (
      <View testID="screen-settings" style={[s.screen, { paddingTop: insets.top + 4 }]}>
        <AppBar heading="Settings" back={{ href: '/', label: 'Counter' }} />
      </View>
    );
  }

  async function patch(next: Partial<Settings>) {
    setSettings(await repo.saveSettings(next));
    setSaved(true);
  }

  const vpaBad = settings.vpa.length > 0 && !isValidVpa(settings.vpa);

  return (
    <View testID="screen-settings" style={[s.screen, { paddingTop: insets.top + 4 }]}>
      <AppBar heading="Settings" back={{ href: '/', label: 'Counter' }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, gap: 18 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.field}>
          <Text style={s.label}>UPI ID that collects</Text>
          <TextInput
            value={settings.vpa}
            onChangeText={(v) => setSettings({ ...settings, vpa: v.trim() })}
            onBlur={() => patch({ vpa: settings.vpa })}
            placeholder="shop@okhdfcbank"
            placeholderTextColor={C.chromeFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={s.input}
          />
          <Text style={[s.help, vpaBad && { color: C.magenta }]}>
            {vpaBad
              ? 'That is not a UPI ID. It looks like name@bank, with no spaces.'
              : 'Every stub collects into this ID.'}
          </Text>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Name the customer sees</Text>
          <TextInput
            value={settings.payeeName}
            onChangeText={(v) => setSettings({ ...settings, payeeName: v })}
            onBlur={() => patch({ payeeName: settings.payeeName })}
            placeholder="Verma Electronics"
            placeholderTextColor={C.chromeFaint}
            style={s.input}
          />
        </View>

        <View style={s.pair}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>Memo prefix</Text>
            <TextInput
              value={settings.invoicePrefix}
              onChangeText={(v) =>
                setSettings({
                  ...settings,
                  invoicePrefix: v.replace(/[^A-Za-z0-9-]/g, ''),
                })
              }
              onBlur={() => patch({ invoicePrefix: settings.invoicePrefix })}
              style={s.input}
            />
          </View>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>Next number</Text>
            <TextInput
              value={String(settings.nextInvoiceNo)}
              onChangeText={(v) =>
                setSettings({
                  ...settings,
                  nextInvoiceNo: Math.max(
                    1,
                    Number.parseInt(v.replace(/\D/g, '') || '1', 10)
                  ),
                })
              }
              onBlur={() => patch({ nextInvoiceNo: settings.nextInvoiceNo })}
              keyboardType="number-pad"
              style={s.input}
            />
          </View>
        </View>
        <Text style={s.help}>
          Memo numbers run in order and are never reused, including for a
          cancelled memo. Set this once to carry on from your bill book, then
          leave it alone — a gap in the sequence is the kind of thing an auditor
          asks about.
        </Text>

        <View style={s.field}>
          <Text style={s.label}>How to divide by default</Text>
          {(
            [
              [
                'maxfill',
                `Into ${formatInrTrim(MDR.exemptUpToPaise)} stubs`,
                'Fewest scans. The last stub takes the remainder.',
              ],
              ['equal', 'Evenly', 'Same number of stubs, each the same size.'],
            ] as const
          ).map(([value, label, detail]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: settings.defaultSplitMode === value }}
              onPress={() => patch({ defaultSplitMode: value as SplitMode })}
              style={[
                s.option,
                settings.defaultSplitMode === value && { borderColor: C.cyan },
              ]}
            >
              <View
                style={[
                  s.radio,
                  settings.defaultSplitMode === value && s.radioOn,
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.optionLabel}>{label}</Text>
                <Text style={s.help}>{detail}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={[s.heading, { marginTop: 8 }]}>The counter lock</Text>
        <Key tone="quiet" onPress={lockNow} style={{ minHeight: 54 }}>
          Lock now
        </Key>
        <Text style={s.help}>
          <Text style={s.strong}>What the lock does. </Text>
          It keeps someone who picks up this phone out of the till and the
          ledger. It closes itself after five minutes of no use and whenever the
          app is restarted, and it slows down after a run of wrong guesses.
        </Text>
        <Text style={s.help}>
          <Text style={s.strong}>What it does not do. </Text>
          The PIN is fixed in the build, so it travels inside the app this phone
          installed, and the check runs on that same device. To change it, set
          EXPO_PUBLIC_ADMIN_PIN and rebuild.
        </Text>

        <Text style={[s.heading, { marginTop: 8 }]}>
          The rule this app works around
        </Text>
        {(
          [
            ['In force from', effective],
            ['Charged above', formatInrTrim(MDR.exemptUpToPaise)],
            ['Rate', `${Math.round(MDR.rate * 1000) / 10}% of the payment`],
            ['Capped at', formatInrTrim(MDR.capPaise)],
            [
              'GST on the fee',
              `${Math.round(MDR.gstRateOnMdr * 100)}%, reclaimable as input tax credit`,
            ],
            ['Exempt below', `${formatInrTrim(MDR.monthlyExemptPaise)} a month`],
          ] as const
        ).map(([term, value]) => (
          <View key={term} style={s.defRow}>
            <Text style={s.help}>{term}</Text>
            <Text style={[s.optionLabel, { textAlign: 'right', flexShrink: 1 }]}>
              {value}
            </Text>
          </View>
        ))}

        <Text style={s.help}>
          <Text style={s.strong}>Check this applies to you. </Text>
          The fee only lands on merchant payments, and whether a payment counts
          as one is decided by your UPI ID at your bank, not by the code shown
          here. If the shop collects on a personal ID there is no fee to avoid
          and this app saves nothing.
        </Text>
        <Text style={s.help}>
          <Text style={s.strong}>One sale stays one memo. </Text>
          This app divides the payment, never the bill. Writing a large sale up
          as several smaller bills to hold down turnover is a different thing
          entirely, and not something this app will do.
        </Text>
        <Text style={s.help}>
          Memos and settings are stored on this device only. Nothing is sent
          anywhere, and nothing syncs to another phone.
        </Text>

        {saved ? <Text style={[s.help, { color: C.cyan }]}>Saved.</Text> : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.machine, paddingHorizontal: 12, gap: 10 },
  field: { gap: 6 },
  pair: { flexDirection: 'row', gap: 12 },
  label: { color: C.chrome, fontFamily: F.machineBold, fontSize: 13, letterSpacing: 0.4 },
  heading: { color: C.cyan, fontFamily: F.machineBold, fontSize: 15 },
  input: {
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.edge,
    backgroundColor: C.recessed,
    paddingHorizontal: 12,
    color: C.chrome,
    fontFamily: F.machine,
    fontSize: 17,
  },
  help: { color: C.chromeSoft, fontFamily: F.machine, fontSize: 13, lineHeight: 20 },
  strong: { color: C.chrome, fontFamily: F.machineBold },
  option: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 10,
    padding: 12,
    minHeight: 56,
  },
  optionLabel: { color: C.chrome, fontFamily: F.machineBold, fontSize: 15 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.edge,
    marginTop: 2,
  },
  radioOn: { borderColor: C.brass, backgroundColor: C.brass },
  defRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: C.edge,
  },
});
