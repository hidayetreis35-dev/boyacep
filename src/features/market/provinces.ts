/**
 * Türkiye's 81 provinces by licence plate code, and the districts of the
 * pilot provinces. Place names are proper nouns: they are data, shown as they
 * are in every language.
 */
export type ProvinceCode = string;

export type Province = { code: ProvinceCode; name: string };

export const PROVINCES: Province[] = [
  { code: '01', name: 'Adana' },
  { code: '02', name: 'Adıyaman' },
  { code: '03', name: 'Afyonkarahisar' },
  { code: '04', name: 'Ağrı' },
  { code: '05', name: 'Amasya' },
  { code: '06', name: 'Ankara' },
  { code: '07', name: 'Antalya' },
  { code: '08', name: 'Artvin' },
  { code: '09', name: 'Aydın' },
  { code: '10', name: 'Balıkesir' },
  { code: '11', name: 'Bilecik' },
  { code: '12', name: 'Bingöl' },
  { code: '13', name: 'Bitlis' },
  { code: '14', name: 'Bolu' },
  { code: '15', name: 'Burdur' },
  { code: '16', name: 'Bursa' },
  { code: '17', name: 'Çanakkale' },
  { code: '18', name: 'Çankırı' },
  { code: '19', name: 'Çorum' },
  { code: '20', name: 'Denizli' },
  { code: '21', name: 'Diyarbakır' },
  { code: '22', name: 'Edirne' },
  { code: '23', name: 'Elazığ' },
  { code: '24', name: 'Erzincan' },
  { code: '25', name: 'Erzurum' },
  { code: '26', name: 'Eskişehir' },
  { code: '27', name: 'Gaziantep' },
  { code: '28', name: 'Giresun' },
  { code: '29', name: 'Gümüşhane' },
  { code: '30', name: 'Hakkari' },
  { code: '31', name: 'Hatay' },
  { code: '32', name: 'Isparta' },
  { code: '33', name: 'Mersin' },
  { code: '34', name: 'İstanbul' },
  { code: '35', name: 'İzmir' },
  { code: '36', name: 'Kars' },
  { code: '37', name: 'Kastamonu' },
  { code: '38', name: 'Kayseri' },
  { code: '39', name: 'Kırklareli' },
  { code: '40', name: 'Kırşehir' },
  { code: '41', name: 'Kocaeli' },
  { code: '42', name: 'Konya' },
  { code: '43', name: 'Kütahya' },
  { code: '44', name: 'Malatya' },
  { code: '45', name: 'Manisa' },
  { code: '46', name: 'Kahramanmaraş' },
  { code: '47', name: 'Mardin' },
  { code: '48', name: 'Muğla' },
  { code: '49', name: 'Muş' },
  { code: '50', name: 'Nevşehir' },
  { code: '51', name: 'Niğde' },
  { code: '52', name: 'Ordu' },
  { code: '53', name: 'Rize' },
  { code: '54', name: 'Sakarya' },
  { code: '55', name: 'Samsun' },
  { code: '56', name: 'Siirt' },
  { code: '57', name: 'Sinop' },
  { code: '58', name: 'Sivas' },
  { code: '59', name: 'Tekirdağ' },
  { code: '60', name: 'Tokat' },
  { code: '61', name: 'Trabzon' },
  { code: '62', name: 'Tunceli' },
  { code: '63', name: 'Şanlıurfa' },
  { code: '64', name: 'Uşak' },
  { code: '65', name: 'Van' },
  { code: '66', name: 'Yozgat' },
  { code: '67', name: 'Zonguldak' },
  { code: '68', name: 'Aksaray' },
  { code: '69', name: 'Bayburt' },
  { code: '70', name: 'Karaman' },
  { code: '71', name: 'Kırıkkale' },
  { code: '72', name: 'Batman' },
  { code: '73', name: 'Şırnak' },
  { code: '74', name: 'Bartın' },
  { code: '75', name: 'Ardahan' },
  { code: '76', name: 'Iğdır' },
  { code: '77', name: 'Yalova' },
  { code: '78', name: 'Karabük' },
  { code: '79', name: 'Kilis' },
  { code: '80', name: 'Osmaniye' },
  { code: '81', name: 'Düzce' },
];

/** Districts are listed where BoyaCep has looked for district-level prices. */
export const DISTRICTS: Record<ProvinceCode, string[]> = {
  '35': ['Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova', 'Buca', 'Çeşme', 'Çiğli', 'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe', 'Karabağlar', 'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz', 'Konak', 'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş', 'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla'],
  '45': ['Ahmetli', 'Akhisar', 'Alaşehir', 'Demirci', 'Gölmarmara', 'Gördes', 'Kırkağaç', 'Köprübaşı', 'Kula', 'Salihli', 'Sarıgöl', 'Saruhanlı', 'Selendi', 'Soma', 'Şehzadeler', 'Turgutlu', 'Yunusemre'],
};

/** The pilot provinces, offered first in the city choice. */
export const PILOT_PROVINCES: ProvinceCode[] = ['45', '35'];

export function provinceByCode(code: ProvinceCode | null | undefined): Province | undefined {
  return PROVINCES.find((p) => p.code === code);
}

export function provinceByName(name: string): Province | undefined {
  const key = name.toLocaleLowerCase('tr');
  return PROVINCES.find((p) => p.name.toLocaleLowerCase('tr') === key);
}

/** Matches the start of a province name, ignoring case and Turkish letters (izmir finds İzmir). */
export function searchProvinces(query: string): Province[] {
  const fold = (s: string) =>
    s
      .toLocaleLowerCase('tr')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u');
  const key = fold(query.trim());
  if (!key) return PROVINCES;
  return PROVINCES.filter((p) => fold(p.name).startsWith(key) || p.code === key.padStart(2, '0'));
}
