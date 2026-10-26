# Başarı ölçütleri

Tarih: 26.10.2026.

**Bugün BoyaCep'te ürün analitiği yok.** Yalnızca hata kaydı (`client_errors`) var. Faz 1'de olay listesi ve rıza ekranı hazırlanacak. Analitik servisi onay listesinde.

Hedefler tahmindir. Kapalı betadan sonra gerçek verilerle güncellenecek.

## Ana ölçüt (North Star)

**Haftalık "hazır proje" sayısı.** Hazır proje şunları içeren projedir:
- en az bir odası hesaplanmış,
- malzeme listesi veya bütçesi olan,
- keşif dosyası paylaşılmış ya da teklif almış.

**Neden bu:**
- BoyaCep'in değeri tek bir hesap değil; ev sahibinin işe hazırlıklı başlaması.
- Bu sayı hem ev sahibi değerini hem usta tarafına giden talebi ölçüyor.

## Huni

| Adım | Ölçüt | Faz 1 hedefi (beta) | Faz 5 hedefi |
|---|---|---|---|
| Edinme | Haftalık yeni kullanıcı; kanal kırılımı (arama, içerik, bayi, davet) | 10 ev sahibi + 3 usta | Kanal başına maliyet ölçülüyor |
| Etkinleşme | İlk oturumda hesap tamamlama oranı | %70 | %60 (geniş kitlede düşer) |
| Kayıt | Hesap sonrası projeyi kaydetme oranı | %50 | %30 |
| Değer | Hazır proje oranı (kaydedilen projelerden) | %40 | %35 |
| Elde tutma | 7. gün ve 30. gün geri dönüş | Ölçülecek | D7 %25, D30 %12 |
| Gelir | Premium dönüşümü; Usta Pro dönüşümü | – | %2–4; %10 |
| Tavsiye | Davet veya paylaşım ile gelen kullanıcı oranı | Ölçülecek | %15 |

## Usta tarafı

| Ölçüt | Hedef |
|---|---|
| Keşif dosyasından teklif hazırlama süresi | 10 dakikanın altında |
| Talep başına teklif sayısı (Faz 3) | 2+ |
| Ustanın talebi "ciddi" bulma oranı | %60+ |
| Aylık aktif usta / doğrulanmış usta | %50+ |

## Ürün kalitesi

| Ölçüt | Hedef | Nasıl ölçülür |
|---|---|---|
| Hesap doğruluğu | 20 gerçek odada kullanılan boyayla fark %10'un altında | Altın örnek testleri |
| Çökmesiz oturum | %99,5+ | Hata kaydı / Sentry |
| Ekran durumu kapsamı | Her ekranda yükleniyor, hata, boş ve dolu durumu testli | Ekran testleri |
| Erişim kuralı kapsamı | Her yeni politika için "izin var / izin yok" testi | Veri tabanı testleri |
| Web uçtan uca | Ana akışlar her kayıtta CI'da geçiyor | Playwright |
| Dil | Çevrilmemiş metin 0 | i18n testi |
| Duvar seçimi doğruluğu (Faz 4) | 50 fotoğrafta %85+ | Elle işaretlenmiş test seti |
| Fiyat verisi tazeliği | Pilot illerde 90 günden yeni | Uygulama içi eskime uyarısı |

## Maliyet ve verim

| Ölçüt | Hedef |
|---|---|
| Kullanıcı başına yapay zekâ maliyeti | Premium gelirinin %15'inden az |
| Aylık altyapı maliyeti / aylık gelir | Faz 5 sonunda 1'in altında |
| Yapay zekâ çağrılarında kota aşımı | 0 (tavan çalışıyor) |

## Faz bazında geçiş ölçütleri

| Faz | Geçiş için |
|---|---|
| 1 → 2 | 10 ev sahibinin 7'si hazır proje; 3 ustanın 2'si dosyadan teklif; katsayılar 2 usta onaylı |
| 2 → 3 | Bildirim çalışıyor; teklif karşılaştırma kullanılıyor; pilot ilde 20 doğrulanmaya hazır usta |
| 3 → 4 | Talep → iş sonu → yorum akışı gerçek kişilerle çalıştı |
| 4 → 5 | Yapay zekâ kalite ve maliyet ölçütleri sağlandı |
| 5 → 6 | 3 ay üst üste gelir ≥ altyapı + yapay zekâ maliyeti |

## Toplanacak olaylar (kişisel veri olmadan)

```
app_open, calc_started, calc_completed{mode}, project_saved, room_added,
budget_item_added, colour_tried, survey_shared, quote_received, quote_compared,
quote_accepted, job_checked, paywall_seen{place}, purchase_completed{plan}
```

- Olaylarda ad, e-posta, telefon, adres ya da fotoğraf bulunmaz.
- Kullanıcı kimliği rastgele bir analitik kimliğidir.
- Analitik, rıza verilmeden açılmaz.
