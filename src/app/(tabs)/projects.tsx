import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { FREE_PROJECT_LIMIT } from '@/features/projects/limits';
import { STATUS_LABEL } from '@/features/projects/mapping';
import { useCreateProject, useProjects } from '@/features/projects/queries';
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
import { radius, space, usePalette } from '@/ui/theme';

function ProjectCard({ project }: { project: ProjectRow }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={project.title}
      onPress={() => router.push({ pathname: '/projects/[id]', params: { id: project.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: p.border,
        backgroundColor: pressed ? p.surfaceMuted : p.surface,
      })}>
      <View style={{ flex: 1, gap: space.xs }}>
        <AppText variant="bodyStrong">{project.title}</AppText>
        <Badge label={STATUS_LABEL[project.status]} tone={project.status === 'completed' ? 'success' : 'primary'} />
      </View>
      <Icon name="chevron-forward" color={p.textMuted} />
    </Pressable>
  );
}

function NewProject({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const create = useCreateProject();

  if (count >= FREE_PROJECT_LIMIT) {
    return (
      <Notice icon="lock-closed">
        Ücretsiz sürümde en fazla {FREE_PROJECT_LIMIT} proje oluşturabilirsin. Daha fazlası Pro ile gelecek; şimdilik eski bir projeyi silebilirsin.
      </Notice>
    );
  }
  if (!open) return <Button label="Yeni proje" icon="add" onPress={() => setOpen(true)} />;

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
      <AppText variant="title">Projelerim</AppText>
      {loading ? (
        <LoadingState />
      ) : session ? (
        <ProjectList />
      ) : (
        <EmptyState
          icon="folder-open"
          title="Projelerini kaydet"
          message={
            db
              ? 'Odalarını, ölçülerini ve hesaplarını kaydetmek için giriş yap.'
              : 'Proje kaydetme, hesap sistemi bağlanınca açılacak. Şimdilik Boya Hesapla ile hesap yapabilirsin.'
          }
          action={
            db ? (
              <Button label="Giriş yap" icon="log-in" onPress={() => router.push('/sign-in')} />
            ) : (
              <Button label="Boya Hesapla" icon="calculator" variant="secondary" onPress={() => router.push('/calculate')} />
            )
          }
        />
      )}
    </Screen>
  );
}
