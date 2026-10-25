const { jest } = require('@jest/globals');

// Icon fonts are native assets that Jest cannot load; render nothing instead.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const Icon = () => null;
  Icon.glyphMap = {};
  return { __esModule: true, default: Icon };
});
