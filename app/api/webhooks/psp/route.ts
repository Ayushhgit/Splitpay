import { NextResponse } from 'next/server';

/**
 * Aggregator webhook endpoint, deliberately inert.
 *
 * When an aggregator is connected, this route verifies the provider's
 * signature over the raw body, maps its order reference back to a leg's `tr`,
 * and fans the result out to open screens. Until then it refuses rather than
 * pretending to accept payments, so nothing can silently depend on it.
 *
 * See lib/providers/psp-stub.ts for the client half.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'not_implemented',
      detail:
        'No payment aggregator is connected. Legs are confirmed by hand in the app.',
    },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'not_implemented', detail: 'No payment aggregator is connected.' },
    { status: 501 }
  );
}
