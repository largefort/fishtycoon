import { createApp, ref, computed, watch, onMounted } from 'vue';

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

        // Fish types with their properties
        const fishTypes = [
            { name: "Common Fish", chance: 0.6, value: 1, color: "#6495ED", minDepth: 20, maxDepth: 50 },
            { name: "Rare Fish", chance: 0.3, value: 5, color: "#FFD700", minDepth: 40, maxDepth: 70 },
            { name: "Epic Fish", chance: 0.09, value: 25, color: "#9932CC", minDepth: 60, maxDepth: 90 },
            { name: "Legendary Fish", chance: 0.01, value: 150, color: "#FF4500", minDepth: 80, maxDepth: 100 }
        ];

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

        // Get fish color by type
        function getFishColor(type) {
            const fishType = fishTypes.find(fish => fish.name === type);
            return fishType ? fishType.color : "#6495ED";
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

        // Catch fish based on fishing power
        function catchFish(isAuto = false) {
            const catchAmount = isAuto ? Math.ceil(autoFishingRate.value) : fishingPower.value;
            
            for (let i = 0; i < catchAmount; i++) {
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
                        totalFishCaught.value++;
                        
                        // Force Vue to recognize the change
                        inventory.value = { ...inventory.value };
                        break;
                    }
                }
            }
        }

        // Sell fish
        function sellFish(type) {
            if (inventory.value[type]) {
                const fishType = fishTypes.find(fish => fish.name === type);
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
            const newFish = {
                id: fishIdCounter++,
                position: -10, // Start off-screen
                depth: Math.random() * 70 + 15, // Random depth between 15% and 85%
                direction: Math.random() > 0.5 ? 1 : -1, // Random direction
                speed: Math.random() * 2 + 1, // Random speed
                color: fishTypes[Math.floor(Math.random() * fishTypes.length)].color
            };
            
            // If going right to left, start from right side
            if (newFish.direction === -1) {
                newFish.position = 110; // Off-screen right
            }
            
            fishInWater.value.push(newFish);
            
            // Remove fish when it goes off-screen
            setTimeout(() => {
                fishInWater.value = fishInWater.value.filter(f => f.id !== newFish.id);
            }, 10000); // 10 seconds to cross the screen
        }

        // Move fish in water
        function updateFishPositions() {
            fishInWater.value.forEach(fish => {
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

        // Setup fish generation and movement
        onMounted(() => {
            // Generate initial fish
            for (let i = 0; i < 5; i++) {
                generateFish();
            }
            
            // Generate new fish periodically
            setInterval(() => {
                // Reduce fish count on mobile to improve performance
                const maxFish = window.innerWidth <= 600 ? 5 : 10;
                if (fishInWater.value.length < maxFish) {
                    generateFish();
                }
            }, 3000);
            
            // Update fish positions
            setInterval(() => {
                updateFishPositions();
            }, 100);
            
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
        });

        // Save game data
        watch([money, inventory, totalFishCaught, fishingPower, autoFishingRate, upgrades], () => {
            const saveData = {
                money: money.value,
                inventory: inventory.value,
                totalFishCaught: totalFishCaught.value,
                fishingPower: fishingPower.value,
                autoFishingRate: autoFishingRate.value,
                upgrades: upgrades.value.map(u => ({ id: u.id, level: u.level, cost: u.cost }))
            };
            localStorage.setItem('fishingTycoonSave', JSON.stringify(saveData));
        }, { deep: true });

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
                    
                    // Setup auto fishing based on loaded data
                    setupAutoFishing();
                } catch (error) {
                    console.error('Error loading save data:', error);
                }
            }
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
            getFishColor
        };
    }
}).mount('#app');