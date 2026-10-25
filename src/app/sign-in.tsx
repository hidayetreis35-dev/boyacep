import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isValidEmail, sendEmailCode } from '@/features/account/api';
import { completeSignIn } from '@/features/account/auth-link';
import { useSession } from '@/features/account/session';
import { AppText, Button, Card, EmptyState, Icon, Notice, Screen, TextField } from '@/ui/components';
import { fonts, space, usePalette } from '@/ui/theme';

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  const p = usePalette();
  const on = active || done;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={[styles.dot, { backgroundColor: on ? p.primary : p.surfaceMuted }]}>
        {done ? (
          <Icon name="checkmark" size={14} color={p.onPrimary} />
        ) : (
          <AppText variant="caption" style={{ color: on ? p.onPrimary : p.textMuted, fontFamily: fonts.bold }}>
            {n}
          </AppText>
        )}
      </View>
      <AppText variant="small" tone={on ? undefined : 'muted'} style={{ fontFamily: fonts.semibold }}>
        {label}
      </AppText>
    </View>
  );
}

export default function SignInScreen() {
  const p = usePalette();
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
          message="Giriş ve proje kaydetme, sunucu bağlantısı kurulunca açılacak. Ne Kadar Boya? şimdiden çalışıyor."
          action={<Button label="Ne Kadar Boya?" icon="calculator" onPress={() => router.replace('/calculate')} />}
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
      await sendEmailCode(db, email, Linking.createURL('/'));
      setStep('code');
    });

  const verify = () =>
    run(async () => {
      await completeSignIn(db, email, code);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    });

  return (
    <Screen edges={['bottom']}>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.md }}>
        <View style={[styles.mark, { backgroundColor: p.accentSoft }]}>
          <Icon name={step === 'email' ? 'mail' : 'mail-open'} size={34} color={p.cta} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <StepDot n={1} label="E-posta" active={step === 'email'} done={step === 'code'} />
          <View style={{ width: 28, height: 2, backgroundColor: p.border }} />
          <StepDot n={2} label="Bağlantı" active={step === 'code'} done={false} />
        </View>
      </View>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">{step === 'email' ? 'E-postanla giriş yap' : 'E-postanı kontrol et'}</AppText>
        <AppText tone="muted">
          {step === 'email'
            ? 'Şifre yok. E-postana tek kullanımlık bir giriş bağlantısı göndereceğiz. Hesabın yoksa otomatik açılır.'
            : `${email.trim()} adresine bir e-posta gönderdik. Bu telefonda e-postadaki bağlantıya dokun. Olmazsa bağlantıya basılı tutup kopyala ve aşağıya yapıştır. E-postada kod varsa kodu da yazabilirsin.`}
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
            label="Bağlantı ya da kod"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
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
          label={step === 'email' ? 'Giriş e-postası gönder' : 'Giriş yap'}
          variant="cta"
          size="lg"
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

const styles = StyleSheet.create({
  mark: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
