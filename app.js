import { createApp, ref, computed, watch, onMounted, reactive } from 'vue';
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
        const fishInWater = ref([]);
        const autoFishingActive = ref(false);
        const autoFishingTimer = ref(null);
        let fishIdCounter = 0;
        let autoFishingInterval = null;

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
                    { id: 'common1', name: "Common Fish", chance: 0.6, value: 1, color: "#6495ED", minDepth: 20, maxDepth: 50 },
                    { id: 'rare1', name: "Rare Fish", chance: 0.3, value: 5, color: "#FFD700", minDepth: 40, maxDepth: 70 },
                    { id: 'epic1', name: "Epic Fish", chance: 0.09, value: 25, color: "#9932CC", minDepth: 60, maxDepth: 90 },
                    { id: 'legendary1', name: "Legendary Fish", chance: 0.01, value: 150, color: "#FF4500", minDepth: 80, maxDepth: 100 }
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
                    { id: 'common2', name: "Lake Trout", chance: 0.5, value: 3, color: "#20B2AA", minDepth: 20, maxDepth: 50 },
                    { id: 'rare2', name: "Mountain Bass", chance: 0.3, value: 8, color: "#DAA520", minDepth: 40, maxDepth: 70 },
                    { id: 'epic2', name: "Rainbow Trout", chance: 0.15, value: 40, color: "#BA55D3", minDepth: 60, maxDepth: 90 },
                    { id: 'legendary2', name: "Golden Carp", chance: 0.05, value: 200, color: "#FFA500", minDepth: 80, maxDepth: 100 }
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
                    { id: 'common3', name: "River Perch", chance: 0.45, value: 5, color: "#4682B4", minDepth: 20, maxDepth: 50 },
                    { id: 'rare3', name: "Silver Salmon", chance: 0.35, value: 15, color: "#C0C0C0", minDepth: 40, maxDepth: 70 },
                    { id: 'epic3', name: "River Sturgeon", chance: 0.15, value: 60, color: "#9370DB", minDepth: 60, maxDepth: 90 },
                    { id: 'legendary3', name: "Royal Salmon", chance: 0.05, value: 250, color: "#CD5C5C", minDepth: 80, maxDepth: 100 }
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
                    { id: 'common4', name: "Mackerel", chance: 0.4, value: 10, color: "#4169E1", minDepth: 20, maxDepth: 50 },
                    { id: 'rare4', name: "Tuna", chance: 0.3, value: 30, color: "#1E90FF", minDepth: 40, maxDepth: 70 },
                    { id: 'epic4', name: "Swordfish", chance: 0.2, value: 100, color: "#8A2BE2", minDepth: 60, maxDepth: 90 },
                    { id: 'legendary4', name: "Blue Marlin", chance: 0.1, value: 500, color: "#0000CD", minDepth: 80, maxDepth: 100 }
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
            if (chance <= 0.05) return 'Legendary';
            if (chance <= 0.15) return 'Epic';
            if (chance <= 0.35) return 'Rare';
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

        // Start fishing with improved animations
        function startFishing() {
            if (isFishing.value) return;
            
            isFishing.value = true;
            boatPosition.value = Math.random() * 80 + 10; // Random position between 10% and 90%
            
            // Animate fishing line down
            lineLength.value = 0;
            setTimeout(() => {
                // Adjust line length for mobile
                const maxDepth = window.innerWidth <= 600 ? 200 : 300;
                lineLength.value = maxDepth + Math.random() * 50; // Random depth
                
                // Show splash effect when line hits water
                showSplash.value = true;
                setTimeout(() => {
                    showSplash.value = false;
                }, 1000);
                
                // Catch fish after line is fully extended
                setTimeout(() => {
                    catchFish();
                    
                    // Reel in the line
                    setTimeout(() => {
                        lineLength.value = 0;
                        setTimeout(() => {
                            isFishing.value = false;
                        }, 500);
                    }, 500);
                }, 1000);
            }, 500);
        }

        // Modified catch fish function to use location-specific fish
        function catchFish(isAuto = false) {
            const catchAmount = isAuto ? Math.ceil(autoFishingRate.value) : fishingPower.value;
            
            for (let i = 0; i < catchAmount; i++) {
                let rand = Math.random();
                let cumulativeChance = 0;
                
                for (const fish of currentFishTypes.value) {
                    cumulativeChance += fish.chance;
                    
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
                    const valueMultiplier = 1 + prestigeBonuses.fishValue;
                    const value = Math.floor(fishType.value * inventory.value[type] * valueMultiplier);
                    money.value += value;
                    inventory.value[type] = 0;
                    
                    // Force Vue to recognize the change
                    inventory.value = { ...inventory.value };
                }
            }
        }

        // Purchase upgrade
        function purchaseUpgrade(id) {
            const upgrade = upgrades.value.find(u => u.id === id);
            
            if (upgrade && money.value >= upgrade.cost) {
                money.value -= upgrade.cost;
                upgrade.level++;
                upgrade.effect();
                
                // Update cost for next level
                upgrade.cost = upgrade.getCost(upgrade.level);
            }
        }

        // Upgrades
        const upgrades = ref([
            {
                id: 'rod',
                name: 'Better Fishing Rod',
                description: 'Catch more fish per cast',
                level: 1,
                cost: 10,
                effect: () => { fishingPower.value += 1; },
                getCost: (level) => Math.floor(10 * Math.pow(1.5, level - 1))
            },
            {
                id: 'boat',
                name: 'Boat Upgrade',
                description: 'Improves fishing speed',
                level: 1,
                cost: 50,
                effect: () => { /* Fishing time will be reduced */ },
                getCost: (level) => Math.floor(50 * Math.pow(1.6, level - 1)),
                maxLevel: 5
            },
            {
                id: 'auto',
                name: 'Auto-Fisher',
                description: 'Automatically catches fish over time',
                level: 0,
                cost: 200,
                effect: () => { 
                    autoFishingRate.value += 0.2;
                    setupAutoFishing();
                },
                getCost: (level) => Math.floor(200 * Math.pow(2, level))
            },
            {
                id: 'lure',
                name: 'Better Lures',
                description: 'Increases chance of rare fish',
                level: 1,
                cost: 100,
                effect: () => { /* Improve fish rarity chances */ },
                getCost: (level) => Math.floor(100 * Math.pow(1.7, level - 1))
            }
        ]);

        // Setup auto fishing
        function setupAutoFishing() {
            if (autoFishingInterval) {
                clearInterval(autoFishingInterval);
            }
            
            if (autoFishingRate.value > 0) {
                autoFishingActive.value = true;
                const intervalTime = 5000; // 5 second interval
                autoFishingInterval = setInterval(() => {
                    if (!isFishing.value) {
                        performAutoFishing();
                    }
                }, intervalTime);
            }
        }

        // Perform auto fishing with visual feedback
        function performAutoFishing() {
            // Move boat to random position
            boatPosition.value = Math.random() * 80 + 10;
            
            // Start auto fishing process with animations
            isFishing.value = true;
            
            // Animate fishing line down
            lineLength.value = 0;
            setTimeout(() => {
                // Adjust line length for mobile
                const maxDepth = window.innerWidth <= 600 ? 200 : 300;
                lineLength.value = maxDepth + Math.random() * 50;
                
                // Show splash effect when line hits water
                showSplash.value = true;
                setTimeout(() => {
                    showSplash.value = false;
                }, 1000);
                
                // Catch fish after line is fully extended
                setTimeout(() => {
                    catchFish(true);
                    
                    // Reel in the line
                    setTimeout(() => {
                        lineLength.value = 0;
                        setTimeout(() => {
                            isFishing.value = false;
                        }, 500);
                    }, 500);
                }, 1000);
            }, 500);
        }

        // Generate fish swimming in the background
        function generateFish() {
            const fishType = currentFishTypes.value[Math.floor(Math.random() * currentFishTypes.value.length)];
            const newFish = {
                id: fishIdCounter++,
                position: -15, // Start further off-screen
                depth: Math.random() * 70 + 15, // Random depth between 15% and 85%
                direction: Math.random() > 0.5 ? 1 : -1, // Random direction
                speed: Math.random() * 1.5 + 0.8, // More natural varied speed
                color: fishType.color,
                size: Math.random() * 0.5 + 0.8 // Size variation factor (0.8 to 1.3)
            };
            
            // If going right to left, start from right side
            if (newFish.direction === -1) {
                newFish.position = 115; // Further off-screen right
            }
            
            fishInWater.value.push(newFish);
            
            // Remove fish when it goes off-screen
            setTimeout(() => {
                fishInWater.value = fishInWater.value.filter(f => f.id !== newFish.id);
            }, 20000); // Longer time to cross for more natural movement
        }

        // Move fish in water with more natural movement
        function updateFishPositions() {
            fishInWater.value.forEach(fish => {
                // Add subtle vertical movement
                if (!fish.verticalDirection) {
                    fish.verticalDirection = Math.random() > 0.5 ? 0.05 : -0.05;
                }
                
                // Occasionally change vertical direction
                if (Math.random() < 0.02) {
                    fish.verticalDirection *= -1;
                }
                
                // Update depth with boundaries
                fish.depth += fish.verticalDirection;
                if (fish.depth < 15) fish.depth = 15;
                if (fish.depth > 85) fish.depth = 85;
                
                // Update horizontal position
                if (fish.direction === 1) {
                    fish.position += fish.speed;
                } else {
                    fish.position -= fish.speed;
                }
            });
        }

        // Format large numbers
        function formatNumber(num) {
            // Fix floating point precision issues for auto-fishing rate
            if (typeof num === 'number' && String(num).includes('.')) {
                num = parseFloat(num.toFixed(2));
            }
            
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            } else {
                return String(num);
            }
        }

        // Get fish color by type
        function getFishColor(type) {
            const fishType = currentFishTypes.value.find(fish => fish.name === type);
            return fishType ? fishType.color : "#6495ED";
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
                    upgrade.cost = upgrade.getCost(upgrade.level);
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
                upgrade.cost = upgrade.getCost(upgrade.level);
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
            
            // Reset auto fishing setup if applicable
            setupAutoFishing();
            
            // Update water background to match initial location
            document.querySelector('.water').style.background = fishingLocations.value[0].background;
            
            // Close any open modals
            showEncyclopedia.value = false;
            showBoatCustomization.value = false;
        }

        // Get highest rank level user has achieved
        function getCurrentHighestRankLevel() {
            const ranks = CONFIG.prestigeSystem.ranks;
            let highestMatch = 0;
            
            for (const rank of ranks) {
                if (prestigeLevel.value >= rank.level && rank.level > highestMatch) {
                    highestMatch = rank.level;
                }
            }
            
            return highestMatch;
        }

        // Initialize on mount
        onMounted(() => {
            // Load all canvas images
            loadLocationCanvases();
            
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
            
            // Initialize encyclopedia
            initializeEncyclopedia();
        });

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
                    
                    // Load prestige data
                    if (data.prestigeLevel !== undefined) {
                        prestigeLevel.value = data.prestigeLevel;
                        calculatePrestigeBonuses();
                    }
                    
                    // Setup auto fishing based on loaded data
                    setupAutoFishing();
                } catch (error) {
                    console.error('Error loading save data:', error);
                }
            }
            
            // Calculate prestige bonuses on initial load
            calculatePrestigeBonuses();
        });

        // Update save function to include prestige data
        watch([
            money, inventory, totalFishCaught, fishingPower, autoFishingRate, upgrades,
            fishingLocations, activeLocationId, boatCustomization, encyclopedia, encyclopediaUnlocked,
            prestigeLevel
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
                prestigeLevel: prestigeLevel.value // Save prestige level
            };
            localStorage.setItem('fishingTycoonSave', JSON.stringify(saveData));
        }, { deep: true });

        // Add window event listener to update last online time when page is about to be closed
        onMounted(() => {
            window.addEventListener('beforeunload', () => {
                const saveData = JSON.parse(localStorage.getItem('fishingTycoonSave') || '{}');
                saveData.lastOnlineTime = Date.now();
                localStorage.setItem('fishingTycoonSave', JSON.stringify(saveData));
            });
        });

        return {
            money,
            inventory,
            totalFishCaught,
            fishingPower,
            autoFishingRate,
            isFishing,
            lineLength,
            boatPosition,
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
            template: `
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-label">
                            <span class="stat-icon">💸</span>
                            <span>Money</span>
                        </div>
                        <div class="stat-value">{{ formatNumber(money) }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">
                            <span class="stat-icon">🎣</span>
                            <span>Fish Caught</span>
                        </div>
                        <div class="stat-value">{{ totalFishCaught }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">
                            <span class="stat-icon">🚣</span>
                            <span>Boat Position</span>
                        </div>
                        <div class="stat-value">{{ boatPosition }}%</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">
                            <span class="stat-icon">🎣</span>
                            <span>Fishing Power</span>
                        </div>
                        <div class="stat-value">{{ fishingPower }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">
                            <span class="stat-icon">⏱️</span>
                            <span>Auto-Fishing</span>
                        </div>
                        <div class="stat-value">{{ autoFishingRate.toFixed(2) }}/second</div>
                    </div>
                </div>
            `
        };
    }
}).mount('#app');