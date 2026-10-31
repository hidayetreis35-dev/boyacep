import { Pressable, StyleSheet, View } from 'react-native';

import { msg, t } from '@/i18n';
import { AppText, Icon, type IconName } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

import type { SelectableRole } from './api';

const OPTIONS: { role: SelectableRole; title: string; text: string; icon: IconName }[] = [
  {
    role: 'homeowner',
    title: msg('Ev sahibiyim'),
    text: msg('Evimi boyatmak veya kendim boyamak istiyorum.'),
    icon: 'home',
  },
  {
    role: 'pro',
    title: msg('Ustayım'),
    text: msg('Boya ve tadilat işleri yapıyorum, teklif hazırlıyorum.'),
    icon: 'construct',
  },
];

export function RolePicker({
  selected,
  onToggle,
}: {
  selected: SelectableRole[];
  onToggle: (role: SelectableRole) => void;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: space.md }}>
      {OPTIONS.map((o) => {
        const on = selected.includes(o.role);
        return (
          <Pressable
            key={o.role}
            accessibilityRole="checkbox"
            aria-checked={on}
            accessibilityLabel={t(o.title)}
            onPress={() => onToggle(o.role)}
            style={[
              styles.option,
              { borderColor: on ? p.primary : p.border, backgroundColor: on ? p.primarySoft : p.surface },
            ]}>
            <View style={[styles.icon, { backgroundColor: on ? p.primary : p.surfaceMuted }]}>
              <Icon name={o.icon} color={on ? p.onPrimary : p.textMuted} size={26} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong">{t(o.title)}</AppText>
              <AppText variant="small" tone="muted">
                {t(o.text)}
              </AppText>
            </View>
            <Icon name={on ? 'checkmark-circle' : 'ellipse-outline'} color={on ? p.primary : p.border} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  icon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
