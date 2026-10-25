import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/features/account/session';
import { CONSULTATION_STATUS_LABEL, topicLabel } from '@/features/ask/api';
import { useAskActions, useQuestion } from '@/features/ask/queries';
import { formatDate } from '@/features/quotes/pdf';
import { t } from '@/i18n';
import type { ConsultationMessageRow } from '@/lib/database.types';
import { AppText, Badge, Button, Card, ErrorState, LoadingState, Notice, Screen, TextField } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

function Bubble({ message, mine }: { message: ConsultationMessageRow; mine: boolean }) {
  const p = usePalette();
  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        padding: space.md,
        borderRadius: radius.lg,
        gap: 4,
        backgroundColor: message.from_team ? p.primarySoft : p.surface,
        borderWidth: 1,
        borderColor: message.from_team ? p.primarySoft : p.border,
      }}>
      <AppText variant="caption" tone={message.from_team ? 'primary' : 'muted'}>
        {message.from_team ? t('BoyaCep ekibi') : mine ? t('Sen') : t('Kullanıcı')} · {formatDate(message.created_at)}
      </AppText>
      <AppText>{message.body}</AppText>
    </View>
  );
}

export default function QuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const question = useQuestion(id);
  const { send, close } = useAskActions();
  const [reply, setReply] = useState('');

  if (question.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (question.isError) {
    return <Screen edges={['bottom']}><ErrorState message={t('Soru yüklenemedi.')} onRetry={() => question.refetch()} /></Screen>;
  }
  const { consultation, messages } = question.data;
  const owner = consultation.user_id === session?.user.id;
  const closed = consultation.status === 'closed';

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: consultation.subject }} />
      <Card>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Badge label={t(CONSULTATION_STATUS_LABEL[consultation.status])} tone={consultation.status === 'answered' ? 'success' : 'muted'} />
          <Badge label={topicLabel(consultation.topic)} />
        </View>
        <AppText variant="heading">{consultation.subject}</AppText>
      </Card>

      {messages.map((m) => (
        <Bubble key={m.id} message={m} mine={m.author_id === session?.user.id} />
      ))}
      {owner && consultation.status === 'open' ? (
        <AppText variant="caption" tone="muted">
          {t('Ekibimiz genellikle bir iş günü içinde yanıtlar.')}
        </AppText>
      ) : null}

      {closed ? (
        <Notice icon="lock-closed">{t('Bu soru kapandı.')}</Notice>
      ) : (
        <>
          <TextField
            label={owner ? t('Ekle ya da yanıtla') : t('Ekip yanıtı')}
            multiline
            value={reply}
            maxLength={2000}
            onChangeText={setReply}
            testID="ask-reply"
          />
          {send.isError ? (
            <Notice tone="danger" icon="alert-circle">
              {send.error.message}
            </Notice>
          ) : null}
          <Button
            label={t('Gönder')}
            icon="send"
            loading={send.isPending}
            disabled={reply.trim().length === 0}
            onPress={() => send.mutate({ id, body: reply }, { onSuccess: () => setReply('') })}
          />
          <Button label={t('Soruyu kapat')} icon="checkmark-done" variant="ghost" loading={close.isPending} onPress={() => close.mutate(id)} />
        </>
      )}
    </Screen>
  );
}
