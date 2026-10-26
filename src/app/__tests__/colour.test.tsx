import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

async function openStudio() {
  await renderRouter('./src/app', { initialUrl: '/colour' });
  await screen.findByText('Renk kataloğu');
}

describe('Renk Stüdyosu', () => {
  it('finds colours by name and by code', async () => {
    await openStudio();
    await fireEvent.changeText(screen.getByTestId('colour-search'), 'lacivert');
    await fireEvent.press(screen.getByLabelText('Lacivert'));
    expect(screen.getAllByText('Lacivert').length).toBeGreaterThan(0);
    expect(screen.getByTestId('selected-colour')).toHaveTextContent(/Lacivert/);

    await fireEvent.changeText(screen.getByTestId('colour-search'), '#12665f');
    expect(screen.getByText('#12665F')).toBeTruthy();
    expect(screen.getByText(/En yakın hazır renk:/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Kullan'));
    expect(screen.getAllByText('#12665F').length).toBeGreaterThan(1);
  });

  it('browses families and keeps favourites', async () => {
    await openStudio();
    expect(screen.getByText('Zamansız klasikler')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Maviler'));
    await fireEvent.press(screen.getByLabelText('Petrol mavisi'));
    await fireEvent.press(screen.getByLabelText('Favorilere ekle'));
    await waitFor(() => expect(screen.getByLabelText('Favorilerden çıkar')).toBeTruthy());

    // The favourite stays one tap away in the quick row of the selected colour.
    expect(screen.getByLabelText('Petrol mavisi rengini seç')).toBeTruthy();
  });

  it('compares up to three colours side by side', async () => {
    await openStudio();
    await fireEvent.press(screen.getByText('Karşılaştır'));
    expect(screen.getByText('Karşılaştır (1/3)')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Terakota'));
    await fireEvent.press(screen.getByText('Karşılaştır'));
    expect(screen.getByTestId('compare')).toBeTruthy();
    expect(screen.getByText('Karşılaştır (2/3)')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Terakota karşılaştırmadan çıkar'));
    expect(screen.getByText('Karşılaştır (1/3)')).toBeTruthy();
  });

  it('offers matching colour schemes', async () => {
    await openStudio();
    expect(screen.getByTestId('room-preview')).toBeTruthy();
    expect(screen.getAllByLabelText(/^Ton sür ton: /).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByLabelText('Kombinasyonlar'));
    for (const name of ['Ton sür ton', 'Komşu renkler', 'Zıt vurgu', 'Nötr eşlik']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.queryByText('Renk kataloğu')).toBeNull();
    // Picking a colour from a scheme makes it the selected colour.
    const accent = screen.getAllByLabelText(/^Zıt vurgu: /).at(-1)!;
    const name = String(accent.props.accessibilityLabel).replace('Zıt vurgu: ', '');
    await fireEvent.press(accent);
    await fireEvent.press(screen.getByLabelText('Renkler'));
    expect(screen.getByTestId('selected-colour')).toHaveTextContent(new RegExp(name));
  });
});
