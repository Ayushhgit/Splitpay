'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AmountPad } from '@/components/amount-pad';
import { AppBar } from '@/components/app-bar';
import { Readout } from '@/components/readout';
import { SavingsStrip } from '@/components/savings-strip';
import { formatInrTrim } from '@/lib/money';
import {
  type AmountDraft,
  backspace,
  draftDisplay,
  draftToPaise,
  emptyDraft,
  pushDecimal,
  pushDigit,
} from '@/lib/money';
import { MDR } from '@/lib/mdr';
import { type SplitMode, splitSale } from '@/lib/split';
import { type Settings, repo } from '@/lib/store';
import { isValidVpa } from '@/lib/upi';

export default function CounterPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<AmountDraft>(emptyDraft);
  const [mode, setMode] = useState<SplitMode>('maxfill');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    repo.getSettings().then((s) => {
      setSettings(s);
      setMode(s.defaultSplitMode);
    });
  }, []);

  const totalPaise = draftToPaise(draft);
  const split = useMemo(() => splitSale(totalPaise, mode), [totalPaise, mode]);
  const ready = settings !== null && isValidVpa(settings.vpa);

  const onDigit = useCallback(
    (d: string) => setDraft((prev) => pushDigit(prev, d)),
    []
  );
  const onDecimal = useCallback(() => setDraft(pushDecimal), []);
  const onBackspace = useCallback(() => setDraft(backspace), []);
  const onClear = useCallback(() => setDraft(emptyDraft), []);

  async function startSale() {
    if (!ready || totalPaise === 0 || busy) return;
    setBusy(true);
    try {
      const sale = await repo.createSale({ totalPaise, splitMode: mode });
      router.push(`/sale?id=${sale.id}`);
    } catch {
      setBusy(false);
    }
  }

  const shown = draftDisplay(draft);
  const [whole, paise] = shown.split('.');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <AppBar heading="Counter" />

      {/* The machine is a fixed-size object, centred on whatever screen it is
          on, rather than stretching its panel and keys to fill a tall phone. */}
      <div className="flex flex-1 flex-col justify-center gap-2.5 py-1.5">

      {/* The till display: which memo is being rung up, the amount on its
          baseline, and what the split is worth, all in one lit panel. */}
        <section className="display screen-in flex flex-col gap-3 px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-bold text-cyan">
            {settings
              ? `Memo ${settings.invoicePrefix}${settings.nextInvoiceNo}`
              : 'Memo'}
          </span>
          {split.isSplit && (
            <span className="text-sm font-semibold text-chrome-soft">
              {split.legCount} stubs of {formatInrTrim(MDR.exemptUpToPaise)} or
              less
            </span>
          )}
        </div>

        <div className="flex items-start gap-2">
          <span className="mt-[0.5em] text-xl font-semibold text-cyan">
            &#8377;
          </span>
          <Readout whole={whole} paise={paise} />
        </div>

        <div className="border-t border-edge pt-3">
          <SavingsStrip split={split} />

          {split.isSplit && (
            <div className="mt-3 flex items-center gap-2">
              <span className="label">Divide</span>
              {(
                [
                  ['maxfill', 'into 2,000s'],
                  ['equal', 'evenly'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={
                    mode === value
                      ? 'flex min-h-11 items-center rounded-lg border border-cyan px-3 text-sm font-semibold text-cyan'
                      : 'flex min-h-11 items-center rounded-lg border border-edge px-3 text-sm font-medium text-chrome-soft'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <AmountPad
        className="screen-in stagger-1"
        onDigit={onDigit}
        onDecimal={onDecimal}
        onBackspace={onBackspace}
        onClear={onClear}
      />

      {ready ? (
        <button
          type="button"
          onClick={startSale}
          disabled={totalPaise === 0 || busy}
          className="key key-commit screen-in stagger-2 min-h-[clamp(54px,7.4dvh,62px)] shrink-0"
        >
          {totalPaise === 0
            ? 'Enter an amount'
            : split.isSplit
              ? `Tear into ${split.legCount} stubs`
              : 'Show one code'}
        </button>
      ) : (
        <Link
          href="/settings"
          className="key key-commit screen-in stagger-2 min-h-[clamp(54px,7.4dvh,62px)] shrink-0 text-center"
        >
          Add your UPI ID to start
        </Link>
      )}
      </div>
    </main>
  );
}
