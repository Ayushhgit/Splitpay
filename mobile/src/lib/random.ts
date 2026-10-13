import { getRandomBytes } from 'expo-crypto';

/**
 * Random bytes, from whatever the platform provides.
 *
 * The native half of the shim that keeps upi.ts byte-identical with the web
 * app: React Native has no global `crypto`, so the bytes come from expo-crypto
 * instead. See the web app's lib/random.ts.
 */
export function randomBytes(count: number): Uint8Array {
  return getRandomBytes(count);
}
