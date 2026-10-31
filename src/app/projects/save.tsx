import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/features/account/session';
import { SignInGate } from '@/features/account/sign-in-gate';
import { toRoomInput } from '@/features/calculator/form';
import { useMyPlan } from '@/features/plans/queries';
import { createProject, saveRoom } from '@/features/projects/api';
import { FREE_PROJECT_LIMIT } from '@/features/projects/limits';
import { inputToRecord } from '@/features/projects/mapping';
import { clearPendingRoom, loadPendingRoom, type PendingRoom } from '@/features/projects/pending-room';
import { useProjects } from '@/features/projects/queries';
import { useQueryClient } from '@tanstack/react-query';
import { t } from '@/i18n';
import { OptionCard, OptionGrid } from '@/ui/brand';
import { AppText, Button, Card, EmptyState, ErrorState, LoadingState, Notice, Screen, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

const NEW = 'new';

/** Saves the room from "Ne Kadar Boya?" into a new or an existing project. */
function SaveForm({ pending }: { pending: PendingRoom }) {
  const { db } = useSession();
  const projects = useProjects();
  const plan = useMyPlan();
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<string | null>(null);
  const [title, setTitle] = useState(t('Ev boyası'));
  const [roomName, setRoomName] = useState(pending.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (projects.isPending) return <LoadingState label={t('Projeler yükleniyor…')} />;
  if (projects.isError) return <ErrorState message={t('Projelerini yükleyemedik. İnternet bağlantını kontrol eder misin?')} onRetry={() => projects.refetch()} />;

  const limit = plan.data?.project_limit ?? FREE_PROJECT_LIMIT;
  const canCreate = projects.data.length < limit;
  // At the plan limit the room can only go into an existing project.
  const target = picked ?? (canCreate ? NEW : projects.data[0].id);
  const setTarget = setPicked;

  const save = async () => {
    const parsed = toRoomInput(pending.form);
    if (!parsed.ok) {
      setError(t('Hesaptaki ölçüler eksik. Geri dönüp düzelt.'));
      return;
    }
    if (!roomName.trim() || (target === NEW && !title.trim())) return;
    setSaving(true);
    setError(null);
    try {
      const projectId = target === NEW ? (await createProject(db!, title)).id : target;
      const { room, openings } = inputToRecord(parsed.input);
      await saveRoom(db!, { projectId, name: roomName, room, openings });
      clearPendingRoom();
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.replace({ pathname: '/projects/[id]', params: { id: projectId } });
    } catch (e) {
      setError(t('Kaydedilemedi: {message}', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <TextField label={t('Oda adı')} placeholder={t('Örn. Salon')} value={roomName} onChangeText={setRoomName} maxLength={80} testID="save-room-name" />
      </Card>
      <View style={{ gap: space.sm }}>
        <AppText variant="heading">{t('Hangi projeye?')}</AppText>
        <OptionGrid columns={1}>
          {canCreate ? (
            <OptionCard title={t('Yeni proje')} icon="add-circle" feature="projects" selected={target === NEW} onPress={() => setTarget(NEW)} testID="save-new" />
          ) : null}
          {projects.data.map((project) => (
            <OptionCard key={project.id} title={project.title} icon="home" feature="projects" selected={target === project.id} onPress={() => setTarget(project.id)} />
          ))}
        </OptionGrid>
        {canCreate ? null : (
          <Notice icon="lock-closed">{t('Proje sınırına ulaştın ({limit}). Bu odayı mevcut bir projene ekleyebilirsin.', { limit })}</Notice>
        )}
      </View>
      {target === NEW ? (
        <Card>
          <TextField label={t('Proje adı')} placeholder={t('Örn. Salon ve koridor')} value={title} onChangeText={setTitle} maxLength={120} testID="save-project-title" />
        </Card>
      ) : null}
      {error ? (
        <Notice tone="danger" icon="alert-circle">
          {error}
        </Notice>
      ) : null}
      <Button
        label={t('Projeye kaydet')}
        icon="bookmark"
        variant="cta"
        size="lg"
        loading={saving}
        disabled={!roomName.trim() || (target === NEW && !title.trim())}
        onPress={save}
      />
    </View>
  );
}

/** Loads the waiting room; the save form needs it before its first render. */
function PendingLoader() {
  const [pending, setPending] = useState<PendingRoom | null | undefined>(undefined);
  useEffect(() => {
    loadPendingRoom().then(setPending);
  }, []);

  if (pending === undefined) return <LoadingState />;
  if (pending === null) {
    return (
      <EmptyState
        icon="calculator"
        title={t('Kaydedilecek hesap yok')}
        message={t('Önce Ne Kadar Boya? ile bir oda hesapla, sonra buradan projene kaydet.')}
        action={<Button label={t('Ne Kadar Boya?')} icon="calculator" onPress={() => router.replace('/calculate')} />}
      />
    );
  }
  return <SaveForm pending={pending} />;
}

export default function SaveToProjectScreen() {
  const { session, db, loading } = useSession();
  return (
    <Screen edges={['bottom']}>
      {loading ? (
        <LoadingState />
      ) : session && db ? (
        <PendingLoader />
      ) : (
        <SignInGate
          feature="projects"
          icon="bookmark"
          title={t('Hesabını kaydet')}
          message={t('Giriş yapınca bu oda projene eklenir.')}
          benefits={[
            t('Odalarını ve ölçülerini bir kez gir, hesap hep hazır olsun.'),
            t('Seçtiğin renkleri, fotoğrafları ve bütçeni sakla.'),
            t('Projeni bir ustayla paylaş, teklif al.'),
          ]}
        />
      )}
    </Screen>
  );
}
