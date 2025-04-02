import { createApp, ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue';
import { CONFIG } from './config.js';
import { LocationRenderer } from './location-renderer.js';

// Title screen and loading screen handling
document.addEventListener('DOMContentLoaded', () => {
    // Set game version from config
    document.querySelector('.game-version').textContent = `v${CONFIG.version}`;
    
    // Initialize location renderer
    const locationRenderer = new LocationRenderer();
    window.locationRenderer = locationRenderer; // Make it accessible globally
    
    // Prerender all location canvases
    const locationIds = ['pond', 'lake', 'river', 'ocean'];
    locationIds.forEach(id => {
        locationRenderer.getLocationCanvas(id);
    });
    
    // Create random bubbles for title screen
    createTitleBubbles();
    
    // Array of tips to show during loading
    const loadingTips = [
        "Higher quality fishing rods catch more fish per cast!",
        "Different locations have different types of fish to catch.",
        "Upgrade your boat to access deeper waters and rare fish.",
        "Auto-fishers work even when you're away from the game.",
        "Check the Fish Encyclopedia to track your collection progress.",
        "Some legendary fish only appear in specific locations.",
        "Boat upgrades can improve your fishing efficiency.",
        "Keep an eye on your stats to track your progress!",
        "Build your trawler empire one fish at a time!",
        "Ocean fishing provides the most valuable catches."
    ];
    
    // Start button click handler
    document.getElementById('start-game').addEventListener('click', () => {
        // Hide title screen
        const titleScreen = document.getElementById('title-screen');
        titleScreen.style.opacity = '0';
        
        // Show loading screen
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('active');
        
        // Start loading bar animation
        const loadingBar = document.querySelector('.loading-bar');
        const loadingTip = document.getElementById('loading-tip');
        let progress = 0;
        
        // Show random loading tip
        loadingTip.textContent = loadingTips[Math.floor(Math.random() * loadingTips.length)];
        
        // Calculate a random loading time between min and max durations
        const loadingDuration = Math.random() * 
            (CONFIG.loadingScreen.maxDuration - CONFIG.loadingScreen.minDuration) + 
            CONFIG.loadingScreen.minDuration;
        
        // Animate loading bar
        const loadingInterval = setInterval(() => {
            progress += 1;
            loadingBar.style.width = `${progress}%`;
            
            // When loading reaches 100%, show the game
            if (progress >= 100) {
                clearInterval(loadingInterval);
                
                // Wait a moment to show 100% before hiding loading screen
                setTimeout(() => {
                    // Hide loading screen
                    loadingScreen.classList.remove('active');
                    
                    // Show app
                    const app = document.getElementById('app');
                    app.classList.remove('hidden-app');
                    app.classList.add('visible-app');
                    
                    // Add a small delay to ensure title screen is fully hidden
                    setTimeout(() => {
                        titleScreen.classList.remove('active');
                    }, 500);
                }, 500);
            }
        }, loadingDuration / 100);
    });
    
    // Function to create random bubbles for title screen
    function createTitleBubbles() {
        const bubbleContainer = document.querySelector('.title-bubbles');
        
        // Create additional random bubbles
        for (let i = 0; i < 30; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            
            // Random position, size and animation properties
            const size = Math.random() * 20 + 5;
            const left = Math.random() * 100;
            const delay = Math.random() * 15;
            const duration = Math.random() * 5 + 7;
            const opacity = Math.random() * 0.5 + 0.2;
            const rotate = Math.random() * 40 - 20;
            
            bubble.style.cssText = `
                left: ${left}%;
                width: ${size}px;
                height: ${size}px;
                --duration: ${duration}s;
                --opacity: ${opacity};
                --rotate: ${rotate}deg;
                animation-delay: ${delay}s;
            `;
            
            bubbleContainer.appendChild(bubble);
        }
    }
});

createApp({
    setup() {
        // Game state
        const money = ref(0);
        const inventory = ref({});
        const totalFishCaught = ref(0);
        const fishingPower = ref(1);
        const autoFishingRate = ref(0);
        const isFishing = ref(false);
        const lineLength = ref(0);
        const boatPosition = ref(50);
        const boatVerticalPosition = ref(40);
        const fishInWater = ref([]);
        const autoFishingActive = ref(false);
        const autoFishingTimer = ref(null);
        let fishIdCounter = 0;
        let autoFishingInterval = null;
        let waterlineCanvas = null;
        let waterlineCtx = null;
        let waterlineAnimationId = null;
        let waveOffset = 0;

        // Define upgrades early to avoid reference error
        const upgrades = ref([
            {
                id: 'rod',
                name: 'Fishing Rod',
                description: 'Increases fishing power (fish per cast)',
                level: 1,
                maxLevel: null,
                getCost: (level) => Math.floor(50 * Math.pow(1.5, level - 1)),
                get cost() { return this.getCost(this.level); },
                getEffect: (level) => level
            },
            {
                id: 'bait',
                name: 'Premium Bait',
                description: 'Increases fishing power and attracts rarer fish',
                level: 0,
                maxLevel: 10,
                getCost: (level) => Math.floor(100 * Math.pow(2, level)),
                get cost() { return this.getCost(this.level); },
                getEffect: (level) => level * 0.5
            },
            {
                id: 'lure',
                name: 'Special Lure',
                description: 'Catches more fish per cast',
                level: 1,
                maxLevel: 10,
                getCost: (level) => Math.floor(75 * Math.pow(1.8, level - 1)),
                get cost() { return this.getCost(this.level); },
                getEffect: (level) => level * 0.5
            },
            {
                id: 'autoFisher',
                name: 'Auto-Fisher',
                description: 'Automatically fishes over time',
                level: 0,
                maxLevel: 10,
                getCost: (level) => Math.floor(500 * Math.pow(2, level)),
                get cost() { return this.getCost(this.level); },
                getEffect: (level) => level * 0.1
            },
            {
                id: 'merchant',
                name: 'Fish Merchant',
                description: 'Automatically sells 5% of your fish every few seconds',
                level: 0,
                maxLevel: 1,
                getCost: (level) => 2000,
                get cost() { return this.getCost(this.level); },
                getEffect: (level) => level
            }
        ]);

        // Add showSplash for animation
        const showSplash = ref(false);

        // New state for fishing locations, boat customization, and encyclopedia
        const activeLocationId = ref('pond');
        const showEncyclopedia = ref(false);
        const selectedFish = ref(null);
        const encyclopediaUnlocked = ref(false);
        const showBoatCustomization = ref(false);
        const activeTab = ref('locations');

        // Add state for offline progress
        const lastOnlineTime = ref(Date.now());
        const showOfflineModal = ref(false);
        const offlineEarnings = ref({
            money: 0,
            fishCaught: 0,
            timeAway: 0
        });

        // Add inbox system state
        const showInbox = ref(false);
        const emails = ref([]);
        const unreadEmailCount = ref(0);
        
        // Initialize inbox with welcome message
        function initializeInbox() {
            if (CONFIG.inboxSystem.enabled && !CONFIG.inboxSystem.welcomeMessageSent) {
                // Add welcome message
                addEmail({
                    id: 'welcome-1',
                    subject: 'Welcome to Trawler\'s Empire!',
                    sender: CONFIG.inboxSystem.defaultSender,
                    senderEmail: CONFIG.inboxSystem.senderEmail,
                    date: new Date().toLocaleDateString(),
                    content: `
                        <p>Ahoy, Captain!</p>
                        <p>Welcome to Trawler's Empire, where you'll build your fishing legacy from humble beginnings to a vast maritime empire.</p>
                        <p>Here are some tips to get started:</p>
                        <ul>
                            <li>Click "Cast Line" to start fishing</li>
                            <li>Upgrade your equipment to catch more fish</li>
                            <li>Unlock new locations for rare fish species</li>
                            <li>Auto-fishing works even when you're away!</li>
                        </ul>
                        <p>Keep an eye on this inbox for future updates and patch notes.</p>
                        <p>Happy fishing!</p>
                        <p>- Jafet Egill<br>Game Developer</p>
                    `,
                    read: false
                });
                
                // Add new fish species announcement
                addEmail({
                    id: 'fish-update-1',
                    subject: 'New Fish Species Discovered!',
                    sender: CONFIG.inboxSystem.defaultSender,
                    senderEmail: CONFIG.inboxSystem.senderEmail,
                    date: new Date().toLocaleDateString(),
                    content: `
                        <p>Exciting news, Captain!</p>
                        <p>Our marine biologists have discovered several new fish species in all fishing locations!</p>
                        <p>New discoveries include:</p>
                        <ul>
                            <li>Mystic Goldfish - An extremely rare pond species</li>
                            <li>Crystal Salmon - Found in the depths of mountain lakes</li>
                            <li>Ghost Catfish - A mythical river species that few have seen</li>
                            <li>Anglerfish, Electric Eel, and more in the deep ocean!</li>
                        </ul>
                        <p>Update your Fish Encyclopedia to track your collection progress.</p>
                        <p>Happy fishing!</p>
                        <p>- Jafet Egill<br>Game Developer</p>
                    `,
                    read: false
                });
                
                // Set welcome message as sent
                CONFIG.inboxSystem.welcomeMessageSent = true;
            }
        }
        
        // Add email to inbox
        function addEmail(email) {
            emails.value.unshift(email);
            if (!email.read) {
                unreadEmailCount.value++;
            }
        }
        
        // Mark email as read
        function markEmailAsRead(emailId) {
            const email = emails.value.find(e => e.id === emailId);
            if (email && !email.read) {
                email.read = true;
                unreadEmailCount.value = Math.max(0, unreadEmailCount.value - 1);
            }
        }
        
        // Toggle inbox view
        function toggleInbox() {
            showInbox.value = !showInbox.value;
        }

        // Initialize location renderer
        const locationRenderer = window.locationRenderer || new LocationRenderer();
        
        // Fishing locations
        const fishingLocations = ref([
            {
                id: 'pond',
                name: 'Local Pond',
                description: 'A peaceful fishing spot with common fish',
                background: 'linear-gradient(to bottom, #81d4fa, #4fc3f7)',
                unlocked: true,
                price: 0,
                image: 'pond',
                canvasImage: null, // Will be filled by canvas
                fishTypes: [
                    { id: 'common1', name: "Common Fish", chance: 0.4, value: 1, color: "#6495ED", minDepth: 20, maxDepth: 50 },
                    { id: 'common2', name: "Bluegill", chance: 0.2, value: 2, color: "#4682B4", minDepth: 15, maxDepth: 40 },
                    { id: 'rare1', name: "Rare Fish", chance: 0.15, value: 5, color: "#FFD700", minDepth: 40, maxDepth: 70 },
                    { id: 'rare2', name: "Smallmouth Bass", chance: 0.15, value: 8, color: "#DAA520", minDepth: 30, maxDepth: 60 },
                    { id: 'epic1', name: "Epic Fish", chance: 0.06, value: 25, color: "#9932CC", minDepth: 60, maxDepth: 90 },
                    { id: 'epic2', name: "Albino Catfish", chance: 0.03, value: 35, color: "#F5F5F5", minDepth: 50, maxDepth: 80 },
                    { id: 'legendary1', name: "Legendary Fish", chance: 0.006, value: 150, color: "#FF4500", minDepth: 80, maxDepth: 100 },
                    { id: 'legendary2', name: "Crowned Koi", chance: 0.004, value: 200, color: "#FFA07A", minDepth: 70, maxDepth: 100 },
                    { id: 'mythic1', name: "Mystic Goldfish", chance: 0.002, value: 300, color: "#FFD700", minDepth: 85, maxDepth: 100 },
                    { id: 'special1', name: "Spotted Sunfish", chance: 0.08, value: 12, color: "#E6A817", minDepth: 25, maxDepth: 55 }
                ]
            },
            {
                id: 'lake',
                name: 'Mountain Lake',
                description: 'Deeper waters with better fish variety',
                background: 'linear-gradient(to bottom, #4db6ac, #009688)',
                unlocked: false,
                price: 1000,
                image: 'lake',
                canvasImage: null, // Will be filled by canvas
                fishTypes: [
                    { id: 'common3', name: "Lake Trout", chance: 0.3, value: 3, color: "#20B2AA", minDepth: 20, maxDepth: 50 },
                    { id: 'common4', name: "Yellow Perch", chance: 0.2, value: 4, color: "#FFEB3B", minDepth: 15, maxDepth: 40 },
                    { id: 'rare3', name: "Mountain Bass", chance: 0.15, value: 8, color: "#DAA520", minDepth: 40, maxDepth: 70 },
                    { id: 'rare4', name: "Brook Trout", chance: 0.15, value: 12, color: "#8BC34A", minDepth: 35, maxDepth: 65 },
                    { id: 'epic3', name: "Rainbow Trout", chance: 0.1, value: 40, color: "#BA55D3", minDepth: 60, maxDepth: 90 },
                    { id: 'epic4', name: "Arctic Char", chance: 0.05, value: 50, color: "#E91E63", minDepth: 55, maxDepth: 85 },
                    { id: 'legendary3', name: "Golden Carp", chance: 0.03, value: 200, color: "#FFA500", minDepth: 80, maxDepth: 100 },
                    { id: 'legendary4', name: "Ancient Sturgeon", chance: 0.02, value: 250, color: "#607D8B", minDepth: 75, maxDepth: 100 },
                    { id: 'mythic2', name: "Crystal Salmon", chance: 0.01, value: 350, color: "#90CAF9", minDepth: 85, maxDepth: 100 },
                    { id: 'special2', name: "Albino Trout", chance: 0.05, value: 30, color: "#F0F0F0", minDepth: 45, maxDepth: 70 }
                ]
            },
            {
                id: 'river',
                name: 'Rushing River',
                description: 'Fast moving water with unique fish species',
                background: 'linear-gradient(to bottom, #4fc3f7, #0288d1)',
                unlocked: false,
                price: 5000,
                image: 'river',
                canvasImage: null, // Will be filled by canvas
                fishTypes: [
                    { id: 'common5', name: "River Perch", chance: 0.25, value: 5, color: "#4682B4", minDepth: 20, maxDepth: 50 },
                    { id: 'common6', name: "Brown Bullhead", chance: 0.2, value: 7, color: "#795548", minDepth: 15, maxDepth: 45 },
                    { id: 'rare5', name: "Silver Salmon", chance: 0.15, value: 15, color: "#C0C0C0", minDepth: 40, maxDepth: 70 },
                    { id: 'rare6', name: "Cutthroat Trout", chance: 0.15, value: 18, color: "#FF5722", minDepth: 35, maxDepth: 65 },
                    { id: 'epic5', name: "River Sturgeon", chance: 0.1, value: 60, color: "#9370DB", minDepth: 60, maxDepth: 90 },
                    { id: 'epic6', name: "Striped Bass", chance: 0.05, value: 80, color: "#455A64", minDepth: 55, maxDepth: 85 },
                    { id: 'legendary5', name: "Royal Salmon", chance: 0.05, value: 250, color: "#CD5C5C", minDepth: 80, maxDepth: 100 },
                    { id: 'legendary6', name: "River Dragon", chance: 0.05, value: 350, color: "#00BCD4", minDepth: 75, maxDepth: 100 },
                    { id: 'mythic3', name: "Ghost Catfish", chance: 0.01, value: 400, color: "#E0E0E0", minDepth: 85, maxDepth: 100 },
                    { id: 'special3', name: "Glowing Carp", chance: 0.07, value: 45, color: "#76FF03", minDepth: 50, maxDepth: 80 }
                ]
            },
            {
                id: 'ocean',
                name: 'Deep Ocean',
                description: 'Vast ocean with rare exotic catches',
                background: 'linear-gradient(to bottom, #0277bd, #01579b)',
                unlocked: false,
                price: 25000,
                image: 'ocean',
                canvasImage: null, // Will be filled by canvas
                fishTypes: [
                    { id: 'common7', name: "Mackerel", chance: 0.2, value: 10, color: "#4169E1", minDepth: 20, maxDepth: 50 },
                    { id: 'common8', name: "Herring", chance: 0.2, value: 12, color: "#90CAF9", minDepth: 15, maxDepth: 45 },
                    { id: 'rare7', name: "Tuna", chance: 0.15, value: 30, color: "#1E90FF", minDepth: 40, maxDepth: 70 },
                    { id: 'rare8', name: "Mahi-Mahi", chance: 0.15, value: 35, color: "#FFC107", minDepth: 35, maxDepth: 65 },
                    { id: 'epic7', name: "Swordfish", chance: 0.1, value: 100, color: "#8A2BE2", minDepth: 60, maxDepth: 90 },
                    { id: 'epic8', name: "Hammerhead Shark", chance: 0.05, value: 150, color: "#757575", minDepth: 55, maxDepth: 85 },
                    { id: 'legendary7', name: "Blue Marlin", chance: 0.05, value: 500, color: "#0000CD", minDepth: 80, maxDepth: 100 },
                    { id: 'legendary8', name: "Colossal Squid", chance: 0.05, value: 800, color: "#D32F2F", minDepth: 75, maxDepth: 100 },
                    { id: 'mythic1', name: "Kraken Spawn", chance: 0.03, value: 1200, color: "#311B92", minDepth: 90, maxDepth: 100 },
                    { id: 'mythic2', name: "Abyssal Leviathan", chance: 0.02, value: 2000, color: "#880E4F", minDepth: 95, maxDepth: 100 },
                    { id: 'mythic4', name: "Anglerfish", chance: 0.03, value: 700, color: "#37474F", minDepth: 85, maxDepth: 100 },
                    { id: 'special4', name: "Electric Eel", chance: 0.07, value: 90, color: "#FFEB3B", minDepth: 60, maxDepth: 90 },
                    { id: 'legendary9', name: "Giant Manta Ray", chance: 0.04, value: 600, color: "#37474F", minDepth: 70, maxDepth: 95 },
                    { id: 'special5', name: "Moonfish", chance: 0.06, value: 120, color: "#E0E0E0", minDepth: 60, maxDepth: 85 }
                ]
            }
        ]);

        // Load canvas images
        function loadLocationCanvases() {
            fishingLocations.value.forEach(location => {
                location.canvasImage = locationRenderer.getLocationCanvas(location.id);
            });
        }
        
        // Boat customization options
        const boatCustomization = ref({
            hull: {
                name: 'Hull',
                current: 'basic',
                options: [
                    { id: 'basic', name: 'Basic Hull', unlocked: true, price: 0, speedBonus: 0, storageBonus: 0 },
                    { id: 'reinforced', name: 'Reinforced Hull', unlocked: false, price: 500, speedBonus: 1, storageBonus: 2 },
                    { id: 'premium', name: 'Premium Hull', unlocked: false, price: 2500, speedBonus: 2, storageBonus: 5 }
                ]
            },
            engine: {
                name: 'Engine',
                current: 'basic',
                options: [
                    { id: 'basic', name: 'Basic Engine', unlocked: true, price: 0, speedBonus: 0, autoFishBonus: 0 },
                    { id: 'improved', name: 'Improved Engine', unlocked: false, price: 750, speedBonus: 2, autoFishBonus: 0.1 },
                    { id: 'advanced', name: 'Advanced Engine', unlocked: false, price: 3500, speedBonus: 5, autoFishBonus: 0.3 }
                ]
            },
            equipment: {
                name: 'Equipment',
                current: 'basic',
                options: [
                    { id: 'basic', name: 'Basic Equipment', unlocked: true, price: 0, rarityBonus: 0 },
                    { id: 'sonar', name: 'Sonar System', unlocked: false, price: 1000, rarityBonus: 0.05 },
                    { id: 'advanced', name: 'Advanced Sonar', unlocked: false, price: 5000, rarityBonus: 0.15 }
                ]
            },
            storage: {
                name: 'Storage',
                current: 'basic',
                options: [
                    { id: 'basic', name: 'Basic Storage', unlocked: true, price: 0, capacityBonus: 0 },
                    { id: 'medium', name: 'Medium Storage', unlocked: false, price: 650, capacityBonus: 10 },
                    { id: 'large', name: 'Large Storage', unlocked: false, price: 3000, capacityBonus: 25 }
                ]
            }
        });

        // Encyclopedia data - tracks discovered fish
        const encyclopedia = ref({});
        
        // Initialize encyclopedia with all possible fish
        function initializeEncyclopedia() {
            fishingLocations.value.forEach(location => {
                location.fishTypes.forEach(fish => {
                    if (!encyclopedia.value[fish.id]) {
                        encyclopedia.value[fish.id] = {
                            id: fish.id,
                            name: fish.name,
                            color: fish.color,
                            discovered: false,
                            caught: 0,
                            location: location.name,
                            rarity: getRarityName(fish.chance),
                            value: fish.value,
                            record: { weight: 0, length: 0 }
                        };
                    }
                });
            });
        }

        // Helper function to get rarity name
        function getRarityName(chance) {
            if (chance <= 0.02) return 'Mythic';
            if (chance <= 0.05) return 'Legendary';
            if (chance <= 0.1) return 'Epic';
            if (chance <= 0.2) return 'Rare';
            return 'Common';
        }

        // Get current location
        const currentLocation = computed(() => {
            return fishingLocations.value.find(loc => loc.id === activeLocationId.value) || fishingLocations.value[0];
        });

        // Get current fish types based on location
        const currentFishTypes = computed(() => {
            return currentLocation.value.fishTypes;
        });

        // Change fishing location
        function changeLocation(locationId) {
            const location = fishingLocations.value.find(loc => loc.id === locationId);
            if (location && location.unlocked) {
                activeLocationId.value = locationId;
                // Update water background based on location
                document.querySelector('.water').style.background = location.background;
            }
        }

        // Unlock new location
        function unlockLocation(locationId) {
            const location = fishingLocations.value.find(loc => loc.id === locationId);
            if (location && !location.unlocked && money.value >= location.price) {
                money.value -= location.price;
                location.unlocked = true;
                // Immediately change to the new location
                changeLocation(locationId);
            }
        }

        // Upgrade boat part
        function upgradeBoatPart(partType, optionId) {
            const part = boatCustomization.value[partType];
            const option = part.options.find(opt => opt.id === optionId);
            
            if (option && !option.unlocked && money.value >= option.price) {
                money.value -= option.price;
                option.unlocked = true;
                applyBoatUpgrade(partType, optionId);
            } else if (option && option.unlocked) {
                applyBoatUpgrade(partType, optionId);
            }
        }

        // Apply boat upgrade effects
        function applyBoatUpgrade(partType, optionId) {
            const part = boatCustomization.value[partType];
            const prevOption = part.options.find(opt => opt.id === part.current);
            const newOption = part.options.find(opt => opt.id === optionId);
            
            if (newOption) {
                // Remove previous bonuses
                if (prevOption) {
                    if (partType === 'engine' && prevOption.autoFishBonus) {
                        autoFishingRate.value -= prevOption.autoFishBonus;
                    }
                    // Add other bonus removals as needed
                }
                
                // Apply new bonuses
                if (partType === 'engine' && newOption.autoFishBonus) {
                    autoFishingRate.value += newOption.autoFishBonus;
                    setupAutoFishing();
                }
                // Add other bonus applications as needed
                
                // Update current selection
                part.current = optionId;
            }
        }

        // Show fish details in encyclopedia
        function showFishDetails(fishId) {
            if (encyclopedia.value[fishId] && encyclopedia.value[fishId].discovered) {
                selectedFish.value = encyclopedia.value[fishId];
            }
        }

        // Add skills system state
        const totalXP = ref(0);
        const lastXpGain = ref(0);
        const fishingSkills = ref([]);
        const totalSkillsLevel = ref(0);
        const xpGainTimeoutId = ref(null);

        // Initialize fishing skills system
        function initializeSkillsSystem() {
            if (!CONFIG.skillsSystem || !CONFIG.skillsSystem.enabled) return;
            
            // Initialize each skill from config
            fishingSkills.value = CONFIG.skillsSystem.skills.map(skillConfig => ({
                id: skillConfig.id,
                name: skillConfig.name,
                description: skillConfig.description,
                level: 1,
                xp: 0,
                nextLevelXp: skillConfig.xpToLevelUp(1),
                maxLevel: skillConfig.maxLevel,
                bonusPerLevel: skillConfig.bonusPerLevel
            }));
            
            // Calculate total skills level
            calculateTotalSkillsLevel();
        }
        
        // Calculate total skill level (sum of all skill levels)
        function calculateTotalSkillsLevel() {
            totalSkillsLevel.value = fishingSkills.value.reduce((sum, skill) => sum + skill.level, 0);
        }
        
        // Get skill icon based on skill ID
        function getSkillIcon(skillId) {
            const icons = {
                casting: 'gps_fixed',
                efficiency: 'speed',
                luck: 'casino',
                knowledge: 'psychology',
                patience: 'hourglass_top',
                automation: 'settings_remote'
            };
            return icons[skillId] || 'star';
        }
        
        // Award XP for catching fish
        function awardFishingXP(fishType) {
            if (!CONFIG.skillsSystem || !CONFIG.skillsSystem.enabled) return;
            
            // Get fish rarity for XP multiplier
            const fishRarity = getRarityName(fishType.chance);
            const rarityMultiplier = CONFIG.skillsSystem.xpMultiplierByRarity[fishRarity] || 1;
            
            // Get base XP per fish
            const baseXP = CONFIG.skillsSystem.xpPerFish;
            
            // Calculate XP with rarity bonus
            let xpGain = baseXP * rarityMultiplier;
            
            // Apply patience skill bonus if available
            const patienceSkill = fishingSkills.value.find(skill => skill.id === 'patience');
            if (patienceSkill) {
                const patienceBonus = 1 + (patienceSkill.level * patienceSkill.bonusPerLevel);
                xpGain *= patienceBonus;
            }
            
            // Round to nearest integer
            xpGain = Math.round(xpGain);
            
            // Add XP to total
            totalXP.value += xpGain;
            
            // Show XP gain
            lastXpGain.value = xpGain;
            
            // Clear previous timeout if exists
            if (xpGainTimeoutId.value) {
                clearTimeout(xpGainTimeoutId.value);
            }
            
            // Set timeout to clear XP gain display
            xpGainTimeoutId.value = setTimeout(() => {
                lastXpGain.value = 0;
            }, 3000);
            
            // Distribute XP to a random skill
            const randomSkillIndex = Math.floor(Math.random() * fishingSkills.value.length);
            const skill = fishingSkills.value[randomSkillIndex];
            
            // Add XP to skill
            skill.xp += xpGain;
            
            // Check for level up
            checkSkillLevelUp(skill);
        }
        
        // Check if a skill can level up
        function checkSkillLevelUp(skill) {
            // Check if skill has enough XP and is not at max level
            if (skill.xp >= skill.nextLevelXp && skill.level < skill.maxLevel) {
                // Level up
                skill.level++;
                
                // Subtract XP used for leveling
                skill.xp -= skill.nextLevelXp;
                
                // Calculate XP for next level
                const skillConfig = CONFIG.skillsSystem.skills.find(s => s.id === skill.id);
                skill.nextLevelXp = skillConfig.xpToLevelUp(skill.level);
                
                // Update total skills level
                calculateTotalSkillsLevel();
                
                // Apply skill effects
                applySkillEffects();
                
                // Show level up notification
                showSkillLevelUpNotification(skill);
                
                // Check if can level up again (if has enough XP)
                checkSkillLevelUp(skill);
            }
        }
        
        // Apply skill effects based on current levels
        function applySkillEffects() {
            fishingSkills.value.forEach(skill => {
                switch (skill.id) {
                    case 'casting':
                        // Affects fishing power
                        updateFishingPowerFromSkills();
                        break;
                    case 'knowledge':
                        // Affects fish value - applied when selling
                        break;
                    case 'luck':
                        // Affects rare fish chance - applied when catching
                        break;
                    case 'efficiency':
                        // Affects fishing speed - applied when fishing
                        break;
                    case 'patience':
                        // Affects XP gain - applied when gaining XP
                        break;
                    case 'automation':
                        // Affects auto-fishing rate
                        updateAutoFishingRateFromSkills();
                        break;
                }
            });
        }
        
        // Update fishing power based on casting skill
        function updateFishingPowerFromSkills() {
            const castingSkill = fishingSkills.value.find(skill => skill.id === 'casting');
            if (!castingSkill) return;
            
            // Get base fishing power (from upgrades and prestige)
            const baseFishingPower = 1 + prestigeBonuses.fishingPower;
            
            // Calculate bonus from casting skill
            const castingBonus = castingSkill.level * castingSkill.bonusPerLevel;
            
            // Update fishing power with skill bonus
            fishingPower.value = baseFishingPower * (1 + castingBonus);
        }

        // Start fishing with improved animations
        function startFishing() {
            if (isFishing.value) return;
            
            isFishing.value = true;
            boatPosition.value = Math.random() * 80 + 10; // Random position between 10% and 90%
            
            // Animate fishing line down
            lineLength.value = 0;
            
            // Apply efficiency skill to fishing time
            const baseDelay = 500;
            const modifiedDelay = getSkillModifiedFishingTime(baseDelay);
            
            setTimeout(() => {
                // Adjust line length for mobile
                const maxDepth = window.innerWidth <= 600 ? 200 : 300;
                lineLength.value = maxDepth + Math.random() * 50; // Random depth
                
                // Show splash effect when line hits water
                showSplash.value = true;
                
                // Create water particles for splash effect
                createWaterParticles();
                
                setTimeout(() => {
                    showSplash.value = false;
                }, 1000);
                
                // Catch fish after line is fully extended
                // Apply efficiency skill to this delay as well
                const catchDelay = getSkillModifiedFishingTime(1000);
                
                setTimeout(() => {
                    catchFish();
                    
                    // Reel in the line
                    const reelDelay = getSkillModifiedFishingTime(500);
                    setTimeout(() => {
                        lineLength.value = 0;
                        setTimeout(() => {
                            isFishing.value = false;
                        }, reelDelay);
                    }, reelDelay);
                }, catchDelay);
            }, modifiedDelay);
        }
        
        // Create water particles for splash effect
        function createWaterParticles() {
            const splashContainer = document.querySelector('.water');
            const boatElement = document.querySelector('.boat');
            if (!splashContainer || !boatElement) return;
            
            const boatRect = boatElement.getBoundingClientRect();
            const splashX = boatRect.left + boatRect.width / 2;
            const splashY = boatRect.top + lineLength.value;
            
            // Add cinematic splash glow
            const splashGlow = document.createElement('div');
            splashGlow.className = 'water-splash-glow';
            splashGlow.style.left = `${splashX}px`;
            splashGlow.style.top = `${splashY}px`;
            splashContainer.appendChild(splashGlow);
            
            setTimeout(() => {
                splashGlow.remove();
            }, 1500);
            
            for (let i = 0; i < 12; i++) {
                const particle = document.createElement('div');
                particle.className = 'water-particle';
                
                // Random position around splash point
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 30 + 5;
                const x = splashX + Math.cos(angle) * distance;
                const y = splashY + Math.sin(angle) * distance;
                
                // Set particle styles
                particle.style.left = `${x}px`;
                particle.style.top = `${y}px`;
                particle.style.opacity = Math.random() * 0.7 + 0.3;
                particle.style.width = `${Math.random() * 3 + 1}px`;
                particle.style.height = `${Math.random() * 3 + 1}px`;
                particle.style.boxShadow = '0 0 2px rgba(255,255,255,0.8)';
                
                // Add animation
                particle.style.animation = `particle-fly ${Math.random() * 1.5 + 0.8}s ease-out forwards`;
                
                // Append particle
                splashContainer.appendChild(particle);
                
                // Remove particle after animation
                setTimeout(() => {
                    particle.remove();
                }, 2500);
            }
        }

        // Catch fish
        function catchFish(isAuto = false) {
            const catchAmount = isAuto ? Math.ceil(autoFishingRate.value) : fishingPower.value;
            
            for (let i = 0; i < catchAmount; i++) {
                let rand = Math.random();
                let cumulativeChance = 0;
                
                // Apply luck skill to adjust chances
                const adjustedFishTypes = currentFishTypes.value.map(fish => {
                    // Create a copy of the fish with adjusted chance
                    return {
                        ...fish,
                        adjustedChance: applyLuckSkillToFishChance(fish)
                    };
                });
                
                // Normalize chances
                const totalChance = adjustedFishTypes.reduce((sum, fish) => sum + fish.adjustedChance, 0);
                const normalizedFishTypes = adjustedFishTypes.map(fish => ({
                    ...fish,
                    normalizedChance: fish.adjustedChance / totalChance
                }));
                
                for (const fish of normalizedFishTypes) {
                    cumulativeChance += fish.normalizedChance;
                    
                    if (rand <= cumulativeChance) {
                        // Add fish to inventory
                        if (!inventory.value[fish.name]) {
                            inventory.value[fish.name] = 0;
                        }
                        inventory.value[fish.name]++;
                        totalFishCaught.value++;
                        
                        // Update encyclopedia
                        if (encyclopedia.value[fish.id]) {
                            const encycEntry = encyclopedia.value[fish.id];
                            encycEntry.caught++;
                            
                            if (!encycEntry.discovered) {
                                encycEntry.discovered = true;
                                // If this is the first caught fish, unlock encyclopedia
                                if (!encyclopediaUnlocked.value) {
                                    encyclopediaUnlocked.value = true;
                                }
                            }
                            
                            // Generate random weight and length for this catch
                            const weight = Math.round((fish.value * 0.5 + Math.random() * fish.value * 1.5) * 10) / 10;
                            const length = Math.round((fish.value * 0.2 + Math.random() * fish.value * 0.4) * 10) / 10;
                            
                            // Update record if this is bigger
                            if (weight > encycEntry.record.weight) {
                                encycEntry.record.weight = weight;
                            }
                            if (length > encycEntry.record.length) {
                                encycEntry.record.length = length;
                            }
                        }
                        
                        // Award XP for catching fish
                        awardFishingXP(fish);
                        
                        // Force Vue to recognize the change
                        inventory.value = { ...inventory.value };
                        encyclopedia.value = { ...encyclopedia.value };
                        break;
                    }
                }
            }
        }

        // Sell fish
        function sellFish(type) {
            if (inventory.value[type]) {
                const fishType = currentFishTypes.value.find(fish => fish.name === type);
                if (fishType) {
                    // Apply prestige bonus to fish value
                    const prestigeMultiplier = 1 + prestigeBonuses.fishValue;
                    
                    // Apply knowledge skill bonus
                    const baseValue = fishType.value * inventory.value[type];
                    const valueWithSkill = applyFishValueSkillBonus(baseValue);
                    
                    // Apply final value with prestige bonus
                    const value = Math.floor(valueWithSkill * prestigeMultiplier);
                    
                    money.value += value;
                    inventory.value[type] = 0;
                    
                    // Force Vue to recognize the change
                    inventory.value = { ...inventory.value };
                }
            }
        }

        // Auto sell fish
        function autoSellFish() {
            if (Object.keys(inventory.value).length === 0) return;
            
            // Get all fish types in inventory
            const fishTypes = Object.keys(inventory.value);
            
            // Sell 5% of each type of fish every interval
            fishTypes.forEach(type => {
                if (inventory.value[type] > 0) {
                    const fishType = fishingLocations.value.flatMap(loc => loc.fishTypes).find(fish => fish.name === type);
                    if (fishType) {
                        // Calculate amount to sell (5% of inventory, min 1)
                        const amountToSell = Math.max(1, Math.floor(inventory.value[type] * 0.05));
                        const amountActuallySold = Math.min(amountToSell, inventory.value[type]);
                        
                        // Apply prestige bonus to fish value
                        const prestigeMultiplier = 1 + prestigeBonuses.fishValue;
                        
                        // Apply knowledge skill bonus
                        const baseValue = fishType.value * amountActuallySold;
                        const valueWithSkill = applyFishValueSkillBonus(baseValue);
                        
                        // Apply final value with prestige bonus
                        const value = Math.floor(valueWithSkill * prestigeMultiplier);
                        
                        // Add money and reduce inventory
                        money.value += value;
                        inventory.value[type] -= amountActuallySold;
                        
                        // If inventory is empty for this type, set to 0 but don't remove the key
                        if (inventory.value[type] <= 0) {
                            inventory.value[type] = 0;
                        }
                    }
                }
            });
            
            // Force Vue to recognize the change
            inventory.value = { ...inventory.value };
        }

        // Toggle encyclopedia view
        function toggleEncyclopedia() {
            showEncyclopedia.value = !showEncyclopedia.value;
            if (showEncyclopedia.value) {
                activeTab.value = 'encyclopedia';
            }
        }

        // Toggle boat customization view
        function toggleBoatCustomization() {
            showBoatCustomization.value = !showBoatCustomization.value;
            if (showBoatCustomization.value) {
                activeTab.value = 'boat';
            }
        }

        // Change active tab
        function changeTab(tabName) {
            activeTab.value = tabName;
            
            // Close modals when changing tabs
            if (tabName !== 'encyclopedia') showEncyclopedia.value = false;
            if (tabName !== 'boat') showBoatCustomization.value = false;
        }

        // Close modals
        function closeModal() {
            showEncyclopedia.value = false;
            showBoatCustomization.value = false;
            selectedFish.value = null;
        }

        // Get number of discovered fish
        const discoveredFishCount = computed(() => {
            return Object.values(encyclopedia.value).filter(fish => fish.discovered).length;
        });

        // Get total number of fish species
        const totalFishCount = computed(() => {
            return Object.keys(encyclopedia.value).length;
        });

        // Discovery percentage
        const discoveryPercentage = computed(() => {
            if (totalFishCount.value === 0) return 0;
            return Math.round((discoveredFishCount.value / totalFishCount.value) * 100);
        });

        // Reset progress function with enhanced encyclopedia reset
        function resetProgress() {
            if (confirm('Are you sure you want to reset ALL progress? This includes your Prestige Level and cannot be undone!')) {
                // Reset prestige level and bonuses
                prestigeLevel.value = 0;
                calculatePrestigeBonuses();
                
                // Clear localStorage
                localStorage.removeItem('fishingTycoonSave');
                
                // Reset all game state
                money.value = 0;
                inventory.value = {};
                totalFishCaught.value = 0;
                fishingPower.value = 1;
                autoFishingRate.value = 0;
                
                // Reset upgrade levels
                upgrades.value.forEach(upgrade => {
                    upgrade.level = upgrade.id === 'rod' || upgrade.id === 'boat' || upgrade.id === 'lure' ? 1 : 0;
                });
                
                // Reset locations
                fishingLocations.value.forEach((loc, index) => {
                    loc.unlocked = index === 0; // Only the first location is unlocked
                });
                activeLocationId.value = 'pond'; // Reset to first location
                
                // Reset boat customization
                Object.keys(boatCustomization.value).forEach(partType => {
                    boatCustomization.value[partType].current = 'basic';
                    boatCustomization.value[partType].options.forEach(option => {
                        option.unlocked = option.id === 'basic';
                    });
                });
                
                // Reset encyclopedia - completely reinitialize it
                encyclopediaUnlocked.value = false;
                Object.keys(encyclopedia.value).forEach(fishId => {
                    encyclopedia.value[fishId].discovered = false;
                    encyclopedia.value[fishId].caught = 0;
                    encyclopedia.value[fishId].record = { weight: 0, length: 0 };
                });
                
                // Reset fishing skills
                totalXP.value = 0;
                fishingSkills.value.forEach(skill => {
                    skill.level = 1;
                    skill.xp = 0;
                    skill.nextLevelXp = CONFIG.skillsSystem.skills.find(s => s.id === skill.id).xpToLevelUp(1);
                });
                calculateTotalSkillsLevel();
                
                // Keep the emails
                CONFIG.inboxSystem.welcomeMessageSent = true;
                
                // Ensure the encyclopedia is fully reset
                encyclopedia.value = { ...encyclopedia.value };
                
                selectedFish.value = null;
                
                // Reset auto fishing
                if (autoFishingInterval) {
                    clearInterval(autoFishingInterval);
                    autoFishingInterval = null;
                }
                autoFishingActive.value = false;
                
                // Update water background to match initial location
                document.querySelector('.water').style.background = fishingLocations.value[0].background;
                
                // Close any open modals
                showEncyclopedia.value = false;
                showBoatCustomization.value = false;
                
                alert('Game progress has been completely reset!');
            }
        }
        
        // Save and quit function
        function saveAndQuit() {
            // Save current game state
            const saveData = {
                money: money.value,
                inventory: inventory.value,
                totalFishCaught: totalFishCaught.value,
                fishingPower: fishingPower.value,
                autoFishingRate: autoFishingRate.value,
                upgrades: upgrades.value.map(u => ({ id: u.id, level: u.level, cost: u.cost })),
                fishingLocations: fishingLocations.value.map(loc => ({ 
                    id: loc.id, 
                    unlocked: loc.unlocked 
                })),
                activeLocationId: activeLocationId.value,
                boatCustomization: boatCustomization.value,
                encyclopedia: encyclopedia.value,
                encyclopediaUnlocked: encyclopediaUnlocked.value,
                lastOnlineTime: Date.now(),
                prestigeLevel: prestigeLevel.value,
                emails: emails.value,
                fishingSkills: fishingSkills.value,
                totalXP: totalXP.value
            };
            localStorage.setItem('fishingTycoonSave', JSON.stringify(saveData));
            
            // Show confirmation and redirect
            if (confirm('Game saved successfully! Close the game?')) {
                // Create a goodbye page and redirect
                document.body.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:linear-gradient(135deg, #0277bd, #01579b);color:white;text-align:center;padding:20px;">
                        <h1 style="font-size:3rem;margin-bottom:20px;">Game Saved Successfully!</h1>
                        <p style="font-size:1.5rem;margin-bottom:30px;">Thank you for playing Trawler's Empire</p>
                        <p style="opacity:0.8;margin-bottom:20px;">Your game progress has been saved.</p>
                        <button onclick="window.location.reload()" style="padding:10px 30px;background:#4CAF50;color:white;border:none;border-radius:5px;font-size:1.2rem;cursor:pointer;transition:all 0.3s;">Return to Game</button>
                    </div>
                `;
            }
        }
        
        // Calculate offline progress
        function calculateOfflineProgress() {
            if (!CONFIG.offlineProgress.enabled || autoFishingRate.value <= 0) {
                return;
            }

            const now = Date.now();
            const lastSaved = lastOnlineTime.value || now;
            const timeAwayMs = now - lastSaved;
            
            // Don't calculate if time away is very short (less than 1 minute)
            if (timeAwayMs < 60000) {
                return;
            }
            
            // Calculate time away in hours, capped at maxHours from config
            const timeAwayHours = Math.min(timeAwayMs / 3600000, CONFIG.offlineProgress.maxHours);
            
            // Calculate fish caught while away
            const offlineRate = autoFishingRate.value * CONFIG.offlineProgress.efficiencyRate;
            const offlineCatches = Math.floor(offlineRate * timeAwayHours * 3600); // Convert to seconds
            
            if (offlineCatches <= 0) {
                return;
            }
            
            // Record time away in hours and minutes format for display
            const hours = Math.floor(timeAwayHours);
            const minutes = Math.floor((timeAwayHours - hours) * 60);
            offlineEarnings.value.timeAway = `${hours}h ${minutes}m`;
            
            // Simulate fish catches
            let totalMoney = 0;
            let totalFish = 0;
            
            // Determine how many of each type of fish based on current location
            const fishTypes = currentFishTypes.value;
            for (let i = 0; i < offlineCatches; i++) {
                let rand = Math.random();
                let cumulativeChance = 0;
                
                for (const fish of fishTypes) {
                    cumulativeChance += fish.chance;
                    
                    if (rand <= cumulativeChance) {
                        // Add fish to inventory
                        if (!inventory.value[fish.name]) {
                            inventory.value[fish.name] = 0;
                        }
                        inventory.value[fish.name]++;
                        totalFish++;
                        
                        // Calculate money (automatically sell if inventory would get too large)
                        const maxOfflineInventory = 1000; // Maximum inventory size while offline
                        if (inventory.value[fish.name] > maxOfflineInventory) {
                            totalMoney += fish.value;
                            inventory.value[fish.name]--;
                        }
                        
                        // Update encyclopedia
                        if (encyclopedia.value[fish.id]) {
                            const encycEntry = encyclopedia.value[fish.id];
                            encycEntry.caught++;
                            
                            if (!encycEntry.discovered) {
                                encycEntry.discovered = true;
                                // If this is the first caught fish, unlock encyclopedia
                                if (!encyclopediaUnlocked.value) {
                                    encyclopediaUnlocked.value = true;
                                }
                            }
                        }
                        
                        break;
                    }
                }
            }
            
            // Update totals
            totalFishCaught.value += totalFish;
            money.value += totalMoney;
            
            // Set values for offline modal
            offlineEarnings.value.fishCaught = totalFish;
            offlineEarnings.value.money = totalMoney;
            
            // Show offline modal
            showOfflineModal.value = true;
            
            // Force Vue to recognize the change to inventory
            inventory.value = { ...inventory.value };
            encyclopedia.value = { ...encyclopedia.value };
        }

        // Close offline modal
        function closeOfflineModal() {
            showOfflineModal.value = false;
        }

        // Add prestige system state
        const prestigeLevel = ref(0);
        const showPrestigeModal = ref(false);
        const currentRank = ref("Novice Fisherman");
        const prestigeBonuses = reactive({
            fishingPower: 0,
            autoFishing: 0,
            fishValue: 0,
            startingMoney: 0
        });

        // Get current rank title based on prestige level
        function getCurrentRank() {
            const ranks = CONFIG.prestigeSystem.ranks;
            let highestMatch = ranks[0];
            
            for (const rank of ranks) {
                if (prestigeLevel.value >= rank.level && rank.level >= highestMatch.level) {
                    highestMatch = rank;
                }
            }
            
            return highestMatch.title;
        }
        
        // Get highest rank level achieved
        function getCurrentHighestRankLevel() {
            const ranks = CONFIG.prestigeSystem.ranks;
            let highestLevel = 0;
            
            for (const rank of ranks) {
                if (prestigeLevel.value >= rank.level && rank.level > highestLevel) {
                    highestLevel = rank.level;
                }
            }
            
            return highestLevel;
        }
        
        // Check if player can prestige
        const canPrestige = computed(() => {
            const reqs = CONFIG.prestigeSystem.requirements;
            return money.value >= reqs.minMoney &&
                  totalFishCaught.value >= reqs.minFishCaught &&
                  fishingLocations.value.filter(loc => loc.unlocked).length >= reqs.minLocationsUnlocked &&
                  discoveryPercentage.value >= reqs.minEncyclopediaCompletion;
        });
        
        // Open prestige modal
        function openPrestigeModal() {
            showPrestigeModal.value = true;
        }
        
        // Close prestige modal
        function closePrestigeModal() {
            showPrestigeModal.value = false;
        }
        
        // Calculate prestige bonuses
        function calculatePrestigeBonuses() {
            const benefits = CONFIG.prestigeSystem.benefits;
            const level = prestigeLevel.value;
            
            prestigeBonuses.fishingPower = +(level * benefits.fishingPowerMultiplier).toFixed(2);
            prestigeBonuses.autoFishing = +(level * benefits.autoFishingBonus).toFixed(2);
            prestigeBonuses.fishValue = +(level * benefits.fishValueMultiplier).toFixed(2);
            prestigeBonuses.startingMoney = Math.floor(benefits.startingMoneyBase * Math.pow(benefits.startingMoneyMultiplier, level));
            
            // Update current rank
            currentRank.value = getCurrentRank();
        }
        
        // Perform prestige
        function performPrestige() {
            if (!canPrestige.value) return;
            
            if (confirm('Are you sure you want to prestige? You will lose most of your progress but gain permanent bonuses!')) {
                // Increment prestige level
                prestigeLevel.value++;
                
                // Calculate new bonuses
                calculatePrestigeBonuses();
                
                // Reset game state but keep prestige data
                resetForPrestige();
                
                // Close modal
                closePrestigeModal();
                
                // Show confirmation
                alert(`Congratulations! You are now Prestige Level ${prestigeLevel.value} (${currentRank.value})`);
            }
        }
        
        // Reset progress for prestige but keep certain data
        function resetForPrestige() {
            // Calculate starting money based on prestige level
            const startingMoney = prestigeBonuses.startingMoney;
            
            // Reset basic stats
            money.value = startingMoney;
            inventory.value = {};
            totalFishCaught.value = 0;
            
            // Set fishing power with prestige bonus
            fishingPower.value = 1 + prestigeBonuses.fishingPower;
            
            // Set auto fishing with prestige bonus
            autoFishingRate.value = prestigeBonuses.autoFishing;
            
            // Reset upgrade levels except for prestige-derived bonuses
            upgrades.value.forEach(upgrade => {
                upgrade.level = upgrade.id === 'rod' || upgrade.id === 'boat' || upgrade.id === 'lure' ? 1 : 0;
            });
            
            // Reset locations but keep encyclopedia knowledge
            fishingLocations.value.forEach((loc, index) => {
                loc.unlocked = index === 0; // Only the first location is unlocked
            });
            activeLocationId.value = 'pond'; // Reset to first location
            
            // Reset boat customization
            Object.keys(boatCustomization.value).forEach(partType => {
                boatCustomization.value[partType].current = 'basic';
                boatCustomization.value[partType].options.forEach(option => {
                    option.unlocked = option.id === 'basic';
                });
            });
            
            // Keep encyclopedia discovery data - this is maintained through prestiges
            
            // Reset fishing skills but give 1 free skill level per prestige level
            totalXP.value = 0;
            fishingSkills.value.forEach(skill => {
                // Start at level 1 + a bonus level for each prestige level (capped at max level)
                skill.level = Math.min(1 + prestigeLevel.value, skill.maxLevel);
                skill.xp = 0;
                skill.nextLevelXp = CONFIG.skillsSystem.skills.find(s => s.id === skill.id).xpToLevelUp(skill.level);
            });
            calculateTotalSkillsLevel();
            
            // Reset auto fishing setup if applicable
            setupAutoFishing();
            
            // Update water background to match initial location
            document.querySelector('.water').style.background = fishingLocations.value[0].background;
            
            // Close any open modals
            showEncyclopedia.value = false;
            showBoatCustomization.value = false;
        }

        // Update auto-fishing rate based on automation skill
        function updateAutoFishingRateFromSkills() {
            const automationSkill = fishingSkills.value.find(skill => skill.id === 'automation');
            if (!automationSkill) return;
            
            // Get base auto-fishing rate (from upgrades)
            const autoFisherUpgrade = upgrades.value.find(u => u.id === 'autoFisher');
            const baseAutoRate = autoFisherUpgrade ? autoFisherUpgrade.getEffect(autoFisherUpgrade.level) : 0;
            
            // Calculate bonus from automation skill
            const automationBonus = automationSkill.level * automationSkill.bonusPerLevel;
            
            // Update auto-fishing rate with skill bonus (add prestige bonus too)
            autoFishingRate.value = baseAutoRate * (1 + automationBonus) + prestigeBonuses.autoFishing;
            
            // Update auto-fishing functionality
            setupAutoFishing();
        }

        // Purchase upgrade
        function purchaseUpgrade(upgradeId) {
            const upgrade = upgrades.value.find(u => u.id === upgradeId);
            if (upgrade && money.value >= upgrade.cost) {
                money.value -= upgrade.cost;
                upgrade.level++;

                // Apply upgrade effects
                if (upgrade.id === 'rod' || upgrade.id === 'bait' || upgrade.id === 'lure') {
                    // Update fishing power based on all fishing upgrades
                    updateFishingPower();
                } else if (upgrade.id === 'autoFisher') {
                    // Base auto-fishing rate from the upgrade
                    const baseRate = upgrade.getEffect(upgrade.level);
                    // Update with skill effects
                    updateAutoFishingRateFromSkills();
                } else if (upgrade.id === 'merchant' && upgrade.level === 1) {
                    setupAutoSelling();
                }
            }
        }

        // Formatting helper for numbers
        function formatNumber(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        }
        
        // Get fish color from type
        function getFishColor(type) {
            const fish = fishingLocations.value.flatMap(loc => loc.fishTypes).find(fish => fish.name === type);
            return fish ? fish.color : '#64B5F6';
        }
        
        // Calculate total skills bonus percentage
        function calculateTotalSkillsBonus() {
            let totalBonus = 0;
            fishingSkills.value.forEach(skill => {
                totalBonus += (skill.level * skill.bonusPerLevel * 100);
            });
            return totalBonus.toFixed(1);
        }

        // Initialize on mount with ocean ambience
        onMounted(() => {
            // Initialize existing features
            // Load all canvas images
            loadLocationCanvases();
            
            // Initialize waterline canvas
            initWaterlineCanvas();
            
            // Add cinematic lighting effects
            initializeCinematicEffects();
            
            // Start background music
            const backgroundMusic = document.getElementById('background-music');
            backgroundMusic.volume = 0.6; // Set volume to 60%
            backgroundMusic.play().catch(e => console.log("Audio autoplay prevented:", e));
            
            // Generate initial fish
            for (let i = 0; i < 8; i++) {
                generateFish();
            }
            
            // Generate new fish periodically
            setInterval(() => {
                // Adjust fish count based on device performance
                const maxFish = window.innerWidth <= 600 ? 6 : 12;
                if (fishInWater.value.length < maxFish) {
                    generateFish();
                }
            }, 3000);
            
            // Update fish positions more frequently for smoother animation
            setInterval(() => {
                updateFishPositions();
            }, 50);
            
            // Initialize auto-fishing if enabled
            setupAutoFishing();
            
            // Initialize auto-selling if enabled
            setupAutoSelling();
            
            // Initialize encyclopedia
            initializeEncyclopedia();
            
            // Initialize inbox
            initializeInbox();
            
            // Initialize skills system
            initializeSkillsSystem();
            
            // Initialize ocean ambience effects
            setupOceanAmbience();
            
            // Initialize seasonal events
            if (CONFIG.seasonalEvents.enabled) {
                detectSeasonalEvents();
                
                // Update seasonal events once per day
                setInterval(() => {
                    detectSeasonalEvents();
                }, 1000 * 60 * 60); // Check every hour
            }
        });
        
        // Update fish positions
        function updateFishPositions() {
            const now = Date.now();
            fishInWater.value.forEach(fish => {
                // Change direction randomly
                if (now >= fish.nextDirectionChange) {
                    fish.direction *= -1; // Flip direction
                    fish.nextDirectionChange = now + Math.random() * 10000 + 5000;
                }
                
                // Update horizontal position based on direction and speed
                fish.position += fish.speed * fish.direction;
                
                // Update vertical position with small oscillation
                fish.depth += fish.verticalSpeed;
                
                // Bounce if reaching edges
                if (fish.depth < 40) {
                    fish.depth = 40;
                    fish.verticalSpeed *= -1;
                } else if (fish.depth > 90) {
                    fish.depth = 90;
                    fish.verticalSpeed *= -1;
                }
                
                // Remove fish that swim off screen (with buffer)
                if (fish.position < -20 || fish.position > 120) {
                    fishInWater.value = fishInWater.value.filter(f => f.id !== fish.id);
                }
            });
        }
        
        // Initialize ocean ambience effects
        function setupOceanAmbience() {
            // Create subtle water movement and ambient sounds
            const waterContainer = document.querySelector('.water');
            if (!waterContainer) return;
            
            // Add subtle bubbles
            for (let i = 0; i < 8; i++) {
                const bubble = document.createElement('div');
                bubble.className = 'ambient-particle';
                bubble.style.left = `${Math.random() * 100}%`;
                bubble.style.top = `${Math.random() * 100}%`;
                bubble.style.width = `${Math.random() * 4 + 2}px`;
                bubble.style.height = `${Math.random() * 4 + 2}px`;
                bubble.style.opacity = Math.random() * 0.5 + 0.2;
                bubble.style.animationDuration = `${Math.random() * 20 + 10}s`;
                bubble.style.animationDelay = `${Math.random() * 10}s`;
                waterContainer.appendChild(bubble);
            }
        }
        
        // Load game data
        onMounted(() => {
            const savedData = localStorage.getItem('fishingTycoonSave');
            if (savedData) {
                try {
                    const data = JSON.parse(savedData);
                    money.value = data.money || 0;
                    inventory.value = data.inventory || {};
                    totalFishCaught.value = data.totalFishCaught || 0;
                    fishingPower.value = data.fishingPower || 1;
                    autoFishingRate.value = data.autoFishingRate || 0;
                    
                    // Load last online time
                    if (data.lastOnlineTime) {
                        lastOnlineTime.value = data.lastOnlineTime;
                        // Calculate offline progress if auto-fishing is active
                        calculateOfflineProgress();
                    }
                    
                    // Update upgrade levels
                    if (data.upgrades) {
                        data.upgrades.forEach(savedUpgrade => {
                            const upgrade = upgrades.value.find(u => u.id === savedUpgrade.id);
                            if (upgrade) {
                                upgrade.level = savedUpgrade.level;
                                upgrade.cost = savedUpgrade.cost;
                            }
                        });
                    }
                    
                    // Update location data
                    if (data.fishingLocations) {
                        data.fishingLocations.forEach(savedLoc => {
                            const loc = fishingLocations.value.find(l => l.id === savedLoc.id);
                            if (loc) {
                                loc.unlocked = savedLoc.unlocked;
                            }
                        });
                    }
                    
                    // Load active location
                    if (data.activeLocationId) {
                        activeLocationId.value = data.activeLocationId;
                    }
                    
                    // Load boat customization
                    if (data.boatCustomization) {
                        Object.keys(data.boatCustomization).forEach(partType => {
                            if (boatCustomization.value[partType]) {
                                boatCustomization.value[partType].current = data.boatCustomization[partType].current;
                                
                                data.boatCustomization[partType].options.forEach(savedOpt => {
                                    const opt = boatCustomization.value[partType].options.find(o => o.id === savedOpt.id);
                                    if (opt) {
                                        opt.unlocked = savedOpt.unlocked;
                                    }
                                });
                            }
                        });
                    }
                    
                    // Load encyclopedia
                    if (data.encyclopedia) {
                        Object.keys(data.encyclopedia).forEach(fishId => {
                            if (encyclopedia.value[fishId]) {
                                encyclopedia.value[fishId] = data.encyclopedia[fishId];
                            }
                        });
                        encyclopediaUnlocked.value = data.encyclopediaUnlocked || false;
                    }
                    
                    // Load inbox data
                    if (data.emails) {
                        emails.value = data.emails;
                        unreadEmailCount.value = emails.value.filter(e => !e.read).length;
                    }
                    
                    // Load prestige data
                    if (data.prestigeLevel !== undefined) {
                        prestigeLevel.value = data.prestigeLevel;
                        calculatePrestigeBonuses();
                    }
                    
                    // Load fishing skills data
                    if (data.fishingSkills) {
                        totalXP.value = data.totalXP || 0;
                        
                        data.fishingSkills.forEach(savedSkill => {
                            const skill = fishingSkills.value.find(s => s.id === savedSkill.id);
                            if (skill) {
                                skill.level = savedSkill.level;
                                skill.xp = savedSkill.xp;
                                skill.nextLevelXp = savedSkill.nextLevelXp;
                            }
                        });
                        
                        calculateTotalSkillsLevel();
                        applySkillEffects();
                    }
                    
                    // Setup auto fishing based on loaded data
                    setupAutoFishing();
                } catch (error) {
                    console.error('Error loading save data:', error);
                }
            } else {
                // First time playing - initialize inbox
                initializeInbox();
            }
            
            // Calculate prestige bonuses on initial load
            calculatePrestigeBonuses();
        });
        
        // Update save function to include skills data
        watch([
            money, inventory, totalFishCaught, fishingPower, autoFishingRate, upgrades,
            fishingLocations, activeLocationId, boatCustomization, encyclopedia, encyclopediaUnlocked,
            prestigeLevel, emails, fishingSkills, totalXP
        ], () => {
            const saveData = {
                money: money.value,
                inventory: inventory.value,
                totalFishCaught: totalFishCaught.value,
                fishingPower: fishingPower.value,
                autoFishingRate: autoFishingRate.value,
                upgrades: upgrades.value.map(u => ({ id: u.id, level: u.level, cost: u.cost })),
                fishingLocations: fishingLocations.value.map(loc => ({ 
                    id: loc.id, 
                    unlocked: loc.unlocked 
                })),
                activeLocationId: activeLocationId.value,
                boatCustomization: boatCustomization.value,
                encyclopedia: encyclopedia.value,
                encyclopediaUnlocked: encyclopediaUnlocked.value,
                lastOnlineTime: Date.now(), // Save current timestamp
                prestigeLevel: prestigeLevel.value, // Save prestige level
                emails: emails.value,
                fishingSkills: fishingSkills.value,
                totalXP: totalXP.value
            };
            localStorage.setItem('fishingTycoonSave', JSON.stringify(saveData));
        }, { deep: true });

        const seasonalParticles = ref([]);
        const currentSeason = ref(null);
        const currentSpecialEvent = ref(null);

        // Initialize waterline canvas
        function initWaterlineCanvas() {
            // Create canvas for water effects if needed
            const waterContainer = document.querySelector('.water');
            if (!waterContainer) return;
            
            // Remove existing canvas if there's one
            const existingCanvas = document.querySelector('.waterline-canvas');
            if (existingCanvas) existingCanvas.remove();
            
            // Create new canvas
            waterlineCanvas = document.createElement('canvas');
            waterlineCanvas.className = 'waterline-canvas';
            waterlineCanvas.width = waterContainer.clientWidth;
            waterlineCanvas.height = waterContainer.clientHeight;
            waterContainer.appendChild(waterlineCanvas);
            
            // Get context
            waterlineCtx = waterlineCanvas.getContext('2d');
            
            // Start animation
            animateWaterline();
        }
        
        // Animate waterline
        function animateWaterline() {
            if (!waterlineCanvas || !waterlineCtx) return;
            
            // Clear canvas
            waterlineCtx.clearRect(0, 0, waterlineCanvas.width, waterlineCanvas.height);
            
            // Draw subtle water movement
            waterlineCtx.strokeStyle = 'rgba(255,255,255,0.1)';
            waterlineCtx.lineWidth = 1.5;
            
            // Draw waves
            waterlineCtx.beginPath();
            for (let x = 0; x < waterlineCanvas.width; x += 20) {
                const y = Math.sin((x + waveOffset) / 30) * 5 + 50;
                if (x === 0) {
                    waterlineCtx.moveTo(x, y);
                } else {
                    waterlineCtx.lineTo(x, y);
                }
            }
            waterlineCtx.stroke();
            
            // Update offset for animation
            waveOffset += 0.5;
            
            // Repeat animation
            waterlineAnimationId = requestAnimationFrame(animateWaterline);
        }
        
        // Generate new fish function
        function generateFish() {
            const fishTypes = currentFishTypes.value;
            if (!fishTypes || fishTypes.length === 0) return;
            
            // Randomly select a fish type from current location
            const randomIndex = Math.floor(Math.random() * fishTypes.length);
            const fishType = fishTypes[randomIndex];
            
            // Create a unique ID for this fish
            const fishId = `fish-${fishIdCounter++}`;
            
            // Calculate a random depth within the fish's preferred range
            const depth = Math.random() * (fishType.maxDepth - fishType.minDepth) + fishType.minDepth;
            
            // Add the fish to our water
            fishInWater.value.push({
                id: fishId,
                type: fishType.name,
                color: fishType.color,
                position: Math.random() < 0.5 ? -10 : 110, // Start offscreen (left or right)
                depth: depth,
                direction: Math.random() < 0.5 ? 1 : -1, // Swimming direction
                speed: Math.random() * 0.5 + 0.5, // Random speed
                verticalSpeed: Math.random() * 0.2 - 0.1, // Small vertical movement
                nextDirectionChange: Date.now() + Math.random() * 10000 + 5000 // Change direction randomly
            });
            
            // Remove fish after some time
            setTimeout(() => {
                fishInWater.value = fishInWater.value.filter(fish => fish.id !== fishId);
            }, Math.random() * 20000 + 15000); // Fish live for 15-35 seconds
        }
        
        // Initialize cinematic effects
        function initializeCinematicEffects() {
            const waterContainer = document.querySelector('.water');
            if (!waterContainer) return;
            
            // Add reflection overlay
            const reflectionOverlay = document.createElement('div');
            reflectionOverlay.className = 'water-reflection-overlay';
            waterContainer.appendChild(reflectionOverlay);
            
            // Add light source
            const lightSource = document.createElement('div');
            lightSource.className = 'light-source';
            waterContainer.appendChild(lightSource);
            
            // Add subtle caustic effects
            for (let i = 0; i < 3; i++) {
                const caustic = document.createElement('div');
                caustic.className = 'caustic-light';
                caustic.style.left = `${Math.random() * 70 + 15}%`;
                caustic.style.top = `${Math.random() * 50 + 20}%`;
                caustic.style.animationDelay = `${i * 3}s`;
                waterContainer.appendChild(caustic);
            }
            
            // Add god rays
            const godRays = document.createElement('div');
            godRays.className = 'god-rays';
            waterContainer.appendChild(godRays);
            
            // Add depth of field overlay
            const depthOfField = document.createElement('div');
            depthOfField.className = 'depth-of-field-overlay';
            waterContainer.appendChild(depthOfField);
            
            // Add ambient particles
            for (let i = 0; i < 10; i++) {
                const particle = document.createElement('div');
                particle.className = 'ambient-particle';
                particle.style.left = `${Math.random() * 100}%`;
                particle.style.top = `${Math.random() * 100}%`;
                particle.style.width = `${Math.random() * 3 + 1}px`;
                particle.style.height = `${Math.random() * 3 + 1}px`;
                particle.style.opacity = Math.random() * 0.5 + 0.1;
                particle.style.animationDuration = `${Math.random() * 15 + 10}s`;
                particle.style.animationDelay = `${Math.random() * 5}s`;
                waterContainer.appendChild(particle);
            }
        }
        
        // Get highest rank level achieved
        function getCurrentHighestRankLevel() {
            const ranks = CONFIG.prestigeSystem.ranks;
            let highestLevel = 0;
            
            for (const rank of ranks) {
                if (prestigeLevel.value >= rank.level && rank.level > highestLevel) {
                    highestLevel = rank.level;
                }
            }
            
            return highestLevel;
        }

        // Add methods for applying skill bonuses
        function applyLuckSkillToFishChance(fish) {
            const luckSkill = fishingSkills.value.find(skill => skill.id === 'luck');
            if (!luckSkill) return fish.chance;
            
            // Calculate luck bonus - increase rare fish chances
            const rarityFactor = fish.chance < 0.1 ? 1.5 : 1; // Higher boost for rarer fish
            const luckBonus = luckSkill.level * luckSkill.bonusPerLevel * rarityFactor;
            
            // Return adjusted chance
            return fish.chance * (1 + luckBonus);
        }
        
        function applyFishValueSkillBonus(baseValue) {
            const knowledgeSkill = fishingSkills.value.find(skill => skill.id === 'knowledge');
            if (!knowledgeSkill) return baseValue;
            
            // Calculate knowledge bonus for fish value
            const knowledgeBonus = knowledgeSkill.level * knowledgeSkill.bonusPerLevel;
            
            // Return adjusted value
            return baseValue * (1 + knowledgeBonus);
        }
        
        function getSkillModifiedFishingTime(baseTime) {
            const efficiencySkill = fishingSkills.value.find(skill => skill.id === 'efficiency');
            if (!efficiencySkill) return baseTime;
            
            // Calculate efficiency bonus - reduced fishing time
            const efficiencyBonus = efficiencySkill.level * efficiencySkill.bonusPerLevel;
            
            // Return adjusted time (minimum 50% of original)
            return Math.max(baseTime * (1 - efficiencyBonus), baseTime * 0.5);
        }
        
        function showSkillLevelUpNotification(skill) {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = 'skill-levelup-notification';
            
            // Notification content
            notification.innerHTML = `
                <div class="levelup-icon">
                    <i class="material-icons">${getSkillIcon(skill.id)}</i>
                </div>
                <div class="levelup-details">
                    <h4>${skill.name} Level Up!</h4>
                    <p>Level ${skill.level} reached</p>
                </div>
            `;
            
            // Add to document
            document.body.appendChild(notification);
            
            // Trigger animation after a small delay
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            // Remove notification after a few seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500);
            }, 4000);
        }
        
        // Update fishing power based on all fishing upgrades
        function updateFishingPower() {
            const rod = upgrades.value.find(u => u.id === 'rod');
            const bait = upgrades.value.find(u => u.id === 'bait');
            const lure = upgrades.value.find(u => u.id === 'lure');
            
            let power = 1; // Base fishing power
            if (rod) power += rod.getEffect(rod.level);
            if (bait) power += bait.getEffect(bait.level);
            if (lure) power += lure.getEffect(lure.level);
            
            // Apply prestige bonus
            power += prestigeBonuses.fishingPower;
            
            // Apply casting skill bonus
            const castingSkill = fishingSkills.value.find(skill => skill.id === 'casting');
            if (castingSkill) {
                power *= (1 + castingSkill.level * castingSkill.bonusPerLevel);
            }
            
            fishingPower.value = Math.floor(power * 10) / 10; // Round to 1 decimal place
        }
        
        // Setup auto-fishing functionality
        function setupAutoFishing() {
            // Clear any existing auto-fishing interval
            if (autoFishingInterval) {
                clearInterval(autoFishingInterval);
                autoFishingInterval = null;
            }
            
            // If auto-fishing rate is positive, set up auto-fishing
            if (autoFishingRate.value > 0) {
                autoFishingActive.value = true;
                
                // Auto-fish every second
                autoFishingInterval = setInterval(() => {
                    catchFish(true); // Auto-fishing
                }, 1000);
            } else {
                autoFishingActive.value = false;
            }
        }
        
        // Setup auto-selling functionality
        function setupAutoSelling() {
            const merchantUpgrade = upgrades.value.find(u => u.id === 'merchant');
            if (merchantUpgrade && merchantUpgrade.level > 0) {
                // Auto-sell every 5 seconds
                setInterval(() => {
                    autoSellFish();
                }, 5000);
            }
        }
        
        // Detect seasonal events
        function detectSeasonalEvents() {
            if (!CONFIG.seasonalEvents.enabled) return;
            
            const now = new Date();
            const month = now.getMonth() + 1; // 1-12
            const day = now.getDate();
            
            // Check for special events first (they take priority)
            const specialEvent = checkForSpecialEvent(month, day);
            
            if (specialEvent) {
                applySpecialEvent(specialEvent);
            } else {
                // Check for seasonal changes
                const season = getSeasonForMonth(month);
                applySeason(season);
            }
            
            // Add seasonal particles based on current season or event
            updateSeasonalParticles();
        }
        
        // Check if today is a special event
        function checkForSpecialEvent(month, day) {
            const events = CONFIG.seasonalEvents.specialEvents;
            
            for (const [eventId, event] of Object.entries(events)) {
                if (event.month === month) {
                    // Check if today is within range of the event
                    const dayDiff = Math.abs(day - event.day);
                    if (dayDiff <= event.range) {
                        return eventId;
                    }
                }
            }
            
            return null;
        }
        
        // Get the season for the current month
        function getSeasonForMonth(month) {
            const seasons = CONFIG.seasonalEvents.seasons;
            
            for (const [seasonId, season] of Object.entries(seasons)) {
                if (season.months.includes(month)) {
                    return seasonId;
                }
            }
            
            return null;
        }
        
        // Apply special event effects
        function applySpecialEvent(eventId) {
            // Store the current special event
            currentSpecialEvent.value = eventId;
            currentSeason.value = null;
            
            // Modify water appearance
            const waterElement = document.querySelector('.water');
            if (waterElement) {
                // Remove any existing seasonal classes
                Object.keys(CONFIG.seasonalEvents.seasons).forEach(season => {
                    waterElement.classList.remove(`${season}-water`);
                });
                
                // Add special event class
                waterElement.classList.add(`${eventId}-water`);
            }
        }
        
        // Apply seasonal effects
        function applySeason(seasonId) {
            // Store the current season
            currentSeason.value = seasonId;
            currentSpecialEvent.value = null;
            
            // Modify water appearance
            const waterElement = document.querySelector('.water');
            if (waterElement) {
                // Remove any existing seasonal classes
                Object.keys(CONFIG.seasonalEvents.seasons).forEach(season => {
                    waterElement.classList.remove(`${season}-water`);
                });
                
                // Add new season class if valid
                if (seasonId) {
                    waterElement.classList.add(`${seasonId}-water`);
                }
            }
        }
        
        // Create seasonal particles based on current season or event
        function updateSeasonalParticles() {
            // Clear existing particles
            seasonalParticles.value = [];
            
            // Determine particle type based on current event or season
            let particleType = null;
            let particleConfig = null;
            
            if (currentSpecialEvent.value) {
                switch (currentSpecialEvent.value) {
                    case 'halloween':
                        particleType = 'ghost';
                        particleConfig = { count: 3, colors: ['#F8BBD0', '#E1BEE7', '#D1C4E9'] };
                        break;
                    case 'christmas':
                        particleType = 'snow';
                        particleConfig = { count: 20, colors: ['#FFFFFF', '#E3F2FD', '#BBDEFB'] };
                        break;
                    case 'easter':
                        particleType = 'egg';
                        particleConfig = { count: 5, colors: ['#F8BBD0', '#E1BEE7', '#D1C4E9', '#FFECB3', '#FFF9C4'] };
                        break;
                    case 'devBirthday':
                        particleType = 'confetti';
                        particleConfig = { count: 15, colors: ['#FF5252', '#FF4081', '#E040FB', '#7C4DFF', '#536DFE'] };
                        break;
                }
            } else if (currentSeason.value) {
                switch (currentSeason.value) {
                    case 'winter':
                        particleType = 'snow';
                        particleConfig = { count: 10, colors: ['#FFFFFF', '#E3F2FD'] };
                        break;
                    case 'spring':
                        particleType = 'petal';
                        particleConfig = { count: 8, colors: ['#F8BBD0', '#E1BEE7', '#FFCDD2'] };
                        break;
                    case 'summer':
                        // Add sun rays instead of particles
                        addSummerSunEffect();
                        break;
                    case 'autumn':
                        particleType = 'leaf';
                        particleConfig = { count: 6, colors: ['#FFCC80', '#FFB74D', '#FFA726', '#FF8A65', '#FF7043'] };
                        break;
                }
            }
            
            // Generate particles if we have a valid type
            if (particleType && particleConfig) {
                for (let i = 0; i < particleConfig.count; i++) {
                    addSeasonalParticle(particleType, particleConfig.colors);
                }
            }
        }
        
        // Add a single seasonal particle
        function addSeasonalParticle(type, colors) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * (type === 'snow' ? 6 : 15) + (type === 'snow' ? 2 : 5);
            
            seasonalParticles.value.push({
                id: Date.now() + Math.random(),
                type: type,
                color: color,
                x: Math.random() * 100,
                y: Math.random() * 30,
                size: size,
                speed: Math.random() * 1 + 0.5,
                opacity: Math.random() * 0.5 + 0.5,
                rotation: Math.random() * 360
            });
            
            // Move particles and remove when they go offscreen
            const particleId = seasonalParticles.value[seasonalParticles.value.length - 1].id;
            moveSeasonalParticle(particleId);
        }
        
        // Move a seasonal particle
        function moveSeasonalParticle(id) {
            const moveInterval = setInterval(() => {
                const index = seasonalParticles.value.findIndex(p => p.id === id);
                if (index === -1) {
                    clearInterval(moveInterval);
                    return;
                }
                
                const particle = seasonalParticles.value[index];
                
                // Update position based on type
                switch (particle.type) {
                    case 'snow':
                        particle.y += particle.speed * 0.2;
                        particle.x += Math.sin(particle.y / 10) * 0.5;
                        break;
                    case 'leaf':
                    case 'petal':
                        particle.y += particle.speed * 0.3;
                        particle.x += Math.sin(particle.y / 15) * 1.2;
                        particle.rotation += particle.speed * 2;
                        break;
                    case 'egg':
                    case 'confetti':
                        particle.y += particle.speed * 0.7;
                        particle.rotation += particle.speed * 5;
                        break;
                    case 'ghost':
                        particle.y += Math.sin(particle.x / 20) * 0.3;
                        particle.x += particle.speed * 0.2;
                        break;
                }
                
                // Remove particles that go offscreen
                if (particle.y > 100 || particle.x > 100 || particle.x < -10) {
                    seasonalParticles.value.splice(index, 1);
                    clearInterval(moveInterval);
                    
                    // Add a new particle to replace the removed one (maintain count)
                    if (currentSeason.value || currentSpecialEvent.value) {
                        setTimeout(() => {
                            let colors;
                            switch (particle.type) {
                                case 'snow': colors = ['#FFFFFF', '#E3F2FD', '#BBDEFB']; break;
                                case 'leaf': colors = ['#FFCC80', '#FFB74D', '#FFA726', '#FF8A65', '#FF7043']; break;
                                case 'petal': colors = ['#F8BBD0', '#E1BEE7', '#FFCDD2']; break;
                                case 'egg': colors = ['#F8BBD0', '#E1BEE7', '#D1C4E9', '#FFECB3', '#FFF9C4']; break;
                                case 'confetti': colors = ['#FF5252', '#FF4081', '#E040FB', '#7C4DFF', '#536DFE']; break;
                                case 'ghost': colors = ['#F8BBD0', '#E1BEE7', '#D1C4E9']; break;
                                default: colors = ['#FFFFFF'];
                            }
                            addSeasonalParticle(particle.type, colors);
                        }, Math.random() * 3000);
                    }
                }
            }, 50);
        }
        
        // Add summer sun effect
        function addSummerSunEffect() {
            const waterContainer = document.querySelector('.water');
            if (!waterContainer) return;
            
            // Remove existing sun if present
            const existingSun = document.querySelector('.seasonal-sun');
            if (existingSun) existingSun.remove();
            
            // Create sun element
            const sun = document.createElement('div');
            sun.className = 'seasonal-sun';
            waterContainer.appendChild(sun);
            
            // Add sun rays
            for (let i = 0; i < 8; i++) {
                const ray = document.createElement('div');
                ray.className = 'sun-ray';
                ray.style.transform = `rotate(${i * 45}deg)`;
                ray.style.animationDelay = `${i * 0.3}s`;
                sun.appendChild(ray);
            }
        }

        return {
            money,
            inventory,
            totalFishCaught,
            fishingPower,
            autoFishingRate,
            isFishing,
            lineLength,
            boatPosition,
            boatVerticalPosition,
            fishInWater,
            upgrades,
            showSplash,
            autoFishingActive,
            startFishing,
            sellFish,
            purchaseUpgrade,
            formatNumber,
            getFishColor,
            fishingLocations,
            activeLocationId,
            currentLocation,
            changeLocation,
            unlockLocation,
            boatCustomization,
            upgradeBoatPart,
            encyclopedia,
            encyclopediaUnlocked,
            showEncyclopedia,
            showBoatCustomization,
            toggleEncyclopedia,
            toggleBoatCustomization,
            selectedFish,
            showFishDetails,
            closeModal,
            discoveredFishCount,
            totalFishCount,
            discoveryPercentage,
            activeTab,
            changeTab,
            resetProgress,
            saveAndQuit,
            showOfflineModal,
            offlineEarnings,
            closeOfflineModal,
            prestigeLevel,
            currentRank,
            prestigeBonuses,
            showPrestigeModal,
            canPrestige,
            openPrestigeModal,
            closePrestigeModal,
            performPrestige,
            getCurrentHighestRankLevel,
            CONFIG,
            emails,
            unreadEmailCount,
            showInbox,
            toggleInbox,
            markEmailAsRead,
            totalXP,
            lastXpGain,
            fishingSkills,
            totalSkillsLevel,
            getSkillIcon,
            calculateTotalSkillsBonus,
            seasonalParticles,
            currentSeason,
            currentSpecialEvent
        };
    }
}).mount('#app');