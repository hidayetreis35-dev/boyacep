import { msg, t } from '@/i18n';

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
  diy: msg('Kendin yapabilirsin'),
  careful: msg('Dikkatli ol'),
  expert: msg('Uzmana danış'),
};

const SEVERITY_RANK: Record<Severity, number> = { expert: 0, careful: 1, diy: 2 };

export const SYMPTOMS: Symptom[] = [
  {
    id: 'wide_crack',
    label: msg('Geniş çatlak'),
    hint: msg('2 mm’den geniş, çapraz ya da kapı ve pencere köşelerinden çıkan'),
    severity: 'expert',
    cause: msg('Binadaki oturma ya da taşıyıcı sistemdeki hareket olabilir. Bu bir boya sorunu değildir.'),
    steps: [
      msg('Bu duvarı boyamadan önce bir inşaat mühendisine ya da deneyimli bir ustaya göster.'),
      msg('Çatlağın fotoğrafını çek, yanına tarih ve cetvelle genişliğini not et.'),
      msg('Birkaç hafta içinde büyüyüp büyümediğini aynı yerden çekilen fotoğraflarla karşılaştır.'),
    ],
  },
  {
    id: 'damp_stain',
    label: msg('Nem lekesi'),
    hint: msg('Kahverengi halka, sarı leke ya da ıslak görünen bölge'),
    severity: 'expert',
    cause: msg('Tesisat sızıntısı, çatıdan ya da dış cepheden su alma veya zeminden yükselen nem.'),
    steps: [
      msg('Önce suyun nereden geldiğini bul ve onarılmasını sağla. Kaynak çözülmeden boya tutmaz.'),
      msg('Duvarın tamamen kurumasını bekle; bu birkaç hafta sürebilir.'),
      msg('Lekenin geri çıkmaması için leke örtücü (izolasyon) astar sür.'),
      msg('Ardından iki kat son kat boya uygula.'),
    ],
    callExpertIf: msg('Suyun kaynağını bulamıyorsan ya da leke büyüyorsa tesisatçı veya yalıtım ustası çağır.'),
    guideSlug: 'sik-yapilan-boya-hatalari',
  },
  {
    id: 'mould',
    label: msg('Küf'),
    hint: msg('Siyah ya da yeşil noktalar; çoğunlukla banyo, mutfak ve pencere çevresinde'),
    severity: 'careful',
    cause: msg('Yoğuşma ve yetersiz havalandırma. Soğuk duvarda biriken nem küfü besler.'),
    steps: [
      msg('Eldiven ve maske tak, odayı havalandır.'),
      msg('Küflü yüzeyi küf temizleyici ile temizle; kuru fırçalama yapma, sporları dağıtır.'),
      msg('Duvarın tamamen kurumasını bekle.'),
      msg('Küfe dayanıklı (anti-bakteriyel) boya kullan.'),
      msg('Odayı her gün havalandır; banyoda aspiratör kullan, mobilyaları duvardan biraz uzaklaştır.'),
    ],
    callExpertIf: msg('Küf bir metrekareden büyükse, sıvanın içine işlemişse ya da evde solunum hastalığı olan biri varsa uzmana danış.'),
    guideSlug: 'boya-oncesi-hazirlik',
  },
  {
    id: 'blistering',
    label: msg('Kabarma'),
    hint: msg('Boya balon gibi şişmiş, duvardan ayrılmış'),
    severity: 'careful',
    cause: msg('Genellikle nem ya da boyanın nemli, tozlu veya kirli yüzeye uygulanması. Çok sıcak havada boyamak da kabartabilir.'),
    steps: [
      msg('Kabarcıkları spatula ile kazı, gevşek boyanın hepsini al.'),
      msg('Nemden kaynaklanıyorsa önce nem nedenini çöz.'),
      msg('Yüzey kuruyunca zımparala ve tozunu al.'),
      msg('Açılan yerlere astar sür, sonra boya.'),
    ],
    callExpertIf: msg('Kabarma aynı yerde tekrar ediyorsa duvarda nem vardır; nem sorununa bakacak bir usta çağır.'),
    guideSlug: 'sik-yapilan-boya-hatalari',
  },
  {
    id: 'efflorescence',
    label: msg('Beyaz tuzlanma'),
    hint: msg('Duvar yüzeyinde beyaz, pudra gibi birikinti'),
    severity: 'careful',
    cause: msg('Duvarın içinden gelen nem, tuzları yüzeye taşır.'),
    steps: [
      msg('Tuzu kuru fırça ile temizle; su ile silme, sorunu büyütür.'),
      msg('Nemin kaynağını bul ve çöz.'),
      msg('Tuzlanmaya dayanıklı astar uygula, ardından boya.'),
    ],
    callExpertIf: msg('Tuzlanma zemine yakın yerlerde ve geniş alandaysa yükselen nem olabilir; yalıtım ustasına danış.'),
    guideSlug: 'astar-ne-zaman-gerekir',
  },
  {
    id: 'peeling',
    label: msg('Dökülme'),
    hint: msg('Boya kat kat ya da pul pul ayrılıyor'),
    severity: 'diy',
    cause: msg('Astar kullanılmaması, tozlu ya da yağlı yüzey veya yağlı boya üstüne su bazlı boya sürülmesi.'),
    steps: [
      msg('Gevşek boyayı spatula ile kazı.'),
      msg('Kenarları zımparala ki geçiş belli olmasın; tozunu al.'),
      msg('Eski boya yağlı boyaysa uygun bir geçiş astarı kullan.'),
      msg('Astar kuruyunca iki kat boya.'),
    ],
    guideSlug: 'astar-ne-zaman-gerekir',
  },
  {
    id: 'hairline_crack',
    label: msg('İnce çatlak'),
    hint: msg('Saç teli inceliğinde, yüzeysel çatlaklar'),
    severity: 'diy',
    cause: msg('Sıvanın kururken çekmesi ya da eski boyanın yaşlanması. Genelde yapısal değildir.'),
    steps: [
      msg('Çatlağı spatula ucuyla hafifçe aç ve tozunu al.'),
      msg('Macunla doldur, kuruyunca zımparala.'),
      msg('Macunlu yerlere astar sür, sonra tüm duvarı boya.'),
    ],
    callExpertIf: msg('Çatlak genişliyorsa ya da kapanıp tekrar açılıyorsa "Geniş çatlak" sonucuna bak.'),
    guideSlug: 'macun-ve-zimpara',
  },
  {
    id: 'surface_damage',
    label: msg('Yüzey bozukluğu'),
    hint: msg('Delik, göçük, pürüz ya da eski dübel ve çivi yerleri'),
    severity: 'diy',
    cause: msg('Zamanla oluşan darbeler, sökülen raf ve tablolar ya da düzgün yapılmamış eski tamirler.'),
    steps: [
      msg('Gevşek parçaları ve çıkıntıları spatula ile temizle.'),
      msg('Delik ve göçükleri macunla doldur; derin yerleri iki seferde doldur.'),
      msg('Kuruyunca zımparala, elinle yokladığında düz olmalı; tozunu al.'),
      msg('Macunlu yerlere astar sür, sonra tüm duvarı boya.'),
    ],
    guideSlug: 'macun-ve-zimpara',
  },
  {
    id: 'patchy',
    label: msg('Rulo ya da fırça izi'),
    hint: msg('Duvarda parlak ve mat bölgeler, yamalı görüntü'),
    severity: 'diy',
    cause: msg('Macunlu yerlere astar sürülmemesi, ince kat boya ya da kurumaya başlamış kenara geri dönülmesi.'),
    steps: [
      msg('Macunlu ve tamir edilmiş yerlere astar sür.'),
      msg('Duvarı bir köşeden diğerine ara vermeden, ıslak kenarı koruyarak boya.'),
      msg('İkinci katı ilk kat tam kuruduktan sonra uygula.'),
    ],
    guideSlug: 'duvar-boyama-teknigi',
  },
  {
    id: 'chalking',
    label: msg('Tozlanma'),
    hint: msg('Dokununca eline toz boya bulaşıyor (çoğunlukla dış cephe)'),
    severity: 'diy',
    cause: msg('Güneş ve hava etkisiyle eskiyen boya yüzeyi tozlaşır.'),
    steps: [
      msg('Yüzeyi fırçala ya da yıka, tamamen kurumasını bekle.'),
      msg('Tozlanan yüzeyi bağlayan bir astar uygula.'),
      msg('Dış cephe için uygun boya ile iki kat boya.'),
    ],
    callExpertIf: msg('Yüksekte çalışman gerekiyorsa iskele ve güvenlik ekipmanı olan bir ustaya yaptır.'),
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
  { value: 'room', label: msg('Oda ya da salon'), hint: msg('Yatak odası, salon, koridor') },
  { value: 'wet', label: msg('Banyo ya da mutfak'), hint: msg('Buharlı ve nemli alanlar') },
  { value: 'exterior', label: msg('Dış cephe'), hint: msg('Balkon, bahçe duvarı, bina dışı') },
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
  expert: msg('Çatlağı boyamadan önce bir inşaat mühendisine ya da deneyimli bir ustaya göster.'),
  water: msg('Nemin ya da suyun nereden geldiğini bul ve onarılmasını sağla.'),
  dry: msg('Duvarın tamamen kurumasını bekle; bu birkaç hafta sürebilir.'),
  protect: msg('Eşyaları ve zemini ört, kenarlara maskeleme bandı yapıştır.'),
  mould: msg('Eldiven ve maske tak, küfü küf temizleyiciyle temizle; kuru fırçalama.'),
  salt: msg('Beyaz tuzu sert, kuru bir fırçayla al; suyla silme.'),
  wash: msg('Tozlanan yüzeyi fırçala ya da yıka, kurumasını bekle.'),
  clean: msg('Duvarın tozunu al, yağlı ve kirli lekeleri sil.'),
  scrape: msg('Kabaran ve gevşeyen boyayı spatulayla kazı.'),
  fill: msg('Çatlak, delik ve göçükleri macunla doldur.'),
  sand: msg('Kuruyunca zımparala ve tozunu al.'),
};

const PRIMER_TEXT: Record<Primer, string> = {
  stain: msg('leke örtücü (izolasyon) astar'),
  salt: msg('tuzlanmaya dayanıklı astar'),
  binding: msg('tozlanan yüzeyi bağlayan astar'),
  patch: msg('kazınan ve macunlanan yerlere astar'),
};

const PRIMER_PRODUCT: Record<Primer, string> = {
  stain: msg('Leke örtücü astar'),
  salt: msg('Tuzlanma astarı'),
  binding: msg('Bağlayıcı astar'),
  patch: msg('Astar'),
};

const MATERIALS: Partial<Record<Task, string[]>> = {
  protect: [msg('Örtü naylonu'), msg('Maskeleme bandı')],
  mould: [msg('Küf temizleyici'), msg('Eldiven ve maske')],
  salt: [msg('Sert fırça')],
  scrape: [msg('Spatula')],
  fill: [msg('Macun')],
  sand: [msg('Zımpara kâğıdı')],
  paint: [msg('Rulo ve fırça')],
};

export type PlanStep = { key: Task; text: string };

/**
 * One ordered work plan for everything the user marked, so steps shared by
 * several findings (scraping, primer…) appear once and in the right order.
 * Steps and materials come back in the current language.
 */
export function workPlan(selected: string[], place: Place): { steps: PlanStep[]; materials: string[]; blocked: boolean } {
  const { symptoms } = assess(selected);
  const tasks = new Set<Task>(['protect', 'paint']);
  const primers = new Set<Primer>();
  for (const s of symptoms) {
    const work = WORK[s.id];
    if (!work) continue;
    work.tasks.forEach((value) => tasks.add(value));
    if (work.primer) primers.add(work.primer);
  }
  if (symptoms.length === 0) tasks.add('clean');
  const antiMould = selected.includes('mould') || place === 'wet';

  const steps: PlanStep[] = TASK_ORDER.filter((value) => tasks.has(value)).map((key) => {
    if (key === 'primer') return { key, text: t('Astar sür: {primers}.', { primers: [...primers].map((p) => t(PRIMER_TEXT[p])).join(', ') }) };
    if (key === 'paint') {
      const paint = place === 'exterior' ? t('dış cephe boyası') : antiMould ? t('küfe dayanıklı, silinebilir boya') : t('iç cephe boyası');
      return { key, text: t('Astar kuruyunca iki kat {paint} uygula; her katı ara vermeden, ıslak kenarı koruyarak sür.', { paint }) };
    }
    return { key, text: t(TASK_TEXT[key]) };
  });
  const materials = [
    ...steps.flatMap((s) => MATERIALS[s.key] ?? []),
    ...[...primers].map((p) => PRIMER_PRODUCT[p]),
  ];
  return { steps, materials: [...new Set(materials)].map((m) => t(m)), blocked: tasks.has('expert') || tasks.has('water') };
}
