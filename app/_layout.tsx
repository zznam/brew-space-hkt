import { useEffect, useState } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { initializeStore, useAppStore } from '@/core/useAppStore';
import { SimulatorBar } from '@/components/SimulatorBar';
import { Badge, Card, colors, styles } from '@/components/ui';
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const role = useAppStore((s) => s.role);
  const onGallery = pathname === '/gallery';

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
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingVertical: 20,
            alignItems: 'center',
          }}
        >
          <View style={{ width: '100%', maxWidth: 1140, gap: 18 }}>
            <View
              style={[
                styles.rowBetween,
                {
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: colors.green,
                  }}
                />
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: colors.ink,
                    letterSpacing: -0.6,
                  }}
                >
                  BrewSpace
                </Text>
              </View>
              <View style={styles.row}>
                <Badge label="Cafe & Co-Work OS" tone="success" />
                <Badge label="Spatial 3D + POS + Guest" tone="neutral" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    onGallery
                      ? 'Close Journey Gallery'
                      : 'User Journeys Gallery'
                  }
                  onPress={() => {
                    if (onGallery) {
                      router.push(
                        (role === 'merchant'
                          ? '/merchant/live-floor'
                          : '/customer/explore') as never,
                      );
                    } else {
                      router.push('/gallery' as never);
                    }
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: onGallery ? colors.ink : colors.green,
                    backgroundColor: onGallery
                      ? colors.ink
                      : colors.greenSurface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: onGallery ? colors.surface : colors.green,
                    }}
                  >
                    {onGallery
                      ? '← Back to Workspace'
                      : 'User Journeys Gallery'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {!ready ? (
              <Card>
                <Text style={{ fontWeight: '700', color: colors.ink }}>
                  Loading your demo…
                </Text>
                <Text style={styles.text}>
                  Restoring local workspace state and 3D venue layouts.
                </Text>
              </Card>
            ) : (
              <>
                {warning && (
                  <View
                    style={{
                      backgroundColor: colors.amberSurface,
                      borderColor: colors.amberBorder,
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text
                      accessibilityRole="alert"
                      style={{ color: colors.amber, fontWeight: '600' }}
                    >
                      {warning}
                    </Text>
                  </View>
                )}
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
