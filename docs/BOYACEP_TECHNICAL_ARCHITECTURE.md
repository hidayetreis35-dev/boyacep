# Teknik mimari

Tarih: 26.10.2026.

**Temel karar:** mevcut mimari korunuyor:
- Expo + React Native + Expo Router,
- Supabase (PostgreSQL, Auth, Storage, Edge Functions),
- saf TypeScript hesap motoru.

Yeni parçalar bu yapının üzerine, fazların sırasıyla ekleniyor. Hiçbir çalışan teknoloji değiştirilmiyor.

## 1. Bugünkü yapı

```
Telefon / Web (Expo, tek kod tabanı)
  ├─ src/app        ekranlar (Expo Router)
  ├─ src/features   özellik modülleri, veri erişimi React Query ile
  ├─ src/engine     hesap motoru (saf TS, testli) ──► aynı kod ileride Edge Function'da da çalışır
  └─ src/ui, i18n   tasarım sistemi, çeviri
        │  (kullanıcının kendi oturumuyla, RLS altında)
        ▼
Supabase (Frankfurt)
  ├─ PostgreSQL 17: 32 tablo, hepsinde RLS, SECURITY DEFINER fonksiyonlar
  ├─ Auth: e-posta bağlantısı (şifresiz)
  └─ Storage: project-photos (özel, 10 MB, JPEG/PNG/WebP)
```

## 2. Alan alan öneri

| Alan | Bugün | Öneri | Faz | Onay |
|---|---|---|---|---|
| Mobil uygulama | Expo SDK 58, APK | Aynı. Mağaza için EAS Build `production` profili | 1 / 5 | Mağazaya yayın onayı |
| Web | Telefon düzeni ortada | Masaüstünde iki sütun (liste + ayrıntı); ayrı tanıtım sayfası (scroll-craft'ın ücretsiz kısımlarıyla). Fiyat ve hesap sayfaları arama motoruna açık | 1 | Web'i bir adreste yayına almak |
| Backend | Supabase | Aynı. İş kuralı veri tabanında (RLS + fonksiyon), dış servis çağrısı Edge Function'da | – | – |
| Veri tabanı | Ücretsiz plan, yedek yok | Dış testçiden önce Pro (25 $/ay, günlük yedek). Değişiklikler önce ayrı bir deneme projesinde | 1 | **Ücretli** |
| Kimlik | E-posta bağlantısı, yalnızca ekip üyelerine gidiyor | Özel SMTP; oturum `expo-secure-store` ile şifreli; ileride Apple ve Google ile giriş | 1 | SMTP sağlayıcısı |
| Dosya | Tek klasör | Yeni klasörler: fişler (bütçe), usta portfolyosu, iş sonu fotoğrafları, keşif PDF'leri. Aynı yol ve izin kalıbı | 1–3 | – |
| Gerçek zamanlı mesajlaşma | Yok | Supabase Realtime (MIT); `messages` tablosu RLS altında; teklif sayfasına bağlı yazışma. Genel sohbet değil | 3 | – |
| Bildirim | Yok | `expo-notifications` + `push_tokens` tablosu + veri tabanı olayıyla tetiklenen Edge Function. Ücretsiz Expo push servisi | 2 | – |
| Ödeme | Yok; `entitlements` tablosu hazır | Mağaza içi: RevenueCat (`react-native-purchases`, MIT). Web veya hizmet ödemesi gerekirse iyzico | 5 | **Ücretli, ödeme** |
| Yapay zekâ | Yok | Tek kapı: Supabase Edge Function. API anahtarı yalnızca Supabase gizli ayarlarında. Kullanıcı ve kota kontrolü, `ai_usage` tablosu, motor araçları, şemalı yanıt | 4 | **Ücretli** |
| Görüntü işleme | Telefonda kendi segmentasyonumuz (Skia) | Kalsın (çevrimdışı yedek). Otomatik duvar için SAM (sunucu) ya da telefonda küçük model (`react-native-executorch` / ONNX) | 4 | GPU servisi ücretli |
| Analitik | Yok; yalnızca `client_errors` | PostHog (AB bulutu, MIT SDK), kişisel veri olmadan olay sayımı; açık rıza ekranı | 1 | Üçüncü taraf veri işleme (KVKK) |
| Hata izleme | `client_errors` tablosu | Sentry (`@sentry/react-native`, MIT) | 1 | Üçüncü taraf |
| Çoklu dil | TR + EN, testli | Aynı; ülke ayarı (dilden bağımsız) ikinci ülke gelince | – | – |
| Harita ve konum | Yok; il seçimi elle | Konum izni istemeden il listesi kalsın. Usta hizmet alanı il/ilçe kodu ile; haritaya gerek yok | – | – |
| Takvim | Yok | Usta Paneli için kendi basit takvim görünümümüz; gerekirse `react-native-calendars` (MIT) | 3 | – |
| PDF | `expo-print` | Aynı; logolu şablon | 3 | – |

## 3. Yapay zekâ akışı: sayıyı motor üretir, yapay zekâ yorumlar

```
Uygulama ──► Edge Function "ai-gateway"
               1. Kullanıcı oturumu + plan + günlük kota kontrolü
               2. Proje verisini kullanıcının kendi yetkisiyle okur (RLS geçerli, servis anahtarı yok)
               3. Modele yalnızca araçlar verilir: hesapla, malzeme_listesi, fiyat_aralığı, rehber_ara
                  (araçlar src/engine içindeki aynı kodu çalıştırır)
               4. Yanıt sabit şemada; motor çıktısına bağlı olmayan sayı içeren yanıt reddedilir
               5. ai_usage tablosuna model, token, maliyet yazılır
            ◄── "Yapay zekâ yorumu" etiketiyle gösterilir
```

- Görsel düzenleme (oda stili, renk) yalnızca kullanıcının istediği anda ve kredi düşülerek yapılır.
- Görselin altında her zaman motorun ürettiği ölçü, malzeme ve maliyet gösterilir.

## 4. Veri modeli eklemeleri (faz sırasıyla)

Hiçbir tablo silinmiyor. Her tablo RLS ve "izin var / izin yok" testiyle geliyor.

| Faz | Tablo | Amaç |
|---|---|---|
| 1 | `project_expenses` | Akıllı Bütçe: gerçekleşen harcama, kategori, fiş fotoğrafı yolu |
| 1 | `shopping_items` (veya `project_materials` üzerine işaret alanı) | Alışveriş listesi |
| 1 | `home_log` | Ev Hafızası: hangi duvar, tarih, renk, ürün |
| 2 | `push_tokens`, `notifications` | Bildirim |
| 2 | `service_requests` | Hizmet talebi (önce boya ve yüzey işleri) |
| 3 | `quote_requests`, `quote_request_recipients` | Ustalardan Teklif İste |
| 3 | `job_checks`, `reviews` | İş Sonu Kontrol, doğrulanmış yorum |
| 3 | `pro_customers`, `pro_jobs`, `pro_ledger` | Usta İşletme Paneli |
| 3 | `messages` | Teklife bağlı yazışma |
| 4 | `ai_usage`, `ai_credits` | Yapay zekâ kotası ve maliyeti |
| 5 | `entitlements` (var) + mağaza bildirimi | Ödeme |
| 6 | `home_items`, `documents`, `maintenance_tasks` | Ev envanteri, belge, bakım |

## 5. Güvenlik ilkeleri (mimariye gömülü)

- İstemcide yalnızca herkese açık (publishable) anahtar bulunur.
- Servis anahtarı hiçbir zaman uygulamada, depoda ya da sohbette yer almaz.
- Her yeni tablo RLS'li gelir; her politika için en az bir "izin yok" testi yazılır.
- Fonksiyonlar `SECURITY DEFINER` ise `search_path` sabitlenir ve ziyaretçinin (anon) çalıştırma izni kaldırılır.
- Dosya yolları sahip ve proje kimliği içerir; üye ustalar yalnızca okur.

Ayrıntı: [BOYACEP_SECURITY_AND_RISK.md](BOYACEP_SECURITY_AND_RISK.md).

## 6. Ölçeklenebilirlik

| Kullanıcı | Yapılacak |
|---|---|
| < 10 bin aylık | Supabase Pro yeter; indeks eksikleri kapatılır (danışmanda 8 indekssiz yabancı anahtar vardı) |
| 10–100 bin | Hesaplama gücü eklentisi; fotoğraf küçük boyutlu kopyalarla; React Query önbelleği; okuma ağırlıklı ekranlar için görünüm (view) |
| > 100 bin | Okuma kopyası; görsel CDN; yapay zekâ kuyruğu |

Hesap motoru telefonda çalıştığı için en sık kullanılan özellik sunucuya yük bindirmiyor.

## 7. Geliştirme ve dağıtım akışı

```
dal → CI (tip + lint + 451 test + DB testleri) → deneme Supabase projesi → APK (Hidayet'in telefonu)
    → yazılı kontrol listesi → canlı veri tabanı (onayla) → mağaza (onayla)
```

**Eksik olan:**
- deneme Supabase projesi,
- CI'da web uçtan uca testleri (Playwright).

İkisi de Faz 1'de ekleniyor.
