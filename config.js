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
  },
  // Inbox system settings
  inboxSystem: {
    enabled: true,
    defaultSender: "Jafet Egill",
    senderEmail: "jafet@trawlersempire.com",
    welcomeMessageSent: false
  },
  // Prestige system settings
  prestigeSystem: {
    enabled: true,
    // Benefits per prestige level
    benefits: {
      fishingPowerMultiplier: 0.1, // +10% fishing power per prestige
      autoFishingBonus: 0.05, // +0.05 auto-fishing per prestige
      fishValueMultiplier: 0.15, // +15% fish value per prestige
      startingMoneyBase: 100, // Base starting money
      startingMoneyMultiplier: 1.5 // Multiplier per prestige
    },
    // Requirements to prestige
    requirements: {
      minMoney: 100000, // Minimum money required to prestige
      minFishCaught: 1000, // Minimum fish caught to prestige
      minLocationsUnlocked: 3, // Minimum number of locations to unlock
      minEncyclopediaCompletion: 50 // Minimum % of encyclopedia completion
    },
    // Titles/ranks based on prestige level
    ranks: [
      { level: 0, title: "Novice Fisherman" },
      { level: 1, title: "Amateur Angler" },
      { level: 2, title: "Skilled Fisher" },
      { level: 3, title: "Professional Trawler" },
      { level: 5, title: "Master Fisherman" },
      { level: 7, title: "Legendary Angler" },
      { level: 10, title: "Fishing Tycoon" },
      { level: 15, title: "Maritime Emperor" },
      { level: 20, title: "Trawler God" }
    ]
  },
  // Seasonal event settings
  seasonalEvents: {
    enabled: true,
    currentSeason: null, // Will be set dynamically
    seasons: {
      winter: {
        name: "Winter",
        months: [12, 1, 2], // December, January, February
        fishModifier: "winter",
        particles: "snow"
      },
      spring: {
        name: "Spring",
        months: [3, 4, 5], // March, April, May
        fishModifier: "spring",
        particles: "petals"
      },
      summer: {
        name: "Summer",
        months: [6, 7, 8], // June, July, August
        fishModifier: "summer",
        particles: "sunshine"
      },
      autumn: {
        name: "Autumn",
        months: [9, 10, 11], // September, October, November
        fishModifier: "autumn",
        particles: "leaves"
      }
    },
    specialEvents: {
      halloween: {
        name: "Halloween",
        month: 10, // October
        day: 31, // 31st
        range: 7, // Days before and after
        fishModifier: "halloween" 
      },
      christmas: {
        name: "Christmas",
        month: 12, // December
        day: 25, // 25th
        range: 7, // Days before and after
        fishModifier: "christmas"
      }
    }
  }
};