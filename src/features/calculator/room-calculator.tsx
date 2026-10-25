import { useState } from 'react';
import { View } from 'react-native';

import { calculateProject, type ProjectCalculation } from '@/engine';
import { AppText, Button, Card, ChoiceChips, FieldRow, Notice, NumberField, Stepper, Toggle } from '@/ui/components';
import { space } from '@/ui/theme';

import { EMPTY_ROOM_FORM, toRoomInput, type FormErrors, type RoomForm } from './form';
import { SURFACE_CONDITION_OPTIONS, SURFACE_TYPE_OPTIONS } from './labels';
import { RoomResults } from './results';

export function RoomCalculator() {
  const [form, setForm] = useState<RoomForm>(EMPTY_ROOM_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<ProjectCalculation | null>(null);

  const set = <K extends keyof RoomForm>(key: K, value: RoomForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setResult(null);
  };

  const calculate = () => {
    const parsed = toRoomInput(form);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setResult(null);
      return;
    }
    const calc = calculateProject([parsed.input]);
    if (!calc.ok) {
      setErrors({ form: calc.issues[0]?.message });
      setResult(null);
      return;
    }
    setErrors({});
    setResult(calc.value);
  };

  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <AppText variant="heading">Oda ölçüleri</AppText>
        <FieldRow>
          <NumberField label="Uzunluk" unit="m" value={form.length} onChangeText={(t) => set('length', t)} error={errors.length} testID="length" />
          <NumberField label="Genişlik" unit="m" value={form.width} onChangeText={(t) => set('width', t)} error={errors.width} testID="width" />
        </FieldRow>
        <NumberField label="Tavan yüksekliği" unit="m" value={form.height} onChangeText={(t) => set('height', t)} error={errors.height} testID="height" />
      </Card>

      <Card>
        <Stepper label="Kapı sayısı" value={form.doorCount} min={0} max={10} onChange={(v) => set('doorCount', v)} />
        {form.doorCount > 0 && (
          <FieldRow>
            <NumberField label="Kapı genişliği" unit="m" value={form.doorWidth} onChangeText={(t) => set('doorWidth', t)} />
            <NumberField label="Kapı yüksekliği" unit="m" value={form.doorHeight} onChangeText={(t) => set('doorHeight', t)} error={errors.doorHeight ?? errors.doorCount} />
          </FieldRow>
        )}
        <Stepper label="Pencere sayısı" value={form.windowCount} min={0} max={20} onChange={(v) => set('windowCount', v)} />
        {form.windowCount > 0 && (
          <FieldRow>
            <NumberField label="Pencere genişliği" unit="m" value={form.windowWidth} onChangeText={(t) => set('windowWidth', t)} />
            <NumberField label="Pencere yüksekliği" unit="m" value={form.windowHeight} onChangeText={(t) => set('windowHeight', t)} error={errors.windowHeight ?? errors.windowCount} />
          </FieldRow>
        )}
      </Card>

      <Card>
        <AppText variant="heading">Neresi boyanacak?</AppText>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Toggle label="Duvarlar" value={form.paintWalls} onChange={(v) => set('paintWalls', v)} />
          <Toggle label="Tavan" value={form.paintCeiling} onChange={(v) => set('paintCeiling', v)} />
        </View>
        <Stepper label="Kat sayısı" value={form.coats} min={1} max={4} onChange={(v) => set('coats', v)} />
        <ChoiceChips label="Yüzey türü" options={SURFACE_TYPE_OPTIONS} value={form.surfaceType} onChange={(v) => set('surfaceType', v)} />
        <ChoiceChips label="Yüzey durumu" options={SURFACE_CONDITION_OPTIONS} value={form.surfaceCondition} onChange={(v) => set('surfaceCondition', v)} />
      </Card>

      <Card>
        <AppText variant="heading">Boya sarfiyatı (isteğe bağlı)</AppText>
        <NumberField
          label="1 litre kaç m² boyar? (tek kat)"
          unit="m²/L"
          value={form.coverage}
          onChangeText={(t) => set('coverage', t)}
          error={errors.coverage}
          hint="Boş bırakırsan genel tahmin (10 m²/L) kullanılır. Değer kutunun üstünde veya teknik föyde yazar."
        />
        {form.coverage.trim() !== '' && (
          <ChoiceChips
            label="Bu değer nereden?"
            options={[
              { value: 'manufacturer', label: 'Teknik föy / kutu' },
              { value: 'user', label: 'Kendi tecrübem' },
            ]}
            value={form.coverageSource}
            onChange={(v) => set('coverageSource', v)}
          />
        )}
      </Card>

      {errors.form ? <Notice tone="danger" icon="alert-circle">{errors.form}</Notice> : null}
      {Object.keys(errors).length > 0 && !errors.form ? (
        <Notice tone="danger" icon="alert-circle">Lütfen kırmızı işaretli alanları düzeltin.</Notice>
      ) : null}

      <Button label="Hesapla" icon="calculator" onPress={calculate} />

      {result && <RoomResults result={result} />}
    </View>
  );
}
