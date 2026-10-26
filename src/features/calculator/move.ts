import { msg } from '@/i18n';

/** Why the whole home is painted. Moving changes what matters most. */
export type PaintReason = 'refresh' | 'move_out' | 'move_in';

export const PAINT_REASONS: { value: PaintReason; label: string; hint: string }[] = [
  { value: 'refresh', label: msg('Yenileme'), hint: msg('Evde oturuyorum, boyatmak istiyorum') },
  { value: 'move_out', label: msg('Kiracı çıkışı'), hint: msg('Evi teslim edeceğim; depozito önemli') },
  { value: 'move_in', label: msg('Yeni eve taşınma'), hint: msg('Eşyalar gelmeden boyatacağım') },
];

/** Steps for moving, in order. General advice; the lease and the landlord decide. */
export const MOVE_STEPS: Record<Exclude<PaintReason, 'refresh'>, string[]> = {
  move_out: [
    msg('Boyamadan önce her odanın her duvarını fotoğrafla; fotoğraflar tarihli kalır.'),
    msg('Kira sözleşmesine bak; teslim rengini (genelde beyaz) ev sahibiyle netleştir.'),
    msg('Dübel ve çivi deliklerini macunla kapat, zımparala; lekelere önce astar sür.'),
    msg('Aynı açık renk üstüne iyi örten bir boyayla çoğu zaman tek kat yeter; emin değilsen 2 kat hesapla.'),
    msg('Bitince aynı açılardan yeniden fotoğraf çek ve teslimde ev sahibiyle birlikte bak.'),
  ],
  move_in: [
    msg('Eşyalar gelmeden boyat; boş evde iş daha hızlı ve temiz biter.'),
    msg('Önce duvarlarda nem, küf ve çatlak var mı bak; varsa boyadan önce çözülmeli.'),
    msg('Eski boyanın yağlı mı su bazlı mı olduğunu ev sahibine ya da yöneticiye sor.'),
    msg('Mutfak ve banyoda silinebilir, küfe dayanıklı boya seç.'),
    msg('Taşınmadan önce en az 2 gün kuruma ve havalandırma payı bırak.'),
  ],
};
