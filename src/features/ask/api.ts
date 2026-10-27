import { msg, t } from '@/i18n';
import type { ConsultationMessageRow, ConsultationRow, ConsultationTopic } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

export const TOPICS: { value: ConsultationTopic; label: string }[] = [
  { value: 'problem', label: msg('Duvarda sorun') },
  { value: 'paint_choice', label: msg('Boya seçimi') },
  { value: 'preparation', label: msg('Hazırlık') },
  { value: 'cost', label: msg('Maliyet') },
  { value: 'other', label: msg('Diğer') },
];

export const topicLabel = (topic: ConsultationTopic) => t(TOPICS.find((x) => x.value === topic)?.label ?? topic);

export const CONSULTATION_STATUS_LABEL: Record<ConsultationRow['status'], string> = {
  open: msg('Yanıt bekleniyor'),
  answered: msg('Yanıtlandı'),
  closed: msg('Kapandı'),
};

export type QuestionErrors = Partial<Record<'subject' | 'body', string>>;

export function validateQuestion(subject: string, body: string): QuestionErrors {
  const errors: QuestionErrors = {};
  const s = subject.trim();
  const b = body.trim();
  if (s.length < 3) errors.subject = t('Kısaca konuyu yaz (en az 3 harf).');
  else if (s.length > 120) errors.subject = t('Konu en fazla 120 karakter olabilir.');
  if (b.length < 10) errors.body = t('Sorunu biraz daha anlat (en az 10 harf).');
  else if (b.length > 2000) errors.body = t('En fazla 2000 karakter.');
  return errors;
}

function askErrorMessage(message: string): string {
  if (message.includes('daily question limit')) return t('Bugün en fazla 5 soru sorabilirsin. Yarın tekrar dene.');
  if (message.includes('consultation is closed')) return t('Bu soru kapandı. Yeni bir soru açabilirsin.');
  return t('Gönderemedik. İnternet bağlantını kontrol eder misin?');
}

/** Mine for users; every question for the team (RLS decides). */
export async function listConsultations(db: DbClient, opts: { onlyMine?: string; status?: ConsultationRow['status'] } = {}): Promise<ConsultationRow[]> {
  let query = db.from('consultations').select('*').order('updated_at', { ascending: false });
  if (opts.onlyMine) query = query.eq('user_id', opts.onlyMine);
  if (opts.status) query = query.eq('status', opts.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getConsultation(db: DbClient, id: string): Promise<{ consultation: ConsultationRow; messages: ConsultationMessageRow[] }> {
  const [c, m] = await Promise.all([
    db.from('consultations').select('*').eq('id', id).single(),
    db.from('consultation_messages').select('*').eq('consultation_id', id).order('created_at'),
  ]);
  if (c.error) throw new Error(c.error.message);
  if (m.error) throw new Error(m.error.message);
  return { consultation: c.data, messages: m.data };
}

/** Opens a question with its first message. */
export async function askQuestion(
  db: DbClient,
  args: { topic: ConsultationTopic; subject: string; body: string; projectId?: string | null },
): Promise<ConsultationRow> {
  const { data, error } = await db
    .from('consultations')
    .insert({ topic: args.topic, subject: args.subject.trim(), project_id: args.projectId ?? null })
    .select('*')
    .single();
  if (error) throw new Error(askErrorMessage(error.message));
  await sendMessage(db, data.id, args.body);
  return data;
}

export async function sendMessage(db: DbClient, consultationId: string, body: string): Promise<void> {
  const { error } = await db.from('consultation_messages').insert({ consultation_id: consultationId, body: body.trim() });
  if (error) throw new Error(askErrorMessage(error.message));
}

export async function closeConsultation(db: DbClient, id: string): Promise<void> {
  const { error } = await db.from('consultations').update({ status: 'closed' }).eq('id', id);
  if (error) throw new Error(t('Kapatılamadı.'));
}
