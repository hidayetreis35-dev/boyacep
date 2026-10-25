import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { SignInGate } from '@/features/account/sign-in-gate';
import { useMyPlan } from '@/features/plans/queries';
import { FREE_PROJECT_LIMIT } from '@/features/projects/limits';
import { STATUS_LABEL } from '@/features/projects/mapping';
import { useCreateProject, useProjects } from '@/features/projects/queries';
import { formatDate } from '@/features/quotes/pdf';
import type { ProjectRow } from '@/lib/database.types';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Notice,
  Screen,
  TextField,
} from '@/ui/components';
import { IconBubble } from '@/ui/brand';
import { PressableScale } from '@/ui/motion';
import { radius, shadowOf, space, usePalette } from '@/ui/theme';

function ProjectCard({ project }: { project: ProjectRow }) {
  const p = usePalette();
  const done = project.status === 'completed';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={project.title}
      onPress={() => router.push({ pathname: '/projects/[id]', params: { id: project.id } })}
      style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <IconBubble icon={done ? 'checkmark-done' : 'home'} feature="projects" />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="bodyStrong">{project.title}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
          <Badge label={STATUS_LABEL[project.status]} tone={done ? 'success' : 'primary'} />
          <AppText variant="caption" tone="muted">
            {formatDate(project.updated_at)}
          </AppText>
        </View>
      </View>
      <Icon name="chevron-forward" color={p.textMuted} />
    </PressableScale>
  );
}

function NewProject({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const create = useCreateProject();
  const plan = useMyPlan();
  const limit = plan.data?.project_limit ?? FREE_PROJECT_LIMIT;

  if (count >= limit) {
    return (
      <>
        <Notice icon="lock-closed">
          {plan.data?.pro
            ? `Pro planında en fazla ${limit} proje oluşturabilirsin. Yer açmak için eski bir projeyi silebilirsin.`
            : `Ücretsiz sürümde en fazla ${limit} proje oluşturabilirsin. Daha fazlası Pro ile gelecek; şimdilik eski bir projeyi silebilirsin.`}
        </Notice>
        <Button label="Planları gör" icon="star" variant="ghost" onPress={() => router.push('/plans')} />
      </>
    );
  }
  if (!open) return <Button label="Yeni proje" icon="add" variant="cta" size="lg" onPress={() => setOpen(true)} />;

  const submit = () => {
    if (!title.trim()) return;
    create.mutate(title, {
      onSuccess: (project) => {
        setOpen(false);
        setTitle('');
        router.push({ pathname: '/projects/[id]', params: { id: project.id } });
      },
    });
  };

  return (
    <Card>
      <TextField
        label="Proje adı"
        placeholder="Örn. Salon ve koridor"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        autoFocus
        onSubmitEditing={submit}
        testID="project-title"
      />
      {create.isError ? (
        <Notice tone="danger" icon="alert-circle">
          Proje oluşturulamadı: {create.error.message}
        </Notice>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button label="Vazgeç" variant="ghost" onPress={() => setOpen(false)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Oluştur" onPress={submit} loading={create.isPending} disabled={!title.trim()} />
        </View>
      </View>
    </Card>
  );
}

function ProjectList() {
  const projects = useProjects();
  if (projects.isPending) return <LoadingState label="Projeler yükleniyor…" />;
  if (projects.isError) return <ErrorState message="Projeler yüklenemedi. İnternet bağlantını kontrol et." onRetry={() => projects.refetch()} />;

  return (
    <View style={{ gap: space.md }}>
      <NewProject count={projects.data.length} />
      {projects.data.length === 0 ? (
        <EmptyState
          icon="folder-open"
          title="Henüz projen yok"
          message="Bir proje oluştur, odalarını ekle; boya ve malzeme ihtiyacın otomatik hesaplansın."
        />
      ) : (
        projects.data.map((project) => <ProjectCard key={project.id} project={project} />)
      )}
    </View>
  );
}

export default function ProjectsScreen() {
  const { db, session, loading } = useSession();
  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <AppText variant="title">Projelerim</AppText>
        <AppText tone="muted">Odaların, renklerin ve bütçen tek yerde.</AppText>
      </View>
      {loading ? (
        <LoadingState />
      ) : session ? (
        <ProjectList />
      ) : (
        db ? (
          <SignInGate
            feature="projects"
            icon="albums"
            title="Projelerini kaydet"
            message="Evinin boya işini tek yerde topla."
            benefits={[
              'Odalarını ve ölçülerini bir kez gir, hesap hep hazır olsun.',
              'Seçtiğin renkleri, fotoğrafları ve bütçeni sakla.',
              'Projeni bir ustayla paylaş, teklif al.',
            ]}
          />
        ) : (
          <EmptyState
            icon="folder-open"
            title="Projelerini kaydet"
            message="Proje kaydetme, hesap sistemi bağlanınca açılacak. Şimdilik Ne Kadar Boya? ile hesap yapabilirsin."
            action={<Button label="Ne Kadar Boya?" icon="calculator" variant="secondary" onPress={() => router.push('/calculate')} />}
          />
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
});
