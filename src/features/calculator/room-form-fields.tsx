import { View } from 'react-native';

import { t } from '@/i18n';
import { AppText, Card, ChoiceChips, FieldRow, Notice, NumberField, Stepper, Toggle } from '@/ui/components';
import { space } from '@/ui/theme';

import type { FormErrors, RoomForm } from './form';
import { SURFACE_CONDITION_OPTIONS, SURFACE_TYPE_OPTIONS } from './labels';

/** The room measurement form, shared by the calculator and the project room editor. */
export function RoomFormFields({
  form,
  errors,
  set,
}: {
  form: RoomForm;
  errors: FormErrors;
  set: <K extends keyof RoomForm>(key: K, value: RoomForm[K]) => void;
}) {
  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <AppText variant="heading">{t('Oda ölçüleri')}</AppText>
        <FieldRow>
          <NumberField label={t('Uzunluk')} unit="m" value={form.length} onChangeText={(value) => set('length', value)} error={errors.length} testID="length" />
          <NumberField label={t('Genişlik')} unit="m" value={form.width} onChangeText={(value) => set('width', value)} error={errors.width} testID="width" />
        </FieldRow>
        <NumberField label={t('Tavan yüksekliği')} unit="m" value={form.height} onChangeText={(value) => set('height', value)} error={errors.height} testID="height" />
      </Card>

      <Card>
        <Stepper label={t('Kapı sayısı')} value={form.doorCount} min={0} max={10} onChange={(v) => set('doorCount', v)} />
        {form.doorCount > 0 && (
          <FieldRow>
            <NumberField label={t('Kapı genişliği')} unit="m" value={form.doorWidth} onChangeText={(value) => set('doorWidth', value)} />
            <NumberField label={t('Kapı yüksekliği')} unit="m" value={form.doorHeight} onChangeText={(value) => set('doorHeight', value)} error={errors.doorHeight ?? errors.doorCount} />
          </FieldRow>
        )}
        <Stepper label={t('Pencere sayısı')} value={form.windowCount} min={0} max={20} onChange={(v) => set('windowCount', v)} />
        {form.windowCount > 0 && (
          <FieldRow>
            <NumberField label={t('Pencere genişliği')} unit="m" value={form.windowWidth} onChangeText={(value) => set('windowWidth', value)} />
            <NumberField label={t('Pencere yüksekliği')} unit="m" value={form.windowHeight} onChangeText={(value) => set('windowHeight', value)} error={errors.windowHeight ?? errors.windowCount} />
          </FieldRow>
        )}
      </Card>

      <Card>
        <AppText variant="heading">{t('Neresi boyanacak?')}</AppText>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Toggle label={t('Duvarlar')} value={form.paintWalls} onChange={(v) => set('paintWalls', v)} />
          <Toggle label={t('Tavan')} value={form.paintCeiling} onChange={(v) => set('paintCeiling', v)} />
        </View>
        <Stepper label={t('Kat sayısı')} value={form.coats} min={1} max={4} onChange={(v) => set('coats', v)} />
        <ChoiceChips label={t('Yüzey türü')} options={SURFACE_TYPE_OPTIONS} value={form.surfaceType} onChange={(v) => set('surfaceType', v)} />
        <ChoiceChips label={t('Yüzey durumu')} options={SURFACE_CONDITION_OPTIONS} value={form.surfaceCondition} onChange={(v) => set('surfaceCondition', v)} />
      </Card>

      <Card>
        <AppText variant="heading">{t('Boya sarfiyatı (isteğe bağlı)')}</AppText>
        <NumberField
          label={t('1 litre kaç m² boyar? (tek kat)')}
          unit="m²/L"
          value={form.coverage}
          onChangeText={(value) => set('coverage', value)}
          error={errors.coverage}
          hint={t('Boş bırakırsan genel tahmin (10 m²/L) kullanılır. Değer kutunun üstünde veya teknik föyde yazar.')}
        />
        {form.coverage.trim() !== '' && (
          <ChoiceChips
            label={t('Bu değer nereden?')}
            options={[
              { value: 'manufacturer', label: t('Teknik föy / kutu') },
              { value: 'user', label: t('Kendi tecrübem') },
            ]}
            value={form.coverageSource}
            onChange={(v) => set('coverageSource', v)}
          />
        )}
      </Card>

      {errors.form ? <Notice tone="danger" icon="alert-circle">{errors.form}</Notice> : null}
      {Object.keys(errors).length > 0 && !errors.form ? (
        <Notice tone="danger" icon="alert-circle">{t('Kırmızı alanlara bir göz atalım, sonra devam edelim.')}</Notice>
      ) : null}
    </View>
  );
}
