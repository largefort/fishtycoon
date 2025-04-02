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
  // Fishing skills system settings
  skillsSystem: {
    enabled: true,
    xpPerFish: 1, // Base XP earned per fish caught
    xpMultiplierByRarity: {
      Common: 1,
      Rare: 2,
      Epic: 5,
      Legendary: 10,
      Mythic: 20
    },
    skills: [
      {
        id: "casting",
        name: "Casting",
        description: "Increases fishing power per cast",
        maxLevel: 20,
        bonusPerLevel: 0.05, // 5% increase per level
        xpToLevelUp: (level) => Math.floor(100 * Math.pow(1.5, level - 1))
      },
      {
        id: "efficiency",
        name: "Efficiency",
        description: "Reduces fishing time",
        maxLevel: 15,
        bonusPerLevel: 0.03, // 3% faster fishing per level
        xpToLevelUp: (level) => Math.floor(150 * Math.pow(1.6, level - 1))
      },
      {
        id: "luck",
        name: "Luck",
        description: "Increases chance of rare fish",
        maxLevel: 20,
        bonusPerLevel: 0.02, // 2% increased rare fish chance per level
        xpToLevelUp: (level) => Math.floor(120 * Math.pow(1.7, level - 1))
      },
      {
        id: "knowledge",
        name: "Fish Knowledge",
        description: "Increases fish value",
        maxLevel: 25,
        bonusPerLevel: 0.04, // 4% increase in fish value per level
        xpToLevelUp: (level) => Math.floor(100 * Math.pow(1.6, level - 1))
      },
      {
        id: "patience",
        name: "Patience",
        description: "Increases XP gained from fishing",
        maxLevel: 10,
        bonusPerLevel: 0.1, // 10% more XP per level
        xpToLevelUp: (level) => Math.floor(200 * Math.pow(1.8, level - 1))
      },
      {
        id: "automation",
        name: "Automation",
        description: "Increases auto-fishing rate",
        maxLevel: 15,
        bonusPerLevel: 0.05, // 5% increase in auto-fishing rate per level
        xpToLevelUp: (level) => Math.floor(180 * Math.pow(1.75, level - 1))
      }
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
      },
      easter: {
        name: "Easter",
        month: 4, // April
        day: 15, // Mid-April
        range: 14, // Two weeks around Easter
        fishModifier: "easter"
      },
      devBirthday: {
        name: "Developer's Birthday",
        month: 5, // May
        day: 8, // 8th
        range: 1, // Only 8th and 9th
        fishModifier: "birthday"
      }
    }
  }
};