import { fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';

import { toPicked, type PickedColour } from '@/features/colour/colour-explorer';
import { ColourStudio } from '@/features/colour/colour-studio';
import { MOCK_JPEG, mockExport } from '@/features/colour/photo-stage.mock';
import type { PhotoSurface } from '@/lib/database.types';

// No frames to wait for in tests.
jest.mock('@/ui/motion', () => ({ ...jest.requireActual('@/ui/motion'), afterPaint: () => Promise.resolve() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
// The share file in the app's cache, kept in memory: what was written where.
jest.mock('expo-file-system', () => {
  const written: { uri: string; bytes: Uint8Array }[] = [];
  class File {
    uri: string;
    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
    }
    create() {}
    async write(bytes: Uint8Array) {
      written.push({ uri: this.uri, bytes });
    }
  }
  return { File, Paths: { cache: 'file:///cache' }, __written: written };
});

const photo = { uri: 'file:///wall.jpg', width: 400, height: 300 };

function Studio({ initialSurfaces, onSave }: { initialSurfaces?: PhotoSurface[]; onSave?: (s: PhotoSurface[]) => void }) {
  const [colour, setColour] = useState<PickedColour>(toPicked('#A3B49A'));
  return (
    <ColourStudio
      photo={photo}
      colour={colour}
      quickColours={['#25324A', '#B35C3E']}
      onPickColour={setColour}
      initialSurfaces={initialSurfaces}
      onSaveSurfaces={onSave}
    />
  );
}

async function layout() {
  await fireEvent(screen.getByTestId('wall-canvas'), 'layout', { nativeEvent: { layout: { width: 400, height: 300 } } });
}

async function tap(x: number, y: number, label = 'Fotoğraf: yüzeyin köşesine dokun') {
  await fireEvent.press(screen.getByLabelText(label), {
    nativeEvent: { locationX: x, locationY: y },
  });
}

const corners = () => fireEvent.press(screen.getByLabelText('Köşeleri çiz'));

const paint = () => screen.getByRole('button', { name: 'Yüzeyi boya' });

describe('ColourStudio', () => {
  it('picks a surface by tapping similar colour', async () => {
    const onSave = jest.fn();
    await render(<Studio onSave={onSave} />);
    await layout();
    expect(paint()).toBeDisabled();
    await tap(100, 80, 'Fotoğraf: boyanacak yere dokun');
    expect(paint()).toBeEnabled();
    await fireEvent.press(screen.getByText('Geniş'));
    await tap(300, 80, 'Fotoğraf: boyanacak yere dokun');
    await fireEvent.press(paint());
    expect(screen.getByText('“Duvar” için renk: Adaçayı')).toBeTruthy();

    await fireEvent.press(screen.getByText('Projeye kaydet'));
    expect(onSave).toHaveBeenCalledWith([{ label: 'Duvar', points: [], seeds: [[0.25, 0.2667], [0.75, 0.2667]], tolerance: 24, hex: '#A3B49A' }]);
  });

  it('keeps out spots tapped in remove mode, and undoes them', async () => {
    const onSave = jest.fn();
    await render(<Studio onSave={onSave} />);
    await layout();
    await tap(200, 200, 'Fotoğraf: boyanacak yere dokun');
    await fireEvent.press(screen.getByLabelText('Çıkar'));
    await tap(200, 20, 'Fotoğraf: boyanacak yere dokun');
    await tap(380, 20, 'Fotoğraf: boyanacak yere dokun');
    await fireEvent.press(screen.getByText('Geri al'));
    await fireEvent.press(paint());
    await fireEvent.press(screen.getByText('Projeye kaydet'));
    expect(onSave).toHaveBeenCalledWith([
      { label: 'Duvar', points: [], seeds: [[0.5, 0.6667]], excludes: [[0.5, 0.0667]], tolerance: 15, hex: '#A3B49A' },
    ]);
  });

  it('remove taps alone cannot paint a surface', async () => {
    await render(<Studio />);
    await layout();
    await fireEvent.press(screen.getByLabelText('Çıkar'));
    await tap(200, 20, 'Fotoğraf: boyanacak yere dokun');
    expect(paint()).toBeDisabled();
  });

  it('needs three corners before a surface can be painted', async () => {
    await render(<Studio />);
    await layout();
    await corners();
    expect(paint()).toBeDisabled();
    await tap(40, 30);
    await tap(360, 30);
    expect(paint()).toBeDisabled();
    await tap(360, 270);
    expect(paint()).toBeEnabled();

    await fireEvent.press(paint());
    expect(screen.getByText('“Duvar” için renk: Adaçayı')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Lacivert'));
    expect(screen.getByText('“Duvar” için renk: Lacivert')).toBeTruthy();
  });

  it('keeps a separate colour for each surface and saves them', async () => {
    const onSave = jest.fn();
    await render(<Studio initialSurfaces={[{ label: 'Duvar', points: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]], hex: '#A3B49A' }]} onSave={onSave} />);
    await layout();

    await fireEvent.press(screen.getByLabelText('Yüzey ekle'));
    await fireEvent.press(screen.getByText('Tavan'));
    await corners();
    await tap(0, 0);
    await tap(400, 0);
    await tap(400, 40);
    await fireEvent.press(paint());
    await fireEvent.press(screen.getByLabelText('Terakota'));
    expect(screen.getByText('“Tavan” için renk: Terakota')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Duvar' }));
    expect(screen.getByText('“Duvar” için renk: Adaçayı')).toBeTruthy();

    await fireEvent.press(screen.getByText('Projeye kaydet'));
    const saved = onSave.mock.calls[0][0] as PhotoSurface[];
    expect(saved.map((s) => [s.label, s.hex])).toEqual([
      ['Duvar', '#A3B49A'],
      ['Tavan', '#B35C3E'],
    ]);
  });

  it('picks a colour from the photo and paints the surface with the closest one', async () => {
    const onSave = jest.fn();
    await render(<Studio initialSurfaces={[{ label: 'Duvar', points: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]], hex: '#25324A' }]} onSave={onSave} />);
    await layout();

    await fireEvent.press(screen.getByRole('button', { name: 'Renk yakala' }));
    expect(screen.queryByTestId('picked-colours')).toBeNull();
    await tap(200, 150, 'Fotoğraf: rengini öğrenmek istediğin yere dokun');
    const picked = within(screen.getByTestId('picked-colours'));
    expect(picked.getByText('En yakın 5 renk')).toBeTruthy();
    expect(picked.getAllByRole('button')).toHaveLength(5);
    expect(picked.getByText('Neredeyse aynı')).toBeTruthy();

    await fireEvent.press(picked.getByRole('button', { name: 'Adaçayı rengini dene' }));
    expect(screen.queryByTestId('picked-colours')).toBeNull();
    expect(screen.getByText('“Duvar” için renk: Adaçayı')).toBeTruthy();
    await fireEvent.press(screen.getByText('Projeye kaydet'));
    expect((onSave.mock.calls[0][0] as PhotoSurface[])[0].hex).toBe('#A3B49A');
  });

  it('picks a colour for the surface being selected, then goes back to selecting', async () => {
    const onSave = jest.fn();
    await render(<Studio onSave={onSave} />);
    await layout();
    await tap(100, 80, 'Fotoğraf: boyanacak yere dokun');

    await fireEvent.press(screen.getByRole('button', { name: 'Renk yakala' }));
    await tap(200, 150, 'Fotoğraf: rengini öğrenmek istediğin yere dokun');
    await fireEvent.press(screen.getByRole('button', { name: 'Yeşil gri rengini dene' }));

    await fireEvent.press(paint());
    expect(screen.getByText('“Duvar” için renk: Yeşil gri')).toBeTruthy();
    await fireEvent.press(screen.getByText('Projeye kaydet'));
    expect(onSave).toHaveBeenCalledWith([{ label: 'Duvar', points: [], seeds: [[0.25, 0.2667]], tolerance: 15, hex: '#A2A79C' }]);
  });

  it('leaves picking with "Bitti" without changing anything', async () => {
    await render(<Studio initialSurfaces={[{ label: 'Duvar', points: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]], hex: '#25324A' }]} />);
    await layout();
    await fireEvent.press(screen.getByRole('button', { name: 'Renk yakala' }));
    await tap(200, 150, 'Fotoğraf: rengini öğrenmek istediğin yere dokun');
    await fireEvent.press(screen.getByRole('button', { name: 'Bitti' }));
    expect(screen.queryByTestId('picked-colours')).toBeNull();
    expect(screen.getByText('“Duvar” için renk: Lacivert')).toBeTruthy();
  });

  it('undoes the last corner', async () => {
    await render(<Studio />);
    await layout();
    await corners();
    await tap(40, 30);
    await tap(360, 30);
    await tap(360, 270);
    await fireEvent.press(screen.getByText('Geri al'));
    expect(paint()).toBeDisabled();
  });
});

describe('sharing the painted room', () => {
  const painted: PhotoSurface[] = [
    { label: 'Duvar', points: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]], hex: '#A3B49A' },
    { label: 'Dolap', points: [[0.1, 0.5], [0.3, 0.5], [0.3, 0.9]], hex: null },
    { label: 'Tavan', points: [[0, 0], [1, 0], [1, 0.1]], hex: '#25324A' },
  ];
  const button = () => screen.getByRole('button', { name: 'Paylaş, fikir al' });
  const share = async () => {
    await fireEvent.press(button());
    expect(button()).not.toBeBusy();
  };

  beforeEach(() => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
    jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
  });
  afterEach(() => jest.clearAllMocks());

  it('sends the photo with each painted surface and its colour written on it', async () => {
    await render(<Studio initialSurfaces={painted} />);
    await layout();
    await share();
    expect(jest.mocked(Sharing.shareAsync)).toHaveBeenCalledWith('file:///cache/boyacep-oda.jpg', expect.objectContaining({ mimeType: 'image/jpeg' }));
    expect(mockExport).toHaveBeenCalledWith({ lines: ['Duvar: Adaçayı', 'Tavan: Lacivert'], note: 'BoyaCep renk önizlemesi' });
    const { __written } = jest.requireMock<{ __written: { uri: string; bytes: Uint8Array }[] }>('expo-file-system');
    expect(__written.at(-1)).toEqual({ uri: 'file:///cache/boyacep-oda.jpg', bytes: MOCK_JPEG });
  });

  it('is not offered before a surface has a colour', async () => {
    await render(<Studio />);
    await layout();
    expect(screen.queryByRole('button', { name: 'Paylaş, fikir al' })).toBeNull();
  });

  it('says what went wrong instead of failing quietly', async () => {
    await render(<Studio initialSurfaces={painted} />);
    await layout();

    mockExport.mockReturnValueOnce(null);
    await share();
    expect(screen.getByText('Fotoğraf henüz hazır değil. Birkaç saniye sonra tekrar dene.')).toBeTruthy();

    jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
    await share();
    expect(screen.getByText('Bu cihazda paylaşma açılamıyor.')).toBeTruthy();

    jest.mocked(Sharing.shareAsync).mockRejectedValueOnce(new Error('closed'));
    await share();
    expect(screen.getByText('Fotoğraf paylaşılamadı. Tekrar dene.')).toBeTruthy();
    expect(screen.queryByText('Bu cihazda paylaşma açılamıyor.')).toBeNull();
  });
});
