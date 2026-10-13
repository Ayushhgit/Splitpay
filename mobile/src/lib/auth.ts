import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The counter lock.
 *
 * The PIN is fixed in the build. Set EXPO_PUBLIC_ADMIN_PIN to change it without
 * editing this file; otherwise it is the constant below.
 *
 * What this is: a PIN that keeps someone who picks up the shop's phone out of
 * the till and the ledger. It locks itself after a few minutes of no use.
 *
 * What this is not: access control. The PIN is compiled into the bundle this
 * device runs, and the check happens on that same device. On a phone this is
 * worth more than it is on the web — the bundle is not one view-source away —
 * but anyone who can read the app's JavaScript can read the PIN.
 */
export const COUNTER_PIN = process.env.EXPO_PUBLIC_ADMIN_PIN || '7890';

export const IDLE_LOCK_MS = 5 * 60 * 1000;
export const PIN_LENGTH = COUNTER_PIN.length;

const GUARD_KEY = 'pin-guard';

interface Guard {
  failures: number;
  blockedUntil: number;
}

/*
  Unlocked-ness is kept in memory, not on disk. A phone app has no "session"
  the way a browser tab does: the module lives exactly as long as the running
  app, so closing it and coming back asks for the PIN again, which is the
  behaviour a counter wants.
*/
let unlockedUntil = 0;

async function readGuard(): Promise<Guard> {
  const raw = await AsyncStorage.getItem(GUARD_KEY);
  return raw ? (JSON.parse(raw) as Guard) : { failures: 0, blockedUntil: 0 };
}

export async function howLongBlocked(): Promise<number> {
  const guard = await readGuard();
  return Math.max(0, guard.blockedUntil - Date.now());
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (await howLongBlocked()) return false;

  if (pin === COUNTER_PIN) {
    await AsyncStorage.setItem(
      GUARD_KEY,
      JSON.stringify({ failures: 0, blockedUntil: 0 })
    );
    unlockForNow();
    return true;
  }

  // Back off after a run of wrong guesses, so the keypad cannot be walked
  // through every combination by hand.
  const guard = await readGuard();
  const failures = guard.failures + 1;
  const penalty =
    failures < 5 ? 0 : Math.min(5 * 60_000, 15_000 * 2 ** (failures - 5));
  await AsyncStorage.setItem(
    GUARD_KEY,
    JSON.stringify({
      failures,
      blockedUntil: penalty ? Date.now() + penalty : 0,
    })
  );
  return false;
}

export function unlockForNow(): void {
  unlockedUntil = Date.now() + IDLE_LOCK_MS;
}

export function touchActivity(): void {
  if (isUnlocked()) unlockForNow();
}

export function isUnlocked(): boolean {
  return unlockedUntil > Date.now();
}

export function lockNow(): void {
  unlockedUntil = 0;
}
