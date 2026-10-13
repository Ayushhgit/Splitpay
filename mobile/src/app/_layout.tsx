import {
  Fraunces_400Regular,
  Fraunces_700Bold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LockGate } from '@/components/lock-gate';
import { C } from '@/lib/theme';

export default function RootLayout() {
  /*
    Two families, split the way the app is split: the machine speaks in a
    technical grotesque, the paper it issues is set in a ledger serif.
  */
  const [ready] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Fraunces_400Regular,
    Fraunces_700Bold,
  });

  // Hold the machine colour rather than flashing white while the faces load.
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.machine }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <LockGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.machine },
            animation: 'fade',
          }}
        />
      </LockGate>
    </SafeAreaProvider>
  );
}
