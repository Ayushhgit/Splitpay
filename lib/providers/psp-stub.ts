import type { LegStatus } from '../store/types';
import { type PaymentProvider, upiPayloadFor } from './types';

/**
 * Placeholder for a payment aggregator (Razorpay, Cashfree, PhonePe).
 *
 * Nothing here is live. It exists so the shape of the real thing is settled:
 * confirmation arrives on /api/webhooks/psp, which pushes to open screens over
 * server-sent events keyed by sale. Wiring an aggregator means filling in that
 * route and this file, and changing the export in index.ts — no screen changes.
 *
 * Note before taking this path: the aggregator sees every leg of every sale,
 * and its merchant agreement is what governs whether splitting is acceptable.
 */
export const pspStubProvider: PaymentProvider = {
  id: 'psp-stub',
  label: 'Automatic (not connected)',
  confirmation: 'automatic',
  buildLegPayload: upiPayloadFor,

  subscribe(saleId, onUpdate) {
    const source = new EventSource(
      `/api/webhooks/psp/stream?sale=${encodeURIComponent(saleId)}`
    );
    source.onmessage = (event) => {
      const { legId, status, pspTxnId } = JSON.parse(event.data) as {
        legId: string;
        status: LegStatus;
        pspTxnId?: string;
      };
      onUpdate(legId, status, pspTxnId);
    };
    return () => source.close();
  },

  async verifyLeg(ref) {
    const res = await fetch(`/api/webhooks/psp?ref=${encodeURIComponent(ref)}`);
    if (!res.ok) throw new Error(`leg lookup failed: ${res.status}`);
    const { status } = (await res.json()) as { status: LegStatus };
    return status;
  },
};
