import { createApp, ref, computed, watch, onMounted, reactive } from 'vue';

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
                fishTypes: [
                    { id: 'common4', name: "Mackerel", chance: 0.4, value: 10, color: "#4169E1", minDepth: 20, maxDepth: 50 },
                    { id: 'rare4', name: "Tuna", chance: 0.3, value: 30, color: "#1E90FF", minDepth: 40, maxDepth: 70 },
                    { id: 'epic4', name: "Swordfish", chance: 0.2, value: 100, color: "#8A2BE2", minDepth: 60, maxDepth: 90 },
                    { id: 'legendary4', name: "Blue Marlin", chance: 0.1, value: 500, color: "#0000CD", minDepth: 80, maxDepth: 100 }
                ]
            }
        ]);

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
                    const value = fishType.value * inventory.value[type];
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
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            } else {
                return num.toFixed(0);
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

        // AdSense related states and functions
        const adsLoaded = ref(false);
        
        function attemptLoadAds() {
            // This is just a placeholder - actual ad loading is handled by the AdSense script
            // You can use this to add additional tracking or handling if needed
            console.log('Attempting to load ads - requires AdSense verification');
        }

        // Initialize on mount
        onMounted(() => {
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
            
            // Add resize event listener for responsive adjustments
            window.addEventListener('resize', () => {
                // Reset line length if window is resized while fishing
                if (isFishing.value) {
                    const maxDepth = window.innerWidth <= 600 ? 200 : 300;
                    lineLength.value = Math.min(lineLength.value, maxDepth + 50);
                }
            });

            // Initialize encyclopedia
            initializeEncyclopedia();

            // Initialize ads after page loads
            setTimeout(() => {
                attemptLoadAds();
            }, 2000);
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
                    
                    // Setup auto fishing based on loaded data
                    setupAutoFishing();
                } catch (error) {
                    console.error('Error loading save data:', error);
                }
            }
        });

        // Update save function to include new features
        watch([
            money, inventory, totalFishCaught, fishingPower, autoFishingRate, upgrades,
            fishingLocations, activeLocationId, boatCustomization, encyclopedia, encyclopediaUnlocked
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
                encyclopediaUnlocked: encyclopediaUnlocked.value
            };
            localStorage.setItem('fishingTycoonSave', JSON.stringify(saveData));
        }, { deep: true });

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
            adsLoaded,
            attemptLoadAds,
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
            changeTab
        };
    }
}).mount('#app');
