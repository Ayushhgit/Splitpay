'use client';

import { useEffect, useState } from 'react';
import { AppBar } from '@/components/app-bar';
import { LockSettings } from '@/components/lock-settings';
import { MDR } from '@/lib/mdr';
import { formatInrTrim } from '@/lib/money';
import { type SplitMode } from '@/lib/split';
import { type Settings, repo } from '@/lib/store';
import { isValidVpa } from '@/lib/upi';

const effective = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'long',
}).format(new Date(MDR.effectiveFrom));

const field =
  'min-h-[54px] rounded-lg border border-edge bg-recessed px-3 text-lg text-chrome placeholder:text-chrome-faint';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    repo.getSettings().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <main className="mx-auto w-full max-w-md px-3">
        <AppBar heading="Settings" back={{ href: '/', label: 'Counter' }} />
      </main>
    );
  }

  async function patch(next: Partial<Settings>) {
    const stored = await repo.saveSettings(next);
    setSettings(stored);
    setSaved(true);
  }

  const vpaBad = settings.vpa.length > 0 && !isValidVpa(settings.vpa);

  return (
    <main className="screen-in mx-auto w-full max-w-md px-3 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <AppBar heading="Settings" back={{ href: '/', label: 'Counter' }} />

      <section className="mt-2 flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="label text-chrome">UPI ID that collects</span>
          <input
            value={settings.vpa}
            onChange={(e) =>
              setSettings({ ...settings, vpa: e.target.value.trim() })
            }
            onBlur={() => patch({ vpa: settings.vpa })}
            placeholder="shop@okhdfcbank"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
            aria-invalid={vpaBad}
            aria-describedby="vpa-help"
            className={field}
          />
          <span
            id="vpa-help"
            className={
              vpaBad
                ? 'text-sm leading-relaxed text-magenta'
                : 'text-sm leading-relaxed text-chrome-soft'
            }
          >
            {vpaBad
              ? 'That is not a UPI ID. It looks like name@bank, with no spaces.'
              : 'Every stub collects into this ID.'}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="label text-chrome">Name the customer sees</span>
          <input
            value={settings.payeeName}
            onChange={(e) =>
              setSettings({ ...settings, payeeName: e.target.value })
            }
            onBlur={() => patch({ payeeName: settings.payeeName })}
            placeholder="Verma Electronics"
            className={field}
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="label text-chrome">Memo prefix</span>
            <input
              value={settings.invoicePrefix}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  invoicePrefix: e.target.value.replace(/[^A-Za-z0-9-]/g, ''),
                })
              }
              onBlur={() => patch({ invoicePrefix: settings.invoicePrefix })}
              className={field}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="label text-chrome">Next number</span>
            <input
              value={settings.nextInvoiceNo}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  nextInvoiceNo: Math.max(
                    1,
                    Number.parseInt(e.target.value.replace(/\D/g, '') || '1', 10)
                  ),
                })
              }
              onBlur={() => patch({ nextInvoiceNo: settings.nextInvoiceNo })}
              inputMode="numeric"
              className={field}
            />
          </label>
        </div>
        <p className="-mt-3 text-sm leading-relaxed text-chrome-soft">
          Memo numbers run in order and are never reused, including for a
          cancelled memo. Set this once to carry on from your bill book, then
          leave it alone — a gap in the sequence is the kind of thing an auditor
          asks about.
        </p>

        <fieldset className="flex flex-col gap-2">
          <legend className="label text-chrome">How to divide by default</legend>
          {(
            [
              [
                'maxfill',
                'Into ' + formatInrTrim(MDR.exemptUpToPaise) + ' stubs',
                'Fewest scans. The last stub takes the remainder.',
              ],
              ['equal', 'Evenly', 'Same number of stubs, each the same size.'],
            ] as const
          ).map(([value, label, detail]) => (
            <label
              key={value}
              className="flex items-start gap-3 rounded-lg border border-edge bg-raised px-3 py-3"
            >
              <input
                type="radio"
                name="splitMode"
                checked={settings.defaultSplitMode === value}
                onChange={() => patch({ defaultSplitMode: value as SplitMode })}
                className="mt-1 h-5 w-5 accent-[var(--brass)]"
              />
              <span className="flex flex-col">
                <span className="font-semibold">{label}</span>
                <span className="text-sm text-chrome-soft">{detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </section>

      <LockSettings />

      <section className="mt-9">
        <h2 className="text-sm font-bold text-cyan">
          The rule this app works around
        </h2>
        <dl className="mt-3 text-sm">
          {(
            [
              ['In force from', effective],
              ['Charged above', formatInrTrim(MDR.exemptUpToPaise)],
              ['Rate', Math.round(MDR.rate * 1000) / 10 + '% of the payment'],
              ['Capped at', formatInrTrim(MDR.capPaise)],
              [
                'GST on the fee',
                Math.round(MDR.gstRateOnMdr * 100) +
                  '%, reclaimable as input tax credit',
              ],
              [
                'Exempt below',
                formatInrTrim(MDR.monthlyExemptPaise) + ' a month',
              ],
            ] as const
          ).map(([term, value]) => (
            <div
              key={term}
              className="flex justify-between gap-4 border-b border-edge py-2.5 last:border-0"
            >
              <dt className="text-chrome-soft">{term}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-col gap-3 text-sm leading-relaxed text-chrome-soft">
          <p>
            <span className="font-bold text-chrome">
              Check this applies to you.
            </span>{' '}
            The fee only lands on merchant payments. Whether a payment counts as
            one is decided by your UPI ID at your bank, not by the code shown
            here — if the shop collects on a personal ID, there is no fee to
            avoid and this app saves nothing. Ask your bank which kind you have.
          </p>
          <p>
            <span className="font-bold text-chrome">
              One sale stays one memo.
            </span>{' '}
            This app divides the payment, never the bill. Writing a large sale
            up as several smaller bills to hold down turnover is a different
            thing entirely, and not something this app will do.
          </p>
          <p>
            Collecting a sale as sub-{formatInrTrim(MDR.exemptUpToPaise)}{' '}
            payments avoids a network fee, not a tax. Banks and NPCI have said
            they intend to spot the pattern, and your merchant agreement is what
            governs it — worth reading before this becomes a habit.
          </p>
          <p>
            Memos and settings are stored on this device only. Nothing is sent
            anywhere, and nothing syncs to another phone.
          </p>
        </div>
      </section>

      {saved ? (
        <p className="mt-6 text-sm font-semibold text-cyan" role="status">
          Saved.
        </p>
      ) : null}
    </main>
  );
}
