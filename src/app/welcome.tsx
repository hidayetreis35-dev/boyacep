import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SelectableRole } from '@/features/account/api';
import { writeLocalRoles } from '@/features/account/local-role';
import { RolePicker } from '@/features/account/role-picker';
import { msg, t } from '@/i18n';
import { Gradient, PaintDrops, SectionTitle } from '@/ui/brand';
import { AppText, Button, Icon, Screen, type IconName } from '@/ui/components';
import { radius, shadowOf, space, usePalette } from '@/ui/theme';

const PROMISES: { icon: IconName; text: string }[] = [
  { icon: 'calculator', text: msg('Ne kadar boya ve malzeme gerektiğini adım adım hesapla') },
  { icon: 'color-palette', text: msg('Renkleri keşfet, odanın fotoğrafında dene') },
  { icon: 'construct', text: msg('Duvarındaki sorunu anla, doğru iş sırasını öğren') },
];

export default function WelcomeScreen() {
  const p = usePalette();
  const [roles, setRoles] = useState<SelectableRole[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (role: SelectableRole) =>
    setRoles((current) => (current.includes(role) ? current.filter((r) => r !== role) : [...current, role]));

  const start = async () => {
    setSaving(true);
    await writeLocalRoles(roles);
    router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={[styles.hero, shadowOf(p, 2)]}>
        <Gradient from={p.heroFrom} to={p.heroTo} />
        <PaintDrops colours={['#FF6B2C', '#C2367A', '#D99A1E']} style={{ opacity: 0.9 }} />
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: p.cta }]}>
            <Icon name="color-fill" size={16} color={p.onCta} />
          </View>
          <AppText variant="overline" style={{ color: p.onHeroMuted }}>
            BoyaCep
          </AppText>
        </View>
        <AppText variant="display" style={{ color: p.onHero, paddingRight: 72 }}>
          {t('BoyaCep’e hoş geldin')}
        </AppText>
        <View style={{ gap: space.sm, marginTop: space.xs }}>
          {PROMISES.map((item) => (
            <View key={item.icon} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <View style={[styles.promiseIcon, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
                <Icon name={item.icon} size={16} color={p.onHero} />
              </View>
              <AppText variant="small" style={{ color: p.onHero, flex: 1 }}>
                {t(item.text)}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: space.xs }}>
        <SectionTitle title={t('Seni tanıyalım')} />
        <AppText tone="muted">{t('Sana uygun ekranları gösterebilmemiz için seç. İkisini birden de seçebilirsin; sonra profilinden değiştirebilirsin.')}</AppText>
      </View>
      <RolePicker selected={roles} onToggle={toggle} />
      <Button label={t('Başla')} icon="arrow-forward" variant="cta" size="lg" onPress={start} disabled={roles.length === 0} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.sm, overflow: 'hidden' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brandMark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  promiseIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
