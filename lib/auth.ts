'use client';

import { createStore, get, set } from 'idb-keyval';

/**
 * The counter lock.
 *
 * What this is: a PIN that keeps someone who picks up the shop's phone out of
 * the till and the ledger. It locks itself after a few minutes of no use,
 * which is the state a counter phone spends most of its day in.
 *
 * What this is not: access control. The whole app runs in the browser with no
 * server behind it, so the check happens on the same device as the person
 * doing the checking. Anyone willing to open developer tools can step past it,
 * and the build-time admin PIN below ships inside the JavaScript. For access
 * that is actually enforced, the deployment itself has to refuse to serve —
 * see the note in README.
 *
 * The PIN is never stored. What is stored is a PBKDF2-SHA256 hash with a random
 * salt, so a PIN reused from somewhere else does not leak out of this device.
 */
const CONFIG = createStore('splitqr-config', 'config');
const PIN_KEY = 'pin';
const GUARD_KEY = 'pin-guard';
const SESSION_KEY = 'counter-unlocked-until';

/** How long the app stays open with no interaction. */
export const IDLE_LOCK_MS = 5 * 60 * 1000;
export const PIN_LENGTH = 4;

const ITERATIONS = 150_000;

interface PinRecord {
  salt: string;
  hash: string;
  iterations: number;
}

interface Guard {
  failures: number;
  blockedUntil: number;
}

const toB64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

async function derive(
  pin: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256
  );
  return toB64(bits);
}

export async function hasPin(): Promise<boolean> {
  return Boolean(await get<PinRecord>(PIN_KEY, CONFIG));
}

export async function setPin(pin: string): Promise<void> {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error('A PIN is 4 to 8 digits.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const record: PinRecord = {
    salt: toB64(salt.buffer),
    hash: await derive(pin, salt, ITERATIONS),
    iterations: ITERATIONS,
  };
  await set(PIN_KEY, record, CONFIG);
  await set(GUARD_KEY, { failures: 0, blockedUntil: 0 }, CONFIG);
}

/**
 * A build-time PIN, set with NEXT_PUBLIC_ADMIN_PIN, that works on any device
 * without one of its own. It is a way back in on a phone whose PIN was
 * forgotten — and, being public JavaScript, it is only that.
 */
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? '';

export async function howLongBlocked(): Promise<number> {
  const guard = (await get<Guard>(GUARD_KEY, CONFIG)) ?? {
    failures: 0,
    blockedUntil: 0,
  };
  return Math.max(0, guard.blockedUntil - Date.now());
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (await howLongBlocked()) return false;

  const record = await get<PinRecord>(PIN_KEY, CONFIG);
  let ok = false;

  if (record) {
    const salt = Uint8Array.from(atob(record.salt), (c) => c.charCodeAt(0));
    ok = (await derive(pin, salt, record.iterations)) === record.hash;
  }
  if (!ok && ADMIN_PIN && pin === ADMIN_PIN) ok = true;

  const guard = (await get<Guard>(GUARD_KEY, CONFIG)) ?? {
    failures: 0,
    blockedUntil: 0,
  };

  if (ok) {
    await set(GUARD_KEY, { failures: 0, blockedUntil: 0 }, CONFIG);
    unlockForNow();
    return true;
  }

  // Back off after a run of wrong guesses, so the keypad cannot be walked
  // through all ten thousand combinations by hand.
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
    const until = Number(sessionStorage.getItem(SESSION_KEY) ?? 0);
    return until > Date.now();
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
