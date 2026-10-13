import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { C, F, RADIUS } from '@/lib/theme';

/**
 * A moulded key.
 *
 * Lit along the top edge with a lip beneath, and it travels when pressed —
 * which on glass is the only feedback a key can give, so it is paired with a
 * haptic tick rather than left to the eye alone.
 */
export function Key({
  children,
  onPress,
  onLongPress,
  disabled,
  tone = 'plain',
  style,
  label,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  tone?: 'plain' | 'commit' | 'quiet' | 'danger';
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const press = () => {
    if (disabled) return;
    void Haptics.impactAsync(
      tone === 'commit'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={press}
      onLongPress={onLongPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.key,
        tone === 'commit' && s.commit,
        tone === 'quiet' && s.quiet,
        tone === 'danger' && s.danger,
        disabled && s.disabled,
        pressed && !disabled && s.pressed,
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text
          style={[
            s.text,
            tone === 'commit' && s.commitText,
            tone === 'danger' && s.dangerText,
            disabled && s.disabledText,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  key: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.edge,
    borderBottomWidth: 4,
    borderBottomColor: C.keyEdge,
    borderRadius: RADIUS.key,
    minHeight: 56,
    paddingHorizontal: 12,
  },
  // Pressing shortens the lip and drops the cap, so the key looks depressed.
  pressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
    backgroundColor: C.raisedTop,
  },
  commit: {
    backgroundColor: C.brass,
    borderColor: C.brassLift,
    borderBottomColor: C.brassEdge,
  },
  quiet: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'transparent', borderColor: C.magenta },
  disabled: {
    backgroundColor: C.raised,
    borderColor: C.edge,
    borderBottomColor: C.keyEdge,
  },
  text: { color: C.chrome, fontSize: 26, fontFamily: F.machine },
  commitText: { color: C.onBrass, fontSize: 17, fontFamily: F.machineBold },
  dangerText: { color: C.magenta, fontSize: 16, fontFamily: F.machineBold },
  disabledText: { color: C.chromeFaint },
});
