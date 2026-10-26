import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/features/account/session';
import type { Place } from '@/features/inspect/rules';
import { useProjects } from '@/features/projects/queries';
import { t } from '@/i18n';
import { AppText, Button, Notice, TextField } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

import { useInspectionActions } from './queries';

/** Saves the inspection to a project, where it becomes part of the survey file. */
export function SaveInspection({ symptoms, place }: { symptoms: string[]; place: Place }) {
  const p = usePalette();
  const { db, session } = useSession();
  const projects = useProjects();
  const { add } = useInspectionActions();
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [saved, setSaved] = useState<{ id: string; title: string } | null>(null);

  if (!db) return null;
  if (!session) {
    return <Button label={t('Projeye kaydetmek için giriş yap')} icon="log-in" variant="secondary" onPress={() => router.push('/sign-in')} />;
  }
  if (!open) {
    return (
      <Button
        label={t('Projeye kaydet')}
        icon="bookmark"
        variant="secondary"
        onPress={() => {
          setOpen(true);
          setSaved(null);
          add.reset();
        }}
      />
    );
  }
  const list = projects.data ?? [];
  return (
    <View style={[styles.save, { backgroundColor: p.surface, borderColor: p.border }]} testID="save-inspection">
      <AppText variant="bodyStrong">{t('Bu inceleme hangi projeye?')}</AppText>
      <AppText variant="small" tone="muted">
        {t('Projenin keşif dosyasına eklenir; projeye katılan ustalar da görür. Fotoğraf telefonunda kalır.')}
      </AppText>
      <TextField label={t('Nerede? (isteğe bağlı)')} value={location} onChangeText={setLocation} placeholder={t('Banyo tavanı, salon pencere altı…')} maxLength={60} />
      {projects.isPending ? <AppText tone="muted">{t('Projeler yükleniyor…')}</AppText> : null}
      {projects.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {t('Projeler yüklenemedi.')}
        </Notice>
      ) : null}
      {list.length === 0 && projects.isSuccess ? <AppText tone="muted">{t('Henüz projen yok. Önce Projelerim’den bir proje oluştur.')}</AppText> : null}
      {saved ? null : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {list.map((project) => (
            <Button
              key={project.id}
              label={project.title}
              variant="secondary"
              loading={add.isPending && add.variables?.project_id === project.id}
              disabled={add.isPending}
              onPress={() =>
                add.mutate(
                  { project_id: project.id, place, symptoms, location: location.trim() || null },
                  { onSuccess: () => setSaved({ id: project.id, title: project.title }) },
                )
              }
            />
          ))}
        </View>
      )}
      {saved ? (
        <>
          <Notice tone="success" icon="checkmark-circle">
            {t('İnceleme “{title}” projesine kaydedildi.', { title: saved.title })}
          </Notice>
          <Button
            label={t('Keşif dosyasını aç')}
            icon="document-text"
            onPress={() => router.push({ pathname: '/projects/[id]/survey', params: { id: saved.id } })}
          />
        </>
      ) : null}
      {add.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {add.error.message}
        </Notice>
      ) : null}
      <Button label={t('Kapat')} variant="ghost" onPress={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  save: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
});
