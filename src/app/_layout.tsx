import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useColorScheme } from 'react-native';

import { SessionProvider } from '@/features/account/session';
import { palettes } from '@/ui/theme';

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
            <Stack.Screen name="soon/[feature]" options={{ title: 'Yakında' }} />
          </Stack>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
