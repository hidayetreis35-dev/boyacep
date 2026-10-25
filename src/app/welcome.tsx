import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { SelectableRole } from '@/features/account/api';
import { writeLocalRoles } from '@/features/account/local-role';
import { RolePicker } from '@/features/account/role-picker';
import { AppText, Button, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

export default function WelcomeScreen() {
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
      <View style={{ gap: space.sm, paddingTop: space.xl }}>
        <AppText variant="title">BoyaCep’e hoş geldin</AppText>
        <AppText tone="muted">Sana uygun ekranları gösterebilmemiz için kendini tanıt. İkisini birden de seçebilirsin; sonra profilinden değiştirebilirsin.</AppText>
      </View>
      <RolePicker selected={roles} onToggle={toggle} />
      <Button label="Başla" icon="arrow-forward" onPress={start} disabled={roles.length === 0} loading={saving} />
    </Screen>
  );
}
