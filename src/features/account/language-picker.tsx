import { usePathname } from 'expo-router';
import { View } from 'react-native';

import { LOCALES, t } from '@/i18n';
import { useLocale } from '@/i18n/provider';
import { Segmented } from '@/ui/brand';
import { AppText } from '@/ui/components';
import { fonts, space } from '@/ui/theme';

/** Switches the app language. Each language is named in its own language. */
export function LanguagePicker() {
  const { locale, setLocale } = useLocale();
  const pathname = usePathname();
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
        {t('Dil')}
      </AppText>
      <Segmented options={LOCALES} value={locale} onChange={(next) => setLocale(next, pathname)} />
    </View>
  );
}
