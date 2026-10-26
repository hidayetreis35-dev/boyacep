# Dil ve küreselleşme denetimi

Tarih: 25.10.2026. Kapsam: Türkçe/İngilizce arayüz, ülke ve para birimi, yeni fiyat ekranları.

## Bugünkü durum

| Konu | Durum | Kanıt |
|---|---|---|
| Varsayılan dil | Türkçe | `src/i18n/index.ts` |
| İngilizce | Bütün arayüz metinleri çevrili: `en.ts` içinde 1.390 kayıt | `src/i18n/__tests__/i18n.test.ts`: sarılmamış Türkçe metin ya da eksik çeviri varsa test kırılır |
| Yeni fiyat ekranları | 116 yeni metin, hepsi `t()`/`msg()` içinde ve İngilizcesi var | Aynı test + `english.test.tsx` içinde `/prices` ve `/prices?pick=1` |
| Dil değişince veri | Silinmiyor. Şehir seçimi, rol ve projeler korunuyor | `prices.test.tsx`: "keeps the city when the language changes" |
| Sayı biçimi | Dile göre: 1.234,5 (TR) / 1,234.5 (EN) | `src/lib/number.ts` |
| Para birimi | Türkiye fiyatları her dilde ₺: "12.500 ₺" / "₺12,500" | `formatLira`, `formatMoney` |
| Ölçü birimi | Metrik (m², L, kg) her dilde | – |
| Yer adları | Özel isim: çevrilmeden gösterilir (İzmir, Muğla). İngilizce cümlelerin içinde (ör. "Choose Izmir") İngilizce yazım "Izmir" kullanılır, çünkü çeviri metninde Türkçe harf olmaması kuralı var | `provinces.ts` veri dosyası; İngilizce testi yer adlarını Türkçe harf kontrolünden muaf tutar |
| Rehber yazıları | Yalnızca Türkçe; İngilizce kullanıcıya bu açıkça söyleniyor | `guide/index.tsx` |
| Ustaya Sor | Ustalar yalnızca Türkiye'de ve Türkçe; İngilizce kullanıcıya söyleniyor | `ask/index.tsx` |

## Dil ve ülke ayrımı

- Dil bir kullanıcı ayarı (`boyacep.locale.v1`). Ülke bugün sabit: Türkiye.
- Fiyat verisi ülkeye bağlı, dile bağlı değil. İngilizce seçen bir kullanıcı Türkiye fiyatlarını ₺ ve m² ile görür; dolar ya da avroya çevrilmez.
- Yabancı ülke fiyatı uydurulmaz. Başka ülke eklenene kadar fiyat ekranı yalnızca Türkiye illerini listeler.

## Eksikler

1. Ayrı bir "ülke" ayarı henüz yok; tek ülke olduğu için gerek olmadı. İkinci ülke eklenirken: ülke seçimi (dilden bağımsız), ülkeye göre bölge listesi, para birimi ve kaynak kataloğu.
2. Veri tabanındaki `service_categories.label` yalnızca Türkçe; uygulama bu etiketi okumaya başlarsa çevirisi `en.ts`'ten verilmeli.
3. Teklif PDF'i dili izliyor, ama para birimi her zaman ₺ (teklif tablosunda `currency` alanı var, ekranda kullanılmıyor).
4. Rehber yazılarının İngilizce sürümleri yok.

## Küresel genişleme için sıradaki adımlar

- İngilizce sürüm hazır; ilk yabancı pazar seçilmeden ülke verisi toplanmayacak.
- Seçilecek ülkede aynı yöntem: herkese açık, izin verilen kaynaklar, kaynak ve tarihle, kalite düzeyiyle.
