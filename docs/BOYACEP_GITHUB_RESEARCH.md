# GitHub ve açık kaynak araştırması

Tarih: 26.10.2026.

**Yöntem:**
- JavaScript paketlerinde lisans ve son sürüm tarihi npm kayıt servisinden okundu.
- Yapay zekâ depolarında GitHub sayfası açıldı.
- Önceki turların kararları (25.10.2026 Teknoloji Denetimi ve Ürün Denetimi) burada tekrar edildi ve değişmedi.

**İlke:** Bir depo yalnızca açık kaynak olduğu için eklenmiyor. Lisansı ticari kullanıma izin vermeli, son 12 ayda bakımı yapılmış olmalı ve bizim mimarimize küçük bir değişiklikle oturmalı.

**Entegrasyon zorluğu:** Düşük = bir paket eklemek, Orta = yeni bir servis veya yerel kod, Yüksek = ayrı sunucu veya lisans sorunu.

## 1. Oda ve duvar segmentasyonu, görsel renklendirme

| Depo | Ne işe yarar | BoyaCep'te nerede | Lisans | Son durum | Gereksinim | Zorluk | Karar |
|---|---|---|---|---|---|---|---|
| [facebookresearch/sam2](https://github.com/facebookresearch/sam2) | Dokunulan noktadan nesneyi seçer | Renk Stüdyosu'nda duvar seçimi | Apache-2.0 (kod ve ağırlık) | 2.1 sürümü Eyl 2024; son güncelleme Ara 2024 (önceki tur) | GPU sunucusu; barındırılan servis çalıştırma başına ≈0,0016–0,022 $ | Orta | **Faz 4 adayı**; GPU servisi onay gerektirir |
| [facebookresearch/sam3](https://github.com/facebookresearch/sam3) | "duvar" yazınca bütün duvarları bulur | Tek dokunuşla otomatik duvar | SAM License (ticari serbest; askeri ve yaptırım kullanımı yasak) | 3.1: Mart 2026 | CUDA GPU, 848M parametre | Orta (özel lisans, hukuk okuması) | **Faz 4'te en güçlü aday** |
| [DepthAnything/Depth-Anything-V2](https://github.com/DepthAnything/Depth-Anything-V2) | Fotoğraftan derinlik haritası | Duvar–eşya ayrımı, gölge ve ışık tahmini | Kod Apache-2.0; **yalnız Small modeli Apache-2.0**, Base/Large/Giant CC-BY-NC (ticari değil) | 9 bin yıldız; son haber Oca 2025 | Small 24,8M parametre; Core ML ve ONNX sürümleri var | Orta | **Yalnızca Small**, telefonda denenebilir (Faz 4) |
| [SHI-Labs/OneFormer](https://github.com/SHI-Labs/OneFormer) | ADE20K'da duvar/tavan/zemin dahil 150 sınıflı segmentasyon | Duvar ve tavanı otomatik ayırma | Kod MIT; ağırlık ve ADE20K veri seti koşulları sayfada yazmıyor | 1,7 bin yıldız | GPU; Detectron2 | Yüksek (ağırlık lisansı belirsiz) | Yalnızca referans |
| [IDEA-Research/Grounded-SAM-2](https://github.com/IDEA-Research/Grounded-SAM-2) | Metinle nesne bulma + SAM | Otomatik duvar | README'de lisans açık değil | ≈11 ay önce son kayıt (önceki tur) | GPU, CUDA 12.1 | Yüksek | Kullanma; SAM 3 aynı işi yapıyor |
| NVIDIA SegFormer ağırlıkları | Segmentasyon | – | Ticari olmayan lisans | – | – | – | **Kullanma** (önceki tur) |
| [react-native-fast-opencv](https://github.com/lukaszkurantdev/react-native-fast-opencv) | Telefonda OpenCV | Renk Stüdyosu seçimini hızlandırma | MIT (OpenCV Apache-2.0) | 1.0.1, 03.08.2026 | Yerel kod; Expo Go'da yok, APK'da var | Orta | Faz 1'de performans gerekirse |
| [react-native-executorch](https://github.com/software-mansion/react-native-executorch) | Telefonda yapay zekâ modeli çalıştırma | Küçük segmentasyon/derinlik modeli, internetsiz | MIT | 0.10.7, 21.10.2026 | Yerel kod; model boyutu uygulamayı büyütür | Orta | Faz 4'te SAM sunucusuna alternatif olarak denenecek |
| [onnxruntime-react-native](https://github.com/Microsoft/onnxruntime) | ONNX modellerini telefonda çalıştırma | Aynı | MIT | 1.24.3, 05.03.2026 | Yerel kod | Orta | executorch'a yedek |
| Kendi segmentasyonumuz (`recolour.ts`) | Kenar duyarlı bölge büyütme, Lab renkte boyama | Bugün kullanılıyor | Bizim | Güncel | Telefonda | – | **Kalsın**; yapay zekâ gelince çevrimdışı yedek |
| [Shopify/react-native-skia](https://github.com/Shopify/react-native-skia) | Telefonda GPU çizimi | Gerçekçi boyama | MIT | 2.14.0, 01.10.2026 | Web'de ek dosya | – | Kullanılıyor |

## 2. Yapay zekâ iç mekân tasarımı

| Depo | Ne | Lisans | Durum | Karar |
|---|---|---|---|---|
| [Nutlope/roomGPT](https://github.com/Nutlope/roomGPT) | RoomGPT'nin eski açık kaynak sürümü: Next.js, Replicate'teki ControlNet'i çağırıyor | MIT | 10,7 bin yıldız; README "önceki sürüm" diyor; 28 açık sorun | Mimari referans. Kod Next.js ve ücretli Replicate'e bağlı; doğrudan kullanılmaz |
| [lllyasviel/ControlNet](https://github.com/lllyasviel/ControlNet) | Görüntü üretimini çizgi (M-LSD), derinlik veya segmentasyonla yönlendirme; oda düzenini korur | Apache-2.0 | 34,1 bin yıldız; 1.1 sürümü ayrı depoda | Faz 4'te kendi GPU'muzda çalıştırma seçeneği. Maliyet, barındırılan görsel API'leriyle karşılaştırılacak |
| huggingface/diffusers | Stable Diffusion ve ControlNet altyapısı | Apache-2.0 | Bu turda sayfası açılmadı | Aynı |
| Barındırılan görsel düzenleme (GPT Image, Gemini Flash Image, FLUX Kontext) | Açık kaynak değil | Ticari API | Görsel başına ≈0,005–0,13 $ ([maliyet raporu](BOYACEP_COST_AND_API_ANALYSIS.md)) | Faz 4'te küçük bir kalite testiyle seçilecek (onaylı) |

## 3. Renk verisi

| Depo | Ne | Lisans | Son sürüm | Karar |
|---|---|---|---|---|
| [meodai/color-names](https://github.com/meodai/color-names) (`color-name-list`) | 30 binden fazla İngilizce renk adı | MIT | 14.80.0, 23.10.2026 | İngilizce renk adları için atıfla (Faz 1, isteğe bağlı) |
| yasminehamaili/color-dataset | Renk adları | – | – | Kullanma: tekrarlı ve hatalı (önceki tur) |
| Marka renk kataloğu | Marka kodları | Üretici izni gerekir | – | Yalnızca izinle ([fikir #21](BOYACEP_30_NEW_IDEAS_SCORECARD.md)) |

## 4. Boya hesaplama

- Paint-Calculator ve benzeri depolar basit; bizim motorumuz (oda, açıklık, emicilik, kat, astar, fire, kutu optimizasyonu, test) daha kapsamlı. **Kullanma** (önceki tur).

## 5. PDF, takvim, proje yönetimi

| Paket | Ne | Lisans | Son sürüm | Karar |
|---|---|---|---|---|
| `expo-print` | HTML'den PDF | MIT | Expo 58 | Kullanılıyor; logolu şablon da bununla |
| [pdfmake](https://github.com/bpampuch/pdfmake) | Kodla PDF | MIT | 0.3.13, 25.10.2026 | Gerek yok; expo-print yetiyor |
| [react-native-calendars](https://github.com/wix/react-native-calendars) | Takvim bileşeni | MIT | 1.1314.0, 29.01.2026 | Usta Paneli takvimi için aday (Faz 3) |
| `expo-calendar` | Telefon takvimine etkinlik | MIT | 58.0.6 | Usta randevusunu telefona ekleme (Faz 3) |
| [twentyhq/twenty](https://github.com/twentyhq/twenty) | Açık kaynak CRM | AGPL-3.0 | Aktif | **Kullanma**: AGPL yükümlülüğü ve ikinci sunucu; Supabase tabloları yeter |

## 6. Harita ve konum

| Paket | Lisans | Son sürüm | Karar |
|---|---|---|---|
| [react-native-maps](https://github.com/react-native-maps/react-native-maps) | MIT | 1.29.11, 27.09.2026 | Şimdilik gerek yok; il/ilçe listesi yeterli ve konum izni istemiyor. Google Maps anahtarı ücretli olabilir |
| `expo-location` | MIT | 58.0.19 | Yalnızca kullanıcı isterse "bulunduğum ili seç" için (isteğe bağlı) |

## 7. Mesajlaşma ve bildirim

| Paket | Lisans | Son sürüm | Karar |
|---|---|---|---|
| `@supabase/realtime-js` | MIT | 2.118.0, 15.10.2026 | Teklife bağlı yazışma (Faz 3); `supabase-js` içinde zaten var |
| [react-native-gifted-chat](https://github.com/FaridSafi/react-native-gifted-chat) | MIT | 3.4.0, 16.06.2026 | Kendi tasarım sistemimize uymazsa kullanılmaz; basit liste yeter |
| `expo-notifications` | MIT | 58.1.6, 21.10.2026 | **Faz 2** |

## 8. Form, depolama, kalite

| Paket | Lisans | Son sürüm | Karar |
|---|---|---|---|
| react-hook-form | MIT | 7.91.0 | Gerek yok: formlar küçük, kendi doğrulamamız motorda |
| zod | MIT | 4.6.7 | Edge Function yanıt şeması için (Faz 4) |
| `expo-secure-store` | MIT | 58.0.2 | **Faz 1**: oturumu şifreli saklama |
| `@sentry/react-native` | MIT | 8.32.0, 22.10.2026 | Faz 1 (onay listesinde: üçüncü taraf veri) |
| `posthog-react-native` | MIT | 4.83.0, 23.10.2026 | Faz 1 (onay listesinde) |
| `react-native-purchases` (RevenueCat) | MIT | 10.15.1, 22.10.2026 | Faz 5 |
| `iyzipay` | MIT | 2.0.71, 22.10.2026 | Faz 5, yalnızca web veya hizmet ödemesi gerekirse |

## 9. Tasarım ve web

| Depo | Karar |
|---|---|
| [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft) (MIT) | Uygulama arayüzü için değil; **tanıtım sitesi** için ücretsiz kısımları (kaydırma motoru, tasarım kuralları, ekran görüntüsü aracı). Ücretli KIE görsel üretimi kullanılmayacak (Hidayet, 26.10.2026) |

## Özet: eklenecekler ve zamanı

| Faz | Eklenecek |
|---|---|
| 1 | `expo-secure-store`; (onayla) Sentry ve PostHog; gerekirse `react-native-fast-opencv` |
| 2 | `expo-notifications` |
| 3 | Supabase Realtime (var), `react-native-calendars`, `expo-calendar` |
| 4 | SAM 3 veya `react-native-executorch` + Depth Anything V2 Small; ControlNet veya barındırılan görsel API (onayla) |
| 5 | `react-native-purchases`; gerekirse `iyzipay` |

## Doğrulanmayanlar

- GitHub API'si bu ortamda kapalı olduğu için yapay zekâ depolarının son kayıt tarihleri bu turda okunamadı. SAM tarihleri önceki turdan.
- ADE20K veri setinin ticari kullanım koşulu okunmadı.
- SAM License'ın tam metni hukuk okuması gerektiriyor.
