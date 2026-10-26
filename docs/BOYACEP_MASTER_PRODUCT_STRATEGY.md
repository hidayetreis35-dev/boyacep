# BoyaCep ana ürün stratejisi

Tarih: 26.10.2026. Faz 0 çıktısı; bu fazda kod değiştirilmedi. Bu belge diğer 11 raporun özeti ve kararlarıdır.

## Yönetici özeti

### 1. BoyaCep tam olarak nasıl bir ürün olmalı?

**Evini yenileyen kişinin, işe hazırlıklı ve kandırılmadan başlamasını sağlayan proje asistanı.**
- Ev sahibi ölçer ve hesaplar, rengini dener, bütçesini görür, şehrindeki makul fiyatı bilir.
- Ustaya eksiksiz bir dosya gönderir, teklifleri karşılaştırır, işi kontrol ederek bitirir.
- Ev neyle boyandıysa kayıtta kalır.

Başlangıç noktası boya. Büyüme yolu boyaya komşu yüzey işleri, sonra bütün yenileme projesi. Genel bir "her hizmet" rehberi değil.

**Konumlandırma cümlesi:** "BoyaCep: Evini yenilemeden önce ne kadar, ne kadara, kiminle sorularının kanıtlı cevabı."

### 2. En güçlü 10 özelliğimiz

| # | Özellik | Bugün |
|---|---|---|
| 1 | Doğrulanmış boya ve malzeme hesabı (tek oda, tüm ev) | Var; usta doğrulaması Faz 1'de |
| 2 | Şehre göre kaynaklı usta fiyatı | Var (12 il araştırıldı, 81 il listede) |
| 3 | Fotoğrafta gerçekçi duvar boyama | Var |
| 4 | Keşif Dosyası: ustaya eve gelmeden teklif verdiren dosya | v1 var, v2 Faz 1'de |
| 5 | Teklif karşılaştırma (piyasa aralığıyla) | Faz 2 |
| 6 | Akıllı Bütçe: planlanan ve gerçekleşen | Faz 1 |
| 7 | WhatsApp teklif + uygulamasız web onayı | Faz 2 |
| 8 | Ev Hafızası: hangi duvara hangi boya | Faz 1 |
| 9 | Usta İşletme Paneli (Usta Pro) | Faz 3 |
| 10 | Ustalardan Teklif İste (adil, iadeli) | Faz 3 |

### 3. Şimdilik bırakılacaklar

- 16 kategorili genel ev hizmetleri pazar yeri. Armut ve Ustabilir zaten var.
- Emanet ödeme ve işten komisyon.
- İkinci el ve kalan malzeme pazarı.
- Canlı kamerada boyama (AR).
- Ev envanteri ve garanti belgeleri (Faz 6'ya).
- Yalnızca görsel üreten yapay zekâ tasarımı. Faz 4'te ölçü ve maliyete bağlı olarak gelecek.

### 4. Rakiplerden nasıl farklılaşacağız?

- **Kanıt:** her sayının kaynağı, tarihi ve güvenilirliği ekranda. Hiçbir Türk rakip şehir bazlı, kaynaklı fiyat göstermiyor.
- **Hazırlık:** usta, eve gelmeden teklif verebileceği dosyayı alıyor. Armut'ta talep ölçüsüz geliyor.
- **Adalet:** usta kazanamadığı iş için ödemiyor. Armut ve Thumbtack modelinin en büyük şikâyeti bu.
- **Bağımsızlık:** marka uygulamaları tek markayı satıyor; BoyaCep tarafsız.
- **Uygulanabilirlik:** yapay zekâ tasarım uygulamaları güzel ama yapılamaz görsel veriyor; BoyaCep'te görselin altında ölçü, malzeme ve bütçe var.
- **Hafıza:** proje bittiğinde kayıt kalıyor.

### 5. Para kazanma modelimiz

- **Ücretsiz:** temel ürün her zaman ücretsiz.
- **Ev sahibi:** tek seferlik Premium, 149–249 ₺ (test edilecek). İçinde sınırsız proje, teklif karşılaştırma, bütçe, Ev Hafızası; Faz 4'ten sonra sayılı yapay zekâ.
- **Usta:** aylık Usta Pro, 149–299 ₺. İçinde işletme paneli, logolu PDF, talep hakkı.
- **Sonra:** iadeli nitelikli talep ücreti, etiketli mağaza ortaklığı, yapay zekâ kredi paketi.
- **Yok:** teklif başına koşulsuz ücret, ücretli sıralama, veri satışı.

Ayrıntı: [BOYACEP_BUSINESS_MODEL.md](BOYACEP_BUSINESS_MODEL.md).

### 6. İlk olarak hangi özellikler?

Faz 1, sırasıyla:
1. katsayı doğrulaması,
2. proje merkezli akış,
3. Akıllı Bütçe,
4. alışveriş listesi,
5. malzeme önericisi,
6. Keşif Dosyası v2,
7. Ev Hafızası,
8. taşınma modu,
9. Renk Stüdyosu iyileştirmesi,
10. 30 rehber yazısı,
11. ana ekran,
12. oturum güvenliği,
13. masaüstü web ve tanıtım sayfası,
14. CI'da uçtan uca testler,
15. analitik hazırlığı,
16. beta hazırlığı.

### 7. Faz 1 ne kadar iş?

- Yaklaşık 26–31 iş günü; takvimde 6–8 hafta (tahmin).
- Geliştirme maliyeti 0 $.
- Dış testçiden önce önerilen giderler (onay listesinde): Supabase Pro 25 $/ay, SMTP (ücretsiz katman olabilir), Google Play 25 $ bir kerelik.

Ayrıntı: [BOYACEP_PHASED_ROADMAP.md](BOYACEP_PHASED_ROADMAP.md).

### 8. En büyük riskler

| Tür | Risk |
|---|---|
| Ticari | Kullanıcıya ulaşmak (dağıtım) |
| Ticari | Usta tarafının boş kalması |
| Ticari | Ödeme isteğinin düşük olması |
| Ticari | Kapsamın dağılması |
| Teknik | Hesap katsayılarının yanlış çıkması |
| Teknik | Yedeksiz ücretsiz veri tabanı |
| Teknik | Dış kullanıcıya e-posta gitmemesi |
| Teknik | Yapay zekâ maliyeti ve uydurma |
| Hukuki | KVKK metinleri |
| Hukuki | Armut verisi (risk kabul edildi) |

Ayrıntı: [BOYACEP_SECURITY_AND_RISK.md](BOYACEP_SECURITY_AND_RISK.md).

## Ürün alanlarının değerlendirmesi

Puanlar 1–10, benim değerlendirmem.

| Alan | Kullanıcı ihtiyacı | Ticari potansiyel | Teknik zorluk | Geliştirme maliyeti | Mevcut projeye uyum | Karar |
|---|---|---|---|---|---|---|
| A. Boya ve dekorasyon merkezi | 9 | 7 | Düşük–orta (temeli var) | Düşük | 10 | **Çekirdek; Faz 1** |
| B. Akıllı bütçe ve proje yönetimi | 8 | 6 | Düşük | Düşük | 9 | **Faz 1–2** |
| C. Tüm ev hizmetleri | 7 | 9 | Yüksek (operasyon) | Yüksek | 4 | **Yalnızca yüzey işleri (Faz 2); diğerleri talep verisine göre (Faz 6)** |
| D. Usta pazar yeri ve Usta Pro | 8 | 9 | Orta–yüksek | Orta | 8 | **Faz 3**; teklif aracı bugün ücretsiz |
| E. Yapay zekâ ev tasarımı | 7 | 7 | Orta | Kullanım başına | 7 | **Faz 4**; ölçü ve maliyete bağlı |
| F. Ev envanteri ve bakım | 5 | 5 | Düşük | Düşük | 5 | **Faz 6**; Ev Hafızası ile küçük başlangıç Faz 1'de |
| G. İkinci el ve geri dönüşüm | 4 | 4 | Orta | Yüksek (moderasyon) | 3 | **Şimdilik yok** |

## Strateji ilkeleri

1. **Dar başla, derin git.**
   - Önce Manisa ve İzmir'de boya.
   - Bir ilde kullanıcı ve usta yoğunluğu olmadan başka ile ve kategoriye yayılma.
2. **Önce ev sahibi, sonra usta.**
   - Ev sahibi ürünü tek başına değerli: hesap, fiyat, renk, bütçe.
   - Usta tarafı talep geldikçe açılır.
3. **Sayıyı motor üretir.** Yapay zekâ yorumlar, motoru çağırır, asla sayı uydurmaz.
4. **Dürüst ürün.** Yapılmamış özellik "Yakında"; tahmin "tahmin"; yetersiz veri "yetersiz".
5. **Her faz ölçülerek geçilir.** Geçiş ölçütleri: [BOYACEP_SUCCESS_METRICS.md](BOYACEP_SUCCESS_METRICS.md).
6. **Para ve geri alınamaz adım onayla.** Onay listesi Hidayet döndüğünde tek seferde sorulur.

## Raporlar

| Rapor | Konu |
|---|---|
| [BOYACEP_CURRENT_PROJECT_AUDIT.md](BOYACEP_CURRENT_PROJECT_AUDIT.md) | Mevcut kod, ekranlar, veri tabanı, testler, açık sorunlar |
| [BOYACEP_30_NEW_IDEAS_SCORECARD.md](BOYACEP_30_NEW_IDEAS_SCORECARD.md) | 36 fikir, 8 kriter, kategoriler, en iyi 10 |
| [BOYACEP_COMPETITOR_ANALYSIS.md](BOYACEP_COMPETITOR_ANALYSIS.md) | Türkiye ve dünya rakipleri, boşluklar |
| [BOYACEP_TARGET_AUDIENCE.md](BOYACEP_TARGET_AUDIENCE.md) | Pazar büyüklüğü, kullanıcı grupları, kanallar |
| [BOYACEP_BUSINESS_MODEL.md](BOYACEP_BUSINESS_MODEL.md) | Gelir modelleri, paketler, mağaza kuralları |
| [BOYACEP_TECHNICAL_ARCHITECTURE.md](BOYACEP_TECHNICAL_ARCHITECTURE.md) | Mimari, yeni parçalar, veri modeli |
| [BOYACEP_GITHUB_RESEARCH.md](BOYACEP_GITHUB_RESEARCH.md) | Açık kaynak depolar, lisans, karar |
| [BOYACEP_PHASED_ROADMAP.md](BOYACEP_PHASED_ROADMAP.md) | Faz 0–6, Faz 1 iş listesi |
| [BOYACEP_SECURITY_AND_RISK.md](BOYACEP_SECURITY_AND_RISK.md) | Güvenlik, KVKK, yapay zekâ ve ticari riskler |
| [BOYACEP_COST_AND_API_ANALYSIS.md](BOYACEP_COST_AND_API_ANALYSIS.md) | Altyapı ve API maliyetleri, kullanıcı başına maliyet |
| [BOYACEP_SUCCESS_METRICS.md](BOYACEP_SUCCESS_METRICS.md) | Ana ölçüt, huni, geçiş ölçütleri |

## Gerçek veri ile varsayımın ayrımı

**Gerçek veri** (kaynaklı, tarihli):
- TÜİK hane, ev sahipliği ve konut satışı,
- BOSAD sektör büyüklüğü,
- rakip fiyatları ve modelleri,
- Angi finansalları,
- API fiyatları,
- mevcut kod ve veri tabanı ölçümleri.

**Varsayım:**
- bütün fiyat önerileri,
- ödeme isteği,
- dönüşüm oranları,
- süre tahminleri,
- ölçeğe göre maliyet,
- fikir puanları.

Kapalı betadan sonra güncellenecek.
