import Link from 'next/link';

/** Near-invisible chrome: a name for where you are, and the ways out. */
export function AppBar({
  heading,
  back,
}: {
  heading: string;
  back?: { href: string; label: string };
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-1 pt-[max(0.5rem,env(safe-area-inset-top))]">
      {back ? (
        <Link
          href={back.href}
          className="label -ml-2 flex min-h-11 items-center px-2 text-cyan"
        >
          {back.label}
        </Link>
      ) : (
        <h1 className="label flex min-h-11 items-center">{heading}</h1>
      )}
      <nav className="-mr-2 flex items-center">
        {back?.label === 'Ledger' ? null : (
          <Link
            href="/ledger"
            className="label flex min-h-11 items-center px-2.5"
          >
            Ledger
          </Link>
        )}
        <Link
          href="/settings"
          className="label flex min-h-11 items-center px-2.5"
        >
          Settings
        </Link>
      </nav>
    </header>
  );
}
