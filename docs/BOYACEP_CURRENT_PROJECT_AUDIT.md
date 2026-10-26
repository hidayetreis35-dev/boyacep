# BoyaCep mevcut proje denetimi

Tarih: 26.10.2026. Kod: `claude/project-thread-tjkvqw` dalı, son kayıt `0c69b0b` (PR #1, ana dala alınmadı). Bu denetimde uygulama kodu değiştirilmedi.

Önceki denetim 25.10.2026'da `e21ffd4` üzerinde yapılmıştı. Bu rapor, o günden bu yana değişenleri ve bugün açık kalan sorunları gösterir.

## Özet

- **Temel sağlam.** Kod modüler, hesap motoru saf TypeScript, her ekranın testi var ve 40 test dosyasındaki 451 testin hepsi geçiyor. Veri tabanında 32 tablonun hepsinde erişim kuralı (RLS) açık.
- **Gerçek kullanım yok.** Canlı veri tabanında 1 kullanıcı (Hidayet) ve 0 proje var. Ürün henüz hiçbir gerçek ev sahibi ya da ustayla denenmedi.
- **En büyük üç açık:**
  1. Hesap katsayıları bir ustaya doğrulatılmadı.
  2. Dış kullanıcıya giriş e-postası gitmiyor (SMTP yok).
  3. Canlı veri tabanının yedeği yok (ücretsiz plan).
- **Web sürümü** üç ekran boyutunda hatasız açılıyor. Ama masaüstünde telefon ekranı ortada tek sütun duruyor; ayrı bir web deneyimi ve tanıtım sayfası yok.

## 1. Teknoloji ve mimari

| Katman | Kullanılan | Not |
|---|---|---|
| Mobil + web | Expo SDK 58, React Native 0.88, React 19.3, Expo Router (dosya tabanlı yönlendirme) | Tek kod tabanı: Android, iOS ve web |
| Dil | TypeScript 6 | `npm run check`: tip kontrolü + lint + Jest |
| Veri | Supabase: PostgreSQL 17 (Frankfurt), Auth, Storage | İstemci `src/lib/supabase.ts`; ekranlar veriye React Query ile erişir |
| Hesap motoru | `src/engine/` | Saf TypeScript; React, ağ ve yapay zekâ yok. Her değişiklik birim testli |
| Görsel | `@shopify/react-native-skia` 2.14 | Renk Stüdyosu'nda gerçekçi boyama |
| PDF | `expo-print` | Teklif ve Keşif Dosyası PDF'i |
| Dil desteği | Kendi `t()`/`msg()` sistemimiz; `en.ts` içinde 1.390+ İngilizce kayıt | Çevrilmemiş metin testi kırar |
| Derleme | EAS Build, `preview` profili APK üretir | Hidayet'in bilgisayarından çift tıkla |
| Sürekli entegrasyon (CI) | GitHub Actions | Son kayıtta yeşil |

**Mimari kararı: korunmalı.** Çalışan teknolojiyi değiştirmek için bir neden bulmadım. Eklenecek parçalar (bildirim, ödeme, yapay zekâ kapısı, analitik) bu yapının üzerine oturur. Ayrıntı: [BOYACEP_TECHNICAL_ARCHITECTURE.md](BOYACEP_TECHNICAL_ARCHITECTURE.md).

## 2. Klasör yapısı

```
src/app/        33 ekran dosyası (Expo Router)
src/features/   20 özellik modülü (calculator, colour, market, quotes, survey…)
src/engine/     hesap motoru (boya, malzeme, maliyet, piyasa)
src/ui/         tasarım sistemi: theme.ts, components.tsx, brand.tsx, motion
src/i18n/       çeviri sistemi
src/lib/        Supabase istemcisi, veri tipleri, sayı biçimi
supabase/       12 migration, 12 veri tabanı test dosyası, kurulum betiği
docs/           raporlar, hesap kuralları, telefon test listesi
scripts/market/ piyasa verisi özet üretici
```

## 3. Ekranlar ve özellikler

| Modül | Ne yapıyor | Durum | Kanıt |
|---|---|---|---|
| Ana sayfa | 6 eylem kartı, şehir kartı | Çalışıyor | `src/app/(tabs)/index.tsx` |
| Ne Kadar Boya? | Tek oda (6 adım) veya tüm ev (4 adım); litre, kutu, astar; sonuçta şehre göre usta maliyeti | Çalışıyor; katsayılar taslak | `src/engine/paint.ts`, `docs/calculation.md` |
| Maliyet Hesapla | Boya + malzeme + işçilik; fiyat kaynağı etiketli | Çalışıyor | `src/app/cost.tsx` |
| Türkiye Boya Fiyatları | 81 il, kalite düzeyi, kaynak ve tarih | Çalışıyor; 12 il araştırıldı | `src/app/prices.tsx` |
| Renk Stüdyosu | Renk keşfi, uyumlu renkler, fotoğrafta gerçekçi boyama, dokunarak seçme | Çalışıyor; benzer renkli eşyada "Çıkar" dokunuşu gerekiyor | `src/features/colour/` |
| Duvarını İncele | 3 adım: fotoğraf, belirti, kural tabanlı öneri | Çalışıyor; fotoğrafı yapay zekâ incelemiyor ve bunu ekranda söylüyor | `src/features/inspect/rules.ts` |
| Boya Rehberi | Yönetim panelinden düzenlenen yazılar | Çalışıyor; canlıda 10 yazı, yalnızca Türkçe | `src/features/guide/` |
| Ustaya Sor | Soru → BoyaCep ekibi yanıtlar | Teknik olarak çalışıyor; yanıtlayacak ekip yok | `src/app/ask/` |
| Projeler | Proje, oda, açıklık, renk, fotoğraf, malzeme, bütçe | Çalışıyor (test); canlıda 0 proje | `src/features/projects/` |
| Keşif Dosyası v1 | Odalar, ölçüler, fotoğraflar, sorunlar, renkler tek dosyada + PDF | Çalışıyor (test) | `src/app/projects/[id]/survey.tsx` |
| Usta tarafı | Profil, doğrulama isteği, davet koduyla proje, teklif ve PDF, kabul/ret | Çalışıyor (test); canlıda 0 usta | `src/features/quotes/`, `src/features/pros/` |
| Planlar | Pro ve Usta Pro tanımları; ödeme kapalı, dürüst uyarı | Kapalı beta | `src/features/plans/api.ts` |
| Hesap ve gizlilik | E-posta bağlantısıyla giriş, veri indirme, hesap silme, hata kaydı | Çalışıyor | `src/features/account/` |
| Yönetim paneli | Rehber, usta doğrulama, sorular | Çalışıyor | `src/app/admin/` |
| Dil | Türkçe + İngilizce, Profil'den değişir | Çalışıyor | `src/i18n/` |

Sahte buton ya da örnek veri bulmadım. Henüz olmayan özellikler "Yakında" diye açıkça işaretli.

## 4. 25.10.2026'dan bu yana değişenler

| Değişiklik | Kayıt |
|---|---|
| Önceki denetimin 4 yüksek riskli güvenlik açığı kapatıldı ve canlıya alındı | `af73f57` |
| Keşif Dosyası v1 | `a5c998d` |
| Android deneme sürümü (APK) profili; Hidayet'in telefonuna kuruldu | `a89711a`, `d0eac4f` |
| İngilizce sürüm | `a21464c` |
| Şehre göre piyasa fiyatları ve canlı fiyat tabloları | `78aa1ae` … `d8ecade` |
| Tarih etiketleri ve Türkçe büyük harf "İ" düzeltmesi | `75118dd` |

## 5. Veri tabanı

- 12 migration, 32 tablo, hepsinde RLS açık (canlıda sorguyla doğrulandı, 26.10.2026).
- Canlı içerik: 1 kullanıcı, 0 proje, 0 usta profili, 10 rehber yazısı, 81 il, 47 ilçe.
- Veri tabanı testleri: 12 dosya, yaklaşık 400 kontrol (yerel PostgreSQL 16).
- Fotoğraflar özel klasörde; boyut ve tür sınırlı; yol, sahibi ve projeyi içeriyor.
- **Yedek yok:** ücretsiz planda günlük yedek yok, proje 1 hafta hareketsiz kalırsa durduruluyor.
- **Kayıtlı migration geçmişi yok:** kurulum SQL Editor'den yapıldı. Değişiklikler önce bir deneme projesinde denenmiyor.

## 6. Kullanıcı akışları

| Akış | Durum |
|---|---|
| Hesapsız: boya hesabı → sonuç → şehre göre maliyet | Çalışıyor. Web'de 26.10.2026'da baştan sona denendi |
| Hesapsız: renk seç → fotoğrafta dene | Çalışıyor; telefonda denendi |
| Giriş: e-posta → bağlantı → uygulama | Çalışıyor, ama yalnızca Supabase ekip üyelerine e-posta gidiyor |
| Proje oluştur → oda ekle → malzeme → bütçe | Testlerde çalışıyor; telefonda uçtan uca denenmedi |
| Ev sahibi → ustaya davet kodu → usta teklif → ev sahibi kabul | Testlerde çalışıyor; iki gerçek kişiyle denenmedi |
| Usta bulma | Yok. Ev sahibi yalnızca tanıdığı ustaya kod verebilir |
| Bildirim | Yok. Teklif gelince kimse haberdar olmuyor |

## 7. Mobil ve web

**Mobil (Android APK):** Ana akışlar Hidayet'in telefonunda açıldı. Piyasa fiyatlı yeni APK 26.10.2026'da derleniyor. iOS denenmedi (Apple geliştirici hesabı yok).

**Web:** `expo export --platform web` ile derlenip Chromium'da 15 ekran 3 boyutta açıldı:

| Boyut | Sonuç |
|---|---|
| Telefon 375×812 | 15/15 ekran açıldı, sayfa hatası 0, yatay taşma 0 |
| Tablet 768×1024 | 15/15, hata 0, taşma 0 |
| Masaüstü 1280×900 | 15/15, hata 0, taşma 0; içerik ortada tek sütun |

Rehber ekranı test ortamında "yükleniyor"da kaldı. Bunun nedeni bu bulut ortamının Supabase'e erişememesi; uygulama hatası değil. Telefonda rehber açılıyor.

**Web'in eksikleri:**
- Masaüstüne özel düzen yok.
- Tanıtım sayfası yok.
- Web sürümü hiçbir adreste yayında değil.
- Renk Stüdyosu web'de yaklaşık 1,2 MB ek kod ve Skia için ayrı bir dosya indiriyor.

## 8. Dil desteği

- Türkçe kaynak dil. İngilizce bütün arayüzde var.
- Çevrilmemiş metin ya da eksik çeviri testleri kırıyor.
- Eksikler: rehber yazıları ve Ustaya Sor yalnızca Türkçe. Ülke ayarı yok, para birimi her dilde ₺.
- Ayrıntı: [BOYACEP_I18N_AND_GLOBALIZATION_AUDIT.md](BOYACEP_I18N_AND_GLOBALIZATION_AUDIT.md).

## 9. Tasarım sistemi

- Bütün renk, boşluk ve yazı `src/ui/theme.ts`'ten geliyor; açık ve koyu tema tanımlı.
- Renkler: lacivert (güven), boya kutusu turuncusu (ana eylem), sıcak beyaz zemin, her özelliğe bir renk.
- Yazı tipi Plus Jakarta Sans. Bileşenler `src/ui/components.tsx` içinde. Kontrast testi var (`src/ui/__tests__/contrast.test.ts`).

**Güçlü yanlar:**
- Tutarlı, sıcak ve kendine ait bir görünüm.
- Büyük dokunma alanları.
- Adım adım sihirbazlar.

**Zayıf yanlar:**
- Masaüstü düzeni yok.
- Koyu tema yeni kartlarda ayrıca denenmedi.
- Mikro animasyonlar az (yalnızca giriş ve basma efekti).

## 10. Test altyapısı

| Katman | Durum |
|---|---|
| Birim ve ekran testleri | 40 dosya, 451 test, hepsi geçiyor (26.10.2026) |
| Veri tabanı erişim testleri | 12 dosya; her tabloda "izin var / izin yok" |
| Uçtan uca (web) | Elle çalıştırılan Playwright betikleri; CI'da yok |
| Telefonda | Yazılı kontrol listesi (`docs/telefon-testi.md`); emülatör yok |
| Performans | Ölçülmüyor |
| Hata kaydı | `client_errors` tablosu; canlıda 0 kayıt |

**Emülatör:** Bulut ortamında donanım sanallaştırması (KVM) yok. Hidayet'in bilgisayarında Android SDK ve emülatör kurulu değil. Telefon testleri APK ile yapılıyor.

## 11. Açık sorunlar (öncelik sırasıyla)

| # | Sorun | Etki | Öncelik |
|---|---|---|---|
| 1 | Hesap katsayıları (emicilik, macun, ev tipi çarpanı) ustaya doğrulatılmadı | Gösterilen litreler yanlış olabilir; ürünün temeli | Yüksek |
| 2 | Dış kullanıcıya giriş e-postası gitmiyor | Beta testçisi giriş yapamaz | Yüksek |
| 3 | Canlıda yedek yok; 1 hafta hareketsizlikte proje duruyor | Veri kaybı | Yüksek |
| 4 | Bildirim yok | Teklif akışı takılır | Orta |
| 5 | Usta bulma yok; Usta Pro'nun gerçek ayrıcalığı yok | Pazar yeri ve gelir yok | Orta |
| 6 | Oda kaydı tek işlem değil (`saveRoom`) | Nadir durumda açıklıklar silinmiş kalır | Orta |
| 7 | Oturum telefonda şifresiz depoda (AsyncStorage) | Cihaz ele geçirilirse oturum okunabilir | Orta |
| 8 | Deneme veri tabanı ve kayıtlı migration akışı yok | Canlıya hatalı değişiklik riski | Orta |
| 9 | Analitik yok | Hangi adımda kullanıcı bıraktığı bilinmiyor | Orta |
| 10 | Masaüstü web düzeni ve tanıtım sayfası yok | Web'den gelen kullanıcı için zayıf ilk izlenim | Orta |
| 11 | Renk Stüdyosu seçim hesabı ana iş parçacığında | Dokunuşta kısa donma | Düşük |
| 12 | Favori renkler ve rol yalnızca telefonda | Telefon değişince kaybolur | Düşük |
| 13 | Rehber 10 yazı ve yalnızca Türkçe | İçerik değeri sınırlı | Düşük |
| 14 | KVKK metinleri avukattan geçmedi | Hukuki risk | Yayından önce yüksek |

## 12. Güçlü ve zayıf yönler

**Güçlü:**
- Her sayının kaynağı ve güvenilirliği gösteriliyor ("üretici", "kullanıcı", "tahmin").
- Hesapsız kullanılabilen gerçek bir hesap motoru.
- Telefonda çalışan gerçekçi duvar boyama.
- Şehre göre, kaynaklı fiyat referansı; Türkiye'de bunu yapan başka bir uygulama bulamadım.
- Ev sahibi ve usta aynı proje dosyası üzerinde çalışıyor.
- Güvenlik kuralları test altında.
- İki dilli.

**Zayıf:**
- Hiç gerçek kullanıcı yok.
- Pazar yerinin iki tarafı da (ev sahibi ve usta) boş.
- Bildirim, ödeme ve analitik yok.
- Katsayılar doğrulanmadı.
- Web deneyimi telefon kopyası.

## Kaynaklar

- Kod: hidayetreis35-dev/boyacep, `0c69b0b`.
- Canlı veri tabanı: salt okuma sorguları (tablo, satır ve RLS sayısı), 26.10.2026.
- Web taraması: Playwright + Chromium, 26.10.2026.
- Önceki denetim: "BoyaCep – Ürün Denetimi ve Stratejik Yol Haritası", 25.10.2026.
