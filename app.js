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

        // Fish generation system for 700+ fish types
        const fishRarities = ref([
            { id: 'common', name: 'Common', chance: 0.6, valueMultiplier: 1, colorRange: ['#6495ED', '#87CEEB', '#4682B4', '#20B2AA', '#5F9EA0'] },
            { id: 'uncommon', name: 'Uncommon', chance: 0.25, valueMultiplier: 3, colorRange: ['#3CB371', '#2E8B57', '#8FBC8F', '#66CDAA', '#7FFFD4'] },
            { id: 'rare', name: 'Rare', chance: 0.1, valueMultiplier: 10, colorRange: ['#FFD700', '#DAA520', '#F0E68C', '#BDB76B', '#FFFF00'] },
            { id: 'epic', name: 'Epic', chance: 0.04, valueMultiplier: 50, colorRange: ['#9932CC', '#8A2BE2', '#9370DB', '#BA55D3', '#EE82EE'] },
            { id: 'legendary', name: 'Legendary', chance: 0.01, valueMultiplier: 200, colorRange: ['#FF4500', '#FF0000', '#FF6347', '#FF7F50', '#FFA07A'] }
        ]);
        
        const fishPrefixes = [
            'Northern', 'Southern', 'Eastern', 'Western', 'Spotted', 'Striped', 'Golden', 'Silver', 'Bronze', 'Copper',
            'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Black', 'White', 'Orange', 'Teal', 'Violet',
            'Tiny', 'Small', 'Large', 'Giant', 'Massive', 'Dwarf', 'Pygmy', 'Colossal', 'Miniature', 'Enormous',
            'Deep', 'Shallow', 'Coastal', 'Oceanic', 'Abyssal', 'Reef', 'Tropical', 'Arctic', 'Desert', 'Mountain',
            'Spiny', 'Smooth', 'Rough', 'Slimy', 'Scaly', 'Armored', 'Fanged', 'Toothy', 'Whiskered', 'Finned',
            'Ancient', 'Prehistoric', 'Futuristic', 'Primal', 'Evolved', 'Mutant', 'Hybrid', 'Undiscovered', 'Rare', 'Common',
            'Swift', 'Slow', 'Darting', 'Lurking', 'Hunting', 'Scavenging', 'Predatory', 'Peaceful', 'Aggressive', 'Timid'
        ];
        
        const fishNames = [
            'Trout', 'Bass', 'Salmon', 'Perch', 'Pike', 'Cod', 'Tuna', 'Marlin', 'Swordfish', 'Shark',
            'Catfish', 'Carp', 'Eel', 'Barracuda', 'Grouper', 'Snapper', 'Flounder', 'Halibut', 'Mackerel', 'Sardine',
            'Herring', 'Anchovy', 'Haddock', 'Pollock', 'Tilapia', 'Mahimahi', 'Wahoo', 'Bonefish', 'Tarpon', 'Snook',
            'Crappie', 'Bluegill', 'Sunfish', 'Walleye', 'Sturgeon', 'Grayling', 'Whitefish', 'Drum', 'Sheepshead', 'Pompano',
            'Ray', 'Skate', 'Sole', 'Plaice', 'Goby', 'Blenny', 'Wrasse', 'Triggerfish', 'Pufferfish', 'Boxfish',
            'Angelfish', 'Butterflyfish', 'Parrotfish', 'Surgeonfish', 'Lionfish', 'Clownfish', 'Damselfish', 'Cardinalfish', 'Gobies', 'Hawkfish',
            'Arowanas', 'Cichlids', 'Discus', 'Guppies', 'Tetras', 'Barbs', 'Rasboras', 'Loaches', 'Corydoras', 'Plecos'
        ];
        
        const fishSuffixes = [
            'of the Deep', 'of the Shallows', 'of the Reefs', 'of the Coast', 'of the Abyss', 
            'of the North', 'of the South', 'of the East', 'of the West', 'of the Arctic',
            'Darter', 'Jumper', 'Lurker', 'Hunter', 'Chaser', 'Stalker', 'Prowler', 'Guardian', 'Defender', 'Predator',
            'Eater', 'Swallower', 'Chomper', 'Gulper', 'Biter', 'Snapper', 'Gnasher', 'Muncher', 'Cruncher', 'Nibbler',
            'Fin', 'Gill', 'Scale', 'Spine', 'Jaw', 'Mouth', 'Eye', 'Tail', 'Whisker', 'Barb',
            'King', 'Queen', 'Prince', 'Princess', 'Duke', 'Duchess', 'Lord', 'Lady', 'Emperor', 'Empress',
            'Warden', 'Sentinel', 'Guardian', 'Keeper', 'Protector', 'Defender', 'Champion', 'Hero', 'Titan', 'Colossus'
        ];
        
        // Adjectives for fish descriptions
        const fishAdjectives = [
            'colorful', 'vibrant', 'striking', 'beautiful', 'graceful', 'elegant', 'majestic', 'magnificent', 'impressive', 'dazzling',
            'stealthy', 'crafty', 'cunning', 'clever', 'intelligent', 'wily', 'shrewd', 'sly', 'deceptive', 'elusive',
            'fierce', 'mighty', 'powerful', 'strong', 'robust', 'hardy', 'tough', 'resilient', 'enduring', 'tenacious',
            'rare', 'uncommon', 'unusual', 'unique', 'extraordinary', 'exceptional', 'exquisite', 'remarkable', 'special', 'distinct',
            'ancient', 'primordial', 'prehistoric', 'primal', 'primitive', 'ancestral', 'archaic', 'timeless', 'eternal', 'everlasting'
        ];
        
        // Actions for fish descriptions
        const fishActions = [
            'swimming', 'darting', 'gliding', 'maneuvering', 'navigating', 'cruising', 'patrolling', 'exploring', 'traversing', 'roaming',
            'hunting', 'stalking', 'pursuing', 'chasing', 'tracking', 'ambushing', 'attacking', 'striking', 'pouncing', 'lunging',
            'feeding', 'grazing', 'foraging', 'scavenging', 'browsing', 'consuming', 'devouring', 'eating', 'dining', 'feasting',
            'hiding', 'lurking', 'concealing', 'camouflaging', 'blending', 'obscuring', 'sheltering', 'retreating', 'evading', 'escaping',
            'resting', 'sleeping', 'floating', 'drifting', 'hovering', 'suspending', 'lingering', 'waiting', 'pausing', 'idling'
        ];
        
        // Habitats for fish descriptions
        const fishHabitats = [
            'coral reefs', 'seagrass meadows', 'kelp forests', 'rocky shores', 'sandy bottoms', 'open ocean', 'deep sea', 'coastal waters', 'estuaries', 'mangroves',
            'freshwater lakes', 'rivers', 'streams', 'ponds', 'swamps', 'marshes', 'wetlands', 'lagoons', 'bayous', 'creeks',
            'mountain springs', 'alpine lakes', 'glacial waters', 'arctic seas', 'tropical waters', 'temperate zones', 'submarine canyons', 'oceanic trenches', 'seamounts', 'hydrothermal vents',
            'caves', 'crevices', 'overhangs', 'drop-offs', 'slopes', 'flats', 'shallows', 'depths', 'surface waters', 'midwater zones',
            'wrecks', 'artificial reefs', 'docks', 'piers', 'harbors', 'bays', 'sounds', 'inlets', 'fjords', 'straits'
        ];

        // Generate a complete set of fish for the game
        function generateAllFish() {
            const allFish = [];
            const locationTypes = ['pond', 'lake', 'river', 'ocean'];
            const totalFishCount = 700;
            
            // Generate unique fish for each location with proper distribution
            for (let i = 0; i < totalFishCount; i++) {
                // Determine rarity based on index (make sure we have good distribution)
                let rarityIndex;
                if (i < totalFishCount * 0.6) rarityIndex = 0; // common
                else if (i < totalFishCount * 0.85) rarityIndex = 1; // uncommon
                else if (i < totalFishCount * 0.95) rarityIndex = 2; // rare
                else if (i < totalFishCount * 0.99) rarityIndex = 3; // epic
                else rarityIndex = 4; // legendary
                
                const rarity = fishRarities.value[rarityIndex];
                
                // Assign to a location
                const locationIndex = Math.floor(i / (totalFishCount / locationTypes.length));
                const location = locationTypes[Math.min(locationIndex, locationTypes.length - 1)];
                
                // Generate a unique name
                const prefix = fishPrefixes[Math.floor(Math.random() * fishPrefixes.length)];
                const baseName = fishNames[Math.floor(Math.random() * fishNames.length)];
                let suffix = '';
                
                // Add suffix to higher rarity fish
                if (rarityIndex >= 2 && Math.random() > 0.5) {
                    suffix = ' ' + fishSuffixes[Math.floor(Math.random() * fishSuffixes.length)];
                }
                
                const name = `${prefix} ${baseName}${suffix}`;
                
                // Pick a color from the rarity's color range
                const color = rarity.colorRange[Math.floor(Math.random() * rarity.colorRange.length)];
                
                // Generate min/max depth based on rarity
                const minDepth = 20 + (rarityIndex * 10);
                const maxDepth = Math.min(100, minDepth + 30 + (rarityIndex * 5));
                
                // Generate random size parameters
                const sizeMin = 0.1 + (rarityIndex * 0.2);
                const sizeMax = sizeMin + 0.3 + (rarityIndex * 0.4);
                
                // Generate random weight parameters
                const weightMin = 0.2 + (rarityIndex * 0.5);
                const weightMax = weightMin + 0.8 + (rarityIndex * 1.2);
                
                // Generate description
                const adjective = fishAdjectives[Math.floor(Math.random() * fishAdjectives.length)];
                const action = fishActions[Math.floor(Math.random() * fishActions.length)];
                const habitat = fishHabitats[Math.floor(Math.random() * fishHabitats.length)];
                
                const description = `A ${adjective} fish often seen ${action} in ${habitat}. This ${rarity.name.toLowerCase()} specimen is prized by collectors.`;
                
                // Calculate value based on rarity
                const baseValue = (1 + Math.floor(Math.random() * 5)) * rarity.valueMultiplier;
                
                // Create the fish entry
                const fish = {
                    id: `fish_${i}`,
                    name: name,
                    color: color,
                    chance: rarity.chance / (1 + rarityIndex), // Adjust chance to make higher rarities less common
                    value: baseValue,
                    rarity: rarity.id,
                    rarityName: rarity.name,
                    minDepth: minDepth,
                    maxDepth: maxDepth,
                    location: location,
                    sizeMin: sizeMin,
                    sizeMax: sizeMax,
                    weightMin: weightMin,
                    weightMax: weightMax,
                    description: description
                };
                
                allFish.push(fish);
            }
            
            return allFish;
        }

        // All fish in the game
        const allGameFish = ref([]);
        
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
                fishTypes: [] // Will be populated with generated fish
            },
            {
                id: 'lake',
                name: 'Mountain Lake',
                description: 'Deeper waters with better fish variety',
                background: 'linear-gradient(to bottom, #4db6ac, #009688)',
                unlocked: false,
                price: 1000,
                image: 'lake',
                fishTypes: [] // Will be populated with generated fish
            },
            {
                id: 'river',
                name: 'Rushing River',
                description: 'Fast moving water with unique fish species',
                background: 'linear-gradient(to bottom, #4fc3f7, #0288d1)',
                unlocked: false,
                price: 5000,
                image: 'river',
                fishTypes: [] // Will be populated with generated fish
            },
            {
                id: 'ocean',
                name: 'Deep Ocean',
                description: 'Vast ocean with rare exotic catches',
                background: 'linear-gradient(to bottom, #0277bd, #01579b)',
                unlocked: false,
                price: 25000,
                image: 'ocean',
                fishTypes: [] // Will be populated with generated fish
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
            allGameFish.value.forEach(fish => {
                if (!encyclopedia.value[fish.id]) {
                    encyclopedia.value[fish.id] = {
                        id: fish.id,
                        name: fish.name,
                        color: fish.color,
                        discovered: false,
                        caught: 0,
                        location: getLocationNameById(fish.location),
                        rarity: fish.rarityName,
                        value: fish.value,
                        description: fish.description,
                        record: { weight: 0, length: 0 }
                    };
                }
            });
        }
        
        // Helper function to get location name by id
        function getLocationNameById(locationId) {
            const location = fishingLocations.value.find(loc => loc.id === locationId);
            return location ? location.name : 'Unknown';
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
            const locationFish = currentFishTypes.value;
            
            if (locationFish.length === 0) return;
            
            for (let i = 0; i < catchAmount; i++) {
                let rand = Math.random();
                let cumulativeChance = 0;
                let caughtFish = null;
                
                // Sort fish by rarity (so we check rarest first)
                const sortedFish = [...locationFish].sort((a, b) => a.chance - b.chance);
                
                // Try to catch a fish based on chance
                for (const fish of sortedFish) {
                    // Adjust chance based on equipment bonuses
                    let adjustedChance = fish.chance;
                    const equipment = boatCustomization.value.equipment;
                    const currentEquipment = equipment.options.find(opt => opt.id === equipment.current);
                    if (currentEquipment && currentEquipment.rarityBonus) {
                        // Apply rarity bonus for rarer fish
                        if (fish.rarity !== 'common') {
                            adjustedChance += currentEquipment.rarityBonus;
                        }
                    }
                    
                    cumulativeChance += adjustedChance;
                    if (rand <= cumulativeChance) {
                        caughtFish = fish;
                        break;
                    }
                }
                
                // If no fish caught, pick a common one
                if (!caughtFish) {
                    const commonFish = locationFish.filter(f => f.rarity === 'common');
                    if (commonFish.length > 0) {
                        caughtFish = commonFish[Math.floor(Math.random() * commonFish.length)];
                    } else {
                        caughtFish = locationFish[0];
                    }
                }
                
                // Add fish to inventory
                if (!inventory.value[caughtFish.name]) {
                    inventory.value[caughtFish.name] = 0;
                }
                inventory.value[caughtFish.name]++;
                totalFishCaught.value++;
                
                // Update encyclopedia
                if (encyclopedia.value[caughtFish.id]) {
                    const encycEntry = encyclopedia.value[caughtFish.id];
                    encycEntry.caught++;
                    
                    if (!encycEntry.discovered) {
                        encycEntry.discovered = true;
                        // If this is the first caught fish, unlock encyclopedia
                        if (!encyclopediaUnlocked.value) {
                            encyclopediaUnlocked.value = true;
                        }
                    }
                    
                    // Generate random weight and length for this catch based on fish parameters
                    const weight = Math.round((caughtFish.weightMin + Math.random() * (caughtFish.weightMax - caughtFish.weightMin)) * 10) / 10;
                    const length = Math.round((caughtFish.sizeMin + Math.random() * (caughtFish.sizeMax - caughtFish.sizeMin)) * 10) / 10;
                    
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

        // Encyclopedia filtering and pagination
        const encyclopediaFilter = ref('all');
        const encyclopediaPage = ref(1);
        const encyclopediaPageSize = ref(20); // Show 20 fish per page
        
        // Filtered encyclopedia fish
        const filteredEncyclopediaFish = computed(() => {
            let result = Object.values(encyclopedia.value);
            
            // Apply filters
            if (encyclopediaFilter.value === 'discovered') {
                result = result.filter(fish => fish.discovered);
            } else if (encyclopediaFilter.value !== 'all') {
                // Filter by rarity
                result = result.filter(fish => {
                    const fishData = allGameFish.value.find(f => f.id === fish.id);
                    return fishData && fishData.rarity === encyclopediaFilter.value;
                });
            }
            
            // Sort by discovered first, then by name
            result.sort((a, b) => {
                if (a.discovered !== b.discovered) {
                    return b.discovered ? 1 : -1;
                }
                return a.name.localeCompare(b.name);
            });
            
            return result;
        });
        
        // Total pages for pagination
        const totalEncyclopediaPages = computed(() => {
            return Math.ceil(filteredEncyclopediaFish.value.length / encyclopediaPageSize.value);
        });
        
        // Fish to display on current page
        const paginatedEncyclopediaFish = computed(() => {
            const startIndex = (encyclopediaPage.value - 1) * encyclopediaPageSize.value;
            const endIndex = startIndex + encyclopediaPageSize.value;
            return filteredEncyclopediaFish.value.slice(startIndex, endIndex);
        });
        
        // Change encyclopedia page
        function changeEncyclopediaPage(page) {
            encyclopediaPage.value = page;
        }
        
        // Watch for filter changes
        watch(encyclopediaFilter, () => {
            // Reset to first page when filter changes
            encyclopediaPage.value = 1;
        });

        // Initialize on mount
        onMounted(() => {
            // Generate all fish in the game
            allGameFish.value = generateAllFish();
            
            // Distribute fish to their appropriate locations
            fishingLocations.value.forEach(location => {
                location.fishTypes = allGameFish.value.filter(fish => fish.location === location.id);
            });
            
            // Initialize encyclopedia with all fish
            initializeEncyclopedia();
            
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
            changeTab,
            encyclopediaFilter,
            encyclopediaPage,
            filteredEncyclopediaFish,
            paginatedEncyclopediaFish,
            totalEncyclopediaPages,
            changeEncyclopediaPage
        };
    }
}).mount('#app');
