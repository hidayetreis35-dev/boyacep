import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';
import { shareQuotePdf } from '@/features/quotes/export';

import { addInspection, listInspections, removeInspection, saveSnapshot, type InspectionRecord } from './api';
import type { SurveyModel } from './model';
import { surveyHtml } from './pdf';

export const surveyKeys = {
  inspections: (projectId: string) => ['inspections', projectId] as const,
};

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
  return useMutation({
    mutationFn: async (model: SurveyModel) => {
      if (snapshot && db && model.snapshot) {
        await saveSnapshot(db, projectId, model.snapshot).catch(() => false);
      }
      try {
        await shareQuotePdf(surveyHtml(model), `Keşif dosyası - ${model.title}`);
      } catch {
        throw new Error('PDF hazırlanamadı. Tekrar dene.');
      }
    },
  });
}
