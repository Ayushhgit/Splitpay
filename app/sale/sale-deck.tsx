'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppBar } from '@/components/app-bar';
import { CollectionStrip } from '@/components/collection-strip';
import { Stub } from '@/components/stub';
import { formatInrTrim } from '@/lib/money';
import { provider } from '@/lib/providers';
import { type Leg, type Sale, type Settings, paidPaise, repo } from '@/lib/store';
import { useReducedMotion } from '@/lib/use-reduced-motion';

export function SaleDeck() {
  const id = useSearchParams().get('id') ?? '';
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [missing, setMissing] = useState(false);
  const [tearing, setTearing] = useState<Leg | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const tearTimer = useRef<number | null>(null);

  useEffect(() => {
    Promise.all([repo.getSale(id), repo.getSettings()]).then(([s, cfg]) => {
      setSettings(cfg);
      if (s) setSale(s);
      else setMissing(true);
    });
  }, [id]);

  // An aggregator provider pushes leg updates here. The manual provider has no
  // subscribe, so this does nothing until one is connected.
  useEffect(() => {
    if (!sale || !provider.subscribe) return;
    return provider.subscribe(sale.id, (legId, status, pspTxnId) => {
      repo
        .confirmLeg({ saleId: sale.id, legId, status, confirmedBy: 'psp', pspTxnId })
        .then(setSale);
    });
  }, [sale]);

  useEffect(
    () => () => {
      if (tearTimer.current) window.clearTimeout(tearTimer.current);
    },
    []
  );

  const focused = useMemo(
    () => sale?.legs.find((l) => l.status === 'pending') ?? null,
    [sale]
  );

  async function markPaid() {
    if (!sale || !focused || tearing) return;
    const leg = focused;
    setTearing(leg);
    if ('vibrate' in navigator) navigator.vibrate(18);
    const next = await repo.confirmLeg({
      saleId: sale.id,
      legId: leg.id,
      status: 'paid',
      confirmedBy: 'manual',
    });
    setSale(next);
    tearTimer.current = window.setTimeout(
      () => setTearing(null),
      reducedMotion ? 0 : 540
    );
  }

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
    router.push('/ledger');
  }

  if (missing) {
    return (
      <main className="mx-auto w-full max-w-md px-3">
        <AppBar heading="Counter" back={{ href: '/', label: 'Counter' }} />
        <p className="mt-8 leading-relaxed text-chrome-soft">
          This memo is not on this device. The ledger is kept per device, so a
          memo made on another phone will not appear here.
        </p>
      </main>
    );
  }

  if (!sale || !settings) {
    return (
      <main className="mx-auto w-full max-w-md px-3">
        <AppBar heading="Counter" />
      </main>
    );
  }

  const collected = paidPaise(sale);
  const settled = sale.status === 'paid';
  const live = focused ?? tearing;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col gap-2.5 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <AppBar
        heading={'Memo ' + sale.invoiceLabel}
        back={{ href: '/', label: 'Counter' }}
      />

      <CollectionStrip
        invoiceLabel={sale.invoiceLabel}
        totalPaise={sale.totalPaise}
        paidPaise={collected}
        legs={sale.legs}
        onUndo={undoLeg}
      />

      {settled && !tearing ? (
        <div className="flex flex-1 flex-col justify-center gap-7 py-8">
          <div className="paper stub-feed flex flex-col items-center gap-4 px-5">
            <span className="stamp text-3xl">PAID</span>
            <p className="text-center text-[1.02rem] leading-relaxed text-ink-soft">
              {formatInrTrim(sale.totalPaise)} collected across{' '}
              {sale.legs.length} stubs of memo {sale.invoiceLabel}.
              {sale.savingPaise > 0 ? (
                <>
                  {' '}
                  <span className="paper-figure text-magenta-ink">
                    {formatInrTrim(sale.savingPaise)} kept
                  </span>
                  .
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link
              href={'/receipt?id=' + sale.id}
              className="key key-commit min-h-[58px]"
            >
              See the memo
            </Link>
            <Link href="/" className="key key-quiet min-h-[58px] text-base">
              Next sale
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* A definite height to measure against: the stub fills it and the
              code sizes to what is left inside, instead of the two growing
              off each other. The torn stub is laid over the live one. */}
          <div className="relative min-h-0 flex-1 py-1">
            {live ? (
              <div className="absolute inset-0 py-1">
                <Stub
                  key={live.id}
                  leg={live}
                  count={sale.legs.length}
                  invoiceLabel={sale.invoiceLabel}
                  upiUri={provider.buildLegPayload(live, settings).upiUri}
                  feeding={live.seq > 1}
                />
              </div>
            ) : null}
            {tearing ? (
              <div className="absolute inset-0 py-1">
                <Stub
                  leg={tearing}
                  count={sale.legs.length}
                  invoiceLabel={sale.invoiceLabel}
                  upiUri={provider.buildLegPayload(tearing, settings).upiUri}
                  stamped
                  tearing
                />
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={markPaid}
              disabled={!focused || tearing !== null}
              className="key key-commit screen-in stagger-2 min-h-[clamp(54px,7.4dvh,62px)]"
            >
              {focused ? 'Mark stub ' + focused.seq + ' paid' : 'All stubs marked'}
            </button>
            <button
              type="button"
              onClick={() =>
                confirmingCancel ? cancelMemo() : setConfirmingCancel(true)
              }
              className="min-h-[44px] text-sm font-semibold text-chrome-faint"
            >
              {confirmingCancel
                ? 'Tap again to cancel this memo'
                : 'Cancel memo'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
