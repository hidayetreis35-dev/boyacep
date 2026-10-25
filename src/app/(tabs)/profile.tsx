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
import { readLocalRoles, writeLocalRoles } from '@/features/account/local-role';
import { PrivacyActions } from '@/features/account/privacy-actions';
import { RolePicker } from '@/features/account/role-picker';
import { useAccount, useSession } from '@/features/account/session';
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
        <AppText variant="heading">Hesabın yok</AppText>
        <AppText tone="muted">
          {hasBackend
            ? 'Projelerini kaydetmek ve her cihazdan görmek için giriş yap.'
            : 'Hesap sistemi henüz bağlı değil. Boya Hesapla hesapsız çalışıyor.'}
        </AppText>
        {hasBackend ? <Button label="Giriş yap / Hesap aç" icon="log-in" onPress={() => router.push('/sign-in')} /> : null}
      </Card>
      <AppText variant="heading">Rolün</AppText>
      <RolePicker selected={roles} onToggle={toggle} />
      <Button label="Gizlilik bilgileri" icon="shield-checkmark" variant="ghost" onPress={() => router.push('/privacy')} />
    </>
  );
}

function NameEditor({ initial, onSave }: { initial: string; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <TextField label="Adın" value={name} onChangeText={setName} maxLength={80} autoCapitalize="words" testID="display-name" />
      <Button
        label="Adı kaydet"
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
    return <ErrorState message="Profil yüklenemedi. İnternet bağlantını kontrol et." onRetry={() => account.refetch()} />;
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
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = (role: SelectableRole) =>
    run(async () => {
      if (selectable.includes(role)) {
        if (selectable.length === 1) throw new Error('En az bir rolün olmalı.');
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

      <AppText variant="heading">Rollerin</AppText>
      <RolePicker selected={selectable} onToggle={toggleRole} />
      {selectable.length > 1 ? (
        <ChoiceChips
          label="Uygulama hangi rolle açılsın?"
          options={selectable.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          value={(account.data.profile.active_role as SelectableRole | null) ?? selectable[0]}
          onChange={(r) => run(() => setActiveRole(db, userId, r))}
        />
      ) : null}

      <Button label="Planlar" icon="star" variant="ghost" onPress={() => router.push('/plans')} />
      {roles.includes('admin') ? (
        <Button label="Yönetim paneli" icon="settings" variant="secondary" onPress={() => router.push('/admin')} />
      ) : null}

      {error ? (
        <Notice tone="danger" icon="alert-circle">
          {error}
        </Notice>
      ) : null}

      <Button label="Çıkış yap" icon="log-out" variant="ghost" loading={busy} onPress={() => run(() => signOut(db))} />
      <PrivacyActions db={db} userId={userId} />
    </>
  );
}

export default function ProfileScreen() {
  const { db, session, loading } = useSession();
  return (
    <Screen>
      <AppText variant="title">Profil</AppText>
      <View style={{ gap: space.lg }}>
        {loading ? <LoadingState /> : session ? <AccountProfile /> : <GuestProfile hasBackend={!!db} />}
      </View>
    </Screen>
  );
}
