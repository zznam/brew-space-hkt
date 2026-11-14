import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { initializeStore } from '@/core/useAppStore';
import { SimulatorBar } from '@/components/SimulatorBar';
import { colors } from '@/components/ui';
export { ErrorBoundary } from 'expo-router';
export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void initializeStore().then((message) => {
      if (active) {
        setWarning(message);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={{ padding: 20, alignItems: 'center' }}
        >
          <View style={{ width: '100%', maxWidth: 1100, gap: 20 }}>
            <Text
              style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}
            >
              vibing / HKT
            </Text>
            {!ready ? (
              <Text>Loading your demo…</Text>
            ) : (
              <>
                {warning && <Text accessibilityRole="alert">{warning}</Text>}
                <SimulatorBar />
                <Slot />
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
