import { ENGINE_VERSION } from '@/engine';

it('has a short semantic version that fits the calculations table', () => {
  expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  expect(ENGINE_VERSION.length).toBeLessThanOrEqual(20);
});
