import { msg, t } from '@/i18n';
import type { ProProfileRow, ProSpecialty, VerificationStatus } from '@/lib/database.types';

export const SPECIALTIES: { value: ProSpecialty; label: string }[] = [
  { value: 'interior', label: msg('İç cephe') },
  { value: 'exterior', label: msg('Dış cephe') },
  { value: 'ceiling', label: msg('Tavan') },
  { value: 'decorative', label: msg('Dekoratif boya') },
  { value: 'insulation', label: msg('Mantolama, yalıtım') },
  { value: 'plaster', label: msg('Sıva, alçı') },
  { value: 'repair', label: msg('Tamirat') },
];

export const specialtyLabel = (s: ProSpecialty) => t(SPECIALTIES.find((x) => x.value === s)?.label ?? s);

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  unverified: msg('Doğrulanmadı'),
  pending: msg('Doğrulama bekleniyor'),
  verified: msg('Doğrulanmış usta'),
  rejected: msg('Doğrulama reddedildi'),
};

export type ProForm = {
  fullName: string;
  businessName: string;
  phone: string;
  showPhone: boolean;
  city: string;
  districts: string;
  specialties: ProSpecialty[];
  yearsExperience: string;
  bio: string;
};

export const EMPTY_PRO_FORM: ProForm = {
  fullName: '',
  businessName: '',
  phone: '',
  showPhone: false,
  city: '',
  districts: '',
  specialties: [],
  yearsExperience: '',
  bio: '',
};

export function profileToForm(p: ProProfileRow): ProForm {
  return {
    fullName: p.full_name,
    businessName: p.business_name ?? '',
    phone: p.phone ?? '',
    showPhone: p.show_phone,
    city: p.city,
    districts: p.districts,
    specialties: p.specialties,
    yearsExperience: p.years_experience === null ? '' : String(p.years_experience),
    bio: p.bio,
  };
}

export type ProRecord = Pick<
  ProProfileRow,
  'full_name' | 'business_name' | 'phone' | 'show_phone' | 'city' | 'districts' | 'specialties' | 'years_experience' | 'bio'
>;

export type ProFormErrors = Partial<Record<'fullName' | 'phone' | 'city' | 'specialties' | 'yearsExperience' | 'bio', string>>;

/** Mirrors the database checks in Turkish. */
export function validateProForm(form: ProForm): { record: ProRecord } | { errors: ProFormErrors } {
  const errors: ProFormErrors = {};
  const fullName = form.fullName.trim();
  const phone = form.phone.trim();
  const city = form.city.trim();
  const years = form.yearsExperience.trim();

  if (fullName.length < 2 || fullName.length > 80) errors.fullName = t('Adını ve soyadını yaz.');
  if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone)) errors.phone = t('Bu numara eksik ya da hatalı görünüyor. Örnek: 0555 123 45 67');
  if (!phone && form.showPhone) errors.phone = t('Telefonunu göstermek için numaranı yaz.');
  if (city.length < 2 || city.length > 60) errors.city = t('Çalıştığın ili yaz.');
  if (form.specialties.length === 0) errors.specialties = t('En az bir uzmanlık seç.');
  if (years && (!/^\d{1,2}$/.test(years) || Number(years) > 70)) errors.yearsExperience = t('0 ile 70 arasında bir sayı gir.');
  if (form.bio.length > 1000) errors.bio = t('En fazla 1000 karakter.');

  if (Object.keys(errors).length > 0) return { errors };
  return {
    record: {
      full_name: fullName,
      business_name: form.businessName.trim() || null,
      phone: phone || null,
      show_phone: form.showPhone && !!phone,
      city,
      districts: form.districts.trim(),
      specialties: form.specialties,
      years_experience: years ? Number(years) : null,
      bio: form.bio.trim(),
    },
  };
}
