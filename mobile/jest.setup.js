import '@testing-library/jest-native/extend-expect';

// Mock Expo module registry (required for Expo 54+)
global.__ExpoImportMetaRegistry = {};
global.__BUNDLE_START_TIME__ = Date.now();

// Mock structuredClone if not available (required by Expo winter runtime)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Highest: 6,
    High: 5,
    Balanced: 4,
    Low: 3,
    Lowest: 2,
  },
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
  },
}));

jest.mock('expo-device', () => ({
  modelName: 'Jest Test Device',
  osName: 'iOS',
  osVersion: '16.0',
  deviceYearClass: 2022,
}));

jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(),
    getCameraPermissionsAsync: jest.fn(),
  },
  CameraType: {
    back: 'back',
    front: 'front',
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })
  ),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock WatermelonDB
jest.mock('@nozbe/watermelondb', () => ({
  Database: jest.fn(),
  Model: jest.fn(),
  Q: {
    where: jest.fn(),
    sortBy: jest.fn(),
    take: jest.fn(),
  },
}));

jest.mock('@nozbe/watermelondb/adapters/sqlite', () => ({
  default: jest.fn(),
}));

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
  },
  sessionId: 'test-session-id',
  default: {
    expoConfig: {
      version: '1.0.0',
    },
    sessionId: 'test-session-id',
  },
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock axios
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(),
        eject: jest.fn(),
      },
    },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      ...mockAxiosInstance,
    },
  };
});

// Suppress console warnings/errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock timers for animations
global.requestAnimationFrame = (cb) => {
  setTimeout(cb, 0);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};
