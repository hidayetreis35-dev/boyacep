import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { HOME_ACTIONS, type HomeAction } from '@/features/home/actions';
import { AppText, Badge, Icon, Screen } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

function ActionCard({ action }: { action: HomeAction }) {
  const p = usePalette();
  const ready = !!action.href;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${action.title}${ready ? '' : ', yakında'}`}
      onPress={() =>
        action.href
          ? router.push(action.href)
          : router.push({ pathname: '/soon/[feature]', params: { feature: action.key } })
      }
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? p.surfaceMuted : p.surface, borderColor: p.border },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: ready ? p.primarySoft : p.surfaceMuted }]}>
        <Icon name={action.icon} size={26} color={ready ? p.primary : p.textMuted} />
      </View>
      <AppText variant="bodyStrong">{action.title}</AppText>
      <AppText variant="caption" tone="muted">
        {action.subtitle}
      </AppText>
      {!ready && <Badge label="Yakında" />}
    </Pressable>
  );
}

export default function HomeScreen() {
  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">BoyaCep</AppText>
        <AppText tone="muted">Boyanı planla, hesapla, doğru malzemeyi al.</AppText>
      </View>
      <View style={styles.grid}>
        {HOME_ACTIONS.map((a) => (
          <View key={a.key} style={styles.cell}>
            <ActionCard action={a} />
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.sm / 2 },
  cell: { width: '50%', padding: space.sm / 2 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.xs, minHeight: 150 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
});
