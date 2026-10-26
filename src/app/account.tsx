import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  disableRole,
  enableRoles,
  ROLE_LABEL,
  setActiveRole,
  signOut,
  updateDisplayName,
  type SelectableRole,
} from '@/features/account/api';
import { LanguagePicker } from '@/features/account/language-picker';
import { readLocalRoles, writeLocalRoles } from '@/features/account/local-role';
import { PrivacyActions } from '@/features/account/privacy-actions';
import { RolePicker } from '@/features/account/role-picker';
import { useAccount, useSession } from '@/features/account/session';
import { CitySetting } from '@/features/market/components';
import { t } from '@/i18n';
import {
  AppText,
  Button,
  Card,
  ChoiceChips,
  ErrorState,
  LoadingState,
  Notice,
  Screen,
  TextField,
} from '@/ui/components';
import { space } from '@/ui/theme';

/** Signed out: the role choice lives on the device only. */
function GuestProfile({ hasBackend }: { hasBackend: boolean }) {
  const [roles, setRoles] = useState<SelectableRole[]>([]);
  useEffect(() => {
    readLocalRoles().then((r) => setRoles(r ?? []));
  }, []);

  const toggle = (role: SelectableRole) => {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    if (next.length === 0) return;
    setRoles(next);
    writeLocalRoles(next);
  };

  return (
    <>
      <Card>
        <AppText variant="heading">{t('Hesabın yok')}</AppText>
        <AppText tone="muted">
          {hasBackend
            ? t('Projelerini kaydetmek ve her cihazdan görmek için giriş yap.')
            : t('Hesap sistemi henüz bağlı değil. Ne Kadar Boya? hesapsız çalışıyor.')}
        </AppText>
        {hasBackend ? <Button label={t('Giriş yap / Hesap aç')} icon="log-in" onPress={() => router.push('/sign-in')} /> : null}
      </Card>
      <AppText variant="heading">{t('Rolün')}</AppText>
      <RolePicker selected={roles} onToggle={toggle} />
      <Button label={t('Gizlilik bilgileri')} icon="shield-checkmark" variant="ghost" onPress={() => router.push('/privacy')} />
    </>
  );
}

function NameEditor({ initial, onSave }: { initial: string; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <TextField label={t('Adın')} value={name} onChangeText={setName} maxLength={80} autoCapitalize="words" testID="display-name" />
      <Button
        label={t('Adı kaydet')}
        variant="secondary"
        loading={busy}
        disabled={name.trim() === initial.trim()}
        onPress={async () => {
          setBusy(true);
          await onSave(name);
          setBusy(false);
        }}
      />
    </>
  );
}

function AccountProfile() {
  const { db, session } = useSession();
  const account = useAccount();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (account.isPending) return <LoadingState />;
  if (account.isError || !db || !session) {
    return <ErrorState message={t('Profil yüklenemedi. İnternet bağlantını kontrol et.')} onRetry={() => account.refetch()} />;
  }

  const userId = session.user.id;
  const { roles } = account.data;
  const selectable = roles.filter((r): r is SelectableRole => r !== 'admin');

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
      await queryClient.invalidateQueries({ queryKey: ['account', userId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Kaydedilemedi.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = (role: SelectableRole) =>
    run(async () => {
      if (selectable.includes(role)) {
        if (selectable.length === 1) throw new Error(t('En az bir rolün olmalı.'));
        if (account.data.profile.active_role === role) {
          await setActiveRole(db, userId, selectable.find((r) => r !== role)!);
        }
        await disableRole(db, userId, role);
        await writeLocalRoles(selectable.filter((r) => r !== role));
      } else {
        await enableRoles(db, userId, [role]);
        await writeLocalRoles([...selectable, role]);
      }
    });

  return (
    <>
      <Card>
        <AppText variant="small" tone="muted">
          {session.user.email}
        </AppText>
        <NameEditor
          key={account.data.profile.updated_at}
          initial={account.data.profile.display_name ?? ''}
          onSave={(name) => run(() => updateDisplayName(db, userId, name))}
        />
      </Card>

      <AppText variant="heading">{t('Rollerin')}</AppText>
      <RolePicker selected={selectable} onToggle={toggleRole} />
      {selectable.length > 1 ? (
        <ChoiceChips
          label={t('Uygulama hangi rolle açılsın?')}
          options={selectable.map((r) => ({ value: r, label: t(ROLE_LABEL[r]) }))}
          value={(account.data.profile.active_role as SelectableRole | null) ?? selectable[0]}
          onChange={(r) => run(() => setActiveRole(db, userId, r))}
        />
      ) : null}

      {roles.includes('admin') ? (
        <Button label={t('Yönetim paneli')} icon="settings" variant="secondary" onPress={() => router.push('/admin')} />
      ) : null}

      {error ? (
        <Notice tone="danger" icon="alert-circle">
          {error}
        </Notice>
      ) : null}

      <Button label={t('Çıkış yap')} icon="log-out" variant="ghost" loading={busy} onPress={() => run(() => signOut(db))} />
      <PrivacyActions db={db} userId={userId} />
    </>
  );
}

/** "Hesap Bilgileri": name, roles, sign out, data export and account deletion. */
export default function AccountScreen() {
  const { db, session, loading } = useSession();
  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: space.lg }}>
        {loading ? <LoadingState /> : session ? <AccountProfile /> : <GuestProfile hasBackend={!!db} />}
        <LanguagePicker />
        <CitySetting />
      </View>
    </Screen>
  );
}
