import { cleanFavourites, mergeFavourites } from '../favourites';

describe('favourite colours', () => {
  it('keeps valid colour codes only, without repeats', () => {
    expect(cleanFavourites(['#F4F1EA', 'red', '#f4f1ea', 7, '#F4F1EA', '#3A3D40'])).toEqual(['#F4F1EA', '#3A3D40']);
    expect(cleanFavourites('nope')).toEqual([]);
    expect(cleanFavourites(undefined)).toEqual([]);
  });

  it('keeps at most 60', () => {
    const many = Array.from({ length: 80 }, (_, i) => `#${i.toString(16).padStart(6, '0').toUpperCase()}`);
    expect(cleanFavourites(many)).toHaveLength(60);
  });

  it('puts this phone first and adds the ones from another phone', () => {
    expect(mergeFavourites(['#111111', '#222222'], ['#222222', '#333333'])).toEqual(['#111111', '#222222', '#333333']);
    expect(mergeFavourites([], ['#333333'])).toEqual(['#333333']);
  });
});
