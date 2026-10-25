-- First guide articles. General good practice; product data sheets always win.
-- Editable from the admin panel after this.

insert into public.guide_articles (slug, category, title, summary, body, reading_minutes, status, published_at, sort_order) values
('ustanin-altin-kurallari', 'preparation', 'Ustanın altın kuralları',
 'İyi bir boyanın yüzde sekseni hazırlıktır. Başlamadan önce bilmen gereken 12 kural.',
$md$Boyanın kalitesini fırça değil hazırlık belirler. Bu kurallar çoğu hatayı daha başlamadan önler.

## Hazırlık
- **Önce temizle, sonra boya.** Toz, yağ ve is üzerine sürülen boya tutmaz; duvarı nemli bezle sil, mutfakta yağ çözücüyle temizle.
- **Mobilyayı ortaya topla, örtüyle kapat.** Zemini koruyucu örtüyle, prizleri ve süpürgelikleri bantla kapat.
- **Çatlak ve delikleri önce kapat.** Macunu kuruduktan sonra zımparala, tozunu al.
- **Nem varsa önce nedeni bul.** Nemli duvara boya sürmek sorunu sadece birkaç ay saklar.

## Uygulama
- **Tavandan başla, duvarla devam et.** Tavandan damlayan boya duvarı kirletmesin.
- **Önce köşeler, sonra rulo.** Köşeleri fırçayla açıp hemen ardından ruloyla geç, böylece ek yeri kalmaz.
- **Islak kenarı kaybetme.** Bir duvarı ara vermeden bitir; yarım kalan duvarda iz kalır.
- **İnce ve çok kat, kalın ve tek kattan iyidir.** Kalın sürülen boya akar, geç kurur ve çatlar.
- **Katlar arası bekleme süresine uy.** Süre kutunun üstünde yazar; genelde birkaç saattir.

## Malzeme ve güvenlik
- **Boyayı karıştır.** Dibe çöken pigment karıştırılmazsa renk her yerde farklı çıkar.
- **Odayı havalandır.** Boyarken ve kururken pencereyi aç.
- **Kutuların parti numarasına bak.** Aynı renk farklı partilerde az da olsa farklı olabilir; büyük işlerde boyaları bir kovada birleştir.$md$,
 4, 'published', now(), 0),

('boya-oncesi-hazirlik', 'preparation', 'Boya öncesi hazırlık adım adım',
 'Odayı boşaltmaktan bantlamaya kadar boyaya başlamadan yapılacaklar.',
$md$Hazırlık işi genellikle boyamanın kendisinden daha uzun sürer. Ama sonucu en çok etkileyen kısım budur.

## Adımlar
1. Odayı mümkün olduğunca boşalt, kalanları ortada topla ve örtüyle kapat.
2. Priz ve anahtar kapaklarını sök ya da bantla kapat.
3. Duvarı kontrol et: çatlak, delik, kabarma, nem lekesi var mı?
4. Gevşek ve kabarmış boyayı spatulayla kazı.
5. Delik ve çatlakları macunla doldur, kuruyunca zımparala.
6. Tozu nemli bezle al.
7. Süpürgelik, kapı kasası ve pencere kenarlarını maskeleme bandıyla kapat.
8. Gerekirse astar uygula.

## Bilmen gerekenler
- Bandı boya tamamen kurumadan, hafif nemliyken çekersen kenar daha temiz çıkar.
- Yağlı boya ile boyanmış bir yüzeye su bazlı boya doğrudan tutmayabilir. Yüzeyi zımparala ve uygun astar kullan.$md$,
 3, 'published', now(), 10),

('astar-ne-zaman-gerekir', 'primer', 'Astar ne zaman gerekir?',
 'Her duvara astar gerekmez. Hangi durumda şart olduğunu ve nasıl uygulanacağını öğren.',
$md$Astar, boyanın yüzeye iyi tutunmasını ve her yerde aynı renkte görünmesini sağlar.

## Astar gereken durumlar
- Yeni sıva, alçı ya da alçıpan yüzeyler (bu yüzeyler boyayı çok emer)
- Çok miktarda macunla tamir edilmiş duvarlar
- Koyu bir rengin üstüne açık renk boyanacaksa
- Is, nikotin ya da su lekesi olan yüzeyler (bunlar için leke örtücü astar kullanılır)
- Yağlı boyadan su bazlı boyaya geçerken

## Genelde gerekmeyen durumlar
- Sağlam, temiz ve daha önce aynı tür boyayla boyanmış duvarlarda, benzer bir renk sürülecekse

## Uygulama
1. Astarı üreticinin önerdiği oranda incelt; oran kutunun üstünde yazar.
2. Tek kat, eşit ve ince sür.
3. Üstüne boya sürmeden önce kutuda yazan süre kadar beklet.

BoyaCep hesaplayıcısı yeni sıva, alçıpan, brüt beton ve kötü durumdaki duvarlarda astarı otomatik olarak önerir.$md$,
 3, 'published', now(), 0),

('macun-ve-zimpara', 'filler_sanding', 'Macun ve zımpara',
 'Çatlak ve delikleri iz bırakmadan kapatmanın yolu.',
$md$Tamir edilen yerin boyadan sonra belli olmaması için macun ve zımpara doğru yapılmalı.

## Adımlar
1. Çatlağın gevşek kısımlarını spatulanın ucuyla temizle.
2. Macunu spatulayla çatlağa bastırarak doldur, fazlasını sıyır.
3. Derin deliklerde tek seferde kalın doldurma; ince katlar halinde, her kat kuruduktan sonra devam et.
4. Kuruyunca ince zımparayla (180–240 numara) yüzey düzleşene kadar zımparala.
5. Tozu al. Geniş tamir yapılan yerlere astar sür.

## İpuçları
- Zımparalanan yere yandan fener tutarsan pürüzler hemen görünür.
- Zımpara yaparken toz maskesi tak.
- Saç çatlakları için elastik macun daha uzun ömürlüdür.$md$,
 3, 'published', now(), 0),

('tavan-nasil-boyanir', 'ceiling', 'Tavan nasıl boyanır?',
 'Boyunu ağrıtmadan, iz bırakmadan tavan boyamak.',
$md$Tavan her zaman ilk boyanan yüzeydir.

## Adımlar
1. Tavanla duvarın birleştiği köşeyi fırçayla 5–10 cm genişliğinde boya.
2. Uzatma sapı takılmış ruloyla, pencereden gelen ışığa paralel şeritler halinde çalış.
3. Bir şeridi bitirmeden ötekine geçme; ıslak kenarı koru.
4. İkinci katı ilk kata dik yönde sür; böylece iz kalmaz.

## İpuçları
- Tavan boyası duvar boyasından daha az damlar; tavanda tavan boyası kullan.
- Lambaları sök ya da poşetle kapat.
- Gözlük tak; tavandan sıçrayan boya göze kaçabilir.$md$,
 3, 'published', now(), 0),

('duvar-boyama-teknigi', 'walls', 'Duvar boyama tekniği',
 'Rulo izi bırakmadan düzgün bir duvar için doğru hareket.',
$md$Düzgün bir duvarın sırrı, ruloyu doğru yüklemek ve ıslak kenarı kaybetmemektir.

## Adımlar
1. Köşeleri, tavan çizgisini ve süpürgelik üstünü fırçayla aç.
2. Ruloyu teknede iyice yükle, fazlasını teknenin sırtında sıyır.
3. Duvarda yaklaşık 1 metrelik bir alana "W" ya da "M" şeklinde sür, sonra boşlukları dikey hareketlerle doldur.
4. Son geçişi yukarıdan aşağıya, hafif baskıyla yap.
5. Bir duvarı ara vermeden bitir.
6. Kutuda yazan süre kadar bekleyip ikinci katı sür.

## Sık yapılan hatalar
- Ruloya fazla bastırmak: kenarlarda boya birikir ve çizgi kalır.
- Kurumaya başlamış yere tekrar dönmek: o yer parlak ya da mat leke olarak kalır.$md$,
 3, 'published', now(), 0),

('rulo-ve-firca-secimi', 'tools', 'Rulo ve fırça seçimi',
 'Hangi işe hangi rulo ve fırça? Yanlış alet, iyi boyayı da kötü gösterir.',
$md$## Rulo
- **Kısa tüylü rulo (yaklaşık 5–10 mm):** pürüzsüz, düz duvar ve tavanlar
- **Orta tüylü rulo (yaklaşık 12–18 mm):** hafif pürüzlü sıva
- **Uzun tüylü rulo (20 mm ve üstü):** dış cephe ve brüt beton gibi pürüzlü yüzeyler
- Uzatma sapı tavanda ve yüksek duvarlarda hem işi hızlandırır hem de iz bırakmayı azaltır.

## Fırça
- **Köşe fırçası (eğik uçlu):** tavan çizgisi ve kenarlar
- **Su bazlı boyalar için sentetik kıllı fırça**, solvent bazlı boyalar için doğal kıllı fırça

## Bakım
- Su bazlı boyada kullandığın aletleri iş biter bitmez bol suyla yıka.
- Ertesi gün devam edeceksen ruloyu poşete sar; kurumaz.$md$,
 3, 'published', now(), 0),

('sik-yapilan-boya-hatalari', 'mistakes', 'Sık yapılan boya hataları ve çözümleri',
 'Kabarma, akma, alacalı görüntü ve rulo izi: neden olur, nasıl düzelir?',
$md$## Kabarma ve dökülme
**Olası nedenler:** nemli yüzey, kirli ya da tozlu duvar, uyumsuz boya katmanları.
**Çözüm:** kabaran kısmı kazı, nedeni gider, macunla düzelt, astarla ve yeniden boya. Nem sürüyorsa önce nemin kaynağını çözdür.

## Akma ve damlama
**Neden:** fazla kalın sürülmüş boya.
**Çözüm:** kuruduktan sonra akıntıyı zımparala, ince bir kat daha sür.

## Alacalı, lekeli görünüm
**Olası nedenler:** astarsız emici yüzey, tek kat boya, karıştırılmamış boya.
**Çözüm:** gerekiyorsa astar sür ve iyi karıştırılmış boyayla bir kat daha uygula.

## Rulo ve fırça izleri
**Neden:** kurumaya başlamış yere dönmek, ruloya fazla bastırmak.
**Çözüm:** hafif zımparala, bir duvarı ara vermeden tek seferde boya.

## Küf ve kararma
**Neden:** nem ve yetersiz havalandırma.
**Çözüm:** üstüne boya sürmek kalıcı çözüm değildir. Önce yüzeyi uygun bir küf temizleyiciyle temizle ve kurut. Gerekirse küfe dayanıklı ürün kullan. Sorun büyükse bir uzmana danış.$md$,
 4, 'published', now(), 0),

('dis-cephe-boyasi', 'exterior', 'Dış cephe boyasında dikkat edilecekler',
 'Hava durumu, yüzey hazırlığı ve güvenlik. Dış cephe, iç mekândan farklıdır.',
$md$## Hava durumu
- Yağmur beklenen günlerde boyama. Boya en az birkaç saat kuru kalmalıdır.
- Çok sıcak, çok soğuk ya da doğrudan güneş alan yüzeylerde boya hızlı ya da kötü kurur. Ürünün uygulama sıcaklığı kutunun üstünde yazar.

## Hazırlık
- Yüzeyi basınçlı suyla yıka ve tamamen kurumasını bekle.
- Dökülen sıvayı onar. Çatlaklar için dış cepheye uygun dolgu kullan.
- Dış cephe astarı kullan.

## Güvenlik
- Yüksekte çalışmak profesyonel iş gerektirir. İskele ve emniyet kemeri olmadan yüksek cephede çalışma.
- Yüksek binalarda işi mutlaka yetkili bir ustaya ya da firmaya yaptır.$md$,
 3, 'published', now(), 0),

('dogru-boya-secimi', 'materials', 'Doğru boya nasıl seçilir?',
 'Silinebilir mi, mat mı, ipek mat mı? Odaya göre boya seçimi.',
$md$## Parlaklık
- **Mat:** yüzey kusurlarını en iyi saklar. Yatak odası ve tavan için uygundur.
- **İpek mat:** hafif parlaktır ve silinebilir. Salon, koridor ve çocuk odası için uygundur.
- **Yarı parlak / parlak:** en dayanıklısıdır ama yüzey kusurlarını belli eder. Kapı ve doğrama için kullanılır.

## Odaya göre
- **Mutfak ve banyo:** silinebilir, neme ve küfe dayanıklı ürün seç.
- **Tavan:** tavan boyası seç. Daha az damlar ve genelde ekonomiktir.
- **Çocuk odası:** silinebilir ve düşük kokulu ürün seç.

## Teknik föy neden önemli?
Her boyanın teknik föyünde sarfiyat (m²/L), inceltme oranı ve katlar arası bekleme süresi yazar. BoyaCep'e bu sarfiyatı girersen hesap çok daha doğru olur.$md$,
 3, 'published', now(), 0);
