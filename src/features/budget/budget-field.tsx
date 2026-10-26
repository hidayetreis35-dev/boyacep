import { useState } from 'react';

import { useSetBudget } from '@/features/materials/queries';
import { t } from '@/i18n';
import { formatNumber, parseDecimal } from '@/lib/number';
import { AppText, Button, Card, NumberField } from '@/ui/components';

/** The amount set aside for the job. */
export function BudgetField({ projectId, budget }: { projectId: string; budget: number | null }) {
  const initial = budget === null ? '' : formatNumber(budget, 2);
  const [text, setText] = useState(initial);
  const save = useSetBudget(projectId);
  const value = text.trim() === '' ? null : parseDecimal(text);
  const invalid = value !== null && !Number.isFinite(value);
  return (
    <Card>
      <AppText variant="heading">{t('Bütçe')}</AppText>
      <NumberField
        label={t('Bu iş için ayırdığın tutar')}
        unit="₺"
        value={text}
        onChangeText={setText}
        error={invalid ? t('Tutarı sayı olarak yazın.') : undefined}
        testID="budget"
      />
      {text !== initial ? (
        <Button label={t('Bütçeyi kaydet')} variant="secondary" disabled={invalid} loading={save.isPending} onPress={() => save.mutate(value)} />
      ) : null}
    </Card>
  );
}
