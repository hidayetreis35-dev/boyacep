# Manisa derin araştırma (pilot)

Araştırma tarihi: 25.10.2026. Veri tarihleri: 27.08.2026 – 17.10.2026. Kaynak ayrıntıları: [BOYACEP_MARKET_DATA_SOURCES.md](BOYACEP_MARKET_DATA_SOURCES.md).

## Özet

Manisa için kullanılabilir tek bağımsız kaynak Armut'un il sayfası (20 tarihli örnek iş, iki kez okundu, iki okuma aynı). Bu yüzden bütün Manisa rakamları **sınırlı** düzeyde: aralık gösteriliyor, ortanca ve ortalama gösterilmiyor. İzmir ile "Manisa daha ucuz" diye kesin bir karşılaştırma yapılmıyor.

## Uygulamada gösterilen (BoyaCep istatistiği)

| Kapsam | Birim | Kalite | Kayıt | Aralık | En yeni |
|---|---|---|---|---|---|
| Yalnız işçilik | ₺/m² ev alanı | Sınırlı | 7 | 75–180 (en düşük–en yüksek) | 22.09.2026 |
| Malzeme dahil | ₺/m² ev alanı | Sınırlı | 7 | 100–340 | 06.10.2026 |
| Yalnız işçilik | Tek oda | Yetersiz | 4 | – (Türkiye geneli gösteriliyor) | 17.10.2026 |
| Malzeme dahil | Tek oda | Yetersiz | 2 | – | 27.09.2026 |

Örnek: 2+1 (≈90 m²) bir ev için yalnız işçilik referansı ≈ 7.000–16.000 ₺ (75–180 ₺/m² × 90, yuvarlanmış). Aralık geniş, çünkü kayıt az.

Analiz notu (yayımlanmıyor, yalnızca yön): işçilikte ortanca ≈100 ₺/m², malzeme dahil ≈142 ₺/m². Kayıt sayısı 7 olduğu için uygulamada gösterilmez.

## İlçe kontrolü

| İlçe | Kayıt | Not |
|---|---|---|
| Yunusemre | 11 (işçilik 4, malzeme dahil 3 ev işi; gerisi tek oda) | En çok kayıt; yine de eşiğin altında |
| Şehzadeler | 3 | |
| Turgutlu | 3 | |
| Akhisar | 3 | |
| Diğer 13 ilçe (Salihli, Soma, Alaşehir…) | 0 | Hiç kayıt yok |

İlçe bazında fiyat gösterilmiyor; ilçe seçilirse ekran "İlçe bazında henüz yeterli veri yok; il geneli gösteriliyor." diyor.

## Kategoriler

| Kategori | Durum |
|---|---|
| İşçilik / malzeme dahil | Var (sınırlı) |
| m² başına | Var (sınırlı) |
| Oda başına | Yetersiz (6 tek oda işi, iki kapsama bölününce 4 ve 2) |
| 1+1 … 4+1 | Kayıtlarda 1, 2, 3 ve 4 odalı işler var (5/4/4/5); ev tipine göre ayrı istatistik için yetersiz. Ekranda m² fiyatı × tipik alan gösteriliyor |
| Eşyalı / boş | 5 eşyalı, 9 boş ev işi; ayrı istatistik için yetersiz |
| Tavan | 9 işte tavan dahil; ayrı istatistik yok |
| Astar, alçı/macun/zımpara, tamir, dış cephe, kapı/ahşap, dekoratif | Manisa'ya özgü veri yok |

## Neden kaynak az

- Manisa'da kendi fiyat listesini yayımlayan bir boya firması bulunamadı.
- Bulunan diğer siteler (trendhizmet, ara.com.tr, boyabadanaci, decoryapi) şablon, yer tutucu ya da robots.txt engelli olduğu için kullanılmadı.
- Gigbi'nin il sayfaları Türkiye geneli rakamı tekrarlıyor; Manisa fiyatı değil.

## Sonraki araştırma

1. Manisa'daki boya ustaları ve boya bayileriyle (Yunusemre, Şehzadeler, Turgutlu, Akhisar, Salihli, Soma) kısa fiyat görüşmesi: kimlik bilgisi almadan, yalnızca iş tipi ve fiyat. Bu bir saha işi; Hidayet'in onayıyla yapılmalı.
2. BoyaCep'e katılan Manisalı ustaların teklifleri ve tamamlanan işleri (onaylı, rızalı, en az 5 iş) en güçlü kaynak olacak.
3. Armut sayfası her ay yeniden okunmalı; yeni tarihli işler eklendikçe kayıt sayısı artar.
