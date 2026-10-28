import type { HomeLogRow } from '@/lib/database.types';

import { addMonths, careDueDates, careReminders, careRule, monthsSince, paintedAgo } from '../care';

function row(id: string, place: string, painted_on: string): HomeLogRow {
  return {
    id,
    owner_id: 'user-1',
    project_id: null,
    place,
    colour_name: null,
    colour_hex: null,
    colour_code: null,
    product: null,
    finish: null,
    painted_on,
    painter: null,
    note: null,
    created_at: '',
    updated_at: '',
  };
}

describe('paint age', () => {
  it('counts whole calendar months', () => {
    expect(monthsSince('2026-10-01', '2026-10-27')).toBe(0);
    expect(monthsSince('2026-09-27', '2026-10-27')).toBe(1);
    expect(monthsSince('2026-09-28', '2026-10-27')).toBe(0);
    expect(monthsSince('2024-03-15', '2026-10-27')).toBe(31);
    expect(monthsSince('2027-01-01', '2026-10-27')).toBe(0);
  });

  it('says it in months, then in whole years', () => {
    expect(paintedAgo(0)).toBe('Bu ay boyandı');
    expect(paintedAgo(1)).toBe('1 ay önce boyandı');
    expect(paintedAgo(5)).toBe('5 ay önce boyandı');
    expect(paintedAgo(12)).toBe('1 yıl önce boyandı');
    expect(paintedAgo(31)).toBe('2 yıl önce boyandı');
  });
});

describe('care reminders', () => {
  it('knows busy, damp and outside places, in Turkish and English', () => {
    expect(careRule('Salon duvarları').years).toBe(6);
    expect(careRule('MUTFAK').years).toBe(4);
    expect(careRule('Çocuk odası').years).toBe(4);
    expect(careRule('Kids room').years).toBe(4);
    expect(careRule('Banyo tavanı').years).toBe(4);
    expect(careRule('Dış cephe').years).toBe(8);
    expect(careRule('Balcony').years).toBe(8);
  });

  it('lists places near or past their usual interval, most overdue first', () => {
    const today = '2026-10-27';
    const reminders = careReminders(
      [
        row('a', 'Salon', '2019-05-01'), // 89 months of 72: 17 over
        row('b', 'Mutfak', '2023-01-10'), // 45 months of 48: soon
        row('c', 'Yatak odası', '2024-06-01'), // 28 months of 72: fine
        row('d', 'Koridor', '2021-02-01'), // 68 months of 48: 20 over
      ],
      today,
    );
    expect(reminders.map((r) => [r.entry.place, r.status])).toEqual([
      ['Koridor', 'due'],
      ['Salon', 'due'],
      ['Mutfak', 'soon'],
    ]);
  });

  it('only counts the latest coat of the same place', () => {
    const reminders = careReminders([row('old', 'Salon', '2015-01-01'), row('new', 'salon ', '2025-04-01')], '2026-10-27');
    expect(reminders).toEqual([]);
  });
});

describe('care due dates', () => {
  it('adds whole months and keeps the day inside the month', () => {
    expect(addMonths('2026-10-27', 3)).toBe('2027-01-27');
    expect(addMonths('2020-02-29', 72)).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('gives each place the day it reaches its interval, soonest first, future only', () => {
    const due = careDueDates(
      [
        row('a', 'Salon', '2019-05-01'), // 2025-05-01: already due, shown on screen instead
        row('b', 'Mutfak', '2023-01-10'), // 4 years: 2027-01-10
        row('c', 'Yatak odası', '2024-06-01'), // 6 years: 2030-06-01
        row('d', 'Balkon', '2020-03-15'), // 8 years: 2028-03-15
        row('e', 'mutfak', '2021-01-10'), // older coat of the kitchen: ignored
      ],
      '2026-10-27',
    );
    expect(due.map((d) => [d.entry.id, d.dueOn])).toEqual([
      ['b', '2027-01-10'],
      ['d', '2028-03-15'],
      ['c', '2030-06-01'],
    ]);
  });
});

