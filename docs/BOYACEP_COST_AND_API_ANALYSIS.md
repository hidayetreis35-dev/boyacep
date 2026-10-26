# Maliyet ve API analizi

Tarih: 26.10.2026. Kur 1 $ ≈ 49,6 ₺ (21.10.2026).

Kaynaklı fiyatlar bağlantılıdır. "Tahmin" yazan satırlar benim hesabımdır; kullanım ölçülmeden kesinleşmez.

**Bugün BoyaCep'in aylık maliyeti 0 $:**
- Supabase ücretsiz plan,
- EAS ücretsiz plan,
- ücretli API yok.

## 1. Sabit altyapı

| Kalem | Ücret | Ne zaman | Kaynak |
|---|---|---|---|
| Supabase Free | 0 $; 500 MB veri tabanı, 1 GB dosya, yedek yok, 1 hafta hareketsizlikte durur | Bugün | [Supabase fiyat](https://supabase.com/pricing) (25.10.2026 okundu) |
| Supabase Pro | 25 $/ay; günlük yedek (7 gün). Anı geri yükleme (PITR) +100 $/ay | Dış testçiden önce önerilir | Aynı |
| EAS Build Free | 0 $; sınırlı, düşük öncelikli derleme | Bugün | [Expo planları](https://docs.expo.dev/billing/plans.md) |
| EAS Starter | 19 $/ay; 45 $ öncelikli derleme kredisi | Derleme kuyruğu sorun olursa | Aynı |
| Google Play geliştirici hesabı | 25 $ bir kerelik | Mağazaya çıkmadan (Faz 1 sonu) | Genel bilinen ücret; ödeme anında doğrulanacak |
| Apple Developer Program | 99 $/yıl | iOS'a çıkmadan | Genel bilinen ücret; ödeme anında doğrulanacak |
| E-posta (SMTP) | Sağlayıcıya göre; ücretsiz katmanlar var | Dış testçiden önce | Sağlayıcı seçimi onayla |
| Alan adı | Yıllık küçük ücret | Tanıtım sitesiyle | – |
| Sentry, PostHog | Ücretsiz katmanla başlanabilir | Faz 1 | Koşullar seçim anında okunacak |
| Expo push bildirimi | Ücretsiz | Faz 2 | Expo |
| RevenueCat | Aylık 2.500 $ gelire kadar ücretsiz, sonra gelirin %1'i | Faz 5 | 25.10.2026 araştırması |

## 2. Yapay zekâ ve görüntü servisleri (birim fiyat)

| Servis | Birim fiyat | Kaynak |
|---|---|---|
| Claude Haiku 5.5 | Milyon token başına 0,10 $ girdi / 0,50 $ çıktı | Anthropic fiyat listesi, 06.10.2026 (önceki tur) |
| Claude Sonnet 5.5 | 2 $ / 10 $ | Aynı |
| Claude Opus 5.5 | 4 $ / 20 $ | Aynı |
| GPT Image 1.5 (1024×1024) | Düşük 0,009 $, orta 0,034 $, yüksek 0,133 $ | [PricePerToken](https://pricepertoken.com/gpt-image-pricing) |
| GPT Image 1 Mini | 0,005 / 0,011 / 0,036 $ | Aynı |
| Gemini 2.5 Flash Image | 0,020 $ (fal.ai) – 0,040 $ (Replicate) | [PricePerToken](https://pricepertoken.com/image/model/google-gemini-2-5-flash-image) |
| FLUX Kontext | 1 kredi = 0,01 $; görsel başına fiyat sayfada okunamadı | [BFL](https://docs.eu.bfl.ai/quick_start/pricing) |
| SAM (Replicate, T4) | Çalıştırma başına ≈0,0016 $, ≈8 sn | [Replicate](https://replicate.com/cbx1/sam-vit-h) |
| SAM 2 (barındırılan) | ≈0,022 $ | Önceki tur |
| Kendi GPU'muz (Modal T4) | ≈0,59 $/saat | Önceki tur |
| Telefonda model (executorch / ONNX) | 0 $ çalıştırma; uygulama boyutu büyür | – |

**Karşılaştırma:** RoomGPT kullanıcıya tasarım başına 0,15–0,30 $ satıyor ([Krea](https://www.krea.ai/blog/roomgpt-review-and-alternatives-in-2026)). Bizim maliyetimiz görsel başına 0,01–0,04 $ (orta kalite). Kredi modelinde marj mümkün.

## 3. Özellik başına maliyet (tahmin)

| Özellik | Bir kullanım | Hesap |
|---|---|---|
| Boya hesabı, fiyat, bütçe, keşif dosyası | ≈0 $ | Telefonda motor; Supabase okuma |
| Renk Danışmanı (fotoğraf + kısa yorum) | 0,0006 $ (Haiku) – 0,012 $ (Sonnet) | Bir fotoğraf ≈1.500 token + 1.000 token metin + 500 token yanıt |
| Duvarını İncele yorumu | Aynı aralık | Aynı |
| Otomatik duvar bulma | 0,002–0,022 $ | SAM servisine göre; telefonda modelde 0 $ |
| Oda stili görseli | 0,011–0,040 $ | Orta kalite; yüksek kalitede 0,13 $'a kadar |
| Sesli keşif (1 dk ses) | Bu turda araştırılmadı | Türkçe konuşma tanıma servisi seçilince |

## 4. Kullanıcı başına yapay zekâ maliyeti ve fiyat

**Premium (tek seferlik 199 ₺ ≈ 4,0 $; mağaza payı %15 düşülünce ≈3,4 $):**

| Kota (yıllık) | Ucuz model | Pahalı model |
|---|---|---|
| 50 Renk Danışmanı veya İnceleme analizi | 50 × 0,0006 = 0,03 $ | 50 × 0,012 = 0,60 $ |
| 10 oda stili görseli | 10 × 0,011 = 0,11 $ | 10 × 0,040 = 0,40 $ |
| 50 otomatik duvar seçimi | 50 × 0,002 = 0,10 $ | 50 × 0,022 = 1,10 $ |
| **Toplam** | **≈0,24 $ (gelirin %7'si)** | **≈2,10 $ (gelirin %62'si)** |

**Sonuç:**
- Premium'a sınırsız yapay zekâ konmamalı.
- Pahalı model ancak kalite testinde açık fark çıkarsa kullanılmalı.
- Görsel üretimi Premium'da yıllık 10 adetle sınırlanmalı; fazlası ayrı kredi paketiyle satılmalı. Örneğin 20 görsel 49 ₺ (≈1 $); maliyeti 0,22–0,80 $.
- Otomatik duvar seçimi mümkünse telefonda çalışmalı (0 $).

**Ücretsiz kullanıcı:**
- Yapay zekâ yok, ya da ayda 3 analiz (≈0,002–0,04 $). Kötüye kullanıma karşı günlük kota şart.
- Tavan: her kullanıcı ve her gün için en fazla N çağrı. `ai_usage` tablosundaki maliyet toplamı aylık bütçeyi geçerse kapı kapanır.

## 5. Ölçeğe göre aylık maliyet (tahmin)

| Aşama | Aylık aktif | Altyapı | Yapay zekâ | Toplam |
|---|---|---|---|---|
| Kapalı beta | ≤100 | 0–25 $ (yedek için Pro) | 0 $ | 0–25 $ |
| Erken | 1.000 | 25–45 $ | 5–20 $ | 30–65 $ |
| Büyüme | 10.000 | 50–150 $ (hesaplama eklentisi, dosya alanı) | 50–200 $ | 100–350 $ |
| Ölçek | 100.000 | 500–1.500 $ | 500–1.500 $ | 1.000–3.000 $ |

**Varsayımlar:**
- Aylık aktif kullanıcıların %10'u yapay zekâ kullanıyor.
- Görsellerin çoğu orta kalite.
- Fotoğraflar küçültülerek saklanıyor.

Dosya alanı ücretleri bu turda okunmadı.

## 6. Performans

- Hesap motoru telefonda çalışıyor; sunucu gecikmesi yok.
- Web derlemesinde en büyük parçalar:
  - ana kod ≈1,1 MB,
  - ortak kod ≈0,9 MB,
  - Renk Stüdyosu fotoğraf modülü ≈1,2 MB (yalnızca açılınca iner) ve Skia için ayrı dosya.
- Barındırılan görsel düzenleme 15–30 sn sürüyor (RoomGPT örneği). Kullanıcıya ilerleme ve iptal gösterilmeli.
- SAM T4'te ≈8 sn.

## 7. Onay listesi (maliyet doğuranlar)

| Kalem | Tutar | Neden |
|---|---|---|
| Supabase Pro | 25 $/ay | Yedek; 1 hafta hareketsizlikte durmama |
| SMTP sağlayıcısı | 0 $'dan başlar | Dış kullanıcıya giriş e-postası |
| Google Play hesabı | 25 $ bir kerelik | Mağaza ve kapalı test kanalı |
| Apple Developer | 99 $/yıl | iOS |
| Yapay zekâ ve GPU servisleri | Kullanım başına; aylık tavanla | Faz 4 |
| Ödeme altyapısı | Komisyon | Faz 5 |
