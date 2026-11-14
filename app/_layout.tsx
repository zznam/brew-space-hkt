import { useEffect, useState } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { initializeStore, useAppStore } from '@/core/useAppStore';
import { SimulatorBar } from '@/components/SimulatorBar';
import { Badge, Card, colors, styles, useResponsive } from '@/components/ui';
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const role = useAppStore((s) => s.role);
  const { isWide } = useResponsive();
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: isWide ? 20 : 12,
              paddingVertical: isWide ? 18 : 12,
              alignItems: 'center',
            }}
          >
            <View style={{ width: '100%', maxWidth: 1080, gap: 12 }}>
              <View
                style={[
                  styles.rowBetween,
                  {
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.green,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 19,
                      fontWeight: '800',
                      color: colors.ink,
                      letterSpacing: -0.5,
                    }}
                  >
                    BrewSpace
                  </Text>
                </View>

                <View style={styles.row}>
                  {isWide ? (
                    <Badge label="Cafe & Co-Work OS" tone="success" />
                  ) : null}
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
                      minHeight: 38,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: onGallery ? colors.ink : colors.green,
                      backgroundColor: onGallery
                        ? colors.ink
                        : colors.greenSurface,
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: onGallery ? colors.surface : colors.green,
                      }}
                    >
                      {onGallery ? '← Back to App' : 'User Journeys Gallery'}
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
