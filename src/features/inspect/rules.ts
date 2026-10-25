/**
 * "Duvarını İncele" without AI: the user picks what they see, the app explains
 * the likely cause and the safe order of work. General guidance only.
 */

export type Severity = 'diy' | 'careful' | 'expert';

export type Symptom = {
  id: string;
  label: string;
  hint: string;
  severity: Severity;
  cause: string;
  steps: string[];
  /** Situations where the user should stop and call a professional. */
  callExpertIf?: string;
  guideSlug?: string;
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  diy: 'Kendin yapabilirsin',
  careful: 'Dikkatli ol',
  expert: 'Uzmana danış',
};

const SEVERITY_RANK: Record<Severity, number> = { expert: 0, careful: 1, diy: 2 };

export const SYMPTOMS: Symptom[] = [
  {
    id: 'wide_crack',
    label: 'Geniş ya da büyüyen çatlak',
    hint: '2 mm’den geniş, çapraz ya da kapı ve pencere köşelerinden çıkan',
    severity: 'expert',
    cause: 'Binadaki oturma ya da taşıyıcı sistemdeki hareket olabilir. Bu bir boya sorunu değildir.',
    steps: [
      'Bu duvarı boyamadan önce bir inşaat mühendisine ya da deneyimli bir ustaya göster.',
      'Çatlağın fotoğrafını çek, yanına tarih ve cetvelle genişliğini not et.',
      'Birkaç hafta içinde büyüyüp büyümediğini aynı yerden çekilen fotoğraflarla karşılaştır.',
    ],
  },
  {
    id: 'damp_stain',
    label: 'Nem lekesi, sararma',
    hint: 'Kahverengi halka, sarı leke ya da ıslak görünen bölge',
    severity: 'expert',
    cause: 'Tesisat sızıntısı, çatıdan ya da dış cepheden su alma veya zeminden yükselen nem.',
    steps: [
      'Önce suyun nereden geldiğini bul ve onarılmasını sağla. Kaynak çözülmeden boya tutmaz.',
      'Duvarın tamamen kurumasını bekle; bu birkaç hafta sürebilir.',
      'Lekenin geri çıkmaması için leke örtücü (izolasyon) astar sür.',
      'Ardından iki kat son kat boya uygula.',
    ],
    callExpertIf: 'Suyun kaynağını bulamıyorsan ya da leke büyüyorsa tesisatçı veya yalıtım ustası çağır.',
    guideSlug: 'sik-yapilan-boya-hatalari',
  },
  {
    id: 'mould',
    label: 'Küf, siyah noktalar',
    hint: 'Özellikle banyo, mutfak, dolap arkası ve pencere çevresinde',
    severity: 'careful',
    cause: 'Yoğuşma ve yetersiz havalandırma. Soğuk duvarda biriken nem küfü besler.',
    steps: [
      'Eldiven ve maske tak, odayı havalandır.',
      'Küflü yüzeyi küf temizleyici ile temizle; kuru fırçalama yapma, sporları dağıtır.',
      'Duvarın tamamen kurumasını bekle.',
      'Küfe dayanıklı (anti-bakteriyel) boya kullan.',
      'Odayı her gün havalandır; banyoda aspiratör kullan, mobilyaları duvardan biraz uzaklaştır.',
    ],
    callExpertIf: 'Küf bir metrekareden büyükse, sıvanın içine işlemişse ya da evde solunum hastalığı olan biri varsa uzmana danış.',
    guideSlug: 'boya-oncesi-hazirlik',
  },
  {
    id: 'blistering',
    label: 'Kabarma, balonlaşma',
    hint: 'Boya duvardan ayrılıp kabarcık yapmış',
    severity: 'careful',
    cause: 'Genellikle nem ya da boyanın nemli, tozlu veya kirli yüzeye uygulanması. Çok sıcak havada boyamak da kabartabilir.',
    steps: [
      'Kabarcıkları spatula ile kazı, gevşek boyanın hepsini al.',
      'Nemden kaynaklanıyorsa önce nem nedenini çöz.',
      'Yüzey kuruyunca zımparala ve tozunu al.',
      'Açılan yerlere astar sür, sonra boya.',
    ],
    callExpertIf: 'Kabarma aynı yerde tekrar ediyorsa duvarda nem vardır; nem sorununa bakacak bir usta çağır.',
    guideSlug: 'sik-yapilan-boya-hatalari',
  },
  {
    id: 'efflorescence',
    label: 'Beyaz tuzlanma',
    hint: 'Duvar yüzeyinde beyaz, pudra gibi birikinti',
    severity: 'careful',
    cause: 'Duvarın içinden gelen nem, tuzları yüzeye taşır.',
    steps: [
      'Tuzu kuru fırça ile temizle; su ile silme, sorunu büyütür.',
      'Nemin kaynağını bul ve çöz.',
      'Tuzlanmaya dayanıklı astar uygula, ardından boya.',
    ],
    callExpertIf: 'Tuzlanma zemine yakın yerlerde ve geniş alandaysa yükselen nem olabilir; yalıtım ustasına danış.',
    guideSlug: 'astar-ne-zaman-gerekir',
  },
  {
    id: 'peeling',
    label: 'Dökülme, pul pul kalkma',
    hint: 'Boya kat kat ya da pul pul ayrılıyor',
    severity: 'diy',
    cause: 'Astar kullanılmaması, tozlu ya da yağlı yüzey veya yağlı boya üstüne su bazlı boya sürülmesi.',
    steps: [
      'Gevşek boyayı spatula ile kazı.',
      'Kenarları zımparala ki geçiş belli olmasın; tozunu al.',
      'Eski boya yağlı boyaysa uygun bir geçiş astarı kullan.',
      'Astar kuruyunca iki kat boya.',
    ],
    guideSlug: 'astar-ne-zaman-gerekir',
  },
  {
    id: 'hairline_crack',
    label: 'İnce (kılcal) çatlak',
    hint: 'Saç teli inceliğinde, yüzeysel çatlaklar',
    severity: 'diy',
    cause: 'Sıvanın kururken çekmesi ya da eski boyanın yaşlanması. Genelde yapısal değildir.',
    steps: [
      'Çatlağı spatula ucuyla hafifçe aç ve tozunu al.',
      'Macunla doldur, kuruyunca zımparala.',
      'Macunlu yerlere astar sür, sonra tüm duvarı boya.',
    ],
    callExpertIf: 'Çatlak genişliyorsa ya da kapanıp tekrar açılıyorsa "Geniş ya da büyüyen çatlak" seçeneğine bak.',
    guideSlug: 'macun-ve-zimpara',
  },
  {
    id: 'patchy',
    label: 'Alacalı görünüm, rulo izleri',
    hint: 'Duvarda parlak ve mat bölgeler, yamalı görüntü',
    severity: 'diy',
    cause: 'Macunlu yerlere astar sürülmemesi, ince kat boya ya da kurumaya başlamış kenara geri dönülmesi.',
    steps: [
      'Macunlu ve tamir edilmiş yerlere astar sür.',
      'Duvarı bir köşeden diğerine ara vermeden, ıslak kenarı koruyarak boya.',
      'İkinci katı ilk kat tam kuruduktan sonra uygula.',
    ],
    guideSlug: 'duvar-boyama-teknigi',
  },
  {
    id: 'chalking',
    label: 'Tebeşirlenme',
    hint: 'Dokununca eline toz boya bulaşıyor (çoğunlukla dış cephe)',
    severity: 'diy',
    cause: 'Güneş ve hava etkisiyle eskiyen boya yüzeyi tozlaşır.',
    steps: [
      'Yüzeyi fırçala ya da yıka, tamamen kurumasını bekle.',
      'Tozlanan yüzeyi bağlayan bir astar uygula.',
      'Dış cephe için uygun boya ile iki kat boya.',
    ],
    callExpertIf: 'Yüksekte çalışman gerekiyorsa iskele ve güvenlik ekipmanı olan bir ustaya yaptır.',
    guideSlug: 'dis-cephe-boyasi',
  },
];

/** Selected symptoms, most serious first. Unknown ids are ignored. */
export function assess(selected: string[]): { symptoms: Symptom[]; worst: Severity | null } {
  const symptoms = SYMPTOMS.filter((s) => selected.includes(s.id)).sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
  return { symptoms, worst: symptoms[0]?.severity ?? null };
}
