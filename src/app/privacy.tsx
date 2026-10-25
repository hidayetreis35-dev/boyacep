import { View } from 'react-native';

import { AppText, Card, Notice, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'Hesap açmadan',
    items: [
      'Ne Kadar Boya?, Maliyet Hesapla, Duvarını İncele ve Renk Stüdyosu hesapsız çalışır.',
      'Bu ekranlarda girdiğin ölçüler ve seçtiğin fotoğraflar telefonunda kalır, sunucuya gönderilmez.',
    ],
  },
  {
    title: 'Hesap açınca sakladıklarımız',
    items: [
      'Giriş için e-posta adresin ve istersen adın.',
      'Projelerin: odalar, ölçüler, malzeme listesi, bütçe ve maliyet notların.',
      'Projeye eklediğin fotoğraflar. Yüklemeden önce küçültülür ve konum bilgisi silinir.',
      'Ustaysan usta profilin ve hazırladığın teklifler.',
      'Uygulama çökerse hata kaydı: hata mesajı, ekran adı ve uygulama sürümü.',
    ],
  },
  {
    title: 'Kimler görebilir?',
    items: [
      'Projelerini yalnızca sen görürsün.',
      'Paylaşım kodu verdiğin ustalar projenin odalarını, malzeme listesini ve fotoğraflarını görür. Bütçeni ve maliyet notlarını göremez. Erişimi istediğin zaman kaldırabilirsin.',
      'Ustanın gönderdiği teklifi, ilgili projenin sahibi görür.',
      'BoyaCep yöneticileri toplam sayıları ve usta doğrulama bilgilerini görür.',
      'Verilerini satmayız ve reklam için kullanmayız.',
    ],
  },
  {
    title: 'Haklarını kullanmak',
    items: [
      'Profil sekmesindeki "Verilerimi indir" ile tüm verilerini bir dosya olarak alabilirsin.',
      '"Hesabımı sil" ile hesabını ve bütün verilerini kalıcı olarak silebilirsin.',
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <Screen edges={['bottom']}>
      <AppText variant="title">Gizlilik</AppText>
      {SECTIONS.map((s) => (
        <Card key={s.title}>
          <AppText variant="heading">{s.title}</AppText>
          {s.items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
              <AppText tone="primary">•</AppText>
              <AppText style={{ flex: 1 }}>{item}</AppText>
            </View>
          ))}
        </Card>
      ))}
      <Notice icon="information-circle">
        Bu sayfa bir özettir. Uygulama herkese açılmadan önce hukuki olarak incelenmiş KVKK aydınlatma metni ve kullanım koşulları eklenecek.
      </Notice>
    </Screen>
  );
}
