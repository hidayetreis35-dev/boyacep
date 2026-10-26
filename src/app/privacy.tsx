import { View } from 'react-native';

import { msg, t } from '@/i18n';
import { AppText, Card, Notice, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: msg('Hesap açmadan'),
    items: [
      msg('Ne Kadar Boya?, Maliyet Hesapla, Duvarını İncele ve Renk Stüdyosu hesapsız çalışır.'),
      msg('Bu ekranlarda girdiğin ölçüler ve seçtiğin fotoğraflar telefonunda kalır, sunucuya gönderilmez.'),
    ],
  },
  {
    title: msg('Hesap açınca sakladıklarımız'),
    items: [
      msg('Giriş için e-posta adresin ve istersen adın.'),
      msg('Projelerin: odalar, ölçüler, malzeme listesi, bütçe ve maliyet notların.'),
      msg('Projeye eklediğin fotoğraflar. Yüklemeden önce küçültülür ve konum bilgisi silinir.'),
      msg('Ustaysan usta profilin ve hazırladığın teklifler.'),
      msg('Uygulama çökerse hata kaydı: hata mesajı, ekran adı ve uygulama sürümü.'),
    ],
  },
  {
    title: msg('Kimler görebilir?'),
    items: [
      msg('Projelerini yalnızca sen görürsün.'),
      msg('Paylaşım kodu verdiğin ustalar projenin odalarını, malzeme listesini ve fotoğraflarını görür. Bütçeni ve maliyet notlarını göremez. Erişimi istediğin zaman kaldırabilirsin.'),
      msg('Ustanın gönderdiği teklifi, ilgili projenin sahibi görür.'),
      msg('BoyaCep yöneticileri toplam sayıları ve usta doğrulama bilgilerini görür.'),
      msg('Verilerini satmayız ve reklam için kullanmayız.'),
    ],
  },
  {
    title: msg('Haklarını kullanmak'),
    items: [
      msg('Profil sekmesindeki "Verilerimi indir" ile tüm verilerini bir dosya olarak alabilirsin.'),
      msg('"Hesabımı sil" ile hesabını ve bütün verilerini kalıcı olarak silebilirsin.'),
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <Screen edges={['bottom']}>
      <AppText variant="title">{t('Gizlilik')}</AppText>
      {SECTIONS.map((s) => (
        <Card key={s.title}>
          <AppText variant="heading">{t(s.title)}</AppText>
          {s.items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
              <AppText tone="primary">•</AppText>
              <AppText style={{ flex: 1 }}>{t(item)}</AppText>
            </View>
          ))}
        </Card>
      ))}
      <Notice icon="information-circle">
        {t('Bu sayfa bir özettir. Uygulama herkese açılmadan önce hukuki olarak incelenmiş KVKK aydınlatma metni ve kullanım koşulları eklenecek.')}
      </Notice>
    </Screen>
  );
}
