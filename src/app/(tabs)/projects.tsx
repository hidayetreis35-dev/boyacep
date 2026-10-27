import { router } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { useProjectColours } from '@/features/colour/project-colours';
import { useProjectPhotos } from '@/features/photos/queries';
import { SignInGate } from '@/features/account/sign-in-gate';
import { useMyPlan } from '@/features/plans/queries';
import { FREE_PROJECT_LIMIT } from '@/features/projects/limits';
import { STATUS_LABEL } from '@/features/projects/mapping';
import { useProjectProgress } from '@/features/projects/project-steps';
import { PROJECT_STEPS } from '@/features/projects/progress';
import { useCreateProject, useProject, useProjects } from '@/features/projects/queries';
import { formatDate } from '@/features/quotes/pdf';
import { msg, t } from '@/i18n';
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
import { IconBubble, Segmented } from '@/ui/brand';
import { PressableScale } from '@/ui/motion';
import { Photo } from '@/ui/photos';
import { fonts, radius, shadowOf, space, useFeatureColour, usePalette } from '@/ui/theme';

type Filter = 'all' | 'active' | 'done';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: msg('Tümü') },
  { value: 'active', label: msg('Devam Eden') },
  { value: 'done', label: msg('Tamamlanan') },
];

const isOpen = (project: ProjectRow) => project.status !== 'completed' && project.status !== 'cancelled';

function ProgressBar({ share, label, done }: { share: number; label: string | null; done?: boolean }) {
  const p = usePalette();
  const f = useFeatureColour('projects');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <View style={[styles.track, { backgroundColor: p.surfaceMuted }]}>
        <View style={[styles.fill, { width: `${Math.round(share * 100)}%`, backgroundColor: done ? p.success : p.cta }]} />
      </View>
      {label ? (
        <AppText variant="caption" style={{ color: done ? p.success : f.ink, fontFamily: fonts.bold, minWidth: 36, textAlign: 'right' }}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

/** Share of Ölç → Malzeme → Renk → Bütçe → Dosya done; the number shows once every step is known. */
function LiveProgress({ project, rooms }: { project: ProjectRow; rooms: number }) {
  const { states, done } = useProjectProgress(project.id, rooms, project.budget);
  const known = PROJECT_STEPS.every((s) => states[s] !== 'unknown');
  const share = done / PROJECT_STEPS.length;
  return <ProgressBar share={share} label={known ? `%${Math.round(share * 100)}` : null} />;
}

function CardProgress({ project }: { project: ProjectRow }) {
  const detail = useProject(project.id);
  if (project.status === 'completed') return <ProgressBar share={1} label="%100" done />;
  if (!detail.isSuccess) return null;
  return <LiveProgress project={project} rooms={detail.data.rooms.length} />;
}

/** The project's own newest photo, else its saved colours as paint chips, else an icon. Never a stock photo. */
function ProjectCover({ project }: { project: ProjectRow }) {
  const p = usePalette();
  const photos = useProjectPhotos(project.id);
  const colours = useProjectColours(project.id);
  const url = photos.data?.find((photo) => photo.url)?.url;
  if (url) return <Image source={{ uri: url }} style={[styles.cover, { backgroundColor: p.surfaceMuted }]} accessible={false} testID="project-cover-photo" />;
  const hexes = (colours.data ?? []).slice(0, 3).map((c) => c.hex);
  if (hexes.length > 0) {
    return (
      <View style={[styles.cover, styles.chips, { borderColor: p.border }]} testID="project-cover-colours">
        {hexes.map((hex, i) => (
          <View key={`${hex}-${i}`} style={{ flex: 1, backgroundColor: hex }} />
        ))}
      </View>
    );
  }
  return <IconBubble icon={project.status === 'completed' ? 'checkmark-done' : 'home'} feature="projects" size={56} />;
}

function ProjectCard({ project }: { project: ProjectRow }) {
  const p = usePalette();
  const done = project.status === 'completed';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={project.title}
      onPress={() => router.push({ pathname: '/projects/[id]', params: { id: project.id } })}
      style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <ProjectCover project={project} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="cardTitle" numberOfLines={1}>
            {project.title}
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatDate(project.updated_at)}
          </AppText>
        </View>
        <Icon name="chevron-forward" color={p.textMuted} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <CardProgress project={project} />
        </View>
        <Badge label={t(STATUS_LABEL[project.status])} tone={done ? 'success' : 'primary'} />
      </View>
    </PressableScale>
  );
}

/** What a saved project looks like, for guests. Shown only inside an "Örnek" preview. */
function SampleProject() {
  const p = usePalette();
  return (
    <View style={[styles.sample, { backgroundColor: p.surface, borderColor: p.border }]}>
      <Photo name="colourRoom" style={styles.samplePhoto} />
      <View style={{ flex: 1, gap: space.sm, padding: space.md }}>
        <AppText variant="cardTitle">{t('Salon, 18 m²')}</AppText>
        <ProgressBar share={0.6} label="%60" />
        <AppText variant="caption" tone="muted">
          {t('Astar bitti · 2 kat boya kaldı')}
        </AppText>
      </View>
    </View>
  );
}

function shownProjects(list: ProjectRow[], filter: Filter): ProjectRow[] {
  if (filter === 'active') return list.filter(isOpen);
  if (filter === 'done') return list.filter((project) => project.status === 'completed');
  return list;
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
            ? t('Pro planında en fazla {limit} proje oluşturabilirsin. Yer açmak için eski bir projeyi silebilirsin.', { limit })
            : t('Ücretsiz sürümde en fazla {limit} proje oluşturabilirsin. Daha fazlası Pro ile gelecek; şimdilik eski bir projeyi silebilirsin.', { limit })}
        </Notice>
        <Button label={t('Planları gör')} icon="star" variant="ghost" onPress={() => router.push('/plans')} />
      </>
    );
  }
  if (!open) return <Button label={t('Yeni proje')} icon="add" variant="cta" size="lg" onPress={() => setOpen(true)} />;

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
        label={t('Proje adı')}
        placeholder={t('Örn. Salon ve koridor')}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        autoFocus
        onSubmitEditing={submit}
        testID="project-title"
      />
      {create.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {t('Projeyi oluşturamadık: {message}', { message: create.error.message })}
        </Notice>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button label={t('Vazgeç')} variant="ghost" onPress={() => setOpen(false)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('Oluştur')} onPress={submit} loading={create.isPending} disabled={!title.trim()} />
        </View>
      </View>
    </Card>
  );
}

function ProjectList() {
  const projects = useProjects();
  const [filter, setFilter] = useState<Filter>('all');
  if (projects.isPending) return <LoadingState label={t('Projeler yükleniyor…')} />;
  if (projects.isError) return <ErrorState message={t('Projelerini yükleyemedik. İnternet bağlantını kontrol eder misin?')} onRetry={() => projects.refetch()} />;

  return (
    <View style={{ gap: space.md }}>
      <NewProject count={projects.data.length} />
      {projects.data.length === 0 ? (
        <EmptyState
          icon="folder-open"
          title={t('Henüz projen yok')}
          message={t('Bir proje oluştur, odalarını ekle; boya ve malzeme ihtiyacın otomatik hesaplansın.')}
        />
      ) : (
        <>
          <Segmented options={FILTERS} value={filter} onChange={setFilter} />
          {shownProjects(projects.data, filter).length === 0 ? (
            <AppText tone="muted" style={{ textAlign: 'center', paddingVertical: space.lg }}>
              {filter === 'done' ? t('Henüz tamamlanan projen yok.') : t('Devam eden projen yok.')}
            </AppText>
          ) : (
            shownProjects(projects.data, filter).map((project) => <ProjectCard key={project.id} project={project} />)
          )}
        </>
      )}
      <Button label={t('Ev Hafızası: boyadığım renkler')} icon="color-palette" variant="ghost" onPress={() => router.push('/home-log')} />
    </View>
  );
}

export default function ProjectsScreen() {
  const { db, session, loading } = useSession();
  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <AppText variant="title">{t('Projelerim')}</AppText>
        <AppText tone="muted">{t('Odaların, renklerin ve bütçen tek yerde.')}</AppText>
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
            title={t('Projelerini kaydet')}
            message={t('Evinin boya işini tek yerde topla.')}
            preview={{ caption: t('Projelerin burada böyle görünecek.'), content: <SampleProject /> }}
            benefits={[
              t('Odalarını ve ölçülerini bir kez gir, hesap hep hazır olsun.'),
              t('Seçtiğin renkleri, fotoğrafları ve bütçeni sakla.'),
              t('Projeni bir ustayla paylaş, teklif al.'),
            ]}
          />
        ) : (
          <EmptyState
            icon="folder-open"
            title={t('Projelerini kaydet')}
            message={t('Proje kaydetme, hesap sistemi bağlanınca açılacak. Şimdilik Ne Kadar Boya? ile hesap yapabilirsin.')}
            action={<Button label={t('Ne Kadar Boya?')} icon="calculator" variant="secondary" onPress={() => router.push('/calculate')} />}
          />
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: 56, height: 56, borderRadius: 14 },
  chips: { flexDirection: 'row', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  card: { gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  track: { flex: 1, height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  sample: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  samplePhoto: { width: 104, minHeight: 104 },
});
