// Game configuration settings
export const CONFIG = {
  // Title screen settings
  titleScreen: {
    fadeInDuration: 800,
    fadeOutDuration: 600
  },
  // Loading screen settings
  loadingScreen: {
    minDuration: 1500,
    maxDuration: 3000
  },
  // Game version
  version: '1.0.0',
  // Canvas settings for locations
  locationCanvas: {
    width: 320,
    height: 180
  },
  // Offline progress settings
  offlineProgress: {
    enabled: true,
    maxHours: 12, // Maximum hours of offline progress to calculate
    efficiencyRate: 0.8 // Offline auto-fishing efficiency (80% of normal rate)
  }
};