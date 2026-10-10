import { Suspense } from 'react';
import { AppBar } from '@/components/app-bar';
import { Receipt } from './receipt';

export default function ReceiptPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-md px-4">
          <AppBar heading="Memo" back={{ href: '/ledger', label: 'Ledger' }} />
        </main>
      }
    >
      <Receipt />
    </Suspense>
  );
}
