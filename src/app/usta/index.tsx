import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { enableRoles, setActiveRole } from '@/features/account/api';
import { readLocalRoles, writeLocalRoles } from '@/features/account/local-role';
import { useAccount, useSession } from '@/features/account/session';
import { SignInGate } from '@/features/account/sign-in-gate';
import { STATUS_LABEL } from '@/features/projects/mapping';
import { specialtyLabel, VERIFICATION_LABEL } from '@/features/pros/form';
import { useMyProProfile } from '@/features/pros/queries';
import { QUOTE_STATUS_LABEL } from '@/features/quotes/form';
import { useCreateQuote, useMyQuotes } from '@/features/quotes/queries';
import { normaliseInviteCode } from '@/features/sharing/api';
import { useRedeemInvite, useSharedProjects } from '@/features/sharing/queries';
import { formatDate } from '@/features/quotes/pdf';
import { t } from '@/i18n';
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
      setError(t('Usta rolü açılamadı. İnternet bağlantını kontrol et.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <EmptyState
      icon="construct"
      title={t('Usta musun?')}
      message={t('Usta rolünü açınca profilini oluşturabilir, ev sahiplerinin paylaştığı projeleri görebilir ve PDF teklif hazırlayabilirsin.')}
      action={
        <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
          <Button label={t('Usta rolünü aç')} icon="construct" loading={busy} onPress={enable} />
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
  if (profile.isError) return <ErrorState message={t('Usta profili yüklenemedi.')} onRetry={() => profile.refetch()} />;
  if (!profile.data) {
    return (
      <Card>
        <AppText variant="heading">{t('Usta profilini oluştur')}</AppText>
        <AppText tone="muted">{t('Adın, çalıştığın bölge ve uzmanlıkların tekliflerinde ve müşterilerinin ekranında görünür.')}</AppText>
        <Button label={t('Profili oluştur')} icon="person-add" onPress={() => router.push('/usta/profile')} />
      </Card>
    );
  }
  const p = profile.data;
  return (
    <ListItem
      title={p.business_name || p.full_name}
      subtitle={`${p.city} · ${p.specialties.map(specialtyLabel).join(', ')}`}
      accessibilityLabel={t('Usta profilini düzenle')}
      onPress={() => router.push('/usta/profile')}>
      <View style={{ flexDirection: 'row' }}>
        <Badge label={t(VERIFICATION_LABEL[p.verification_status])} tone={p.verification_status === 'verified' ? 'success' : 'muted'} />
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
      setError(t('Kod 8 karakterdir. Örnek: BOYA-2345'));
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
      <AppText variant="heading">{t('Paylaşım kodu gir')}</AppText>
      <AppText tone="muted">{t('Ev sahibi projesini seninle paylaşınca sana bir kod verir.')}</AppText>
      <TextField
        label={t('Kod')}
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
      <Button label={t('Projeye katıl')} icon="enter" loading={redeem.isPending} onPress={join} />
    </Card>
  );
}

function SharedProjects() {
  const shared = useSharedProjects();
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="heading">{t('Paylaşılan projeler')}</AppText>
      {shared.isPending ? (
        <LoadingState />
      ) : shared.isError ? (
        <ErrorState message={t('Projeler yüklenemedi.')} onRetry={() => shared.refetch()} />
      ) : shared.data.length === 0 ? (
        <AppText tone="muted">{t('Henüz seninle paylaşılan bir proje yok.')}</AppText>
      ) : (
        shared.data.map((p) => (
          <ListItem
            key={p.id}
            title={p.title}
            subtitle={`${p.owner_name} · ${t(STATUS_LABEL[p.status])}`}
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
      <AppText variant="heading">{t('Tekliflerim')}</AppText>
      <Button
        label={t('Yeni teklif')}
        icon="add"
        variant="secondary"
        loading={create.isPending}
        onPress={() =>
          create.mutate({ title: t('Boya işçiliği teklifi') }, { onSuccess: (q) => router.push({ pathname: '/quotes/[id]', params: { id: q.id } }) })
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
        <ErrorState message={t('Teklifler yüklenemedi.')} onRetry={() => quotes.refetch()} />
      ) : quotes.data.length === 0 ? (
        <AppText tone="muted">{t('Henüz teklif yok. Paylaşılan bir projeden ya da buradan teklif hazırlayabilirsin.')}</AppText>
      ) : (
        quotes.data.map((q) => (
          <ListItem
            key={q.id}
            title={`#${q.number} ${q.title}`}
            subtitle={[q.customer_name, formatDate(q.created_at)].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/quotes/[id]', params: { id: q.id } })}>
            <View style={{ flexDirection: 'row' }}>
              <Badge
                label={t(QUOTE_STATUS_LABEL[q.status])}
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
    body = <EmptyState icon="cloud-offline" title={t('Sunucu bağlı değil')} message={t('Usta araçları hesap gerektirir; sunucu bağlantısı kurulunca açılacak.')} />;
  } else if (!session) {
    body = (
      <SignInGate
        feature="cost"
        icon="construct"
        title={t('Usta araçları')}
        message={t('Boya ustaları için teklif ve iş takibi.')}
        benefits={[
          t('Ev sahibinin paylaştığı ölçüleri ve malzeme listesini gör.'),
          t('Dakikalar içinde PDF teklif hazırla ve gönder.'),
          t('Usta profilinle güven ver.'),
        ]}
      />
    );
  } else if (account.isPending) body = <LoadingState />;
  else if (account.isError) body = <ErrorState message={t('Hesap yüklenemedi.')} onRetry={() => account.refetch()} />;
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
    <Screen edges={['bottom']}>
      <View style={{ gap: space.lg }}>{body}</View>
    </Screen>
  );
}
