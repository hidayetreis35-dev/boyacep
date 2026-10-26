import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/features/account/session';
import { SignInGate } from '@/features/account/sign-in-gate';
import { CONSULTATION_STATUS_LABEL, TOPICS, topicLabel, validateQuestion, type QuestionErrors } from '@/features/ask/api';
import { useAskActions, useMyQuestions } from '@/features/ask/queries';
import { formatDate } from '@/features/quotes/pdf';
import { getLocale, t } from '@/i18n';
import type { ConsultationTopic } from '@/lib/database.types';
import {
  AppText,
  Badge,
  Button,
  Card,
  ChoiceChips,
  EmptyState,
  ErrorState,
  ListItem,
  LoadingState,
  Notice,
  Screen,
  TextField,
} from '@/ui/components';
import { space } from '@/ui/theme';

function NewQuestion({ onDone }: { onDone: () => void }) {
  const { ask } = useAskActions();
  const [topic, setTopic] = useState<ConsultationTopic>('problem');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<QuestionErrors>({});

  const submit = () => {
    const e = validateQuestion(subject, body);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    ask.mutate(
      { topic, subject, body },
      {
        onSuccess: (c) => {
          onDone();
          router.push({ pathname: '/ask/[id]', params: { id: c.id } });
        },
      },
    );
  };

  return (
    <Card>
      <AppText variant="heading">{t('Yeni soru')}</AppText>
      <ChoiceChips label={t('Konu')} options={TOPICS} value={topic} onChange={setTopic} />
      <TextField label={t('Başlık')} value={subject} maxLength={120} placeholder={t('Örn. Banyo tavanında kabarma')} error={errors.subject} onChangeText={setSubject} testID="ask-subject" />
      <TextField
        label={t('Sorun')}
        multiline
        value={body}
        maxLength={2000}
        placeholder={t('Ne görüyorsun, ne zamandır var, daha önce ne denedin?')}
        error={errors.body}
        onChangeText={setBody}
        testID="ask-body"
      />
      {ask.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {ask.error.message}
        </Notice>
      ) : null}
      <Button label={t('Gönder')} icon="send" loading={ask.isPending} onPress={submit} />
    </Card>
  );
}

function Questions() {
  const questions = useMyQuestions();
  const [asking, setAsking] = useState(false);
  return (
    <>
      {asking ? <NewQuestion onDone={() => setAsking(false)} /> : <Button label={t('Soru sor')} icon="chatbubbles" onPress={() => setAsking(true)} />}
      <AppText variant="heading">{t('Sorularım')}</AppText>
      {questions.isPending ? (
        <LoadingState />
      ) : questions.isError ? (
        <ErrorState message={t('Sorular yüklenemedi.')} onRetry={() => questions.refetch()} />
      ) : questions.data.length === 0 ? (
        <AppText tone="muted">{t('Henüz soru sormadın.')}</AppText>
      ) : (
        questions.data.map((q) => (
          <ListItem
            key={q.id}
            title={q.subject}
            subtitle={`${topicLabel(q.topic)} · ${formatDate(q.updated_at)}`}
            onPress={() => router.push({ pathname: '/ask/[id]', params: { id: q.id } })}>
            <View style={{ flexDirection: 'row' }}>
              <Badge label={t(CONSULTATION_STATUS_LABEL[q.status])} tone={q.status === 'answered' ? 'success' : q.status === 'open' ? 'accent' : 'muted'} />
            </View>
          </ListItem>
        ))
      )}
    </>
  );
}

export default function AskScreen() {
  const { db, session, loading } = useSession();
  return (
    <Screen edges={['bottom']}>
      <Notice icon="people">
        {t('Sorularını BoyaCep ekibindeki boya ustaları yanıtlar; beta süresince ücretsiz. Yapısal çatlak, büyük nem ya da elektrik gibi durumlarda yerinde bir uzmana danış.')}
      </Notice>
      {getLocale() === 'tr' ? null : <Notice icon="language">{t('Ustalar şimdilik yalnızca Türkiye’de ve Türkçe yanıt veriyor.')}</Notice>}
      <View style={{ gap: space.lg }}>
        {loading ? (
          <LoadingState />
        ) : !db ? (
          <EmptyState icon="cloud-offline" title={t('Sunucu bağlı değil')} message={t('Ustaya Sor hesap gerektirir; sunucu bağlantısı kurulunca açılacak.')} />
        ) : !session ? (
          <SignInGate
            feature="ask"
            icon="chatbubbles"
            title={t('Ustaya Sor')}
            message={t('Boya ustalarından yanıt al.')}
            benefits={[t('Sorunu yaz, istersen fotoğraf ekle.'), t('Yanıtı bildirim olarak al, sonra yine buradan oku.'), t('Beta süresince ücretsiz.')]}
          />
        ) : (
          <Questions />
        )}
      </View>
    </Screen>
  );
}
