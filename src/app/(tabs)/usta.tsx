import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { enableRoles, setActiveRole } from '@/features/account/api';
import { readLocalRoles, writeLocalRoles } from '@/features/account/local-role';
import { useAccount, useSession } from '@/features/account/session';
import { STATUS_LABEL } from '@/features/projects/mapping';
import { specialtyLabel, VERIFICATION_LABEL } from '@/features/pros/form';
import { useMyProProfile } from '@/features/pros/queries';
import { QUOTE_STATUS_LABEL } from '@/features/quotes/form';
import { useCreateQuote, useMyQuotes } from '@/features/quotes/queries';
import { normaliseInviteCode } from '@/features/sharing/api';
import { useRedeemInvite, useSharedProjects } from '@/features/sharing/queries';
import { formatDate } from '@/features/quotes/pdf';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListItem,
  LoadingState,
  Notice,
  Screen,
  TextField,
} from '@/ui/components';
import { space } from '@/ui/theme';

function BecomePro() {
  const { db, session } = useSession();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enable = async () => {
    if (!db || !session) return;
    setBusy(true);
    setError(null);
    try {
      await enableRoles(db, session.user.id, ['pro']);
      await setActiveRole(db, session.user.id, 'pro');
      const local = (await readLocalRoles()) ?? [];
      if (!local.includes('pro')) await writeLocalRoles([...local, 'pro']);
      await queryClient.invalidateQueries({ queryKey: ['account', session.user.id] });
    } catch {
      setError('Usta rolü açılamadı. İnternet bağlantını kontrol et.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <EmptyState
      icon="construct"
      title="Usta musun?"
      message="Usta rolünü açınca profilini oluşturabilir, ev sahiplerinin paylaştığı projeleri görebilir ve PDF teklif hazırlayabilirsin."
      action={
        <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
          <Button label="Usta rolünü aç" icon="construct" loading={busy} onPress={enable} />
          {error ? (
            <Notice tone="danger" icon="alert-circle">
              {error}
            </Notice>
          ) : null}
        </View>
      }
    />
  );
}

function ProfileCard() {
  const profile = useMyProProfile();
  if (profile.isPending) return <LoadingState />;
  if (profile.isError) return <ErrorState message="Usta profili yüklenemedi." onRetry={() => profile.refetch()} />;
  if (!profile.data) {
    return (
      <Card>
        <AppText variant="heading">Usta profilini oluştur</AppText>
        <AppText tone="muted">Adın, çalıştığın bölge ve uzmanlıkların tekliflerinde ve müşterilerinin ekranında görünür.</AppText>
        <Button label="Profili oluştur" icon="person-add" onPress={() => router.push('/usta/profile')} />
      </Card>
    );
  }
  const p = profile.data;
  return (
    <ListItem
      title={p.business_name || p.full_name}
      subtitle={`${p.city} · ${p.specialties.map(specialtyLabel).join(', ')}`}
      accessibilityLabel="Usta profilini düzenle"
      onPress={() => router.push('/usta/profile')}>
      <View style={{ flexDirection: 'row' }}>
        <Badge label={VERIFICATION_LABEL[p.verification_status]} tone={p.verification_status === 'verified' ? 'success' : 'muted'} />
      </View>
    </ListItem>
  );
}

function JoinProject() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const redeem = useRedeemInvite();
  const join = () => {
    const normalised = normaliseInviteCode(code);
    if (!normalised) {
      setError('Kod 8 karakterdir. Örnek: BOYA-2345');
      return;
    }
    setError(undefined);
    redeem.mutate(normalised, {
      onSuccess: (projectId) => {
        setCode('');
        router.push({ pathname: '/usta/project/[id]', params: { id: projectId } });
      },
    });
  };
  return (
    <Card>
      <AppText variant="heading">Paylaşım kodu gir</AppText>
      <AppText tone="muted">Ev sahibi projesini seninle paylaşınca sana bir kod verir.</AppText>
      <TextField
        label="Kod"
        value={code}
        placeholder="BOYA-2345"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={11}
        error={error ?? (redeem.isError ? redeem.error.message : undefined)}
        onChangeText={setCode}
        onSubmitEditing={join}
        testID="invite-code"
      />
      <Button label="Projeye katıl" icon="enter" loading={redeem.isPending} onPress={join} />
    </Card>
  );
}

function SharedProjects() {
  const shared = useSharedProjects();
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="heading">Paylaşılan projeler</AppText>
      {shared.isPending ? (
        <LoadingState />
      ) : shared.isError ? (
        <ErrorState message="Projeler yüklenemedi." onRetry={() => shared.refetch()} />
      ) : shared.data.length === 0 ? (
        <AppText tone="muted">Henüz seninle paylaşılan bir proje yok.</AppText>
      ) : (
        shared.data.map((p) => (
          <ListItem
            key={p.id}
            title={p.title}
            subtitle={`${p.owner_name} · ${STATUS_LABEL[p.status]}`}
            onPress={() => router.push({ pathname: '/usta/project/[id]', params: { id: p.id } })}
          />
        ))
      )}
    </View>
  );
}

function Quotes() {
  const quotes = useMyQuotes();
  const create = useCreateQuote();
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="heading">Tekliflerim</AppText>
      <Button
        label="Yeni teklif"
        icon="add"
        variant="secondary"
        loading={create.isPending}
        onPress={() =>
          create.mutate({ title: 'Boya işçiliği teklifi' }, { onSuccess: (q) => router.push({ pathname: '/quotes/[id]', params: { id: q.id } }) })
        }
      />
      {create.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {create.error.message}
        </Notice>
      ) : null}
      {quotes.isPending ? (
        <LoadingState />
      ) : quotes.isError ? (
        <ErrorState message="Teklifler yüklenemedi." onRetry={() => quotes.refetch()} />
      ) : quotes.data.length === 0 ? (
        <AppText tone="muted">Henüz teklif yok. Paylaşılan bir projeden ya da buradan teklif hazırlayabilirsin.</AppText>
      ) : (
        quotes.data.map((q) => (
          <ListItem
            key={q.id}
            title={`#${q.number} ${q.title}`}
            subtitle={[q.customer_name, formatDate(q.created_at)].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/quotes/[id]', params: { id: q.id } })}>
            <View style={{ flexDirection: 'row' }}>
              <Badge
                label={QUOTE_STATUS_LABEL[q.status]}
                tone={q.status === 'accepted' ? 'success' : q.status === 'sent' ? 'primary' : 'muted'}
              />
            </View>
          </ListItem>
        ))
      )}
    </View>
  );
}

export default function UstaScreen() {
  const { db, session, loading } = useSession();
  const account = useAccount();

  let body;
  if (loading) body = <LoadingState />;
  else if (!db) {
    body = <EmptyState icon="cloud-offline" title="Sunucu bağlı değil" message="Usta araçları hesap gerektirir; sunucu bağlantısı kurulunca açılacak." />;
  } else if (!session) {
    body = (
      <EmptyState
        icon="construct"
        title="Usta araçları"
        message="Teklif hazırlamak ve paylaşılan projeleri görmek için giriş yap."
        action={<Button label="Giriş yap" icon="log-in" onPress={() => router.push('/sign-in')} />}
      />
    );
  } else if (account.isPending) body = <LoadingState />;
  else if (account.isError) body = <ErrorState message="Hesap yüklenemedi." onRetry={() => account.refetch()} />;
  else if (!account.data.roles.includes('pro')) body = <BecomePro />;
  else {
    body = (
      <>
        <ProfileCard />
        <JoinProject />
        <SharedProjects />
        <Quotes />
      </>
    );
  }

  return (
    <Screen>
      <AppText variant="title">Usta</AppText>
      <View style={{ gap: space.lg }}>{body}</View>
    </Screen>
  );
}
