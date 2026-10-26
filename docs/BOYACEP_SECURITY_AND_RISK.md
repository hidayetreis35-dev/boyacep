# Güvenlik ve risk

Tarih: 26.10.2026. Risk düzeyi: olasılık × etki, benim değerlendirmem.

## 1. Bugünkü güvenlik durumu (doğrulanmış)

- 32 tablonun hepsinde RLS açık (canlı sorgu, 26.10.2026).
- Ziyaretçi (anon) ham piyasa kayıtlarını, tamamlanan işleri ve proje verisini okuyamıyor. Yönetici fonksiyonlarını çalıştıramıyor.
- Önceki denetimin 4 yüksek riskli açığı kapatıldı ve canlıda (25.10.2026):
  - ustanın gizli telefonu,
  - ustanın kendi teklifini onaylaması,
  - sınırsız davet kodu,
  - ziyaretçiye açık yardımcı fonksiyonlar.
- Veri tabanı testleri her politika için "izin var / izin yok" kontrol ediyor (12 dosya).
- İstemcide yalnızca herkese açık anahtar var. `.env` içinde servis anahtarı yok; bu, Hidayet'in bilgisayarındaki kopyada da kontrol edildi (26.10.2026).
- Fotoğraflar özel klasörde; yol, sahibi ve projeyi içeriyor; boyut ve tür sınırlı.

**Supabase güvenlik danışmanında kalan uyarılar bilinçli:**
- Giriş yapmış kullanıcıya açık `SECURITY DEFINER` fonksiyonlar; içlerinde kendi kontrolleri var.
- Politikasız `invite_redeem_failures` tablosu; yalnızca fonksiyon yazıyor.
- Sızdırılmış şifre koruması kapalı; giriş şifresiz olduğu için gerekmiyor.

## 2. Açık güvenlik işleri

| # | İş | Risk | Faz |
|---|---|---|---|
| 1 | Oturumu telefonda şifreli sakla (`expo-secure-store`) | Orta | 1 |
| 2 | Yedek: Supabase Pro + düzenli yedek indirme | Yüksek (veri kaybı) | 1, onayla |
| 3 | Deneme veri tabanı ve kayıtlı migration akışı | Orta | 1 |
| 4 | KVKK aydınlatma metni, fotoğraf için açık rıza, avukat okuması | Yüksek (hukuki) | Yayından önce |
| 5 | VERBİS kaydı gerekip gerekmediği | Orta (hukuki) | Yayından önce; avukat veya mali müşavir |
| 6 | 25.10.2026'da sohbete yapıştırılan servis anahtarı: eski anahtarların kapatıldığını Supabase panelinde doğrulamak | Yüksek | **Hemen; Hidayet yapar** |
| 7 | Bağımlılık taraması (`npm audit`), haftalık danışman kontrolü | Düşük | Sürekli |
| 8 | Analitik ve hata izlemede kişisel veri göndermemek; rıza ekranı | Orta | 1 |
| 9 | Hız sınırı: giriş, davet kodu, yapay zekâ kapısı | Orta | 1–4 |
| 10 | Yönetici işlemleri için denetim kaydı (`audit_log` var); her yönetici işleminin yazıldığını test etmek | Düşük | 1 |

## 3. Kullanıcı fotoğrafları ve kişisel veri

- Fotoğraf evin içini gösteriyor; adres ve aile bilgisi çıkarılabilir. Varsayılan olarak özel, yalnızca davet edilen ustayla paylaşılıyor.
- Fotoğraflar yapay zekâya gönderilmeden önce kullanıcıya sorulmalı. Hangi servise gittiği yazılmalı, servis eğitim için kullanmamalı (sözleşme koşulu okunacak).
- Konum izni istenmiyor. İl ve ilçe elle seçiliyor.
- Hesap silme ve veri indirme var. Yeni tablolar (bütçe, mesaj, yorum) bu iki işleme eklenmeli. Bunu test eden bir veri tabanı kontrolü yazılmalı.
- Usta belgeleri (kimlik, vergi levhası) ayrı, yalnızca yöneticinin okuyabildiği klasörde. Doğrulama bitince saklama süresi tanımlanmalı.

## 4. Ödeme güvenliği (Faz 5)

- Kart bilgisi hiçbir zaman BoyaCep'te tutulmaz. Mağaza içi satın alma veya lisanslı ödeme kuruluşu (iyzico) kullanılır.
- Hak tanımı yalnızca sunucuda: mağaza bildirimi → Edge Function → `entitlements`. İstemci "Pro oldum" diyemez.
- Ev sahibi ile usta arasındaki iş bedeli platformdan geçmez; emanet ödeme bu yüzden "şimdilik yapılmamalı".

## 5. Yapay zekâ riskleri

| Risk | Önlem |
|---|---|
| Uydurma sayı (litre, fiyat) | Sayılar yalnızca motor araçlarından; şemaya uymayan yanıt reddedilir |
| Yanlış teşhis (nem, çatlak) | "Olası neden" dili; ciddi belirtide her zaman uzmana yönlendirme; yapay zekâ yorumu etiketi |
| Maliyet patlaması | Kullanıcı ve gün başına kota, aylık bütçe tavanı, `ai_usage` kaydı |
| Görsel hayal ürünü (pencere kayması, olmayan mobilya) | Görselin "ilham" olduğu yazılır; ölçü ve maliyet her zaman motordan |
| İstem saldırısı (prompt injection) | Model yalnızca araç çağırır, veri yazamaz; kullanıcının kendi yetkisiyle okur |
| Model lisansı | Ticari olmayan ağırlıklar kullanılmaz (SegFormer, Depth Anything Base/Large) |

## 6. Ticari riskler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Kullanıcı bulamamak (dağıtım) | Yüksek | Yüksek | Arama trafiği (fiyat ve hesap sayfaları), içerik kanalı, bayi QR; Faz 1'de 10+3 kişilik beta ile ölçüm |
| Usta tarafının boş kalması | Yüksek | Yüksek | Pazar yerini Faz 3'e kadar açmamak; önce ücretsiz teklif aracıyla ustayı içeri almak |
| Ödeme isteğinin düşük olması | Orta | Yüksek | Temel ücretsiz; tek seferlik düşük fiyat; görüşmelerle test |
| Büyük rakibin kopyalaması (Armut, Koçtaş) | Orta | Orta | Kanıtlı fiyat ve Ev Hafızası gibi veri birikimine dayalı farklar |
| Armut verisinin hukuki riski | Orta | Orta | İlan kopyalanmıyor, yalnızca kendi yuvarlanmış istatistiğimiz; Hidayet riski kabul etti; iş birliği e-postası hazır (gönderilmedi) |
| Katsayıların yanlış çıkması | Orta | Yüksek | Faz 1'in ilk işi: usta doğrulaması ve 20 gerçek oda |
| Kapsamın dağılması ("her şeyi yapan uygulama") | Yüksek | Yüksek | Fazlar arası geçiş kriteri; "şimdilik yapılmamalı" listesi |
| Tek kişiye bağımlılık | Yüksek | Orta | Her şey depoda ve raporlarda; testler davranışı belgeliyor |

## 7. Teknik riskler

| Risk | Önlem |
|---|---|
| Ücretsiz Supabase'in durması veya veri kaybı | Pro + yedek (onay listesinde) |
| Canlıya hatalı migration | Deneme projesi; geri alınabilir, `DROP` içermeyen migration'lar |
| Expo SDK yükseltmeleri | Yılda 1–2 kez, testlerle |
| Web'de Skia boyutu | Renk Stüdyosu ayrı parça olarak, açılınca iniyor |
| Emülatör yok | APK + yazılı kontrol listesi; web'de telefon boyutu testleri |
| Bildirim ve e-posta teslimi | SMTP ve Expo push; teslim edilmeyenler kayda geçer |

## 8. Onay listesi (güvenlik ve risk)

- Supabase Pro ve yedek.
- SMTP sağlayıcısı.
- Sentry ve PostHog (üçüncü taraf veri işleme).
- KVKK metni için avukat.
- Eski Supabase anahtarlarının kapatıldığının panelden doğrulanması (Hidayet).
