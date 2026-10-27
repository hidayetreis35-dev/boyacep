import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/features/account/session';
import {
  adminKeys,
  deleteGuide,
  EMPTY_GUIDE_FORM,
  guideToForm,
  saveGuide,
  slugify,
  useAdminGuide,
  useIsAdmin,
  validateGuideForm,
  type GuideForm,
  type GuideFormErrors,
} from '@/features/admin/api';
import { GUIDE_CATEGORIES } from '@/features/guide/api';
import { ArticleBody } from '@/features/guide/article-body';
import { t } from '@/i18n';
import type { GuideArticleRow } from '@/lib/database.types';
import {
  AppText,
  Button,
  Card,
  ChoiceChips,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  Screen,
  TextField,
  Toggle,
} from '@/ui/components';
import { space } from '@/ui/theme';

function GuideEditor({ existing }: { existing?: GuideArticleRow }) {
  const { db } = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GuideForm>(existing ? guideToForm(existing) : EMPTY_GUIDE_FORM);
  const [errors, setErrors] = useState<GuideFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // New guides follow the title until the admin edits the address by hand.
  const [slugTouched, setSlugTouched] = useState(!!existing);

  const set = <K extends keyof GuideForm>(key: K, value: GuideForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin'] });
    await queryClient.invalidateQueries({ queryKey: ['guides'] });
  };

  const save = async () => {
    const result = validateGuideForm(form);
    if ('errors' in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaveError(null);
    setBusy(true);
    try {
      const saved = await saveGuide(db!, result.record, existing);
      await refresh();
      queryClient.setQueryData(adminKeys.guide(saved.id), saved);
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('Kaydedemedik. Bir daha dener misin?'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    setSaveError(null);
    try {
      await deleteGuide(db!, existing.id);
      await refresh();
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('Silinemedi.'));
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? t('Yazı düzenle') : t('Yeni yazı') }} />
      <TextField
        label={t('Başlık')}
        value={form.title}
        maxLength={140}
        error={errors.title}
        testID="guide-title"
        onChangeText={(title) => setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }))}
      />
      <TextField
        label={t('Adres (slug)')}
        value={form.slug}
        maxLength={80}
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.slug}
        hint={t('Yazının bağlantısında görünür. Yayınlandıktan sonra değiştirmemek iyi olur.')}
        testID="guide-slug"
        onChangeText={(slug) => {
          setSlugTouched(true);
          set('slug', slug);
        }}
      />
      <ChoiceChips
        label={t('Kategori')}
        options={GUIDE_CATEGORIES}
        value={form.category}
        onChange={(c) => set('category', c)}
      />
      <TextField label={t('Kısa özet')} value={form.summary} maxLength={300} error={errors.summary} onChangeText={(v) => set('summary', v)} />
      <TextField
        label={t('Okuma süresi')}
        unit="dk"
        value={form.readingMinutes}
        keyboardType="number-pad"
        inputMode="numeric"
        error={errors.readingMinutes}
        onChangeText={(v) => set('readingMinutes', v)}
      />

      <ChoiceChips
        options={[
          { value: 'edit', label: t('Yaz') },
          { value: 'preview', label: t('Önizle') },
        ]}
        value={preview ? 'preview' : 'edit'}
        onChange={(v) => setPreview(v === 'preview')}
      />
      {preview ? (
        <Card>
          {form.body.trim() ? <ArticleBody body={form.body} /> : <AppText tone="muted">{t('Önizlenecek metin yok.')}</AppText>}
        </Card>
      ) : (
        <TextField
          label={t('Yazı')}
          multiline
          value={form.body}
          maxLength={20000}
          error={errors.body}
          hint={t('## Ara başlık · - madde · 1. adım · **kalın**')}
          testID="guide-body"
          onChangeText={(v) => set('body', v)}
        />
      )}

      <Toggle label={t('Yayında (herkes görebilir)')} value={form.published} onChange={(v) => set('published', v)} />

      {saveError ? (
        <Notice tone="danger" icon="alert-circle">
          {saveError}
        </Notice>
      ) : null}

      <Button label={t('Kaydet')} icon="save" loading={busy} onPress={save} />
      {existing ? (
        confirmDelete ? (
          <Card>
            <AppText variant="bodyStrong">{t('Bu yazı kalıcı olarak silinsin mi?')}</AppText>
            <AppText tone="muted">{t('Silinen yazı geri getirilemez. Sadece gizlemek istiyorsan Yayında seçeneğini kapatıp kaydet.')}</AppText>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button label={t('Vazgeç')} variant="secondary" onPress={() => setConfirmDelete(false)} />
              <Button label={t('Evet, sil')} variant="ghost" icon="trash" loading={busy} onPress={remove} />
            </View>
          </Card>
        ) : (
          <Button label={t('Yazıyı sil')} variant="ghost" icon="trash-outline" onPress={() => setConfirmDelete(true)} />
        )
      ) : null}
    </>
  );
}

export default function AdminGuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, session, loading } = useSession();
  const admin = useIsAdmin();
  const isNew = id === 'new';
  const guide = useAdminGuide(isNew ? undefined : id, admin.isAdmin);

  if (loading || (session && admin.isPending)) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (!db || !session || !admin.isAdmin) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="lock-closed" title={t('Yetkin yok')} message={t('Bu sayfayı yalnızca BoyaCep yöneticileri açabilir.')} />
      </Screen>
    );
  }
  if (isNew) {
    return (
      <Screen edges={['bottom']}>
        <GuideEditor />
      </Screen>
    );
  }
  if (guide.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (guide.isError) {
    return <Screen edges={['bottom']}><ErrorState message={t('Yazı yüklenemedi.')} onRetry={() => guide.refetch()} /></Screen>;
  }
  return (
    <Screen edges={['bottom']}>
      <GuideEditor key={guide.data.id} existing={guide.data} />
    </Screen>
  );
}
