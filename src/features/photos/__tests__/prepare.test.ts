import { photoErrorMessage, photoPath, resizeFor } from '@/features/photos/prepare';

describe('resizeFor', () => {
  it('leaves small photos alone', () => {
    expect(resizeFor(1200, 900)).toBeNull();
    expect(resizeFor(1600, 1600)).toBeNull();
  });

  it('shrinks the longest side', () => {
    expect(resizeFor(4032, 3024)).toEqual({ width: 1600 });
    expect(resizeFor(3024, 4032)).toEqual({ height: 1600 });
  });
});

describe('photo helpers', () => {
  it('builds the path the storage policies expect', () => {
    expect(photoPath('u', 'p', 'f')).toBe('u/p/f.jpg');
  });

  it('explains common upload errors in Turkish', () => {
    expect(photoErrorMessage('photo limit reached')).toMatch(/20 fotoğraf/);
    expect(photoErrorMessage('The object exceeded the maximum allowed size')).toMatch(/10 MB/);
    expect(photoErrorMessage('new row violates row-level security policy')).toMatch(/yetkin yok/);
    expect(photoErrorMessage('network')).toMatch(/İnternet/);
  });
});
