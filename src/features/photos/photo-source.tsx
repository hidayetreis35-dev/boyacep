import { useState } from 'react';
import { View } from 'react-native';

import { Button, Notice } from '@/ui/components';
import { space } from '@/ui/theme';

import { pickPhoto, type PickedPhoto } from './picker';

export function PhotoSourceButtons({ onPicked, busy }: { onPicked: (photo: PickedPhoto) => void; busy?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    setMessage(null);
    setPicking(true);
    try {
      const result = await pickPhoto(source);
      if (result.ok) onPicked(result.photo);
      else if (result.reason === 'permission') {
        setMessage(
          source === 'camera'
            ? 'Kamera izni verilmedi. Telefonun ayarlarından BoyaCep için kamera iznini açabilirsin.'
            : 'Galeri izni verilmedi. Telefonun ayarlarından BoyaCep için fotoğraf iznini açabilirsin.',
        );
      }
    } catch {
      setMessage('Fotoğraf açılamadı. Başka bir fotoğraf dene.');
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      <Button label="Fotoğraf çek" icon="camera" loading={picking || busy} onPress={() => pick('camera')} />
      <Button label="Galeriden seç" icon="images" variant="secondary" disabled={picking || busy} onPress={() => pick('library')} />
      {message ? (
        <Notice tone="danger" icon="alert-circle">
          {message}
        </Notice>
      ) : null}
    </View>
  );
}
