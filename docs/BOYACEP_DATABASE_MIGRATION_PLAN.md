# Veri tabanı geçiş planı: piyasa fiyatları

Dosya: `supabase/migrations/20261025320000_market_prices.sql`. Testler: `supabase/tests/97_market_prices.test.sql` (yerel PostgreSQL 16'da, diğer bütün veri tabanı testleriyle birlikte geçti).

**Durum: 26.10.2026'da Hidayet'in onayıyla canlı veri tabanına uygulandı.** Kontrol: 81 il, 47 ilçe, 9 kategori yüklü; 8 tablonun hepsinde RLS açık; ziyaretçi ham kayıtları ve tamamlanan işleri okuyamıyor, yalnızca istatistiği okuyabiliyor; yönetici fonksiyonlarını ziyaretçi çalıştıramıyor. Güvenlik uyarılarında yeni bulgu yalnızca beklenen türden: giriş yapmış kullanıcının çağırabildiği SECURITY DEFINER fonksiyonlar (hepsi içeride yönetici ya da sahiplik kontrolü yapıyor).

## Ne ekliyor

| Tablo | Kim okur | Kim yazar | Amaç |
|---|---|---|---|
| `provinces` | herkes | – | 81 il (plaka kodu, ad) |
| `districts` | herkes | – | Pilot illerin ilçeleri (İzmir 30, Manisa 17) |
| `service_categories` | herkes | – | İç duvar, tek oda, tavan, astar, alçı/macun/zımpara, tamir, dış cephe, kapı/ahşap, dekoratif |
| `market_price_sources` | herkes | yönetici | Kaynak adı, adresi, türü, kullanım koşulu notu |
| `price_research_runs` | yönetici | yönetici | Hangi gün, hangi araştırma |
| `market_price_records` | yalnızca yönetici | yönetici | Ham kayıtlar. Tekrar engeli (`dedupe_key`), durum: aktif / uç değer / tekrar / eski / reddedildi / inceleme bekliyor. Silinmez, işaretlenir |
| `market_price_statistics` | herkes | yönetici | BoyaCep'in kendi istatistiği. Kalite kuralları kısıt olarak tabloda: sınırlı veride ortanca, orta veride ortalama, yetersiz veride aralık yazılamaz. Tarihli satırlar geçmişi oluşturur |
| `completed_jobs` | işin ustası ve ev sahibi | usta (kabul edilmiş tekliften), ev sahibi onaylar | Gerçek iş fiyatı. İstatistiğe yalnızca iki taraf da onaylayıp paylaşmaya izin verdiyse ve grupta en az 5 iş varsa girer |

Fonksiyonlar (yalnızca yönetici): `market_data_quality()` il il kayıt, durum ve tazelik raporu; `mark_stale_market_records(gün)` eski kayıtları işaretler; `verified_job_summary()` en az 5 işlik grupların m² ortancası. Ev sahibi için: `confirm_completed_job(iş, paylaş)`.

Örnek listede geçen `project_estimates` ve `contractor_quotes` için yeni tablo açılmadı: mevcut `calculations` (proje hesapları) ve `quotes` (usta teklifleri) aynı işi görüyor.

## Gizlilik ve güvenlik

- Ham üçüncü taraf kayıtları herkese kapalı (anon ve normal kullanıcı "izin yok" alır; testli).
- Tamamlanan işler: başka ustalar göremez; yönetici tek tek işleri göremez, yalnızca 5+ işlik özetleri görür.
- Usta, ev sahibi adına onay veremez ya da paylaşım izni veremez (tetikleyici ve kolon izinleriyle; testli).
- Onaylanmış iş değiştirilemez; usta paylaşım iznini her zaman geri çekebilir.

## Riskler

| Risk | Değerlendirme |
|---|---|
| Mevcut veriye etki | Yok. Yalnızca yeni tablo ve fonksiyon ekliyor; mevcut tablo ya da satır değişmiyor |
| Geri alma | Kolay: yeni tablolar boşken `drop table` ile kaldırılabilir. İçine kayıt girildikten sonra geri almak veri kaybı demektir |
| Ücretsiz plan sınırı | Tohum verisi küçük (81 il + 47 ilçe + 9 kategori); boyut sorunu yok |
| Ev sahibi hesabını silerse | Projesi silinir, teklifin proje bağı boşalır; tamamlanan iş ustanın kaydı olarak kalır (ev sahibinin adı yok, yalnızca il/ilçe/fiyat). Bunun hesap silme metninde açıklanması gerekiyor |
| Veri dışa aktarma | `export_my_data_v2` henüz tamamlanan işleri içermiyor; uygulama bu tabloyu kullanmaya başlamadan önce eklenmeli |
| Tip dosyası | `src/lib/database.types.ts` güncellenmedi; uygulama bu tabloları henüz okumuyor |

## Uygulama adımları (yapıldı, 4. adım hariç)

1. Yerel testler: `npm run test:db`.
2. Supabase'de `apply_migration` ile `20261025320000_market_prices` uygula.
3. Güvenlik uyarılarını (`get_advisors`) kontrol et.
4. Kaynak kataloğunu `market_price_sources`'a ekle (yalnızca ad, adres, tür; ham kayıt değil).
5. Hidayet'in telefonda bir şey değişmediğini görmesi: uygulama bu tabloları henüz okumadığı için ekranlar aynı kalır.
