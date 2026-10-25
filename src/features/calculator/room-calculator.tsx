import { useState } from 'react';
import { View } from 'react-native';

import { calculateProject, type ProjectCalculation } from '@/engine';
import { Button } from '@/ui/components';
import { space } from '@/ui/theme';

import { EMPTY_ROOM_FORM, toRoomInput, type FormErrors, type RoomForm } from './form';
import { RoomFormFields } from './room-form-fields';
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
      <RoomFormFields form={form} errors={errors} set={set} />

      <Button label="Hesapla" icon="calculator" onPress={calculate} />

      {result && <RoomResults result={result} />}
    </View>
  );
}
