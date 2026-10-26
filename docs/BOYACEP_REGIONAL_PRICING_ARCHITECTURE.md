# Bölgesel fiyat mimarisi

## Katmanlar

```
Özel araştırma kayıtları (depo dışında, /mnt/project-files/boyacep/arastirma/)
        │  scripts/market/build-snapshot.cjs  (deterministik, src/engine/market.ts kurallarıyla)
        ▼
src/features/market/snapshot.ts      BoyaCep istatistiği: il × kapsam × birim, yuvarlanmış
src/features/market/sources.ts       kaynak kataloğu, Gigbi Türkiye göstergesi, resmi birim fiyat, malzeme fiyatları
        │
        ▼
src/features/market/regional.ts      marketReference(il, kapsam, birim) → il verisi ya da Türkiye geneli (yedek nedeniyle)
                                     homeTotal, paintCost, compareSummaries
        │
        ▼
Ekranlar: /prices (Türkiye Boya Fiyatları), hesap sonucu kartı (RegionalCostCard),
          ana sayfa şehir sorusu (CityPrompt), Profil şehir ayarı (CitySetting), Maliyet ekranından bağlantı
```

- `src/engine/market.ts` saf TypeScript: React yok, ağ yok, yapay zekâ yok. Her değişikliği birim testli.
- İstatistik uygulamayla birlikte gelir (çevrimdışı çalışır). Veri tabanı tabloları hazır ama uygulama henüz onlardan okumuyor; canlıya uygulandıktan sonra `market_price_statistics` aynı biçimde okunabilir.

## Hesap kuralları

| Çıktı | Formül | Not |
|---|---|---|
| m² referansı | il istatistiği (ortadaki yarı ya da en düşük–en yüksek) | Kalite yetersizse Türkiye geneli, "yedek" etiketiyle |
| Ev toplamı | m² aralığı × ev alanı, 500'e yuvarlanır | Ev tipi seçilirse tipik alan: 1+1 65, 2+1 90, 3+1 120, 4+1 150 m² |
| Tek oda | "oda" grubu (30 m²'ye kadar işler) | m² fiyatı odaya uygulanmaz (asgari ücret etkisi) |
| Boya maliyeti | litre × iç cephe boyası ₺/L aralığı (165–335) | Tavan boyası kg ile satılır ve genelde ucuzdur; hesap yüksek tarafta kalır |
| Ustayla toplam | işçilik + boya | Astar, macun, yardımcı malzeme dahil değil; kartta yazıyor |

İşçilik ve malzeme her zaman ayrı tutulur. "Malzeme dahil" istatistiği ayrı bir gruptur; işçilik + boya toplamı ile karıştırılmaz.

## Şehir seçimi

- İsteğe bağlı. Ana sayfada bir kez sorulur: "Fiyatları şehrine göre görmek ister misin?", "Manisa'yı seç", "İzmir'i seç", "Başka il seç", "Şehir seçmeden devam et".
- Konum izni istenmez, otomatik konum algılama iddiası yoktur.
- Seçim cihazda (`boyacep.city.v1`) ve React durumunun dışında tutulur; dil değişince silinmez (testli).
- Pilot illerde ilçe seçilebilir. İlçe verisi yetersiz olduğu için il geneli gösterilir ve bu yazılır.
- Profil'den değiştirilebilir ya da kaldırılabilir.

## Yedek (fallback) nedenleri

| Neden | Ekrandaki metin |
|---|---|
| Şehir seçilmemiş | "Şehir seçmediğin için Türkiye geneli gösteriliyor." |
| İlde hiç kayıt yok | "{il} için yeterli güncel veri bulunamadı. Türkiye geneli gösteriliyor." |
| İlde kayıt var ama yetersiz | Aynı metin |

## Ülke, para birimi, dil

- Dil ve ülke ayrı ayarlardır. Bugün tek ülke Türkiye: fiyatlar ₺, ölçüler metrik. İngilizce arayüzde de Türkiye fiyatları ₺ ve m² kalır (`formatLira`).
- Başka ülke eklenince: `provinces` yerine ülke bazlı bölge tablosu, istatistikte `currency`, ve ülkeye göre kaynak kataloğu. Yabancı fiyat uydurulmaz; veri yoksa ekran bunu söyler.

## Yapılmayanlar

- Otomatik kazıma (scraping) yok. Kayıtlar elle, izin verilen herkese açık sayfalardan okundu. Yenileme bugün de elle yapılıyor.
- Yapay zekâ fiyat hesaplamıyor.
