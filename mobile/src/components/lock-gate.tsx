import * as Haptics from 'expo-haptics';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IDLE_LOCK_MS,
  PIN_LENGTH,
  howLongBlocked,
  isUnlocked,
  lockNow,
  touchActivity,
  verifyPin,
} from '@/lib/auth';
import { C, F } from '@/lib/theme';
import { Display } from './panels';
import { Key } from './keys';

/** Nothing in the app renders until the counter is unlocked. */
export function LockGate({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(() => isUnlocked());
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blockedFor, setBlockedFor] = useState(0);
  const [shake] = useState(() => new Animated.Value(0));
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void howLongBlocked().then(setBlockedFor);
  }, []);

  // Relock after a spell of no use: a counter phone is put down mid-sale.
  const resetIdle = useCallback(() => {
    touchActivity();
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      lockNow();
      setOpen(false);
      setEntry('');
    }, IDLE_LOCK_MS);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetIdle();
    return () => {
      if (idle.current) clearTimeout(idle.current);
    };
  }, [open, resetIdle]);

  // Count the lockout down so the wait is visible rather than mysterious.
  useEffect(() => {
    if (blockedFor <= 0) return;
    const tick = setInterval(async () => {
      const left = await howLongBlocked();
      setBlockedFor(left);
      if (left <= 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [blockedFor]);

  const refuse = useCallback(
    (message: string) => {
      setError(message);
      setEntry('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0.5, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    },
    [shake]
  );

  const submit = useCallback(
    async (pin: string) => {
      if (await verifyPin(pin)) {
        setError(null);
        setOpen(true);
        return;
      }
      const left = await howLongBlocked();
      setBlockedFor(left);
      refuse(left > 0 ? 'Too many tries.' : 'Wrong PIN.');
    },
    [refuse]
  );

  const press = useCallback(
    (digit: string) => {
      if (blockedFor > 0) return;
      setError(null);
      setEntry((prev) => {
        const next = prev + digit;
        if (next.length === PIN_LENGTH) void submit(next);
        return next.length >= PIN_LENGTH ? '' : next;
      });
    },
    [blockedFor, submit]
  );

  if (open) return <>{children}</>;

  const note =
    blockedFor > 0
      ? `Too many wrong tries. Try again in ${Math.ceil(blockedFor / 1000)}s.`
      : 'Enter the PIN to open the till.';

  return (
    <View
      testID="screen-lock"
      style={[
        s.screen,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <View style={s.middle}>
        <Display style={s.panel}>
          <Text style={s.title}>Counter locked</Text>
          <Animated.View
            style={[
              s.dots,
              {
                transform: [
                  {
                    translateX: shake.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [-8, 8],
                    }),
                  },
                ],
              },
            ]}
          >
            {Array.from({ length: PIN_LENGTH }, (_, i) => (
              <View key={i} style={[s.dot, i < entry.length && s.dotOn]} />
            ))}
          </Animated.View>
          <Text style={[s.note, error ? { color: C.magenta } : null]}>
            {error ? `${error} ${note}` : note}
          </Text>
        </Display>

        <View style={s.pad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <Key
              key={d}
              label={d}
              disabled={blockedFor > 0}
              onPress={() => press(d)}
              style={s.cell}
            >
              {d}
            </Key>
          ))}
          <View style={s.cell} />
          <Key
            label="0"
            disabled={blockedFor > 0}
            onPress={() => press('0')}
            style={s.cell}
          >
            0
          </Key>
          <Key
            label="Delete last digit"
            onPress={() => setEntry((p) => p.slice(0, -1))}
            style={s.cell}
          >
            <Text style={s.back}>⌫</Text>
          </Key>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.machine, paddingHorizontal: 12 },
  middle: { flex: 1, justifyContent: 'center', gap: 10 },
  panel: { paddingHorizontal: 16, paddingVertical: 20, gap: 16 },
  title: { color: C.cyan, fontFamily: F.machineBold, fontSize: 17 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.edge,
  },
  dotOn: { backgroundColor: C.cyan, borderColor: C.cyan },
  note: { color: C.chromeSoft, fontFamily: F.machine, fontSize: 14, minHeight: 38 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '31.5%', flexGrow: 1, minHeight: 60 },
  back: { color: C.chromeSoft, fontSize: 26, fontFamily: F.machine },
});
