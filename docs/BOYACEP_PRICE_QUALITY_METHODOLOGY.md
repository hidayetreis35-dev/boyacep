# Fiyat kalitesi yöntemi

Kod: `src/engine/market.ts` (saf TypeScript, testleri `src/engine/__tests__/market.test.ts`). Aynı girdi her zaman aynı sonucu verir; fiyat hesabında yapay zekâ yok.

## Gözlem

Her gözlem şunları taşır: değer (₺, grubun biriminde), gözlem tarihi, yayımlayan kaynak ve türü. Türler, zayıftan güçlüye: firma fiyat listesi, platform talebi, resmi birim fiyat, BoyaCep teklifi, kabul edilen teklif, tamamlanan iş.

## Gruplama (`scripts/market/build-snapshot.cjs`)

- Grup = il (ya da Türkiye geneli) × kapsam (yalnız işçilik / malzeme dahil) × birim.
- Birim "m² ev alanı": iş fiyatı ÷ beyan edilen ev alanı, yalnızca 31–300 m² evler için.
- Birim "oda": 30 m²'ye kadar tek oda işlerinin toplam fiyatı. Tek oda işlerinde asgari ücret etkisi olduğu için m² fiyatına karıştırılmaz.
- 1.000 ₺ ve altı fiyatlar yer tutucu sayılıp atılır.
- Aynı yayımcının bütün sayfaları tek kaynaktır (örneğin Armut'un il, ilçe ve "ev boyama" sayfaları).
- Bir firmanın fiyat listesi, satır sayısından bağımsız olarak tek gözlemdir: satırlarının ortancası. Böylece tek bir liste örneklemi şişiremez.
- Aynı iş iki kez görülürse (`dedupe_key` aynıysa) ikinci kayıt reddedilir.

## Eleme

- İki yıldan (730 gün) eski gözlemler hiçbir istatistiğe girmez; "eski" diye sayılır, silinmez.
- Uç değerler logaritma üzerinde bulunur, çünkü fiyatlar sağa çarpıktır:
  - 8 ve üzeri gözlemde: Q1 − 1,5·IQR ile Q3 + 1,5·IQR dışı.
  - 8'den az gözlemde: ortancadan 4 kattan fazla uzak olanlar.
- Uç değerler kullanılmaz ama silinmez; sayıları gösterilir ve incelemeye kalır.

## Kalite düzeyleri

| Düzey | Kayıt | Bağımsız kaynak | En yeni kayıt | Gösterilen |
|---|---|---|---|---|
| Güçlü | ≥ 30 | ≥ 3 | ≤ 90 gün | Aralık, ortanca, ortalama |
| Orta | ≥ 10 | ≥ 2 | ≤ 180 gün | Aralık, ortanca |
| Sınırlı | ≥ 5 | ≥ 1 | ≤ 365 gün | Yalnızca aralık, "yön gösterir" uyarısıyla |
| Yetersiz | diğer | | | Rakam yok: "Bu şehir için yeterli güncel veri bulunamadı." |

Aralık: 10 ve üzeri kayıtta kayıtların ortadaki yarısı (25.–75. yüzdelik), daha azında gözlenen en düşük–en yüksek. Ekranda hangisi olduğu yazar.

Neden bu eşikler: 10 kaydın altında çeyrekler birkaç kayda bağlı kalır; tek kaynaklı veri o kaynağın yanlılığını taşır, bu yüzden 2+ kaynak olmadan "orta" verilmez; 30+ kayıt ve 3+ kaynakta ortalama artık tek bir uç işten belirgin etkilenmez.

## Yuvarlama

m² fiyatları tam liraya, toplamlar 1.000 ₺ altında 10'a, üstünde 500'e yuvarlanır. Bir istatistik olduğundan daha kesin görünmez.

## Karşılaştırma

İki il arasında "daha pahalı / daha uygun" denmesi için ikisinde de en az orta düzey veri olmalı ve ortadaki yarılar çakışmamalı. Aksi halde ekran "Kesin bir fark söylemek için yeterli veri yok." der. Bugün Manisa sınırlı düzeyde olduğu için Manisa–İzmir için kesin bir yargı verilmiyor.

## Yedek (fallback)

Bir ilin verisi yetersizse başka bir ilin rakamı asla kullanılmaz. Ekran açıkça "{il} için yeterli güncel veri bulunamadı. Türkiye geneli gösteriliyor." yazar ve Türkiye geneli rakamını kendi kalite etiketiyle gösterir.

## Gösterim ayrımı

- **Piyasa referansı**: kesikli çerçeveli kart, "Piyasa referansı" başlığı, kalite rozeti, kayıt sayısı, kaynak, tarih.
- **BoyaCep tahmini** (boya litresi gibi): normal kart, "tahmini" etiketi.
- **Gerçek teklif**: ustanın teklif ekranı; numaralı, satırlı, düz çerçeveli.

## Bilinen sınırlar

- Armut'ta işin fiyatı mı, ilk teklif mi, ortalama teklif mi olduğu yazmıyor; değeri "talep için verilen fiyat" diye okuyoruz.
- Ev alanı müşterinin beyanı; ölçülmüş değil.
- Eşyalı/boş ve tavan dahil/hariç bilgisi kayıtlarda var ama grupları bölmek için kayıt yetmiyor; şimdilik birlikte hesaplanıyor.
- İlçe fiyatı ancak "orta" düzeye (2+ kaynak, 10+ kayıt) ulaşınca gösterilecek. Bugün yalnız Buca "sınırlı" eşiğine geliyor (işçilik 6, malzeme dahil 5 kayıt, tek kaynak); bu yüzden ekranda ilçe seçilince il geneli gösteriliyor ve bu açıkça yazıyor.
