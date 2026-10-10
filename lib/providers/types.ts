import { buildUpiUri } from '../upi';
import type { Leg, LegStatus, Settings } from '../store/types';

export interface LegPayload {
  /** What the QR encodes. */
  upiUri: string;
}

/**
 * How a leg gets paid and how the app learns it was paid.
 *
 * The manual provider only builds the QR; the merchant confirms each leg by
 * hand against their UPI app notifications. A payment-aggregator provider adds
 * `subscribe` and `verifyLeg` so confirmation arrives over a webhook instead.
 * Screens talk to this interface and never to a specific provider, so adding
 * the aggregator later does not touch the UI.
 */
export interface PaymentProvider {
  id: string;
  label: string;
  /** Whether the merchant has to tick legs off themselves. */
  confirmation: 'manual' | 'automatic';
  buildLegPayload(leg: Leg, settings: Settings): LegPayload;
  /** Push updates for a sale's legs. Returns an unsubscribe function. */
  subscribe?(
    saleId: string,
    onUpdate: (legId: string, status: LegStatus, pspTxnId?: string) => void
  ): () => void;
  /** Pull a single leg's status, for a reconnect or a manual recheck. */
  verifyLeg?(ref: string): Promise<LegStatus>;
}

/** Shared by every provider: the QR content is the same UPI intent URI. */
export function upiPayloadFor(leg: Leg, settings: Settings): LegPayload {
  return {
    upiUri: buildUpiUri({
      payee: { vpa: settings.vpa, payeeName: settings.payeeName },
      amountPaise: leg.amountPaise,
      note: leg.note,
      ref: leg.ref,
    }),
  };
}
