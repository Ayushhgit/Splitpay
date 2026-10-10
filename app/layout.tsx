import type { Metadata, Viewport } from 'next';
import { Fraunces, Space_Grotesk } from 'next/font/google';
import { LockGate } from '@/components/lock-gate';
import { OfflineShell } from '@/components/offline-shell';
import './globals.css';

/*
  Two families, split the way the app is split: the machine speaks in a
  technical grotesque, the paper it issues is set in a ledger serif. See
  DESIGN.md.
*/
const machine = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-machine',
});

/*
  The serif is only ever printed on paper, which first appears one screen in, so
  it is not preloaded — the till screen does not wait on it.
*/
const paper = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  display: 'swap',
  preload: false,
  variable: '--font-paper',
});

export const metadata: Metadata = {
  title: 'Counter',
  description:
    'Enter one amount, collect it as stubs that each stay inside the zero-MDR band.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Counter', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximumScale: pinching to read a reference or a memo line must stay
  // possible. Accidental double-tap zoom is handled by touch-action instead.
  viewportFit: 'cover',
  // The machine is one colour in every light, so the browser chrome is too.
  themeColor: '#0b1020',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={`${machine.variable} ${paper.variable}`}>
      <body className="min-h-dvh">
        <LockGate>{children}</LockGate>
        <OfflineShell />
      </body>
    </html>
  );
}
