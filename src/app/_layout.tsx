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
            <Stack.Screen name="soon/[feature]" options={{ title: 'Yakında' }} />
          </Stack>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
