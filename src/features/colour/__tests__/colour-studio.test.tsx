import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { toPicked, type PickedColour } from '@/features/colour/colour-explorer';
import { ColourStudio } from '@/features/colour/colour-studio';
import type { PhotoSurface } from '@/lib/database.types';

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
