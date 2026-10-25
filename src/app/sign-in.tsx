import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { isValidEmail, sendEmailCode, verifyEmailCode } from '@/features/account/api';
import { useSession } from '@/features/account/session';
import { AppText, Button, Card, EmptyState, Notice, Screen, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

export default function SignInScreen() {
  const { db } = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!db) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="cloud-offline"
          title="Hesap sistemi henüz bağlı değil"
          message="Giriş ve proje kaydetme, sunucu bağlantısı kurulunca açılacak. Boya Hesapla şimdiden çalışıyor."
          action={<Button label="Boya Hesapla" icon="calculator" onPress={() => router.replace('/calculate')} />}
        />
      </Screen>
    );
  }

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir sorun oluştu.');
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      if (!isValidEmail(email)) throw new Error('Geçerli bir e-posta adresi yazın.');
      await sendEmailCode(db, email);
      setStep('code');
    });

  const verify = () =>
    run(async () => {
      if (!/^\d{6,8}$/.test(code.trim())) throw new Error('E-postadaki kodu yazın.');
      await verifyEmailCode(db, email, code);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    });

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: space.xs }}>
        <AppText variant="heading">{step === 'email' ? 'E-postanla giriş yap' : 'Kodu gir'}</AppText>
        <AppText tone="muted">
          {step === 'email'
            ? 'Şifre yok. E-postana tek kullanımlık bir kod göndereceğiz. Hesabın yoksa otomatik açılır.'
            : `${email.trim()} adresine gönderdiğimiz kodu yaz.`}
        </AppText>
      </View>
      <Card>
        {step === 'email' ? (
          <TextField
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
            onSubmitEditing={sendCode}
            testID="email"
          />
        ) : (
          <TextField
            label="Kod"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={8}
            onSubmitEditing={verify}
            testID="code"
          />
        )}
        {error ? (
          <Notice tone="danger" icon="alert-circle">
            {error}
          </Notice>
        ) : null}
        <Button
          label={step === 'email' ? 'Kod gönder' : 'Giriş yap'}
          onPress={step === 'email' ? sendCode : verify}
          loading={busy}
        />
        {step === 'code' ? (
          <Button
            label="E-postayı değiştir"
            variant="ghost"
            onPress={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          />
        ) : null}
      </Card>
      <AppText variant="caption" tone="muted">
        Giriş yaparak verilerinin BoyaCep hesabında saklanmasını kabul etmiş olursun. Hesabını ve verilerini istediğin zaman silebileceksin.
      </AppText>
    </Screen>
  );
}
