import { fireEvent, render, screen } from '@testing-library/react-native';

import { IconLink, PhotoHero, QuickAction, RoomStrip, SamplePreview, SectionHeader, SkeletonCard } from '@/ui/showcase';
import { AppText } from '@/ui/components';

describe('showcase pieces', () => {
  it('PhotoHero shows the headline and one action', async () => {
    const onAction = jest.fn();
    await render(<PhotoHero photo="welcome" title="Evin için güzel fikirler" body="Alt metin" action="Hemen başla" onAction={onAction} />);
    expect(screen.getByRole('header', { name: 'Evin için güzel fikirler' })).toBeTruthy();
    expect(screen.getByText('Alt metin')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Hemen başla' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('QuickAction is a labelled button with its hint', async () => {
    const onPress = jest.fn();
    await render(<QuickAction title="Boya Hesapla" hint="Kaç litre lazım?" icon="color-fill" feature="calculate" onPress={onPress} />);
    expect(screen.getByText('Kaç litre lazım?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Boya Hesapla' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('RoomStrip lists every room, with or without a photo, on phones and wide screens', async () => {
    const onSalon = jest.fn();
    const items = [
      { key: 'living', title: 'Salon', photo: 'inspiration' as const, onPress: onSalon },
      { key: 'home', title: 'Tüm ev', icon: 'home' as const, onPress: jest.fn() },
    ];
    const { rerender } = await render(<RoomStrip items={items} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Salon' }));
    expect(onSalon).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Tüm ev' })).toBeTruthy();
    await rerender(<RoomStrip items={items} wide />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('SectionHeader is a heading with an optional link', async () => {
    const onAction = jest.fn();
    await render(<SectionHeader title="Evini yenile" action="Tümü" onAction={onAction} />);
    expect(screen.getByRole('header', { name: 'Evini yenile' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Tümü' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('IconLink says honestly when a feature is not ready', async () => {
    await render(<IconLink title="AI Ev Tasarımı" icon="sparkles" feature="color" soon onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'AI Ev Tasarımı, yakında' })).toBeTruthy();
    expect(screen.getByText('Yakında')).toBeTruthy();
  });

  it('SamplePreview always carries the Örnek tag', async () => {
    await render(
      <SamplePreview testID="sample">
        <AppText>Salon, 18 m²</AppText>
      </SamplePreview>,
    );
    expect(screen.getByText('ÖRNEK')).toBeTruthy();
    expect(screen.getByText('Salon, 18 m²')).toBeTruthy();
  });

  it('SkeletonCard tells screen readers it is loading', async () => {
    await render(<SkeletonCard />);
    expect(screen.getByLabelText('Yükleniyor')).toBeTruthy();
  });
});
