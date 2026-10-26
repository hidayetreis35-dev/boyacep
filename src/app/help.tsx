import { router } from 'expo-router';
import { View } from 'react-native';

import { msg, t } from '@/i18n';
import { Disclosure } from '@/ui/brand';
import { AppText, Button, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: msg('Hesaplanan boya miktarı ne kadar doğru?'),
    a: msg('Ölçülerin ve boyanın kutusunda yazan sarfiyat değeriyle hesaplarız. Bilmediğin değerlerde ortalama kullanır ve bunu "tahmini" diye işaretleriz. Kesin ürün için kutudaki bilgiyi gir.'),
  },
  {
    q: msg('Fiyatlar nereden geliyor?'),
    a: msg('Usta fiyatları herkese açık, tarihli kaynaklardan toplanır; her rakamın kaynağı ve tarihi yazar. Bunlar piyasa referansıdır, teklif değildir.'),
  },
  {
    q: msg('Ustamı projeme nasıl eklerim?'),
    a: msg('Projende "Ustayla paylaş"a dokun, paylaşım kodunu ustana gönder. Ustan kodu Usta Paneli’ne yazınca ölçüleri ve malzeme listesini görür; bütçeni göremez.'),
  },
  {
    q: msg('Verilerim nerede, kim görebilir?'),
    a: msg('Hesapsız kullandığın hesaplamalar telefonunda kalır. Kaydettiğin projeleri yalnızca sen ve paylaştığın ustalar görür. Ayrıntılar Gizlilik sayfasında.'),
  },
  {
    q: msg('Hesabımı nasıl silerim?'),
    a: msg('Profil > Hesap Bilgileri’nde verilerini indirebilir ya da hesabını ve tüm verilerini silebilirsin.'),
  },
  {
    q: msg('Bir hata buldum, ne yapayım?'),
    a: msg('Uygulama çökerse hata kaydı otomatik tutulur. Gördüğün sorunu ekran görüntüsüyle bize ilet; test sürecinde her bildirimi okuyoruz.'),
  },
];

export default function HelpScreen() {
  return (
    <Screen edges={['bottom']}>
      <AppText variant="heading">{t('Sık sorulanlar')}</AppText>
      {QUESTIONS.map((item) => (
        <Disclosure key={item.q} title={t(item.q)}>
          <AppText>{t(item.a)}</AppText>
        </Disclosure>
      ))}
      <View style={{ gap: space.sm }}>
        <Button label={t('Boya Rehberi')} icon="book" variant="secondary" onPress={() => router.push('/guide')} />
        <Button label={t('Ustaya Sor')} icon="chatbubbles" variant="secondary" onPress={() => router.push('/ask')} />
        <Button label={t('Gizlilik')} icon="shield-checkmark" variant="ghost" onPress={() => router.push('/privacy')} />
      </View>
    </Screen>
  );
}
