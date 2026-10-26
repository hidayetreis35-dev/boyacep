import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';

import { useSession } from '@/features/account/session';
import { shareQuotePdf } from '@/features/quotes/export';
import { t } from '@/i18n';

import { addInspection, latestSnapshot, listInspections, removeInspection, saveSnapshot, type InspectionRecord } from './api';
import type { SurveyModel } from './model';
import { surveyHtml } from './pdf';
import { surveyText } from './readiness';

export const surveyKeys = {
  inspections: (projectId: string) => ['inspections', projectId] as const,
  snapshot: (projectId: string) => ['survey-snapshot', projectId] as const,
};

/** The last survey snapshot; one exists once the homeowner has shared the survey file. */
export function useLatestSnapshot(projectId: string) {
  const { db, session } = useSession();
  return useQuery({
    queryKey: surveyKeys.snapshot(projectId),
    enabled: !!db && !!session && !!projectId,
    queryFn: () => latestSnapshot(db!, projectId),
  });
}

export function useInspections(projectId: string) {
  const { db, session } = useSession();
  return useQuery({
    queryKey: surveyKeys.inspections(projectId),
    enabled: !!db && !!session && !!projectId,
    queryFn: () => listInspections(db!, projectId),
  });
}

export function useInspectionActions() {
  const { db } = useSession();
  const queryClient = useQueryClient();
  const refresh = (projectId: string) => queryClient.invalidateQueries({ queryKey: surveyKeys.inspections(projectId) });
  return {
    add: useMutation({ mutationFn: (r: InspectionRecord) => addInspection(db!, r), onSuccess: (_d, r) => refresh(r.project_id) }),
    remove: useMutation({
      mutationFn: (i: { id: string; projectId: string }) => removeInspection(db!, i.id),
      onSuccess: (_d, i) => refresh(i.projectId),
    }),
  };
}

/**
 * Opens the share sheet with the survey as a PDF. For the homeowner it first
 * stores a calculation snapshot; if that fails (offline) the PDF is still shared.
 */
export function useShareSurvey(projectId: string, { snapshot }: { snapshot: boolean }) {
  const { db } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    onSettled: () => queryClient.invalidateQueries({ queryKey: surveyKeys.snapshot(projectId) }),
    mutationFn: async (model: SurveyModel) => {
      if (snapshot && db && model.snapshot) {
        await saveSnapshot(db, projectId, model.snapshot).catch(() => false);
      }
      try {
        await shareQuotePdf(surveyHtml(model), t('Keşif dosyası - {title}', { title: model.title }));
      } catch {
        throw new Error(t('PDF hazırlanamadı. Tekrar dene.'));
      }
    },
  });
}

/** Sends the short text summary on WhatsApp; like the PDF, it first stores a calculation snapshot. */
export function useShareSurveyText(projectId: string) {
  const { db } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    onSettled: () => queryClient.invalidateQueries({ queryKey: surveyKeys.snapshot(projectId) }),
    mutationFn: async (model: SurveyModel) => {
      if (db && model.snapshot) await saveSnapshot(db, projectId, model.snapshot).catch(() => false);
      try {
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(surveyText(model))}`);
      } catch {
        throw new Error(t('WhatsApp açılamadı. PDF olarak paylaşmayı dene.'));
      }
    },
  });
}
