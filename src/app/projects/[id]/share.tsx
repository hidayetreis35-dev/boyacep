import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import { VERIFICATION_LABEL } from '@/features/pros/form';
import { formatDate } from '@/features/quotes/pdf';
import { formatInviteCode, isInviteActive } from '@/features/sharing/api';
import { useProjectSharing, useSharingActions } from '@/features/sharing/queries';
import { AppText, Badge, Button, Card, ErrorState, LoadingState, Notice, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

export default function ShareProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sharing = useProjectSharing(id);
  const actions = useSharingActions(id);
  const [removing, setRemoving] = useState<string | null>(null);

  if (sharing.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (sharing.isError) {
    return <Screen edges={['bottom']}><ErrorState message="Paylaşım bilgileri yüklenemedi." onRetry={() => sharing.refetch()} /></Screen>;
  }
  const active = sharing.data.invites.filter((i) => isInviteActive(i));
  const { members } = sharing.data;

  const share = (code: string) =>
    Share.share({
      message: `BoyaCep projemi seninle paylaşıyorum. Uygulamada Usta sekmesinden bu kodu gir: ${formatInviteCode(code)}`,
    }).catch(() => undefined);

  return (
    <Screen edges={['bottom']}>
      <Card>
        <AppText variant="heading">Projeni bir ustayla paylaş</AppText>
        <AppText tone="muted">
          Usta; odalarını, ölçülerini, malzeme listeni ve fotoğraflarını görür, sana uygulama içinden teklif gönderir. Bütçeni ve maliyet notlarını göremez. Erişimi istediğin zaman kaldırabilirsin.
        </AppText>
      </Card>

      {active.length === 0 ? (
        <Button label="Paylaşım kodu oluştur" icon="key" loading={actions.create.isPending} onPress={() => actions.create.mutate()} />
      ) : (
        active.map((invite) => (
          <Card key={invite.id}>
            <AppText variant="small" tone="muted">
              Paylaşım kodu
            </AppText>
            <AppText variant="number" tone="primary" selectable accessibilityLabel={`Kod ${invite.code.split('').join(' ')}`}>
              {formatInviteCode(invite.code)}
            </AppText>
            <AppText variant="caption" tone="muted">
              Son geçerlilik: {formatDate(invite.expires_at)}. Kodu bilen her usta katılabilir; sadece güvendiğin kişilere gönder.
            </AppText>
            <Button label="Kodu gönder" icon="share-social" onPress={() => share(invite.code)} />
            <Button
              label="Kodu iptal et"
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

      <AppText variant="heading">Projeyi görebilen ustalar</AppText>
      {members.length === 0 ? (
        <AppText tone="muted">Henüz kimse katılmadı.</AppText>
      ) : (
        members.map((m) => (
          <Card key={m.user_id}>
            <AppText variant="bodyStrong">{m.business_name || m.full_name}</AppText>
            <View style={{ flexDirection: 'row' }}>
              <Badge label={VERIFICATION_LABEL[m.verification_status]} tone={m.verification_status === 'verified' ? 'success' : 'muted'} />
            </View>
            {removing === m.user_id ? (
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                <Button label="Vazgeç" variant="secondary" onPress={() => setRemoving(null)} />
                <Button
                  label="Erişimi kaldır"
                  icon="person-remove"
                  loading={actions.remove.isPending}
                  onPress={() => actions.remove.mutate(m.user_id, { onSettled: () => setRemoving(null) })}
                />
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setRemoving(m.user_id)} style={{ paddingVertical: space.sm }}>
                <AppText tone="danger">Erişimi kaldır</AppText>
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
