import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import * as photosApi from '@/features/photos/api';
import * as projectsApi from '@/features/projects/api';
import type { RoomWithOpenings } from '@/features/projects/mapping';
import * as quoteExport from '@/features/quotes/export';
import * as sharingApi from '@/features/sharing/api';
import * as surveyApi from '@/features/survey/api';
import type { InspectionResultRow, ProjectRow } from '@/lib/database.types';

jest.mock('@/lib/supabase', () => ({
  isBackendConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'user-1', email: 'ayse@example.com' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

jest.mock('@/features/account/api', () => ({
  ...jest.requireActual('@/features/account/api'),
  getAccount: jest.fn(async () => ({
    profile: { id: 'user-1', display_name: 'Ayşe', active_role: 'homeowner', updated_at: '1' },
    roles: ['homeowner'],
  })),
  enableRoles: jest.fn(async () => {}),
}));

jest.mock('@/features/projects/api');
const api = jest.mocked(projectsApi);
jest.mock('@/features/photos/api');
const photos = jest.mocked(photosApi);
jest.mock('@/features/survey/api', () => ({
  ...jest.requireActual('@/features/survey/api'),
  listInspections: jest.fn(),
  addInspection: jest.fn(),
  removeInspection: jest.fn(),
  saveSnapshot: jest.fn(),
}));
const survey = jest.mocked(surveyApi);
jest.mock('@/features/quotes/export', () => ({ shareQuotePdf: jest.fn() }));
const pdf = jest.mocked(quoteExport);
jest.mock('@/features/sharing/api', () => ({
  ...jest.requireActual('@/features/sharing/api'),
  listSharedProjects: jest.fn(),
  getSharedProject: jest.fn(),
}));
const sharing = jest.mocked(sharingApi);

const project: ProjectRow = {
  id: 'p1',
  owner_id: 'user-1',
  title: 'Salon boyası',
  status: 'planning',
  notes: null,
  budget: 30000,
  currency: 'TRY',
  created_at: '',
  updated_at: '',
};

const salon: RoomWithOpenings = {
  id: 'r1',
  project_id: 'p1',
  name: 'Salon',
  length_m: 4,
  width_m: 3,
  height_m: 2.5,
  paint_walls: true,
  paint_ceiling: true,
  coats: 2,
  surface_type: 'painted',
  surface_condition: 'good',
  coverage_m2_per_l: null,
  coverage_source: null,
  sort_order: 0,
  created_at: '',
  updated_at: '',
  openings: [],
};

const damp: InspectionResultRow = {
  id: 'i1',
  project_id: 'p1',
  place: 'wet',
  symptoms: ['damp_stain'],
  location: 'Banyo tavanı',
  created_at: '2026-10-25T10:00:00Z',
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
  photos.listProjectPhotos.mockResolvedValue([]);
});

describe('Keşif dosyası', () => {
  it('shows rooms, engine totals and saved inspections', async () => {
    api.getProject.mockResolvedValue({ project, rooms: [salon] });
    survey.listInspections.mockResolvedValue([damp]);
    await renderRouter('./src/app', { initialUrl: '/projects/p1/survey' });
    expect(await screen.findByTestId('survey-file')).toBeTruthy();
    expect(screen.getByText('Salon')).toBeTruthy();
    // Same numbers as the project screen: 35 m² walls + 12 m² ceiling → 10,3 L
    expect(screen.getAllByText('10,3 L').length).toBeGreaterThan(0);
    expect(screen.getByText('Banyo tavanı')).toBeTruthy();
    expect(screen.getByText('Nem lekesi · Uzmana danış')).toBeTruthy();
    expect(screen.getByText(/nedeni giderilmeli/)).toBeTruthy();
    // The budget is private to the homeowner and never part of the file.
    expect(screen.queryByText(/30\.000/)).toBeNull();
  });

  it('stores a snapshot and shares the PDF', async () => {
    api.getProject.mockResolvedValue({ project, rooms: [salon] });
    survey.listInspections.mockResolvedValue([]);
    survey.saveSnapshot.mockResolvedValue(true);
    pdf.shareQuotePdf.mockResolvedValue();
    await renderRouter('./src/app', { initialUrl: '/projects/p1/survey' });
    await fireEvent.press(await screen.findByText('PDF olarak paylaş'));
    await waitFor(() => expect(pdf.shareQuotePdf).toHaveBeenCalled());
    expect(survey.saveSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      'p1',
      expect.objectContaining({ engineVersion: expect.any(String), input: expect.objectContaining({ rooms: expect.any(Array) }) }),
    );
    expect(pdf.shareQuotePdf.mock.calls[0][0]).toContain('Salon boyası');
  });

  it('lists what a painter would ask for before quoting', async () => {
    api.getProject.mockResolvedValue({ project, rooms: [salon] });
    survey.listInspections.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/projects/p1/survey' });
    expect(await screen.findByText('Teklif için eksik bilgi var')).toBeTruthy();
    expect(screen.getByText(/Duvar fotoğrafı yok/)).toBeTruthy();
    expect(screen.getByText(/Renk seçilmedi/)).toBeTruthy();
  });

  it('sends a text summary on WhatsApp and stores a snapshot', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    api.getProject.mockResolvedValue({ project, rooms: [salon] });
    survey.listInspections.mockResolvedValue([damp]);
    survey.saveSnapshot.mockResolvedValue(true);
    await renderRouter('./src/app', { initialUrl: '/projects/p1/survey' });
    await fireEvent.press(await screen.findByText('WhatsApp’ta özet gönder'));
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(survey.saveSnapshot).toHaveBeenCalled();
    const text = decodeURIComponent(open.mock.calls[0][0].replace('https://wa.me/?text=', ''));
    expect(text).toContain('BoyaCep keşif dosyası: Salon boyası');
    expect(text).toContain('Nem lekesi (Uzmana danış)');
    expect(text).not.toMatch(/30\.000/);
    open.mockRestore();
  });

  it('still shares the PDF when the snapshot cannot be saved', async () => {
    api.getProject.mockResolvedValue({ project, rooms: [salon] });
    survey.listInspections.mockResolvedValue([]);
    survey.saveSnapshot.mockRejectedValue(new Error('offline'));
    pdf.shareQuotePdf.mockResolvedValue();
    await renderRouter('./src/app', { initialUrl: '/projects/p1/survey' });
    await fireEvent.press(await screen.findByText('PDF olarak paylaş'));
    await waitFor(() => expect(pdf.shareQuotePdf).toHaveBeenCalled());
  });

  it('lets the homeowner delete an inspection', async () => {
    api.getProject.mockResolvedValue({ project, rooms: [] });
    survey.listInspections.mockResolvedValue([damp]);
    survey.removeInspection.mockResolvedValue();
    await renderRouter('./src/app', { initialUrl: '/projects/p1/survey' });
    await fireEvent.press(await screen.findByText('İncelemeyi sil'));
    await waitFor(() => expect(survey.removeInspection).toHaveBeenCalledWith(expect.anything(), 'i1'));
  });

  it('explains an empty file', async () => {
    api.getProject.mockResolvedValue({ project, rooms: [] });
    survey.listInspections.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/projects/p1/survey' });
    expect(await screen.findByText('Keşif dosyan henüz boş')).toBeTruthy();
  });

  it('shows an error with retry when inspections fail to load', async () => {
    api.getProject.mockResolvedValue({ project, rooms: [] });
    survey.listInspections.mockRejectedValue(new Error('offline'));
    await renderRouter('./src/app', { initialUrl: '/projects/p1/survey' });
    expect(await screen.findByText('Keşif dosyası yüklenemedi.', {}, { timeout: 3000 })).toBeTruthy();
  });
});

describe('Duvarını İncele → projeye kaydet', () => {
  it('saves the findings to the chosen project', async () => {
    api.listProjects.mockResolvedValue([project]);
    survey.addInspection.mockResolvedValue();
    await renderRouter('./src/app', { initialUrl: '/inspect' });
    await fireEvent.press(await screen.findByText('Fotoğrafsız devam et'));
    await fireEvent.press(await screen.findByText('Oda ya da salon'));
    await fireEvent.press(screen.getByText('Devam'));
    await fireEvent.press(await screen.findByText('Kabarma'));
    await fireEvent.press(screen.getByText('Sonucu göster'));
    await fireEvent.press(await screen.findByText('Projeye kaydet'));
    await fireEvent.changeText(await screen.findByPlaceholderText('Banyo tavanı, salon pencere altı…'), ' Koridor ');
    await fireEvent.press(await screen.findByText('Salon boyası'));
    await waitFor(() =>
      expect(survey.addInspection).toHaveBeenCalledWith(expect.anything(), {
        project_id: 'p1',
        place: 'room',
        symptoms: ['blistering'],
        location: 'Koridor',
      }),
    );
    expect(await screen.findByText('Keşif dosyasını aç')).toBeTruthy();
  });
});

describe('Keşif dosyası for a painter on the project', () => {
  it('shows the same file with the owner name, read only and without a snapshot', async () => {
    sharing.listSharedProjects.mockResolvedValue([
      { id: 'p1', title: 'Salon boyası', status: 'planning', owner_name: 'Ayşe', shared_at: '', updated_at: '' },
    ]);
    sharing.getSharedProject.mockResolvedValue({ rooms: [salon], materials: [] });
    survey.listInspections.mockResolvedValue([damp]);
    pdf.shareQuotePdf.mockResolvedValue();
    await renderRouter('./src/app', { initialUrl: '/usta/survey/p1' });
    expect(await screen.findByTestId('survey-file')).toBeTruthy();
    expect(screen.getByText('Ayşe')).toBeTruthy();
    expect(screen.getByText('Banyo tavanı')).toBeTruthy();
    expect(screen.queryByText('İncelemeyi sil')).toBeNull();
    await fireEvent.press(screen.getByText('PDF olarak paylaş'));
    await waitFor(() => expect(pdf.shareQuotePdf).toHaveBeenCalled());
    expect(survey.saveSnapshot).not.toHaveBeenCalled();
  });

  it('says so when the homeowner stopped sharing', async () => {
    sharing.listSharedProjects.mockResolvedValue([]);
    sharing.getSharedProject.mockResolvedValue({ rooms: [], materials: [] });
    survey.listInspections.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/usta/survey/p1' });
    expect(await screen.findByText('Bu projeye erişimin yok')).toBeTruthy();
  });
});
