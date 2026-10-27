import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useGuides } from '@/features/guide/api';
import { t } from '@/i18n';
import { AppText, Icon } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { fonts, radius, shadowOf, space, type as typeScale, useFeatureColour, usePalette } from '@/ui/theme';

import { KIND_LABEL, searchApp, type SearchHit } from './search';

function HitRow({ hit, onOpen }: { hit: SearchHit; onOpen: (hit: SearchHit) => void }) {
  const p = usePalette();
  const f = useFeatureColour(hit.feature);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${hit.title}, ${t(KIND_LABEL[hit.kind])}`}
      onPress={() => onOpen(hit)}
      style={styles.hit}>
      {hit.swatch ? (
        <View style={[styles.hitIcon, { backgroundColor: hit.swatch, borderWidth: StyleSheet.hairlineWidth, borderColor: p.border }]} />
      ) : (
        <View style={[styles.hitIcon, { backgroundColor: f.soft }]}>
          <Icon name={hit.icon} size={18} color={f.ink} />
        </View>
      )}
      <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
        {hit.title}
      </AppText>
      <AppText variant="caption" tone="muted">
        {t(KIND_LABEL[hit.kind])}
      </AppText>
    </PressableScale>
  );
}

/**
 * "Ne yapmak istiyorsun?" search on the home screen. Results appear under the
 * field as you type; nothing is sent anywhere.
 */
export function SearchBox({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const p = usePalette();
  const guides = useGuides();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const hits = searchApp(query, guides.data ?? []);
  const active = query.trim().length >= 2;

  const change = (text: string) => {
    setQuery(text);
    onActiveChange?.(text.trim().length >= 2);
  };
  const open = (hit: SearchHit) => {
    change('');
    router.push(hit.href);
  };

  return (
    <View style={{ gap: space.sm }}>
      <View style={[styles.field, { backgroundColor: p.surface, borderColor: focused ? p.primary : p.border }]}>
        <Icon name="search" size={20} color={p.primary} />
        <TextInput
          accessibilityLabel={t('Uygulamada ara')}
          testID="home-search"
          value={query}
          onChangeText={change}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t('Salon boyamak, renk bulmak…')}
          placeholderTextColor={p.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          style={[styles.input, typeScale.body, { color: p.text }]}
        />
        {query ? (
          <PressableScale accessibilityRole="button" accessibilityLabel={t('Aramayı temizle')} onPress={() => change('')} hitSlop={8} style={styles.clear}>
            <Icon name="close-circle" size={20} color={p.textMuted} />
          </PressableScale>
        ) : null}
      </View>
      {active ? (
        <View style={[styles.results, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p, 2)]} testID="search-results">
          {hits.length > 0 ? (
            hits.map((hit, i) => (
              <View key={hit.key} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border } : null}>
                <HitRow hit={hit} onOpen={open} />
              </View>
            ))
          ) : (
            <View style={{ padding: space.lg, gap: 4 }}>
              <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
                {t('“{query}” için bir şey bulamadık.', { query: query.trim() })}
              </AppText>
              <AppText variant="small" tone="muted">
                {t('“Salon”, “nem” ya da bir renk adı yazmayı dene.')}
              </AppText>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, borderWidth: 1, borderRadius: radius.md + 2, paddingHorizontal: space.md + 2, minHeight: 50 },
  input: { flex: 1, minHeight: 48, paddingVertical: 0 },
  clear: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  results: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  hit: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md + 2, minHeight: 56 },
  hitIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
