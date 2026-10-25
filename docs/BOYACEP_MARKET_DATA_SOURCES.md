# BoyaCep piyasa veri kaynakları

Araştırma tarihi: 25.10.2026. Bu belge, BoyaCep'in boya fiyatlarında kullandığı ve kullanmadığı her kaynağı, nedenleriyle birlikte listeler.

## Kurallar

- Yalnızca herkese açık sayfalar okundu. Giriş, CAPTCHA, robots.txt engeli ya da ücretli erişim aşılmadı.
- Kişisel veri toplanmadı. Kayıtlarda isim, telefon ya da adres yok; yalnızca il, ilçe, tarih, alan, oda sayısı, malzeme durumu ve fiyat var.
- Üçüncü taraf ilanları uygulamada ya da bu depoda yayımlanmaz. Ham kayıtlar özel klasörde durur (`/mnt/project-files/boyacep/arastirma/`, depoda değil). Uygulama yalnızca BoyaCep'in kendi hesapladığı, yuvarlanmış aralığı, kaynak adı, tarih ve kayıt sayısıyla gösterir.
- Her rakamın yanında kaynağı ve tarihi durur (`src/features/market/sources.ts`).

## Kullanılan kaynaklar

| Kaynak | Adres | Tür | Kapsam | Veri tarihi | Birim | Güvenilirlik | Kullanım koşulu |
|---|---|---|---|---|---|---|---|
| Armut | armut.com/fiyatlari/{il}-boyaci-boya-badana-ustasi_32_{plaka} | Hizmet platformu | 64 ilde il sayfası; her sayfada yaklaşık 20 tarihli örnek iş (ilçe, beyan edilen m², oda, malzeme dahil/hariç, eşyalı mı, tavan dahil mi, fiyat aralığı ve tek bir fiyat) | 08–10.2026 | İş başına toplam ₺ | Orta: gerçek talepler, ama "fiyat" alanının anlamı ve "Ortalama Fiyat" başlığının yöntemi açıklanmıyor | Kullanıcı Sözleşmesi 25.1 izinsiz kullanım ve yeniden yayımı yasaklıyor. Hidayet kalan riski kabul etti; ilanlar kopyalanmıyor, iş birliği e-postası taslağı hazır (gönderilmedi) |
| Gigbi | gigbi.com/fiyatlar/boya-badana-ustasi | Platform istatistiği | Türkiye geneli 3.398 teklif (12 ay), alan bandına göre ortanca ve ortadaki yarı; 352 anlaşılan iş (24 ay), ortalama 13.000 ₺ | 09.2026 | İş başına toplam ₺ | Orta-yüksek: yöntemini açıklıyor. Malzemenin dahil olup olmadığı belirtilmemiş. İl sayfaları ulusal rakamı tekrarlıyor, bu yüzden il fiyatı olarak kullanılmıyor | Yayımlanmış özet rakamlar kaynak gösterilerek aktarılıyor |
| Urla Boyacı | urlaboyaci.com/boya-badana-fiyatlari | Firma fiyat listesi | İzmir; stüdyo 12.500, 1+1 15.000, 2+1 20.000, 3+1 28.000, 4+1 35.000 ₺; malzeme dahil, tavan hariç. Ekler: tavan +%10, tamir +%5/20/50, eşyalı ev +%30, kapı ≈950 ₺ | 08.2026 | Ev tipine göre ₺ | Orta: tek firma | Liste tek gözlem sayılıyor (satırların ortancası) |
| İzdekor | izdekor.com.tr/izmir-boyaci/ | Firma örneği | Bornova, 3+1, 100 m², tavanlar ve malzeme dahil, boş ev: 15.000–25.000 ₺ | 14.02.2026 | İş başına ₺ | Orta: tek örnek | Tek gözlem |
| İzmirde Tadilat | izmirdetadilat.com.tr/tadilat-fiyatlari/boya-badana | Firma fiyat listesi | İşçilik, yüzey m²'si başına: duvar 90–180, tavan 100–190, macun+astar 60–140, saten alçı 180–380, dış cephe 140–300, dekoratif 250–600 ₺ | 22.04.2026 | ₺/m² yüzey | Sınırlı: tek kaynak, yüzey m²'si (ev alanı değil) | İstatistiğe girmedi; raporlarda gösterge olarak anılıyor |
| Herpoz (ikincil) | herpoz.com/detay/15-540-1507-… | Resmi birim fiyat | Bakanlık pozu 15.540.1507: 214,21 ₺/m² duvar (12.2025). Analiz: 0,35 sa usta + 0,15 sa düz işçi + 0,135 L boya + 0,07 L astar + 0,05 kg saten alçı / m² | 12.2025 | ₺/m² yüzey | Doğrulanmadı: Bakanlık PDF'leri robots.txt ile kapalı | "Doğrulanmadı" etiketiyle gösteriliyor |
| Yapı Arenası (ikincil) | yapiarenasi.com/insaat-iscilik-birim-fiyatlari | Resmi birim fiyat iddiası | 15.540.1522: 253,36 ₺; tavan 15.540.1548: 299,53 ₺ (iddia: Ekim 2026) | 10.2026 | ₺/m² yüzey | Doğrulanmadı | Yalnızca raporlarda |
| Karekod | karekod.org/blog/boya-fiyatlari/ | Mağaza fiyatı | 15 L iç cephe 2.500–5.000 ₺; 17,5 kg tavan 1.300–2.500 ₺; 15 L dış cephe 3.200–5.900 ₺ | 17.09.2026 | ₺/kutu | Sınırlı | Aralık kaynak gösterilerek kullanılıyor |
| Cimri | cimri.com (Filli iç cephe) | Mağaza fiyatı | Filli 15 L ≈2.480–4.500 ₺; Momento astar 2,5 L 610,63 ₺; macun 5 kg 692,66 ₺ | 25.10.2026 | ₺/kutu | Sınırlı (astar ve macun tek fiyat → yetersiz) | Kaynak gösterilerek |

## İncelenip kullanılmayan kaynaklar

| Kaynak | Neden kullanılmadı |
|---|---|
| trendhizmet.com (Manisa, İzmir, Köprübaşı, Turgutlu sayfaları) | Şablon sayfalar; otomatik üretilmiş gibi görünen tahminler, bir kayıt yarının tarihini taşıyor |
| ara.com.tr | "1,00 TL" gibi yer tutucu fiyatlar |
| boyabadanaci.com.tr/manisa-boyaci | Müşteri toplama sitesi; birim yok |
| teklifuzmani.com | 2026 başlığı altında 2018 verisi |
| decoryapi.com | robots.txt ile kapalı; aşılmadı |
| dek-mar.com.tr | İstanbul ticari işler (işçilik 80–150 ₺/m²); konut fiyatı değil, il de pilot değil |
| csb.gov.tr birim fiyat PDF'leri | robots.txt ile kapalı; değerler ikincil kaynaktan, "doğrulanmadı" olarak |

## Okuma doğruluğu

- Pilot iller (Manisa, İzmir) iki kez okundu; iki okuma birebir tuttu.
- Ankara bir kez sütunları eksik okundu, açık talimatla yeniden okundu. İkinci okumada bir satırın m²'si farklı geldi (Gölbaşı); bu satırın alanı "bilinmiyor" sayıldı ve m² fiyatına girmedi.
- Uç değerler silinmedi, işaretlendi: Bayraklı 362.500 ₺ (m² başına ≈4.500 ₺) ve Bursa "10.000 m²" gibi.

## Kaynak eklerken

1. Sayfanın herkese açık olduğunu, robots.txt'nin izin verdiğini ve kullanım koşullarını kontrol et.
2. Kaynağı `market_price_sources` tablosuna ve `src/features/market/sources.ts` dosyasına ekle (ad, adres, tür, koşul notu).
3. Kayıtları özel klasöre yaz; her kayda `dedupe_key` ver (aynı iş iki kez sayılmasın).
4. `node scripts/market/build-snapshot.cjs <kayitlar.json> <tarih>` ile istatistiği yeniden üret, testleri çalıştır.
