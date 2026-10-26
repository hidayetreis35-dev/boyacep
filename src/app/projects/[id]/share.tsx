import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import { VERIFICATION_LABEL } from '@/features/pros/form';
import { formatDate } from '@/features/quotes/pdf';
import { formatInviteCode, isInviteActive } from '@/features/sharing/api';
import { useProjectSharing, useSharingActions } from '@/features/sharing/queries';
import { t } from '@/i18n';
import { AppText, Badge, Button, Card, ErrorState, LoadingState, Notice, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

export default function ShareProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sharing = useProjectSharing(id);
  const actions = useSharingActions(id);
  const [removing, setRemoving] = useState<string | null>(null);

  if (sharing.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (sharing.isError) {
    return <Screen edges={['bottom']}><ErrorState message={t('Paylaşım bilgileri yüklenemedi.')} onRetry={() => sharing.refetch()} /></Screen>;
  }
  const active = sharing.data.invites.filter((i) => isInviteActive(i));
  const { members } = sharing.data;

  const share = (code: string) =>
    Share.share({
      message: t('BoyaCep projemi seninle paylaşıyorum. Uygulamada Usta sekmesinden bu kodu gir: {code}', { code: formatInviteCode(code) }),
    }).catch(() => undefined);

  return (
    <Screen edges={['bottom']}>
      <Card>
        <AppText variant="heading">{t('Projeni bir ustayla paylaş')}</AppText>
        <AppText tone="muted">
          {t('Usta; odalarını, ölçülerini, malzeme listeni ve fotoğraflarını görür, sana uygulama içinden teklif gönderir. Bütçeni ve maliyet notlarını göremez. Erişimi istediğin zaman kaldırabilirsin.')}
        </AppText>
      </Card>

      {active.length === 0 ? (
        <Button label={t('Paylaşım kodu oluştur')} icon="key" loading={actions.create.isPending} onPress={() => actions.create.mutate()} />
      ) : (
        active.map((invite) => (
          <Card key={invite.id}>
            <AppText variant="small" tone="muted">
              {t('Paylaşım kodu')}
            </AppText>
            <AppText variant="number" tone="primary" selectable accessibilityLabel={t('Kod {code}', { code: invite.code.split('').join(' ') })}>
              {formatInviteCode(invite.code)}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t('Son geçerlilik: {date}. Bu kodla en fazla {count} usta katılabilir ({uses} katıldı). Sadece güvendiğin kişilere gönder.', {
                date: formatDate(invite.expires_at),
                count: invite.max_uses,
                uses: invite.uses,
              })}
            </AppText>
            <Button label={t('Kodu gönder')} icon="share-social" onPress={() => share(invite.code)} />
            <Button
              label={t('Kodu iptal et')}
              icon="close-circle"
              variant="ghost"
              loading={actions.revoke.isPending && actions.revoke.variables === invite.id}
              onPress={() => actions.revoke.mutate(invite.id)}
            />
          </Card>
        ))
      )}
      {actions.create.isError || actions.revoke.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {(actions.create.error ?? actions.revoke.error)?.message}
        </Notice>
      ) : null}

      <AppText variant="heading">{t('Projeyi görebilen ustalar')}</AppText>
      {members.length === 0 ? (
        <AppText tone="muted">{t('Henüz kimse katılmadı.')}</AppText>
      ) : (
        members.map((m) => (
          <Card key={m.user_id}>
            <AppText variant="bodyStrong">{m.business_name || m.full_name}</AppText>
            <View style={{ flexDirection: 'row' }}>
              <Badge label={t(VERIFICATION_LABEL[m.verification_status])} tone={m.verification_status === 'verified' ? 'success' : 'muted'} />
            </View>
            {removing === m.user_id ? (
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                <Button label={t('Vazgeç')} variant="secondary" onPress={() => setRemoving(null)} />
                <Button
                  label={t('Erişimi kaldır')}
                  icon="person-remove"
                  loading={actions.remove.isPending}
                  onPress={() => actions.remove.mutate(m.user_id, { onSettled: () => setRemoving(null) })}
                />
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setRemoving(m.user_id)} style={{ paddingVertical: space.sm }}>
                <AppText tone="danger">{t('Erişimi kaldır')}</AppText>
              </Pressable>
            )}
          </Card>
        ))
      )}
      {actions.remove.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {actions.remove.error.message}
        </Notice>
      ) : null}
    </Screen>
  );
}
