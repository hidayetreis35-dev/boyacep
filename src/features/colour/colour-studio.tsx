import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { WallOutline } from '@/lib/database.types';
import { AppText, Button, ChoiceChips, Icon, Notice, TextField } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

import { isUsableOutline, MAX_OUTLINE_POINTS } from './outline';
import { isLight, normaliseHex, PALETTE } from './palette';
import { WallCanvas } from './wall-canvas';

const STRENGTHS = [
  { value: 'light', label: 'Hafif', opacity: 0.45 },
  { value: 'medium', label: 'Orta', opacity: 0.65 },
  { value: 'strong', label: 'Güçlü', opacity: 0.85 },
] as const;
type Strength = (typeof STRENGTHS)[number]['value'];

function Swatch({ hex, name, selected, onPress }: { hex: string; name: string; selected: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        backgroundColor: hex,
        borderWidth: selected ? 3 : 1,
        borderColor: selected ? p.primary : p.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {selected ? <Icon name="checkmark" size={20} color={isLight(hex) ? '#1B1F1E' : '#FFFFFF'} /> : null}
    </Pressable>
  );
}

/**
 * Outline a wall on a photo and preview colours on it.
 * Works fully on the device; saving the outline is optional and handled by the caller.
 */
export function ColourStudio({
  photo,
  initialOutline,
  onChangePhoto,
  onSaveOutline,
  saving,
  saveError,
}: {
  photo: { uri: string; width: number; height: number };
  initialOutline?: WallOutline | null;
  onChangePhoto?: () => void;
  onSaveOutline?: (outline: WallOutline | null) => void;
  saving?: boolean;
  saveError?: string | null;
}) {
  const [outline, setOutline] = useState<WallOutline>(initialOutline ?? []);
  const [drawing, setDrawing] = useState(!isUsableOutline(initialOutline));
  const [colour, setColour] = useState(PALETTE[3].colours[1].hex);
  const [strength, setStrength] = useState<Strength>('medium');
  const [showColour, setShowColour] = useState(true);
  const [customHex, setCustomHex] = useState('');
  const pointCount = outline.length;
  const usable = isUsableOutline(outline);
  const customError = customHex.trim() && !normaliseHex(customHex) ? 'Örnek: #8FB3CF' : undefined;
  const colourName = PALETTE.flatMap((g) => g.colours).find((c) => c.hex === colour)?.name ?? colour;

  const addPoint = (point: [number, number]) =>
    setOutline((o) => (o.length >= MAX_OUTLINE_POINTS ? o : [...o, point]));

  return (
    <View style={{ gap: space.lg }}>
      {drawing ? (
        <Notice icon="hand-left">
          Boyamak istediğin duvarın köşelerine sırayla dokun. En az 3 nokta gerekir. Kapı, pencere ve dolapların dışından geç.
        </Notice>
      ) : null}

      <WallCanvas
        uri={photo.uri}
        aspect={photo.width / photo.height}
        outline={outline}
        colour={colour}
        opacity={STRENGTHS.find((s) => s.value === strength)!.opacity}
        showColour={showColour && !drawing}
        drawing={drawing}
        onAddPoint={addPoint}
      />

      {drawing ? (
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button label="Geri al" icon="arrow-undo" variant="secondary" disabled={outline.length === 0} onPress={() => setOutline((o) => o.slice(0, -1))} />
          <Button label="Temizle" icon="close" variant="ghost" disabled={outline.length === 0} onPress={() => setOutline([])} />
          <Button label="Duvarı boya" icon="color-fill" disabled={!usable} onPress={() => setDrawing(false)} />
        </View>
      ) : (
        <>
          <ChoiceChips
            options={[
              { value: 'after', label: 'Yeni renk' },
              { value: 'before', label: 'Şu anki hali' },
            ]}
            value={showColour ? 'after' : 'before'}
            onChange={(v) => setShowColour(v === 'after')}
          />
          <AppText variant="bodyStrong">Seçili renk: {colourName}</AppText>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {PALETTE.flatMap((group) => group.colours).map((c) => (
              <Swatch key={c.hex} hex={c.hex} name={c.name} selected={colour === c.hex} onPress={() => setColour(c.hex)} />
            ))}
          </View>
          <TextField
            label="Kendi renk kodun (isteğe bağlı)"
            value={customHex}
            placeholder="#8FB3CF"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={7}
            error={customError}
            hint="Boya kataloğundaki HEX kodunu yazabilirsin."
            onChangeText={(text) => {
              setCustomHex(text);
              const hex = normaliseHex(text);
              if (hex) setColour(hex);
            }}
          />
          <ChoiceChips
            label="Renk yoğunluğu"
            options={STRENGTHS.map(({ value, label }) => ({ value, label }))}
            value={strength}
            onChange={setStrength}
          />
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button label="Çizimi düzenle" icon="create" variant="secondary" onPress={() => setDrawing(true)} />
            {onChangePhoto ? <Button label="Başka fotoğraf" icon="images" variant="ghost" onPress={onChangePhoto} /> : null}
          </View>
        </>
      )}

      {onSaveOutline ? (
        <>
          <Button
            label="Çizimi projeye kaydet"
            icon="save"
            loading={saving}
            disabled={!usable && pointCount > 0}
            onPress={() => onSaveOutline(usable ? outline : null)}
          />
          {saveError ? (
            <Notice tone="danger" icon="alert-circle">
              {saveError}
            </Notice>
          ) : null}
        </>
      ) : null}

      <Notice icon="information-circle">
        Bu bir önizlemedir. Ekrandaki renk; ışığa, ekran ayarına ve boyanın parlaklığına göre gerçekte farklı görünür. Karar vermeden önce boyanın renk kartına bak ya da küçük bir alana deneme yap.
      </Notice>
    </View>
  );
}
