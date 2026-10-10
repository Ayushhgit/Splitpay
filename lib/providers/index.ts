import { manualProvider } from './manual';
import type { PaymentProvider } from './types';

/** The one place the app decides how payments get confirmed. */
export const provider: PaymentProvider = manualProvider;

export * from './types';
