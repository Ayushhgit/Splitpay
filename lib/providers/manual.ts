import { type PaymentProvider, upiPayloadFor } from './types';

/**
 * No integration at all: the merchant watches their own UPI app and taps each
 * stub as it is paid. Works on day one, needs no onboarding, and no third
 * party sees the sale broken into legs.
 */
export const manualProvider: PaymentProvider = {
  id: 'manual',
  label: 'Confirm by hand',
  confirmation: 'manual',
  buildLegPayload: upiPayloadFor,
};
