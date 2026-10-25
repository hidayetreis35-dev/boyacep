import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  EMPTY_PRO_FORM,
  profileToForm,
  SPECIALTIES,
  validateProForm,
  VERIFICATION_LABEL,
  type ProForm,
  type ProFormErrors,
} from '@/features/pros/form';
import { useMyProProfile, useRequestVerification, useSaveProProfile } from '@/features/pros/queries';
import type { ProProfileRow } from '@/lib/database.types';
import { AppText, Badge, Button, Card, ErrorState, LoadingState, Notice, Screen, TextField, Toggle } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

function SpecialtyPicker({ value, onChange, error }: { value: ProForm['specialties']; onChange: (v: ProForm['specialties']) => void; error?: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="small" tone="muted">
        Uzmanlıkların
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {SPECIALTIES.map((s) => {
          const selected = value.includes(s.value);
          return (
            <Pressable
              key={s.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(selected ? value.filter((v) => v !== s.value) : [...value, s.value])}
              style={{
                minHeight: 40,
                paddingHorizontal: space.md,
                borderRadius: radius.pill,
                borderWidth: 1,
                justifyContent: 'center',
                backgroundColor: selected ? p.primary : p.surface,
                borderColor: selected ? p.primary : p.border,
              }}>
              <AppText variant="small" style={{ color: selected ? p.onPrimary : p.text, fontWeight: '600' }}>
                {s.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function ProfileEditor({ existing }: { existing: ProProfileRow | null }) {
  const [form, setForm] = useState<ProForm>(existing ? profileToForm(existing) : EMPTY_PRO_FORM);
  const [errors, setErrors] = useState<ProFormErrors>({});
  const save = useSaveProProfile();
  const verify = useRequestVerification();
  const set = <K extends keyof ProForm>(key: K, value: ProForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const result = validateProForm(form);
    if ('errors' in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    save.mutate(result.record, { onSuccess: () => (existing ? undefined : router.back()) });
  };

  const status = existing?.verification_status;
  return (
    <>
      {existing ? (
        <Card>
          <View style={{ flexDirection: 'row' }}>
            <Badge label={VERIFICATION_LABEL[existing.verification_status]} tone={status === 'verified' ? 'success' : 'muted'} />
          </View>
          {status === 'unverified' || status === 'rejected' ? (
            <>
              <AppText tone="muted">
                Doğrulanmış ustalar müşterilere rozetle görünür. İstek gönderince ekibimiz seninle iletişime geçip kimlik ve iş bilgilerini kontrol eder.
              </AppText>
              <Button label="Doğrulama iste" icon="shield-checkmark" variant="secondary" loading={verify.isPending} onPress={() => verify.mutate()} />
              {verify.isError ? (
                <Notice tone="danger" icon="alert-circle">
                  {verify.error.message}
                </Notice>
              ) : null}
            </>
          ) : status === 'pending' ? (
            <AppText tone="muted">İsteğin alındı. Kontrol tamamlanınca rozetin burada görünecek.</AppText>
          ) : null}
        </Card>
      ) : null}

      <TextField label="Adın ve soyadın" value={form.fullName} maxLength={80} autoCapitalize="words" error={errors.fullName} onChangeText={(v) => set('fullName', v)} testID="pro-name" />
      <TextField label="İşletme adı (isteğe bağlı)" value={form.businessName} maxLength={120} onChangeText={(v) => set('businessName', v)} />
      <TextField label="Çalıştığın il" value={form.city} maxLength={60} autoCapitalize="words" error={errors.city} onChangeText={(v) => set('city', v)} testID="pro-city" />
      <TextField label="İlçeler (isteğe bağlı)" value={form.districts} maxLength={300} placeholder="Kadıköy, Üsküdar, Ataşehir" onChangeText={(v) => set('districts', v)} />
      <SpecialtyPicker value={form.specialties} onChange={(v) => set('specialties', v)} error={errors.specialties} />
      <TextField
        label="Deneyim (yıl)"
        value={form.yearsExperience}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={2}
        error={errors.yearsExperience}
        onChangeText={(v) => set('yearsExperience', v)}
      />
      <TextField label="Telefon (isteğe bağlı)" value={form.phone} keyboardType="phone-pad" inputMode="tel" maxLength={20} error={errors.phone} onChangeText={(v) => set('phone', v)} />
      <Toggle label="Telefonumu müşterilerime göster" value={form.showPhone} onChange={(v) => set('showPhone', v)} />
      <TextField label="Kendini tanıt (isteğe bağlı)" multiline value={form.bio} maxLength={1000} error={errors.bio} onChangeText={(v) => set('bio', v)} />

      {save.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {save.error.message}
        </Notice>
      ) : null}
      {save.isSuccess && existing ? <Notice icon="checkmark-circle">Profil kaydedildi.</Notice> : null}
      <Button label="Kaydet" icon="save" loading={save.isPending} onPress={submit} />
      <Notice icon="images">Profil fotoğrafı ve iş fotoğrafları (portföy) sonraki sürümde eklenecek.</Notice>
    </>
  );
}

export default function ProProfileScreen() {
  const profile = useMyProProfile();
  if (profile.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (profile.isError) {
    return <Screen edges={['bottom']}><ErrorState message="Profil yüklenemedi." onRetry={() => profile.refetch()} /></Screen>;
  }
  return (
    <Screen edges={['bottom']}>
      <ProfileEditor key={profile.data ? 'edit' : 'new'} existing={profile.data} />
    </Screen>
  );
}
