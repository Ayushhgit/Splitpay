/**
 * Random bytes, from whatever the platform provides.
 *
 * The one line in the payment logic that cannot be written the same way in a
 * browser and in React Native. Keeping it behind this function lets upi.ts stay
 * byte-identical between the web app and the Expo app, so the reference format
 * the bank sees cannot drift between them.
 *
 * The native build replaces this file with one backed by expo-crypto.
 */
export function randomBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  crypto.getRandomValues(bytes);
  return bytes;
}
