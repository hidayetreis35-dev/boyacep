import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isValidEmail, sendEmailCode, TooSoonError } from '@/features/account/api';
import { completeSignIn } from '@/features/account/auth-link';
import { useSession } from '@/features/account/session';
import { t } from '@/i18n';
import { AppText, Button, Card, EmptyState, Icon, Notice, Screen, TextField } from '@/ui/components';
import { fonts, space, usePalette } from '@/ui/theme';

/** Seconds between two sign-in emails (Supabase's own limit is one a minute per address). */
const RESEND_SECONDS = 60;
/** Wrong codes allowed before the screen asks for a new email. */
const MAX_ATTEMPTS = 5;

/** A countdown in whole seconds; `start` begins a new one. */
function useCountdown(): [number, (seconds: number) => void] {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!until) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= until) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [until]);
  const start = (seconds: number) => {
    const time = Date.now();
    setNow(time);
    setUntil(time + seconds * 1000);
  };
  return [Math.max(0, Math.ceil((until - now) / 1000)), start];
}

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
  const [sentAgain, setSentAgain] = useState(false);
  const [failures, setFailures] = useState(0);
  const [wait, startWait] = useCountdown();
  const blocked = failures >= MAX_ATTEMPTS;

  if (!db) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="cloud-offline"
          title={t('Hesap sistemi henüz bağlı değil')}
          message={t('Giriş ve proje kaydetme, sunucu bağlantısı kurulunca açılacak. Ne Kadar Boya? şimdiden çalışıyor.')}
          action={<Button label={t('Ne Kadar Boya?')} icon="calculator" onPress={() => router.replace('/calculate')} />}
        />
      </Screen>
    );
  }

  const run = async (task: () => Promise<void>, onError?: (e: unknown) => void) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      if (e instanceof TooSoonError) startWait(e.seconds);
      onError?.(e);
      setError(e instanceof Error ? e.message : t('Bir sorun oluştu.'));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      if (!isValidEmail(email)) throw new Error(t('Geçerli bir e-posta adresi yazın.'));
      await sendEmailCode(db, email, Linking.createURL('/'));
      startWait(RESEND_SECONDS);
      setSentAgain(step === 'code');
      setFailures(0);
      setStep('code');
    });

  const verify = () =>
    run(
      async () => {
        if (blocked) throw new Error(t('Çok fazla hatalı deneme. Güvenliğin için yeni bir giriş e-postası iste.'));
        await completeSignIn(db, email, code);
        if (router.canGoBack()) router.back();
        else router.replace('/');
      },
      () => {
        if (code.trim()) setFailures((n) => n + 1);
      },
    );

  return (
    <Screen edges={['bottom']}>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.md }}>
        <View style={[styles.mark, { backgroundColor: p.accentSoft }]}>
          <Icon name={step === 'email' ? 'mail' : 'mail-open'} size={34} color={p.cta} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <StepDot n={1} label={t('E-posta')} active={step === 'email'} done={step === 'code'} />
          <View style={{ width: 28, height: 2, backgroundColor: p.border }} />
          <StepDot n={2} label={t('Bağlantı')} active={step === 'code'} done={false} />
        </View>
      </View>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">{step === 'email' ? t('E-postanla giriş yap') : t('E-postanı kontrol et')}</AppText>
        <AppText tone="muted">
          {step === 'email'
            ? t('Şifre yok. E-postana tek kullanımlık bir giriş bağlantısı göndereceğiz. Hesabın yoksa otomatik açılır.')
            : t('{email} adresine bir e-posta gönderdik. Bu telefonda e-postadaki bağlantıya dokun. Olmazsa bağlantıya basılı tutup kopyala ve aşağıya yapıştır. E-postada kod varsa kodu da yazabilirsin.', { email: email.trim() })}
        </AppText>
      </View>
      <Card>
        {step === 'email' ? (
          <TextField
            label={t('E-posta')}
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
            label={t('Bağlantı ya da kod')}
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
        {sentAgain && !error ? (
          <Notice tone="success" icon="checkmark-circle">
            {t('Yeni bir giriş e-postası gönderdik. En son gelen e-postayı kullan.')}
          </Notice>
        ) : null}
        <Button
          label={step === 'email' ? t('Giriş e-postası gönder') : t('Giriş yap')}
          variant="cta"
          size="lg"
          onPress={step === 'email' ? sendCode : verify}
          loading={busy}
          disabled={step === 'code' && blocked}
        />
        {step === 'code' ? (
          <Button
            label={wait > 0 ? t('{seconds} sn sonra yeniden gönderebilirsin', { seconds: wait }) : t('E-postayı yeniden gönder')}
            icon="refresh"
            variant="secondary"
            onPress={sendCode}
            disabled={wait > 0 || busy}
          />
        ) : null}
        {step === 'code' ? (
          <Button
            label={t('E-postayı değiştir')}
            variant="ghost"
            onPress={() => {
              setStep('email');
              setCode('');
              setError(null);
              setSentAgain(false);
            }}
          />
        ) : null}
      </Card>
      {step === 'code' ? (
        <Notice icon="help-circle">
          {t('E-posta gelmedi mi? Gereksiz (spam) klasörüne bak ve adresi doğru yazdığından emin ol. E-posta birkaç dakika gecikebilir.')}
        </Notice>
      ) : null}
      <AppText variant="caption" tone="muted">
        {t('Giriş yaparak verilerinin BoyaCep hesabında saklanmasını kabul etmiş olursun. Hesabını ve verilerini istediğin zaman silebileceksin.')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
