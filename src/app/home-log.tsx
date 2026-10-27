import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { SignInGate } from '@/features/account/sign-in-gate';
import { isNotEnabled } from '@/features/home-log/api';
import { careReminders, monthsSince, paintedAgo, type CareReminder } from '@/features/home-log/care';
import { emptyHomeLogForm, FINISH_LABEL, FINISH_OPTIONS, searchHomeLog, toHomeLogDraft, type HomeLogErrors, type HomeLogForm } from '@/features/home-log/form';
import { useHomeLog, useHomeLogActions } from '@/features/home-log/queries';
import { formatDate } from '@/features/quotes/pdf';
import { t } from '@/i18n';
import type { HomeLogRow, PaintFinish } from '@/lib/database.types';
import { todayIso } from '@/lib/day';
import { SectionTitle } from '@/ui/brand';
import { AppText, Badge, Button, Card, ChoiceChips, EmptyState, ErrorState, FieldRow, Icon, LoadingState, Notice, Screen, TextField } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

const NO_FINISH = 'none';

function AddEntry({ projectId, place }: { projectId?: string; place?: string }) {
  const [open, setOpen] = useState(!!place);
  const [form, setForm] = useState<HomeLogForm>(() => ({ ...emptyHomeLogForm(), place: place ?? '' }));
  const [errors, setErrors] = useState<HomeLogErrors>({});
  const { add } = useHomeLogActions();
  const set = <K extends keyof HomeLogForm>(key: K, value: HomeLogForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  if (!open) return <Button label={t('Kayıt ekle')} icon="add" variant="cta" size="lg" onPress={() => setOpen(true)} />;

  const submit = () => {
    const parsed = toHomeLogDraft(form, { projectId: projectId ?? null });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    add.mutate([parsed.draft], {
      onSuccess: () => {
        setForm(emptyHomeLogForm());
        setOpen(false);
      },
    });
  };

  return (
    <Card>
      <AppText variant="heading">{t('Yeni kayıt')}</AppText>
      <TextField label={t('Nereyi boyadın?')} placeholder={t('Örn. Salon duvarları')} value={form.place} onChangeText={(v) => set('place', v)} error={errors.place && t(errors.place)} maxLength={80} testID="log-place" />
      <FieldRow>
        <TextField label={t('Renk adı')} placeholder={t('Örn. Kırık beyaz')} value={form.colourName} onChangeText={(v) => set('colourName', v)} maxLength={80} testID="log-colour" />
        <TextField label={t('Kutudaki renk kodu')} placeholder="7035" value={form.colourCode} onChangeText={(v) => set('colourCode', v)} maxLength={40} testID="log-code" />
      </FieldRow>
      <FieldRow>
        <TextField label={t('Ürün')} placeholder={t('Örn. iç cephe, silinebilir')} value={form.product} onChangeText={(v) => set('product', v)} maxLength={120} testID="log-product" />
        <TextField label={t('Tarih')} value={form.date} onChangeText={(v) => set('date', v)} error={errors.date && t(errors.date)} keyboardType="numbers-and-punctuation" testID="log-date" />
      </FieldRow>
      <ChoiceChips
        label={t('Yüzey görünümü')}
        options={[{ value: NO_FINISH, label: t('Bilmiyorum') }, ...FINISH_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))]}
        value={form.finish ?? NO_FINISH}
        onChange={(v) => set('finish', v === NO_FINISH ? null : (v as PaintFinish))}
      />
      <TextField label={t('Renk kodu (#RRGGBB, isteğe bağlı)')} placeholder="#F4F1EA" value={form.colourHex} onChangeText={(v) => set('colourHex', v)} error={errors.colourHex && t(errors.colourHex)} autoCapitalize="characters" maxLength={7} testID="log-hex" />
      <TextField label={t('Usta (isteğe bağlı)')} value={form.painter} onChangeText={(v) => set('painter', v)} maxLength={80} testID="log-painter" />
      <TextField label={t('Not (isteğe bağlı)')} placeholder={t('Örn. Rötuş için kutuda 1 L kaldı, balkon dolabında')} value={form.note} onChangeText={(v) => set('note', v)} error={errors.note && t(errors.note)} multiline maxLength={500} testID="log-note" />
      {add.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {add.error.message}
        </Notice>
      ) : null}
      <FieldRow>
        <Button label={t('Vazgeç')} variant="secondary" onPress={() => setOpen(false)} />
        <Button label={t('Kaydet')} icon="checkmark" loading={add.isPending} onPress={submit} />
      </FieldRow>
    </Card>
  );
}

/** Places that may want a fresh coat, from the user's own dates and a rough usual interval. */
function CareCard({ reminders }: { reminders: CareReminder[] }) {
  const p = usePalette();
  return (
    <View testID="care-reminders">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="alarm" size={22} color={p.accent} />
          <AppText variant="heading" style={{ flex: 1 }}>
            {t('Bakım zamanı')}
          </AppText>
          <Badge label={t('Tahmini')} tone="accent" />
        </View>
        {reminders.map((r) => (
          <View key={r.entry.id} style={[styles.careRow, { borderColor: p.border }]}>
            <View style={[styles.dot, { backgroundColor: r.entry.colour_hex ?? p.surfaceMuted, borderColor: p.border }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong">
                {r.entry.place} · {paintedAgo(r.months)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t(r.rule.reason)}
              </AppText>
            </View>
            <Badge label={r.status === 'due' ? t('Yenileme zamanı') : t('Zamanı yaklaşıyor')} tone={r.status === 'due' ? 'accent' : 'muted'} />
          </View>
        ))}
        <AppText variant="caption" tone="muted">
          {t('Süreler genel öneridir. Duvarında kabarma, solma ya da kir varsa daha erken; iyi duruyorsa daha geç boyayabilirsin.')}
        </AppText>
        <Button label={t('Yenileme için boya hesapla')} icon="calculator" variant="secondary" onPress={() => router.push('/calculate')} />
      </Card>
    </View>
  );
}

function Entry({ entry }: { entry: HomeLogRow }) {
  const p = usePalette();
  const [confirming, setConfirming] = useState(false);
  const { remove } = useHomeLogActions();
  const colour = [entry.colour_name, entry.colour_code].filter(Boolean).join(' · ');
  const details = [entry.product, entry.finish ? t(FINISH_LABEL[entry.finish]) : null, formatDate(entry.painted_on), entry.painter].filter(Boolean).join(' · ');
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <View
          style={[styles.swatch, { backgroundColor: entry.colour_hex ?? p.surfaceMuted, borderColor: p.border }]}
          accessibilityLabel={entry.colour_hex ? t('Renk {hex}', { hex: entry.colour_hex }) : t('Renk kodu yok')}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">{entry.place}</AppText>
          {colour ? <AppText>{colour}</AppText> : null}
          <AppText variant="caption" tone="muted">
            {details}
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="time-outline" size={16} color={p.textMuted} />
        <AppText variant="small" tone="muted">
          {paintedAgo(monthsSince(entry.painted_on, todayIso()))}
        </AppText>
      </View>
      {entry.note ? <AppText variant="small" tone="muted">{entry.note}</AppText> : null}
      {confirming ? (
        <FieldRow>
          <Button label={t('Vazgeç')} variant="secondary" onPress={() => setConfirming(false)} />
          <Button label={t('Evet, sil')} icon="trash" loading={remove.isPending} onPress={() => remove.mutate(entry.id)} />
        </FieldRow>
      ) : (
        <Button label={t('Kaydı sil')} icon="trash-outline" variant="ghost" onPress={() => setConfirming(true)} />
      )}
      {remove.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {remove.error.message}
        </Notice>
      ) : null}
    </Card>
  );
}

function HomeLog() {
  const { projectId, place } = useLocalSearchParams<{ projectId?: string; place?: string }>();
  const log = useHomeLog();
  const [query, setQuery] = useState('');

  if (log.isPending) return <LoadingState />;
  if (log.isError) {
    if (isNotEnabled(log.error.message)) {
      return (
        <EmptyState
          icon="time"
          title={t('Yakında')}
          message={t('Ev Hafızası hazır ama sunucuda henüz açılmadı. Açılınca hangi duvara hangi rengi sürdüğünü burada saklayabileceksin.')}
        />
      );
    }
    return <ErrorState message={t('Ev Hafızanı yükleyemedik.')} onRetry={() => log.refetch()} />;
  }

  const rows = searchHomeLog(log.data, query);
  const reminders = careReminders(log.data, todayIso());
  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <AppText variant="heading">{t('Bu duvarın rengi neydi?')}</AppText>
        <AppText tone="muted">
          {t('Boyadığın her yerin rengini, ürününü ve tarihini sakla. Yıllar sonra rötuş yaparken ya da evi satarken aynı rengi bulursun.')}
        </AppText>
      </Card>
      {reminders.length > 0 ? <CareCard reminders={reminders} /> : null}
      <AddEntry projectId={projectId} place={place} />
      <View style={{ gap: space.sm }}>
        <SectionTitle title={t('Kayıtların')} />
        {log.data.length > 3 ? <TextField label={t('Ara')} placeholder={t('Oda, renk, kod ya da ürün')} value={query} onChangeText={setQuery} testID="log-search" /> : null}
        {log.data.length === 0 ? (
          <EmptyState icon="color-palette" title={t('Henüz kayıt yok')} message={t('İlk kaydını ekle ya da bitirdiğin bir projeden aktar.')} />
        ) : rows.length === 0 ? (
          <AppText tone="muted">{t('Aramana uyan kayıt yok.')}</AppText>
        ) : (
          rows.map((entry) => <Entry key={entry.id} entry={entry} />)
        )}
      </View>
    </View>
  );
}

export default function HomeLogScreen() {
  const { session, db, loading } = useSession();
  return (
    <Screen edges={['bottom']}>
      {loading ? (
        <LoadingState />
      ) : session && db ? (
        <HomeLog />
      ) : (
        <SignInGate
          feature="projects"
          icon="color-palette"
          title={t('Ev Hafızası')}
          message={t('Giriş yapınca boyadığın renkleri ve ürünleri saklayabilirsin.')}
          benefits={[t('Hangi duvara hangi rengi sürdüğünü unutma.'), t('Rötuş için aynı rengi ve ürünü bul.'), t('Kayıtlar yalnızca sende; istediğin zaman silebilirsin.')]}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatch: { width: 48, height: 48, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  careRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
});
