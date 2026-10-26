const { jest } = require('@jest/globals');

// Icon fonts are native assets that Jest cannot load; render nothing instead.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const Icon = () => null;
  Icon.glyphMap = {};
  return { __esModule: true, default: Icon };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The Keychain/Keystore is native; an in-memory map stands in for it.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    AFTER_FIRST_UNLOCK: 0,
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    __store: store,
  };
});

// Skia draws with a native (or WebAssembly) engine that Jest does not load.
jest.mock('./src/features/colour/photo-stage', () => require('./src/features/colour/photo-stage.mock'));

// Tests read the Turkish source text, whatever language the machine uses.
jest.mock('./src/i18n/device', () => ({ deviceLocale: () => 'tr' }));
