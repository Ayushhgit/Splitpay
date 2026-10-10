import { Suspense } from 'react';
import { AppBar } from '@/components/app-bar';
import { SaleDeck } from './sale-deck';

/**
 * The memo id arrives in the query string rather than the path so that this is
 * one document the offline shell can cache and reuse for every memo.
 */
export default function SalePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-md px-4">
          <AppBar heading="Memo" back={{ href: '/', label: 'Counter' }} />
        </main>
      }
    >
      <SaleDeck />
    </Suspense>
  );
}
