import { fireEvent, render, screen } from '@testing-library/react-native';

import { ColourStudio } from '@/features/colour/colour-studio';

const photo = { uri: 'file:///wall.jpg', width: 400, height: 300 };

async function layout() {
  await fireEvent(screen.getByTestId('wall-canvas'), 'layout', { nativeEvent: { layout: { width: 400, height: 300 } } });
}

async function tap(x: number, y: number) {
  await fireEvent.press(screen.getByLabelText('Fotoğraf: duvarın köşesine dokun'), {
    nativeEvent: { locationX: x, locationY: y },
  });
}

describe('ColourStudio', () => {
  it('needs three corners before the wall can be painted', async () => {
    await render(<ColourStudio photo={photo} />);
    await layout();
    const paint = () => screen.getByRole('button', { name: 'Duvarı boya' });
    expect(paint()).toBeDisabled();
    await tap(40, 30);
    await tap(360, 30);
    expect(paint()).toBeDisabled();
    await tap(360, 270);
    expect(paint()).toBeEnabled();

    await fireEvent.press(paint());
    expect(screen.getByText(/Seçili renk:/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Lacivert'));
    expect(screen.getByText('Seçili renk: Lacivert')).toBeTruthy();
  });

  it('accepts a custom colour code and saves the outline', async () => {
    const onSave = jest.fn();
    await render(
      <ColourStudio
        photo={photo}
        initialOutline={[[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]]}
        onSaveOutline={onSave}
      />,
    );
    await fireEvent.changeText(screen.getByLabelText('Kendi renk kodun (isteğe bağlı)'), '#12665f');
    expect(screen.getByText('Seçili renk: #12665F')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Kendi renk kodun (isteğe bağlı)'), '#12');
    expect(screen.getByText('Örnek: #8FB3CF')).toBeTruthy();

    await fireEvent.press(screen.getByText('Çizimi projeye kaydet'));
    expect(onSave).toHaveBeenCalledWith([[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]]);
  });

  it('undoes the last corner', async () => {
    await render(<ColourStudio photo={photo} />);
    await layout();
    await tap(40, 30);
    await tap(360, 30);
    await tap(360, 270);
    await fireEvent.press(screen.getByText('Geri al'));
    expect(screen.getByRole('button', { name: 'Duvarı boya' })).toBeDisabled();
  });
});
