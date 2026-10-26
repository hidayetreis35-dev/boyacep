# Test sonuçları: piyasa fiyatları

Tarih: 25.10.2026. Komutlar: `npm run check` (tip kontrolü, lint, Jest) ve `npm run test:db` (yerel PostgreSQL 16).

## Özet

| Kontrol | Sonuç |
|---|---|
| TypeScript | Hatasız |
| Lint | Hatasız |
| Jest | 40 dosya, 450 test, hepsi geçti |
| Veri tabanı testleri | Bütün dosyalar geçti; yeni `97_market_prices.test.sql` 47 kontrol |
| Tarayıcı (web derlemesi, Chromium) | Masaüstü 1280×900 ve mobil 390×844'te ana sayfa, fiyat ekranı (Manisa, Adıyaman, İzmir + malzeme dahil, karşılaştırma) ve İngilizce fiyat ekranı açıldı; sayfa hatası yok. 26.10.2026: boya hesabı tarayıcıda sonuna kadar yürütüldü (tüm ev 120 m² ve tek oda, şehir Manisa); "Ustayla yaklaşık maliyet" kartı çıktı, sayfa hatası yok |

## İstenen 12 senaryo

| # | Senaryo | Nasıl test edildi | Sonuç |
|---|---|---|---|
| 1 | Şehir seçmeden boya hesabı | `prices.test.tsx`: tüm ev, 120 m²; kart "Şehir seçmediğin için Türkiye geneli gösteriliyor." ve 12.000–18.000 ₺ işçilik, 16.500–33.500 ₺ boya | Geçti |
| 2 | Manisa'yı seçer | Ana sayfadaki "Manisa'yı seç"; seçim cihazda saklanıyor, fiyat ekranı ve hesap kartı Manisa aralığını (75–180 ₺/m²) kullanıyor | Geçti, tarayıcıda da görüldü |
| 3 | İzmir'i seçer | Arama ile "izm" → İzmir; ilçe seçimi (Bornova) ve "ilçe verisi yetersiz" uyarısı | Geçti, tarayıcıda da görüldü |
| 4 | Şehri sonradan değiştirir | Manisa → "Değiştir" → İzmir; kayıt güncelleniyor | Geçti |
| 5 | Verisi yetersiz şehir | Adıyaman: "Adıyaman için yeterli güncel veri bulunamadı. Türkiye geneli gösteriliyor." | Geçti, tarayıcıda da görüldü |
| 6 | Malzeme dahil maliyet | İzmir, "Malzeme dahil": orta düzey, ortanca var, ortalama yok | Geçti |
| 7 | Yalnızca işçilik | İzmir varsayılan "Sadece işçilik": sınırlı, ortanca yok; hesap kartında işçilik ayrı satır | Geçti |
| 8 | Manisa–İzmir karşılaştırma | "Kesin bir fark söylemek için yeterli veri yok." ve "daha pahalı/uygun" yargısı yok. Fark yargısının kuralı ayrı birim testinde | Geçti |
| 9 | Türkçe–İngilizce geçiş | Profil'de English; şehir seçimi korunuyor. `/prices` İngilizce açılınca ekranda yer adları dışında Türkçe metin yok | Geçti |
| 10 | Proje kaydedip tekrar açma | Mevcut proje testleri (`projects.test.tsx`) geçiyor. Bölgesel fiyat kartı yalnızca hesap sonucunda; kaydedilmiş projenin içinde henüz yok | Kısmen: projeye bölgesel fiyat kaydı yapılmadı |
| 11 | Eski veri uyarısı | Tarih 01.01.2028'e alınınca: "Bu fiyatlar 25.10.2026 tarihinde toplandı ve güncel olmayabilir.", İzmir verisi düşüyor, Türkiye geneline geçiliyor, rakam gösterilmiyor | Geçti |
| 12 | Kaynak yokken fiyat uydurmama | Veri olmayan işler (dekoratif vb.) rakam göstermiyor; veri olmayan il başka ilin rakamını almıyor | Geçti |

## Diğer yeni testler

- Motor (`market.test.ts`, 20 test): çeyreklik, uç değer, kalite düzeyleri, eski kayıtlar, aynı kaynağın tek sayılması, yuvarlama, toplamlar.
- Bölgesel katman (`regional.test.ts`): 81 il ve plaka kodları, il arama (Türkçe harfsiz), istatistiğin kalite kurallarına uyması, yedek kuralları, karşılaştırma kuralı, verinin yaşlanması, şehir kaydının temizlenmesi.
- Veri tabanı: herkese açık / yalnızca yönetici ayrımı, tekrar ve tarih kontrolleri, kalite kısıtları, tamamlanan işlerde ev sahibi onayı ve rıza, 5 iş eşiği.

## Test edilemeyenler

- **Gerçek telefon (Android APK)**: yeni ekranlar telefonda denenmedi. Yeni APK, Hidayet'in "APK beklemede kalsın" isteği üzerine yapılmadı.
- **Canlı veri tabanı**: tablolar 26.10.2026'da canlıya uygulandı ve salt okuma sorgularıyla doğrulandı (il/ilçe sayıları, RLS, ziyaretçi izinleri). Kural testleri (onay, rıza, 5 iş eşiği) yalnızca yerel PostgreSQL'de çalıştı; canlıda test verisi yazılmadı.
- **Android emülatör**: bu bulut ortamında donanım sanallaştırması (KVM) yok, Android emülatörü çalışamıyor. Telefon boyutundaki ekranlar tarayıcıda (390×844) denendi.
- **iOS**: test edilmedi.
- **Karanlık tema**: yeni kartlar tema renklerini kullanıyor, ama karanlık temada ayrıca bakılmadı.
