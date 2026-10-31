import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { t } from '@/i18n';
import type { DbClient } from '@/lib/supabase';
import { AppText, Button, Card, Notice, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

import { DELETE_CONFIRMATION, deleteMyAccount, fetchMyData, isDeleteConfirmed, saveExport } from './privacy';

/** Download all my data, or delete my account for good. */
export function PrivacyActions({ db, userId }: { db: DbClient; userId: string }) {
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const exportData = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await saveExport(await fetchMyData(db));
    } catch (e) {
      setExportError(e instanceof Error ? e.message : t('Veriler indirilemedi.'));
    } finally {
      setExporting(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount(db, userId);
      queryClient.clear();
      router.replace('/welcome');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t('Hesabını silemedik.'));
      setDeleting(false);
    }
  };

  return (
    <>
      <AppText variant="heading">{t('Gizlilik ve verilerin')}</AppText>
      <Button label={t('Verilerimi indir')} icon="download" variant="secondary" loading={exporting} onPress={exportData} />
      {exportError ? (
        <Notice tone="danger" icon="alert-circle">
          {exportError}
        </Notice>
      ) : null}
      <Button label={t('Gizlilik bilgileri')} icon="shield-checkmark" variant="ghost" onPress={() => router.push('/privacy')} />

      {deleteOpen ? (
        <Card>
          <AppText variant="bodyStrong">{t('Hesabın kalıcı olarak silinsin mi?')}</AppText>
          <AppText tone="muted">
            {t('Projelerin, odaların, malzeme listelerin, fotoğrafların, usta profilin ve tekliflerin silinir. Bu işlem geri alınamaz. İstersen önce verilerini indir.')}
          </AppText>
          <TextField
            label={t('Onaylamak için {word} yaz', { word: t(DELETE_CONFIRMATION) })}
            value={confirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={setConfirmText}
            testID="delete-confirm"
          />
          {deleteError ? (
            <Notice tone="danger" icon="alert-circle">
              {deleteError}
            </Notice>
          ) : null}
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button label={t('Vazgeç')} variant="secondary" disabled={deleting} onPress={() => { setDeleteOpen(false); setConfirmText(''); }} />
            <Button label={t('Hesabımı sil')} icon="trash" loading={deleting} disabled={!isDeleteConfirmed(confirmText)} onPress={remove} />
          </View>
        </Card>
      ) : (
        <Button label={t('Hesabımı sil')} icon="trash-outline" variant="ghost" onPress={() => setDeleteOpen(true)} />
      )}
    </>
  );
}
