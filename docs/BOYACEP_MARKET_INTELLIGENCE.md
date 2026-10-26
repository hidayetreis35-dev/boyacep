# BoyaCep piyasa bilgisi: genel rapor

Tarih: 25.10.2026. Bu rapor, şehir bazlı boya fiyatı çalışmasının ne bulduğunu, ne yaptığını ve neyin eksik kaldığını özetler. Ayrıntılar diğer raporlarda.

## Bir cümlede

BoyaCep artık bir kullanıcıya "şehrinde boya ustası yaklaşık ne ister" sorusunun cevabını kaynağı, tarihi ve güvenilirlik düzeyiyle veriyor; veri yetmeyen yerde rakam uydurmak yerine bunu açıkça söylüyor.

## Bulgular

1. **Türkiye'de boya fiyatının tek, güvenilir, il bazlı açık kaynağı yok.** En zengin kaynak Armut'un il sayfaları (64 il, il başına ≈20 tarihli iş), ama sözleşmesi yeniden yayımı yasaklıyor ve fiyat alanının anlamı açıklanmıyor. Gigbi yöntemini açıklıyor ama yalnızca Türkiye geneli.
2. **Türkiye geneli (m² ev alanı başına):** yalnız işçilik ≈100–150 ₺ (sınırlı; tek kaynak), malzeme dahil 140–231 ₺, ortanca 180 ₺ (güçlü; 98 kayıt, 3 kaynak).
3. **Gigbi'ye göre bir ev boyası teklifi** (12 ay, 3.398 teklif): ortanca 17.000 ₺; 51–100 m² evde ortanca 15.000 ₺, 101–150 m²'de 20.000 ₺. Anlaşılan işlerde ödenen ortalama 13.000 ₺. Aylık ortanca Kasım 2025'te 15.000, Eylül 2026'da 17.500 ₺ (≈%17 artış).
4. **İzmir pilotu:** malzeme dahil 188–250 ₺/m², ortanca 213 ₺ (orta). Üç bağımsız kaynak birbiriyle tutarlı (2+1 için ≈17–22,5 bin ₺; bir firmanın liste fiyatı 20 bin ₺).
5. **Manisa pilotu:** tek kaynak, 7'şer kayıt; işçilik 75–180, malzeme dahil 100–340 ₺/m² (sınırlı). İzmir'den ucuz görünüyor ama bunu söyleyecek kadar veri yok.
6. **Resmi birim fiyat** (Bakanlık, poz 15.540.1507, 12.2025): 214 ₺/m² duvar, malzeme + işçilik + yüklenici kârı. Bu, duvar m²'si başına; ev alanı m²'si başına değil (bir evde duvar alanı ev alanının ≈2,5–3 katı). Doğrulanamadı.
7. **Malzeme:** 15 L iç cephe boyası 2.500–5.000 ₺ (≈165–335 ₺/L). Astar ve macun için tek fiyat var; aralık için yetersiz.

## Yapılanlar

| Alan | Sonuç |
|---|---|
| Araştırma | 12 il, 275 kayıt, 9 kaynak kullanıldı, 7 kaynak gerekçesiyle elendi |
| Kalite motoru | Güçlü / Orta / Sınırlı / Yetersiz; uç değer işaretleme; eski veri; aynı kaynağın tek sayılması |
| Uygulama | Türkiye Boya Fiyatları ekranı; isteğe bağlı şehir seçimi (konum izni yok); hesap sonucunda "ustayla yaklaşık maliyet" kartı; maliyet ekranından bağlantı; Profil'de şehir ayarı |
| Dürüstlük | Yetersiz veri → "Bu şehir için yeterli güncel veri bulunamadı."; piyasa referansı, tahmin ve gerçek teklif görsel olarak ayrı; uygulamadaki veri eskidikçe kalite kendiliğinden düşüyor ve uyarı çıkıyor |
| İngilizce | Bütün yeni metinler çevrili; dil değişince şehir seçimi korunuyor; Türkiye fiyatları her dilde ₺ |
| Veri tabanı | Tablolar, güvenlik kuralları ve testler hazır; 26.10.2026'da canlıya uygulandı (uygulama henüz bu tablolardan okumuyor) |
| Raporlar | 11 rapor (bu klasör) |

## Eksik kalanlar (tamamlanmış gibi gösterilmiyor)

- 81 ilden yalnızca 12'si araştırıldı; 52 ilin Armut sayfası okunmadı, 17 ilin platform sayfası yok.
- Hiçbir ilde işçilik "orta" düzeyde değil (ikinci bağımsız kaynak eksik).
- Tavan, astar, alçı/macun/zımpara, tamir, dış cephe, kapı/ahşap ve dekoratif için il düzeyinde veri yok.
- İlçe düzeyinde fiyat gösterilemiyor.
- Kaydedilmiş projelerin içinde bölgesel fiyat yok.
- Yönetici veri kalitesi paneli veri tabanında (rapor fonksiyonu) hazır, uygulama ekranı yok.
- Otomatik veri yenileme yok; yenileme elle yapılıyor.

## Ürün vizyonu

BoyaCep'in fiyat konusundaki farkı, rakamı **kanıtıyla** göstermesi: "Bu rakam nereden geliyor, kaç iş, ne zaman?" sorusunun cevabı her zaman ekranda. Uzun vadede en güçlü kaynak BoyaCep'in kendisi olacak: usta teklifi → kabul → iş bitti → iki taraf da onayladı ve paylaşmaya izin verdi. Bu iş kayıtları, en az 5 işlik gruplar halinde, hiçbir kişiyi göstermeden ilin fiyatına eklenir. Platform büyüdükçe dış kaynaklara bağımlılık azalır, Armut gibi sözleşme riski taşıyan kaynaklar geri çekilebilir.

Kullanıcıya etkisi: ev sahibi teklif almadan önce makul aralığı bilir, usta kendi fiyatını şehrindeki piyasayla karşılaştırır. Bu, "Usta Pro" aboneliğine somut bir değer olarak (ör. "Şehrindeki fiyatlarla teklifini karşılaştır") eklenebilir; bu bir ürün kararıdır ve Hidayet'in onayını bekler.

## Hukuki not

Armut verisi için kalan risk Hidayet tarafından kabul edildi. Risk azaltma: ilanlar kopyalanmıyor, yalnızca BoyaCep'in kendi yuvarlanmış istatistiği gösteriliyor, ham kayıtlar özel klasörde. Armut'a iş birliği e-postası taslağı hazır (`/mnt/project-files/boyacep/arastirma/armut-isbirligi-eposta.md`), gönderilmedi.
