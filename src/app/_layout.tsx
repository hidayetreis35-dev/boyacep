import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider, usePathname, type ErrorBoundaryProps } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';

import { SessionProvider } from '@/features/account/session';
import { reportError } from '@/lib/report-error';
import { AppText, Button } from '@/ui/components';
import { palettes, space } from '@/ui/theme';

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
        Bir şeyler ters gitti
      </AppText>
      <AppText tone="muted" style={{ textAlign: 'center' }}>
        Bu ekran beklenmedik bir hata verdi. Hatayı kaydettik. Tekrar dene; sorun sürerse uygulamayı kapatıp aç.
      </AppText>
      <Button label="Tekrar dene" icon="refresh" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const p = palettes[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider
          value={{
            ...base,
            colors: { ...base.colors, primary: p.primary, background: p.background, card: p.surface, text: p.text, border: p.border },
          }}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerBackTitle: 'Geri', headerTintColor: p.primary, headerTitleStyle: { color: p.text } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="sign-in" options={{ title: 'Giriş yap' }} />
            <Stack.Screen name="calculate" options={{ title: 'Boya Hesapla' }} />
            <Stack.Screen name="projects/[id]/index" options={{ title: 'Proje' }} />
            <Stack.Screen name="projects/[id]/room" options={{ title: 'Oda' }} />
            <Stack.Screen name="projects/[id]/cost" options={{ title: 'Malzeme ve maliyet' }} />
            <Stack.Screen name="projects/[id]/share" options={{ title: 'Ustayla paylaş' }} />
            <Stack.Screen name="cost" options={{ title: 'Maliyet Hesapla' }} />
            <Stack.Screen name="usta/profile" options={{ title: 'Usta profili' }} />
            <Stack.Screen name="usta/project/[id]" options={{ title: 'Paylaşılan proje' }} />
            <Stack.Screen name="quotes/[id]" options={{ title: 'Teklif' }} />
            <Stack.Screen name="admin/pros" options={{ title: 'Usta doğrulama' }} />
            <Stack.Screen name="colour" options={{ title: 'Rengini Dene' }} />
            <Stack.Screen name="inspect" options={{ title: 'Duvarını İncele' }} />
            <Stack.Screen name="guide/index" options={{ title: 'Boya Rehberi' }} />
            <Stack.Screen name="guide/[slug]" options={{ title: 'Rehber' }} />
            <Stack.Screen name="admin/index" options={{ title: 'Yönetim paneli' }} />
            <Stack.Screen name="admin/guide/[id]" options={{ title: 'Yazı düzenle' }} />
            <Stack.Screen name="privacy" options={{ title: 'Gizlilik' }} />
            <Stack.Screen name="plans" options={{ title: 'Planlar' }} />
            <Stack.Screen name="ask/index" options={{ title: 'Ustaya Sor' }} />
            <Stack.Screen name="ask/[id]" options={{ title: 'Soru' }} />
            <Stack.Screen name="admin/questions" options={{ title: 'Bekleyen sorular' }} />
            <Stack.Screen name="soon/[feature]" options={{ title: 'Yakında' }} />
          </Stack>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
