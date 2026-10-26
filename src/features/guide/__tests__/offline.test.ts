import AsyncStorage from '@react-native-async-storage/async-storage';

import { withOfflineCopy } from '../api';

describe('guide offline copy', () => {
  beforeEach(() => AsyncStorage.clear());

  it('keeps a copy of what was loaded', async () => {
    expect(await withOfflineCopy('k', async () => ({ title: 'Astar' }))).toEqual({ title: 'Astar' });
    await new Promise((r) => setTimeout(r, 0));
    expect(JSON.parse((await AsyncStorage.getItem('k'))!)).toEqual({ title: 'Astar' });
  });

  it('shows the copy when offline', async () => {
    await AsyncStorage.setItem('k', JSON.stringify({ title: 'Astar' }));
    expect(await withOfflineCopy('k', () => Promise.reject(new Error('offline')))).toEqual({ title: 'Astar' });
  });

  it('shows the error when there is no copy', async () => {
    await expect(withOfflineCopy('none', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
  });

  it('ignores a damaged copy', async () => {
    await AsyncStorage.setItem('k', '{oops');
    await expect(withOfflineCopy('k', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
  });
});
