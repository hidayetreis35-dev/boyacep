import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, View } from 'react-native';

import { quantityText } from '@/features/calculator/labels';
import { useMaterials } from '@/features/materials/queries';
import { loadBought, saveBought, shoppingItems, shoppingText, whatsappUrl } from '@/features/materials/shopping';
import { useProject } from '@/features/projects/queries';
import { t } from '@/i18n';
import { formatMoney } from '@/lib/number';
import { AppText, Button, Card, EmptyState, ErrorState, FieldRow, Icon, LoadingState, Notice, Screen } from '@/ui/components';
import { fonts, radius, space, useFeatureColour, usePalette } from '@/ui/theme';

export default function ShoppingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const f = useFeatureColour('cost');
  const project = useProject(id);
  const materials = useMaterials(id);
  const [bought, setBought] = useState<Set<string> | null>(null);
  const [shareError, setShareError] = useState(false);

  useEffect(() => {
    loadBought(id).then(setBought);
  }, [id]);

  if (project.isPending || materials.isPending || bought === null) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (project.isError || materials.isError) {
    const retry = () => {
      project.refetch();
      materials.refetch();
    };
    return <Screen edges={['bottom']}><ErrorState message={t('Malzeme listesi yüklenemedi.')} onRetry={retry} /></Screen>;
  }

  const items = shoppingItems(materials.data);
  const title = project.data.project.title;
  const done = items.filter((i) => bought.has(i.id)).length;

  const toggle = (itemId: string) => {
    const next = new Set(bought);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setBought(next);
    saveBought(id, next);
  };
  const clear = () => {
    setBought(new Set());
    saveBought(id, new Set());
  };
  const text = () => shoppingText(title, items, bought);
  const sendWhatsapp = () => {
    setShareError(false);
    Linking.openURL(whatsappUrl(text())).catch(() => setShareError(true));
  };
  const shareOther = () => {
    setShareError(false);
    Share.share({ message: text() }).catch(() => setShareError(true));
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('Alışveriş listesi') }} />
      {items.length === 0 ? (
        <EmptyState
          icon="cart"
          title={t('Liste boş')}
          message={t('Önce “Malzeme ve maliyet” ekranında ölçülerden liste oluştur ya da kalem ekle.')}
        />
      ) : (
        <>
          <Card>
            <AppText variant="heading">{t('{done} / {total} alındı', { done, total: items.length })}</AppText>
            <View style={[styles.track, { backgroundColor: p.surfaceMuted }]}>
              <View style={[styles.fill, { width: `${(done / items.length) * 100}%`, backgroundColor: f.base }]} />
            </View>
            <AppText variant="caption" tone="muted">
              {t('Markette aldıkça işaretle. İşaretler yalnızca bu telefonda tutulur.')}
            </AppText>
          </Card>

          <Card>
            {items.map((item) => {
              const checked = bought.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`${t(item.name)}, ${quantityText(Number(item.quantity), item.unit)}`}
                  onPress={() => toggle(item.id)}
                  style={[styles.row, { borderColor: p.border }]}>
                  <Icon name={checked ? 'checkbox' : 'square-outline'} size={26} color={checked ? f.base : p.textMuted} />
                  <View style={{ flex: 1 }}>
                    <AppText
                      variant="bodyStrong"
                      tone={checked ? 'muted' : undefined}
                      style={checked ? { textDecorationLine: 'line-through' } : undefined}>
                      {t(item.name)}
                    </AppText>
                    {item.unit_price !== null ? (
                      <AppText variant="caption" tone="muted">
                        {item.price_source === 'store'
                          ? formatMoney(Number(item.quantity) * Number(item.unit_price))
                          : t('≈ {amount} (tahmini)', { amount: formatMoney(Number(item.quantity) * Number(item.unit_price)) })}
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
                    {quantityText(Number(item.quantity), item.unit)}
                  </AppText>
                </Pressable>
              );
            })}
          </Card>

          <Button label={t('WhatsApp’ta gönder')} icon="logo-whatsapp" variant="cta" size="lg" onPress={sendWhatsapp} />
          <FieldRow>
            <Button label={t('Başka uygulamayla paylaş')} icon="share-outline" variant="secondary" onPress={shareOther} />
            {done > 0 ? <Button label={t('İşaretleri temizle')} icon="refresh" variant="ghost" onPress={clear} /> : null}
          </FieldRow>
          {shareError ? (
            <Notice tone="danger" icon="alert-circle">
              {t('Paylaşım açılamadı. WhatsApp yüklü değilse “Başka uygulamayla paylaş”ı dene.')}
            </Notice>
          ) : null}
          <AppText variant="caption" tone="muted">
            {t('Gönderilen listede alınmış kalemler yer almaz. Mesajı kime göndereceğini WhatsApp’ta sen seçersin.')}
          </AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, minHeight: 52 },
});
