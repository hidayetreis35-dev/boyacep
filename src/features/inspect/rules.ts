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
    label: 'Geniş çatlak',
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
    label: 'Nem lekesi',
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
    label: 'Küf',
    hint: 'Siyah ya da yeşil noktalar; çoğunlukla banyo, mutfak ve pencere çevresinde',
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
    label: 'Kabarma',
    hint: 'Boya balon gibi şişmiş, duvardan ayrılmış',
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
    label: 'Dökülme',
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
    label: 'İnce çatlak',
    hint: 'Saç teli inceliğinde, yüzeysel çatlaklar',
    severity: 'diy',
    cause: 'Sıvanın kururken çekmesi ya da eski boyanın yaşlanması. Genelde yapısal değildir.',
    steps: [
      'Çatlağı spatula ucuyla hafifçe aç ve tozunu al.',
      'Macunla doldur, kuruyunca zımparala.',
      'Macunlu yerlere astar sür, sonra tüm duvarı boya.',
    ],
    callExpertIf: 'Çatlak genişliyorsa ya da kapanıp tekrar açılıyorsa "Geniş çatlak" sonucuna bak.',
    guideSlug: 'macun-ve-zimpara',
  },
  {
    id: 'surface_damage',
    label: 'Yüzey bozukluğu',
    hint: 'Delik, göçük, pürüz ya da eski dübel ve çivi yerleri',
    severity: 'diy',
    cause: 'Zamanla oluşan darbeler, sökülen raf ve tablolar ya da düzgün yapılmamış eski tamirler.',
    steps: [
      'Gevşek parçaları ve çıkıntıları spatula ile temizle.',
      'Delik ve göçükleri macunla doldur; derin yerleri iki seferde doldur.',
      'Kuruyunca zımparala, elinle yokladığında düz olmalı; tozunu al.',
      'Macunlu yerlere astar sür, sonra tüm duvarı boya.',
    ],
    guideSlug: 'macun-ve-zimpara',
  },
  {
    id: 'patchy',
    label: 'Rulo ya da fırça izi',
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
    label: 'Tozlanma',
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

/** Where the wall is; adds a tip and decides on mould-resistant paint. */
export type Place = 'room' | 'wet' | 'exterior';

export const PLACES: { value: Place; label: string; hint: string }[] = [
  { value: 'room', label: 'Oda ya da salon', hint: 'Yatak odası, salon, koridor' },
  { value: 'wet', label: 'Banyo ya da mutfak', hint: 'Buharlı ve nemli alanlar' },
  { value: 'exterior', label: 'Dış cephe', hint: 'Balkon, bahçe duvarı, bina dışı' },
];

type Task = 'expert' | 'water' | 'dry' | 'protect' | 'mould' | 'salt' | 'wash' | 'clean' | 'scrape' | 'fill' | 'sand' | 'primer' | 'paint';
type Primer = 'stain' | 'salt' | 'binding' | 'patch';

/** The work each finding adds to the plan. Order comes from TASK_ORDER, not from here. */
const WORK: Record<string, { tasks: Task[]; primer?: Primer }> = {
  wide_crack: { tasks: ['expert'] },
  damp_stain: { tasks: ['water', 'dry', 'primer'], primer: 'stain' },
  mould: { tasks: ['mould', 'dry'] },
  blistering: { tasks: ['scrape', 'sand', 'primer'], primer: 'patch' },
  efflorescence: { tasks: ['water', 'salt', 'primer'], primer: 'salt' },
  peeling: { tasks: ['scrape', 'sand', 'primer'], primer: 'patch' },
  hairline_crack: { tasks: ['fill', 'sand', 'primer'], primer: 'patch' },
  surface_damage: { tasks: ['scrape', 'fill', 'sand', 'primer'], primer: 'patch' },
  patchy: { tasks: ['primer'], primer: 'patch' },
  chalking: { tasks: ['wash', 'primer'], primer: 'binding' },
};

const TASK_ORDER: Task[] = ['expert', 'water', 'dry', 'protect', 'mould', 'salt', 'wash', 'clean', 'scrape', 'fill', 'sand', 'primer', 'paint'];

const TASK_TEXT: Record<Exclude<Task, 'primer' | 'paint'>, string> = {
  expert: 'Çatlağı boyamadan önce bir inşaat mühendisine ya da deneyimli bir ustaya göster.',
  water: 'Nemin ya da suyun nereden geldiğini bul ve onarılmasını sağla.',
  dry: 'Duvarın tamamen kurumasını bekle; bu birkaç hafta sürebilir.',
  protect: 'Eşyaları ve zemini ört, kenarlara maskeleme bandı yapıştır.',
  mould: 'Eldiven ve maske tak, küfü küf temizleyiciyle temizle; kuru fırçalama.',
  salt: 'Beyaz tuzu sert, kuru bir fırçayla al; suyla silme.',
  wash: 'Tozlanan yüzeyi fırçala ya da yıka, kurumasını bekle.',
  clean: 'Duvarın tozunu al, yağlı ve kirli lekeleri sil.',
  scrape: 'Kabaran ve gevşeyen boyayı spatulayla kazı.',
  fill: 'Çatlak, delik ve göçükleri macunla doldur.',
  sand: 'Kuruyunca zımparala ve tozunu al.',
};

const PRIMER_TEXT: Record<Primer, string> = {
  stain: 'leke örtücü (izolasyon) astar',
  salt: 'tuzlanmaya dayanıklı astar',
  binding: 'tozlanan yüzeyi bağlayan astar',
  patch: 'kazınan ve macunlanan yerlere astar',
};

const PRIMER_PRODUCT: Record<Primer, string> = {
  stain: 'Leke örtücü astar',
  salt: 'Tuzlanma astarı',
  binding: 'Bağlayıcı astar',
  patch: 'Astar',
};

const MATERIALS: Partial<Record<Task, string[]>> = {
  protect: ['Örtü naylonu', 'Maskeleme bandı'],
  mould: ['Küf temizleyici', 'Eldiven ve maske'],
  salt: ['Sert fırça'],
  scrape: ['Spatula'],
  fill: ['Macun'],
  sand: ['Zımpara kâğıdı'],
  paint: ['Rulo ve fırça'],
};

export type PlanStep = { key: Task; text: string };

/**
 * One ordered work plan for everything the user marked, so steps shared by
 * several findings (scraping, primer…) appear once and in the right order.
 */
export function workPlan(selected: string[], place: Place): { steps: PlanStep[]; materials: string[]; blocked: boolean } {
  const { symptoms } = assess(selected);
  const tasks = new Set<Task>(['protect', 'paint']);
  const primers = new Set<Primer>();
  for (const s of symptoms) {
    const work = WORK[s.id];
    if (!work) continue;
    work.tasks.forEach((t) => tasks.add(t));
    if (work.primer) primers.add(work.primer);
  }
  if (symptoms.length === 0) tasks.add('clean');
  const antiMould = selected.includes('mould') || place === 'wet';

  const steps: PlanStep[] = TASK_ORDER.filter((t) => tasks.has(t)).map((key) => {
    if (key === 'primer') return { key, text: `Astar sür: ${[...primers].map((p) => PRIMER_TEXT[p]).join(', ')}.` };
    if (key === 'paint') {
      const paint = place === 'exterior' ? 'dış cephe boyası' : antiMould ? 'küfe dayanıklı, silinebilir boya' : 'iç cephe boyası';
      return { key, text: `Astar kuruyunca iki kat ${paint} uygula; her katı ara vermeden, ıslak kenarı koruyarak sür.` };
    }
    return { key, text: TASK_TEXT[key] };
  });
  const materials = [
    ...steps.flatMap((s) => MATERIALS[s.key] ?? []),
    ...[...primers].map((p) => PRIMER_PRODUCT[p]),
  ];
  return { steps, materials: [...new Set(materials)], blocked: tasks.has('expert') || tasks.has('water') };
}
