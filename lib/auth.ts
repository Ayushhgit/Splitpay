'use client';

import { createStore, get, set } from 'idb-keyval';

/**
 * The counter lock.
 *
 * The PIN is fixed in the build. Set NEXT_PUBLIC_ADMIN_PIN to change it without
 * editing this file; otherwise it is the constant below.
 *
 * What this is: a PIN that keeps someone who picks up the shop's phone out of
 * the till and the ledger. It locks itself after a few minutes of no use, which
 * is the state a counter phone spends most of its day in.
 *
 * What this is not: access control. The app is all browser and no server, so
 * the check runs on the same device as the person entering it, and the PIN is
 * compiled into the JavaScript that device downloads. Anyone willing to read
 * the bundle or open developer tools can step past it. For access that is
 * actually enforced, the deployment has to refuse to serve — see README.
 */
export const COUNTER_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '7890';

const CONFIG = createStore('splitqr-config', 'config');
const GUARD_KEY = 'pin-guard';
const SESSION_KEY = 'counter-unlocked-until';

/** How long the app stays open with no interaction. */
export const IDLE_LOCK_MS = 5 * 60 * 1000;
export const PIN_LENGTH = COUNTER_PIN.length;

interface Guard {
  failures: number;
  blockedUntil: number;
}

async function readGuard(): Promise<Guard> {
  return (await get<Guard>(GUARD_KEY, CONFIG)) ?? { failures: 0, blockedUntil: 0 };
}

export async function howLongBlocked(): Promise<number> {
  const guard = await readGuard();
  return Math.max(0, guard.blockedUntil - Date.now());
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (await howLongBlocked()) return false;

  if (pin === COUNTER_PIN) {
    await set(GUARD_KEY, { failures: 0, blockedUntil: 0 }, CONFIG);
    unlockForNow();
    return true;
  }

  // Back off after a run of wrong guesses, so the keypad cannot be walked
  // through every combination by hand.
  const guard = await readGuard();
  const failures = guard.failures + 1;
  const penalty =
    failures < 5 ? 0 : Math.min(5 * 60_000, 15_000 * 2 ** (failures - 5));
  await set(
    GUARD_KEY,
    { failures, blockedUntil: penalty ? Date.now() + penalty : 0 },
    CONFIG
  );
  return false;
}

export function unlockForNow(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, String(Date.now() + IDLE_LOCK_MS));
  } catch {
    // Private mode with storage blocked: the app still runs, it just relocks
    // on every navigation.
  }
}

export function touchActivity(): void {
  if (isUnlocked()) unlockForNow();
}

export function isUnlocked(): boolean {
  try {
    return Number(sessionStorage.getItem(SESSION_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

export function lockNow(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
}
