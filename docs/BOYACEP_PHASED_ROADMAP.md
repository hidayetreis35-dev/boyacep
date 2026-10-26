# Fazlara ayrılmış yol haritası

Tarih: 26.10.2026.

**Süre tahminleri:**
- Kodu ben (Claude) yazıyorum, Hidayet her fazın sonunda telefonda deniyor.
- "İş günü" benim geliştirme günüm. Takvim süresi, Hidayet'in deneme turları ve onay beklemeleriyle uzar.
- Hiçbir süre ölçülmedi.

## Kurallar (her faz için)

1. Bir fazın tamamlanma kriterleri karşılanmadan sonraki faza geçilmez.
2. Her faz 14 adımlı düzenle yürür: inceleme, hedef, iş listesi, teknik plan, bağımlılık, dosyalar, veri tabanı planı, güvenlik kontrolü, geliştirme, test, düzeltme, tekrar test, ekran görüntüsü, rapor.
3. Onay gereken adımlar onay listesine yazılır ve atlanır; diğer işler devam eder. Liste Hidayet döndüğünde tek seferde sorulur (Hidayet, 26.10.2026).
4. Hiçbir tablo ve veri silinmez; migration'lar geri alınabilir.

## Faz 0: Mevcut durum ve ürün stratejisi

- **Durum:** tamamlandı (26.10.2026), kod değişmedi.
- **Çıktı:** 12 rapor (bu klasör).

## Faz 1: Güçlü BoyaCep temeli

- **Amaç:** Var olan ürünü gerçek bir ev sahibinin baştan sona güvenle kullanabileceği hale getirmek.
- **Kapsam:** Gereksiz yeni modül açılmayacak.
- **Ölçü:** 10 ev sahibi ve 3 ustayla kapalı beta.

| # | İş | Neden | Değişecek dosyalar (tahmin) | Veri tabanı | Süre |
|---|---|---|---|---|---|
| 1.1 | **Hesap katsayılarının doğrulaması:** ustaya sorulacak kısa form + 20 gerçek oda için "altın örnek" testi | Ürünün temeli | `docs/calculation.md`, `src/engine/__tests__/` | – | 1 gün + Hidayet'in ustaları |
| 1.2 | **Proje merkezli akış:** hesap sonucundan tek dokunuşla "Projeye kaydet"; proje ekranında adım çubuğu (Ölç → Malzeme → Renk → Bütçe → Dosya) | Bugün parçalar dağınık | `src/app/projects/[id]/index.tsx`, `wizard-result.tsx`, `features/projects` | – | 2–3 gün |
| 1.3 | **Akıllı Bütçe v1:** planlanan ve gerçekleşen, harcama ekleme, fiş fotoğrafı, kategori | Ana talimatın B alanı; Faz 1'de istendi | `features/budget/` (yeni), `projects/[id]/cost.tsx` | `project_expenses` + RLS + test; fiş klasörü | 3 gün |
| 1.4 | **Malzeme listesi → alışveriş listesi:** işaretleme, paylaşma (WhatsApp metni) | Kullanıcı markette bunu açar | `features/materials/` | Var olan tabloya alan | 1–2 gün |
| 1.5 | **Malzeme önericisi (kural tabanlı):** yüzey ve soruna göre astar ve boya türü | En sık hata yanlış ürün | `src/engine/recommend.ts` (yeni, testli), Duvarını İncele sonucu | – | 2 gün |
| 1.6 | **Keşif Dosyası v2:** piyasa aralığı, malzeme listesi, renkler, "teklif için eksik bilgi" kontrolü, paylaşım metni | En değerli özellik | `features/survey/` | – | 2 gün |
| 1.7 | **Ev Hafızası v1:** proje bitince renk, ürün ve tarih kaydı; "bu duvarın rengi neydi?" | Bağlılık; rakipte yok | `features/projects/` | `home_log` + RLS + test | 1–2 gün |
| 1.8 | **Taşınma modu:** tüm ev hızlı hesabına "kiracı çıkışı/girişi" seçeneği, öncesi ve sonrası fotoğrafı | Büyük kiracı kitlesi | `paint-wizard.tsx` | – | 1 gün |
| 1.9 | **Renk Stüdyosu:** favoriler hesaba bağlansın; seçim hesabı ana iş parçacığından çıksın | Telefon değişince kayıp; donma | `features/colour/` | Favori tablosu + RLS | 2 gün |
| 1.10 | **Rehber:** 10 → 30 yazı (hazırlık, astar, nem, tavan, dış cephe); çevrimdışı önbellek | İçerik değeri, arama trafiği | `supabase/migrations` (seed), `features/guide` | Yalnızca ekleme | 2 gün |
| 1.11 | **Ana ekran ve navigasyon:** "Devam eden projen" kartı; şehir; ilk açılışta 3 adımlık tanıtım | İlk izlenim | `(tabs)/index.tsx`, `welcome.tsx` | – | 1–2 gün |
| 1.12 | **Hesap güvenliği:** oturum `expo-secure-store` ile; giriş ekranı metinleri; hız sınırı | Güvenlik | `src/lib/supabase.ts` | – | 1 gün |
| 1.13 | **Web:** masaüstünde iki sütun (proje, fiyat, rehber); arama motoruna açık fiyat ve hesap sayfaları; tanıtım sayfası taslağı (scroll-craft, ücretsiz kısımlar) | Web'den gelen kullanıcı | `src/ui/components.tsx` (Screen), yeni `site/` | – | 3–4 gün |
| 1.14 | **Kalite:** CI'da web uçtan uca testleri (Playwright); koyu tema kontrolü; erişilebilirlik etiketleri | Test edilmeyen başarılı sayılmaz | `.github/workflows`, `e2e/` | – | 2 gün |
| 1.15 | **Gözlem:** analitik olay listesi ve rıza ekranı hazır; servis bağlantısı onayla | Başarı ölçütleri ölçülsün | `src/lib/analytics.ts` | – | 1 gün |
| 1.16 | **Beta hazırlığı:** deneme Supabase projesi, telefon kontrol listesi güncellemesi, beta davet metni | Güvenli dağıtım | `docs/` | – | 1 gün |

**Toplam:**
- Yaklaşık 26–31 iş günü.
- Takvimde 6–8 hafta (tahmin; Hidayet'in deneme turları ve ustalarla görüşme dahil).
- Geliştirme maliyeti 0 $.

**Onay listesine gidenler:**
- Supabase Pro (25 $/ay),
- SMTP sağlayıcısı,
- Sentry ve PostHog,
- web sitesini bir adreste yayına almak,
- Google Play hesabı (25 $),
- KVKK için avukat.

**Bağımlılıklar:**
- 1.1 için Hidayet'in 2–3 ustaya ulaşması.
- 1.3, 1.7 ve 1.9 yeni tablolar istiyor. Canlıya uygulama `DROP` içermediği için Supabase aracıyla yapılabilir; yine de canlı veri tabanı değişikliği olduğu için onay listesinde.

**Başarı ölçütü:**
- 10 ev sahibinin en az 7'si bir projeyi baştan sona (hesap → bütçe → dosya) tamamlıyor.
- 3 ustanın en az 2'si keşif dosyasından teklif hazırlıyor.
- Katsayılar en az 2 usta tarafından onaylandı.

**Tamamlanma kriteri:**
- Bütün testler ve CI yeşil.
- Yeni tablolar RLS testli.
- Hidayet'in telefonunda kontrol listesi geçti.
- Faz 1 raporu yazıldı.

## Faz 2: Akıllı ev bütçesi ve yeni hizmetler

- **Amaç:** Boya uygulamasından "ev yenileme planlama" uygulamasına geçiş, ama yalnızca boyaya komşu yüzey işleriyle.

**İşler:**
- Teklif karşılaştırma.
- WhatsApp teklif + web onay sayfası.
- Bildirimler (`expo-notifications`).
- Yeni ev yenileme planı.
- Yüzey işleri kategorileri: alçı, sıva, macun, dekoratif, dış cephe.
- Hizmet talebi oluşturma (dosya + kategori).
- Bölgesel fiyat verisinde ikinci kaynak (pilot illerde "orta" düzey).
- Proje takvimi.
- Fotoğraf ve dosya paylaşımı.

**Bağımlılıklar:** Faz 1 bütçesi ve dosyası; piyasa verisi.

**Süre ve maliyet:**
- 25–35 iş günü.
- Altyapı 25–45 $/ay.

**Başarı ölçütü:**
- Teklif alan projelerin %50'sinde karşılaştırma ekranı açılıyor.
- Bildirim izin oranı %40 üstü.
- Pilot illerde işçilik fiyatı "orta" düzeyde.

**Tamamlanma kriteri:**
- Bildirim telefonda uçtan uca çalışıyor.
- Web onay sayfası güvenlik testli.
- Faz raporu yazıldı.

## Faz 3: Usta pazar yeri ve Usta Pro

- **Amaç:** Ev sahibi ile doğrulanmış usta arasında güvenilir ağ kurmak.

**İşler:**
- Usta doğrulama.
- Usta profili v2 (portfolyo, hizmet alanı).
- Ustalardan Teklif İste (en fazla 3 usta, iadeli ücret kuralı tasarımı).
- Teklife bağlı mesajlaşma (Realtime).
- İş Sonu Kontrol.
- Güven Endeksi ve doğrulanmış yorum.
- Şikâyet ve itiraz akışı.
- Usta İşletme Paneli: müşteri, takvim, gelir-gider, logolu PDF.

**Bağımlılıklar:**
- Faz 2 bildirimleri.
- Pilot ilde en az 20 doğrulanmış usta. Bu bir operasyon işi: Hidayet ve usta görüşmeleri.

**Süre ve maliyet:**
- 35–45 iş günü.
- Moderasyon için insan zamanı gerekiyor.

**Başarı ölçütü:**
- Pilot ilde talep başına ortalama 2+ teklif.
- Ustaların %60'ı talebi "ciddi" buluyor.
- Sahte yorum kontrolü çalışıyor.

**Tamamlanma kriteri:**
- Talep → teklif → kabul → iş sonu → yorum akışı iki gerçek kişiyle çalıştı.
- Bütün RLS testleri geçti.

## Faz 4: Yapay zekâ ve akıllı ev tasarımı

- **Amaç:** Karar desteği. Yapay zekâ yorumlar, sayıları motor üretir.

**İşler:**
- Yapay zekâ kapısı (Edge Function + kota + `ai_usage`).
- Akıllı Renk Danışmanı.
- Otomatik duvar bulma: SAM 3 servisi ya da telefonda model.
- Duvarını İncele için yapay zekâ yorumu.
- Oda stili görseli: kredili, ölçü ve maliyete bağlı.
- Sesli keşif.
- Proje asistanı (motor araçlarıyla).

**Bağımlılıklar:** Faz 1–3 araçları; kalite test seti (50 fotoğraf).

**Süre ve maliyet:**
- 30–40 iş günü.
- Kullanım başına 0,001–0,04 $, aylık tavanla.
- **Ücretli servis; onay şart.**

**Başarı ölçütü:**
- 50 test fotoğrafında duvar seçimi en az %85 doğru.
- Yorumlarda motor dışı sayı sıfır.
- Kullanıcı başına yapay zekâ maliyeti, Premium gelirinin %15'inin altında.

**Tamamlanma kriteri:**
- Kota ve tavan testli.
- Maliyet raporu ölçülmüş verilerle güncellendi.

## Faz 5: Abonelik, ticari büyüme ve ölçeklenme

**İşler:**
- Mağaza içi satın alma: RevenueCat; Premium ve Usta Pro.
- Yapay zekâ kredi paketleri.
- Nitelikli talep ücreti (iadeli).
- Mağaza ve bayi ortaklığı.
- Analitik ile dönüşüm hunisi.
- Elde tutma deneyleri.
- Mağazada yayın: Google Play, sonra App Store.
- Uluslararası hazırlık: ülke ayarı, ilk yabancı pazar araştırması.

**Bağımlılıklar:** şirket ve fatura yapısı, mağaza hesapları, KVKK metinleri.

**Süre ve maliyet:**
- 25–35 iş günü.
- Mağaza payı %15.
- **Ödeme ve yayın; onay şart.**

**Başarı ölçütü:**
- Aktif ev sahiplerinin %2–4'ü Premium'a geçiyor.
- Aktif ustaların %10'u Usta Pro'ya geçiyor.
- Aylık gelir, altyapı ve yapay zekâ maliyetini karşılıyor.

**Tamamlanma kriteri:**
- Satın alma, iade ve hak kaybı akışları test mağaza hesaplarıyla denendi.

## Faz 6: Akıllı ev ekosistemi

- **Koşul:** Faz 5'in gelir ölçütü en az 3 ay üst üste sağlanmadan başlanmaz.

**İşler:**
- Ev envanteri.
- Garanti ve belge yönetimi.
- Bakım takvimi ve hatırlatma.
- Kiraya veren (çoklu ev) modu.
- Apartman ve site dış cephe teklifi.
- Yeni hizmet kategorileri: talep verisine göre, tek tek.
- İkinci el ve geri dönüşüm: yalnızca risk analizi yeniden yapıldıktan sonra.

**Süre:** Fazın başında yeniden planlanacak.

## Özet çizelge

| Faz | Süre (iş günü, tahmin) | Aylık maliyet (tahmin) | Onay gereken |
|---|---|---|---|
| 0 | Tamamlandı | 0 $ | – |
| 1 | 26–31 | 0–25 $ | Supabase Pro, SMTP, analitik, web yayını, Google Play, avukat |
| 2 | 25–35 | 25–45 $ | – |
| 3 | 35–45 | 25–65 $ | Talep ücreti tasarımı |
| 4 | 30–40 | +kullanım (tavanlı) | Yapay zekâ ve GPU servisleri |
| 5 | 25–35 | +mağaza payı | Ödeme, mağaza yayını, şirket ve fatura |
| 6 | Sonra | – | – |
