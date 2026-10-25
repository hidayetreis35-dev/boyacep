import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider, usePathname, type ErrorBoundaryProps } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';

import { SessionProvider } from '@/features/account/session';
import { t } from '@/i18n';
import { LocaleProvider, useLocale } from '@/i18n/provider';
import { reportError } from '@/lib/report-error';
import { AppText, Button } from '@/ui/components';
import { fonts, palettes, space } from '@/ui/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

/** Shown instead of a crashed screen; the crash is reported for signed-in users. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const pathname = usePathname();
  const p = palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
  useEffect(() => {
    reportError(error, pathname);
  }, [error, pathname]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl, backgroundColor: p.background }}>
      <AppText variant="title" style={{ textAlign: 'center' }}>
        {t('Bir şeyler ters gitti')}
      </AppText>
      <AppText tone="muted" style={{ textAlign: 'center' }}>
        {t('Bu ekran beklenmedik bir hata verdi. Hatayı kaydettik. Tekrar dene; sorun sürerse uygulamayı kapatıp aç.')}
      </AppText>
      <Button label={t('Tekrar dene')} icon="refresh" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <LocaleProvider>
      <App />
    </LocaleProvider>
  );
}

/** Rendered inside LocaleProvider, so a language switch re-renders every title. */
function App() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const p = palettes[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const { ready: localeReady } = useLocale();
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  // If a font fails to load the system font is used; the app still opens.
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const ready = (fontsLoaded || !!fontError) && localeReady;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider
          value={{
            ...base,
            colors: { ...base.colors, primary: p.primary, background: p.background, card: p.surface, text: p.text, border: p.border },
          }}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerBackTitle: t('Geri'),
              headerTintColor: p.text,
              headerTitleStyle: { color: p.text, fontFamily: fonts.bold, fontSize: 17 },
              headerShadowVisible: false,
              headerStyle: { backgroundColor: p.background },
              contentStyle: { backgroundColor: p.background },
              animation: 'slide_from_right',
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="sign-in" options={{ title: t('Giriş yap') }} />
            <Stack.Screen name="calculate" options={{ title: t('Ne Kadar Boya?') }} />
            <Stack.Screen name="projects/[id]/index" options={{ title: t('Proje') }} />
            <Stack.Screen name="projects/[id]/room" options={{ title: t('Oda') }} />
            <Stack.Screen name="projects/[id]/cost" options={{ title: t('Malzeme ve maliyet') }} />
            <Stack.Screen name="projects/[id]/share" options={{ title: t('Ustayla paylaş') }} />
            <Stack.Screen name="projects/[id]/survey" options={{ title: t('Keşif dosyası') }} />
            <Stack.Screen name="cost" options={{ title: t('Maliyet Hesapla') }} />
            <Stack.Screen name="usta/profile" options={{ title: t('Usta profili') }} />
            <Stack.Screen name="usta/project/[id]" options={{ title: t('Paylaşılan proje') }} />
            <Stack.Screen name="usta/survey/[id]" options={{ title: t('Keşif dosyası') }} />
            <Stack.Screen name="quotes/[id]" options={{ title: t('Teklif') }} />
            <Stack.Screen name="admin/pros" options={{ title: t('Usta doğrulama') }} />
            <Stack.Screen name="colour" options={{ title: t('Renk Stüdyosu') }} />
            <Stack.Screen name="inspect" options={{ title: t('Duvarını İncele') }} />
            <Stack.Screen name="guide/index" options={{ title: t('Boya Rehberi') }} />
            <Stack.Screen name="guide/[slug]" options={{ title: t('Rehber') }} />
            <Stack.Screen name="admin/index" options={{ title: t('Yönetim paneli') }} />
            <Stack.Screen name="admin/guide/[id]" options={{ title: t('Yazı düzenle') }} />
            <Stack.Screen name="privacy" options={{ title: t('Gizlilik') }} />
            <Stack.Screen name="plans" options={{ title: t('Planlar') }} />
            <Stack.Screen name="ask/index" options={{ title: t('Ustaya Sor') }} />
            <Stack.Screen name="ask/[id]" options={{ title: t('Soru') }} />
            <Stack.Screen name="admin/questions" options={{ title: t('Bekleyen sorular') }} />
            <Stack.Screen name="soon/[feature]" options={{ title: t('Yakında') }} />
          </Stack>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
