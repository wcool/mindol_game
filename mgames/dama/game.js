// Tamagotchi Game - Complete Implementation

// Game State
let tamagotchi = null;
let gameTimers = {};
let coins = 0;
let poopCount = 0;
let isGameActive = false;
let inventory = [];

// Mini-game state
let miniGame = {
    active: false,
    canvas: null,
    ctx: null,
    player: { x: 135, y: 350, width: 30, height: 30 },
    coins: [],
    score: 0,
    keys: {}
};

// Evolution stages with sprites - Expanded with many varieties
const evolutionStages = [
    // Stage 0: Egg
    { name: 'egg', sprite: '🥚', stage: 0, minAge: 0 },

    // Stage 1: Baby (1 form)
    { name: 'baby', sprite: '👶', stage: 1, minAge: 5 },

    // Stage 2: Child (3 forms based on care)
    { name: 'child_happy', sprite: '😊', stage: 2, minAge: 10, minCare: 70 },
    { name: 'child_normal', sprite: '😐', stage: 2, minAge: 10, minCare: 40, maxCare: 70 },
    { name: 'child_sad', sprite: '😢', stage: 2, minAge: 10, maxCare: 40 },

    // Stage 3: Teen (5 forms based on stats)
    { name: 'teen_energetic', sprite: '⚡', stage: 3, minAge: 15, minHappiness: 80 },
    { name: 'teen_healthy', sprite: '💪', stage: 3, minAge: 15, minFullness: 80, minHappiness: 60 },
    { name: 'teen_smart', sprite: '🧠', stage: 3, minAge: 15, minCare: 70 },
    { name: 'teen_lazy', sprite: '😴', stage: 3, minAge: 15, maxFullness: 40 },
    { name: 'teen_grumpy', sprite: '😠', stage: 3, minAge: 15, maxHappiness: 40 },

    // Stage 4: Adult (15+ forms based on care quality and stats)
    // Legendary forms (90+ care)
    { name: 'adult_angel', sprite: '😇', stage: 4, minAge: 20, minCare: 90 },
    { name: 'adult_star', sprite: '⭐', stage: 4, minAge: 20, minCare: 90, minHappiness: 90 },

    // Great forms (70-90 care)
    { name: 'adult_unicorn', sprite: '🦄', stage: 4, minAge: 20, minCare: 70, maxCare: 90 },
    { name: 'adult_dragon', sprite: '🐉', stage: 4, minAge: 20, minCare: 70, minFullness: 70 },
    { name: 'adult_phoenix', sprite: '🔥', stage: 4, minAge: 20, minCare: 70, minHappiness: 80 },
    { name: 'adult_butterfly', sprite: '🦋', stage: 4, minAge: 20, minCare: 70, minHappiness: 75 },

    // Good forms (50-70 care)
    { name: 'adult_cat', sprite: '🐱', stage: 4, minAge: 20, minCare: 50, maxCare: 70 },
    { name: 'adult_dog', sprite: '🐶', stage: 4, minAge: 20, minCare: 50, maxCare: 70, minHappiness: 60 },
    { name: 'adult_rabbit', sprite: '🐰', stage: 4, minAge: 20, minCare: 50, maxCare: 70 },
    { name: 'adult_bear', sprite: '🐻', stage: 4, minAge: 20, minCare: 50, maxCare: 70, minFullness: 60 },

    // Average forms (30-50 care)
    { name: 'adult_frog', sprite: '🐸', stage: 4, minAge: 20, minCare: 30, maxCare: 50 },
    { name: 'adult_turtle', sprite: '🐢', stage: 4, minAge: 20, minCare: 30, maxCare: 50 },
    { name: 'adult_snail', sprite: '🐌', stage: 4, minAge: 20, minCare: 30, maxCare: 50, maxHappiness: 50 },

    // Poor forms (below 30 care)
    { name: 'adult_ghost', sprite: '👻', stage: 4, minAge: 20, maxCare: 30 },
    { name: 'adult_alien', sprite: '👾', stage: 4, minAge: 20, maxCare: 30, maxHappiness: 40 },
    { name: 'adult_zombie', sprite: '🧟', stage: 4, minAge: 20, maxCare: 30, maxFullness: 30 },
    { name: 'adult_skull', sprite: '💀', stage: 4, minAge: 20, maxCare: 20 }
];

// Tamagotchi Class
class Tamagotchi {
    constructor(name) {
        this.name = name;
        this.gender = Math.random() > 0.5 ? '♂' : '♀';
        this.fullness = 50;
        this.happiness = 50;
        this.weight = 10;
        this.age = 0; // in minutes
        this.evolutionStage = 0;
        this.isSick = false;
        this.sickTime = null;
        this.isAlive = true;
        this.isSleeping = false;
        this.birthTime = Date.now();
        this.careQuality = 100; // 0-100, affects evolution
    }

    feed(foodType) {
        if (!this.isAlive || this.isSleeping) return;

        const foods = {
            rice: { fullness: 15, happiness: 5, weight: 1 },
            meat: { fullness: 20, happiness: 8, weight: 2 },
            bread: { fullness: 12, happiness: 6, weight: 1 },
            noodle: { fullness: 18, happiness: 7, weight: 1.5 },
            candy: { fullness: 5, happiness: 15, weight: 0.5 },
            cake: { fullness: 8, happiness: 20, weight: 1 },
            icecream: { fullness: 6, happiness: 18, weight: 0.8 },
            cookie: { fullness: 7, happiness: 16, weight: 0.7 }
        };

        const food = foods[foodType];
        if (food) {
            this.fullness = Math.min(100, this.fullness + food.fullness);
            this.happiness = Math.min(100, this.happiness + food.happiness);
            this.weight += food.weight;

            // Animate feeding
            animateFeeding(foodType);
            updateDisplay();
        }
    }

    play() {
        if (!this.isAlive || this.isSleeping) return;
        this.happiness = Math.min(100, this.happiness + 10);
        updateDisplay();
    }

    clean() {
        if (poopCount > 0) {
            poopCount = 0;
            document.getElementById('poopContainer').innerHTML = '';
            this.happiness = Math.min(100, this.happiness + 5);
            updateDisplay();
        }
    }

    cure() {
        if (this.isSick) {
            this.isSick = false;
            this.sickTime = null;
            document.getElementById('sickIndicator').style.display = 'none';
            this.happiness = Math.min(100, this.happiness + 10);
            updateDisplay();
        }
    }

    update() {
        if (!this.isAlive) return;

        // Decrease stats over time
        this.fullness = Math.max(0, this.fullness - 0.5);
        this.happiness = Math.max(0, this.happiness - 0.3);

        // Update care quality
        const avgStat = (this.fullness + this.happiness) / 2;
        this.careQuality = (this.careQuality * 0.9) + (avgStat * 0.1);

        // Check for death conditions
        if (this.fullness <= 0 || this.happiness <= 0) {
            this.die('방치로 인해');
        }

        // Check sick timer
        if (this.isSick && this.sickTime) {
            const sickDuration = (Date.now() - this.sickTime) / 1000 / 60; // minutes
            if (sickDuration >= 20) {
                this.die('병을 치료하지 않아');
            }
        }

        updateDisplay();
    }

    die(reason) {
        this.isAlive = false;
        clearAllTimers();
        showDeathScreen(reason);
    }

    sleep() {
        this.isSleeping = true;
        document.querySelector('.game-screen').classList.add('sleeping');
        document.getElementById('lightIcon').textContent = '🌙';
        document.getElementById('lightIcon').classList.add('light-off');
        document.getElementById('tamagotchiSprite').textContent = '😴';
    }

    wakeUp() {
        this.isSleeping = false;
        document.querySelector('.game-screen').classList.remove('sleeping');
        document.getElementById('lightIcon').textContent = '💡';
        document.getElementById('lightIcon').classList.remove('light-off');
        updateSprite();
    }

    evolve() {
        // Get current stage number
        const currentStage = evolutionStages[this.evolutionStage].stage;
        const nextStageNum = currentStage + 1;

        // Find all possible evolutions for next stage
        const possibleEvolutions = evolutionStages.filter(e => e.stage === nextStageNum);

        if (possibleEvolutions.length === 0) {
            // Already at max stage
            return;
        }

        // Determine which evolution to use based on stats
        let selectedEvolution = possibleEvolutions[0]; // Default

        for (const evo of possibleEvolutions) {
            let matches = true;

            // Check care quality requirements
            if (evo.minCare !== undefined && this.careQuality < evo.minCare) matches = false;
            if (evo.maxCare !== undefined && this.careQuality > evo.maxCare) matches = false;

            // Check happiness requirements
            if (evo.minHappiness !== undefined && this.happiness < evo.minHappiness) matches = false;
            if (evo.maxHappiness !== undefined && this.happiness > evo.maxHappiness) matches = false;

            // Check fullness requirements
            if (evo.minFullness !== undefined && this.fullness < evo.minFullness) matches = false;
            if (evo.maxFullness !== undefined && this.fullness > evo.maxFullness) matches = false;

            if (matches) {
                selectedEvolution = evo;
                break; // Use first match
            }
        }

        this.evolutionStage = evolutionStages.indexOf(selectedEvolution);
        showEvolutionScreen();
    }
}

// Initialize Game
function startGame() {
    const nameInput = document.getElementById('nameInput').value.trim();
    if (!nameInput) {
        alert('이름을 입력해주세요!');
        return;
    }

    tamagotchi = new Tamagotchi(nameInput);
    document.getElementById('nameInputScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';

    isGameActive = true;
    updateDisplay();
    startTimers();
}

// Update Display
function updateDisplay() {
    if (!tamagotchi) return;

    // Update status bars
    document.getElementById('fullnessBar').style.width = tamagotchi.fullness + '%';
    document.getElementById('happinessBar').style.width = tamagotchi.happiness + '%';

    // Update info
    document.getElementById('petName').textContent = tamagotchi.name;
    document.getElementById('ageDisplay').textContent = `나이: ${tamagotchi.age}분`;
    document.getElementById('coinCount').textContent = coins;

    // Update sprite
    updateSprite();

    // Update sick indicator
    if (tamagotchi.isSick) {
        document.getElementById('sickIndicator').style.display = 'block';
    }
}

function updateSprite() {
    if (!tamagotchi || tamagotchi.isSleeping) return;

    const stage = evolutionStages[tamagotchi.evolutionStage];
    document.getElementById('tamagotchiSprite').textContent = stage.sprite;
}

// Timers
function startTimers() {
    // Age timer (every minute)
    gameTimers.age = setInterval(() => {
        if (!tamagotchi || !tamagotchi.isAlive) return;
        tamagotchi.age++;
        updateDisplay();
    }, 60000); // 1 minute

    // Update timer (every 10 seconds)
    gameTimers.update = setInterval(() => {
        if (!tamagotchi || !tamagotchi.isAlive) return;
        tamagotchi.update();
    }, 10000);

    // Poop timer (random 2-5 minutes)
    function schedulePoop() {
        const delay = (Math.random() * 3 + 2) * 60000; // 2-5 minutes
        gameTimers.poop = setTimeout(() => {
            if (tamagotchi && tamagotchi.isAlive && !tamagotchi.isSleeping && tamagotchi.fullness > 30) {
                addPoop();
            }
            schedulePoop();
        }, delay);
    }
    schedulePoop();

    // Sickness timer (random 5-15 minutes)
    function scheduleSickness() {
        const delay = (Math.random() * 10 + 5) * 60000; // 5-15 minutes
        gameTimers.sickness = setTimeout(() => {
            if (tamagotchi && tamagotchi.isAlive && !tamagotchi.isSick && !tamagotchi.isSleeping) {
                tamagotchi.isSick = true;
                tamagotchi.sickTime = Date.now();
                document.getElementById('sickIndicator').style.display = 'block';
            }
            scheduleSickness();
        }, delay);
    }
    scheduleSickness();

    // Evolution timer (every 5 minutes)
    function scheduleEvolution() {
        // Clear any existing evolution timers
        if (gameTimers.evolutionSleep) clearTimeout(gameTimers.evolutionSleep);
        if (gameTimers.evolutionWake) clearTimeout(gameTimers.evolutionWake);
        if (gameTimers.evolutionEvolve) clearTimeout(gameTimers.evolutionEvolve);

        const evolutionInterval = 5 * 60000; // 5 minutes

        // Schedule sleep at 4 minutes
        gameTimers.evolutionSleep = setTimeout(() => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.sleep();
            }
        }, evolutionInterval - 60000); // 4 minutes

        // Schedule wake up at 4:50
        gameTimers.evolutionWake = setTimeout(() => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.wakeUp();
            }
        }, evolutionInterval - 10000); // 4 minutes 50 seconds

        // Schedule evolution at 5:00
        gameTimers.evolutionEvolve = setTimeout(() => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.evolve();
                scheduleEvolution(); // Schedule next evolution
            }
        }, evolutionInterval); // 5 minutes
    }
    scheduleEvolution();
}

function clearAllTimers() {
    Object.values(gameTimers).forEach(timer => {
        if (timer) {
            clearInterval(timer);
            clearTimeout(timer);
        }
    });
    gameTimers = {};
}

// Poop Management
function addPoop() {
    if (poopCount < 5) {
        poopCount++;
        const poop = document.createElement('div');
        poop.className = 'poop';
        poop.textContent = '💩';
        document.getElementById('poopContainer').appendChild(poop);

        if (tamagotchi) {
            tamagotchi.happiness = Math.max(0, tamagotchi.happiness - 5);
            updateDisplay();
        }
    }
}

function cleanPoop() {
    if (tamagotchi) {
        tamagotchi.clean();
    }
}

// Medicine
function giveMedicine() {
    if (tamagotchi) {
        tamagotchi.cure();
    }
}

// Feed Menu
function openFeedMenu() {
    if (!tamagotchi || !tamagotchi.isAlive || tamagotchi.isSleeping) return;
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('feedScreen').style.display = 'block';
}

function closeFeedMenu() {
    document.getElementById('feedScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'block';
}

function feed(foodType) {
    if (tamagotchi) {
        tamagotchi.feed(foodType);
    }
}

function animateFeeding(foodType) {
    const foodEmojis = {
        rice: '🍚', meat: '🍖', bread: '🍞', noodle: '🍜',
        candy: '🍬', cake: '🍰', icecream: '🍦', cookie: '🍪'
    };

    const sprite = document.getElementById('tamagotchiSprite');
    const originalContent = sprite.textContent;
    sprite.textContent = foodEmojis[foodType];

    setTimeout(() => {
        sprite.textContent = originalContent;
    }, 500);
}

// Health Meter
function showHealthMeter() {
    if (!tamagotchi) return;

    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('healthScreen').style.display = 'block';

    document.getElementById('healthName').textContent = tamagotchi.name;
    document.getElementById('healthGender').textContent = tamagotchi.gender;
    document.getElementById('healthFullness').style.width = tamagotchi.fullness + '%';
    document.getElementById('healthFullnessText').textContent = Math.round(tamagotchi.fullness) + '%';
    document.getElementById('healthHappiness').style.width = tamagotchi.happiness + '%';
    document.getElementById('healthHappinessText').textContent = Math.round(tamagotchi.happiness) + '%';
    document.getElementById('healthWeight').textContent = tamagotchi.weight.toFixed(1) + 'g';

    const hours = Math.floor(tamagotchi.age / 60);
    const minutes = tamagotchi.age % 60;
    document.getElementById('healthAge').textContent = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

function closeHealthMeter() {
    document.getElementById('healthScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'block';
}

// Mini Game
function startMiniGame() {
    if (!tamagotchi || !tamagotchi.isAlive || tamagotchi.isSleeping) return;

    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';

    miniGame.active = true;
    miniGame.canvas = document.getElementById('gameCanvas');
    miniGame.ctx = miniGame.canvas.getContext('2d');
    miniGame.coins = [];
    miniGame.score = 0;

    // Reset player position
    miniGame.player.x = 135;

    // Start game loop
    requestAnimationFrame(updateMiniGame);

    // Spawn coins
    miniGame.spawnInterval = setInterval(spawnCoin, 1000);

    // End game after 30 seconds
    setTimeout(endMiniGame, 30000);
}

function spawnCoin() {
    if (!miniGame.active) return;

    miniGame.coins.push({
        x: Math.random() * (miniGame.canvas.width - 20),
        y: 0,
        width: 20,
        height: 20,
        speed: 2 + Math.random() * 2
    });
}

function updateMiniGame() {
    if (!miniGame.active) return;

    const ctx = miniGame.ctx;
    const canvas = miniGame.canvas;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.font = '30px Arial';
    ctx.fillText(evolutionStages[tamagotchi.evolutionStage].sprite, miniGame.player.x, miniGame.player.y);

    // Update and draw coins
    for (let i = miniGame.coins.length - 1; i >= 0; i--) {
        const coin = miniGame.coins[i];
        coin.y += coin.speed;

        // Draw coin
        ctx.font = '20px Arial';
        ctx.fillText('🪙', coin.x, coin.y);

        // Check collision
        if (Math.abs(coin.x - miniGame.player.x) < 30 &&
            Math.abs(coin.y - miniGame.player.y) < 30) {
            miniGame.coins.splice(i, 1);
            miniGame.score++;
            coins++;
            updateDisplay();
        }

        // Remove if off screen
        if (coin.y > canvas.height) {
            miniGame.coins.splice(i, 1);
        }
    }

    // Draw score
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('코인: ' + miniGame.score, 10, 30);

    requestAnimationFrame(updateMiniGame);
}

function endMiniGame() {
    miniGame.active = false;
    clearInterval(miniGame.spawnInterval);

    if (tamagotchi) {
        tamagotchi.happiness = Math.min(100, tamagotchi.happiness + miniGame.score * 2);
        updateDisplay();
    }

    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'block';
}

// Keyboard controls for mini-game
document.addEventListener('keydown', (e) => {
    if (!miniGame.active) return;

    if (e.key === 'ArrowLeft') {
        miniGame.player.x = Math.max(0, miniGame.player.x - 15);
    } else if (e.key === 'ArrowRight') {
        miniGame.player.x = Math.min(miniGame.canvas.width - 30, miniGame.player.x + 15);
    }
});

// Evolution Screen
function showEvolutionScreen() {
    const evolutionScreen = document.getElementById('evolutionScreen');
    const evolutionAnimation = document.getElementById('evolutionAnimation');

    // Show black screen
    evolutionScreen.style.display = 'flex';
    evolutionAnimation.textContent = '✨';

    setTimeout(() => {
        // Show new form
        const stage = evolutionStages[tamagotchi.evolutionStage];
        evolutionAnimation.textContent = stage.sprite;

        setTimeout(() => {
            evolutionScreen.style.display = 'none';
            updateSprite();
        }, 2000);
    }, 2000);
}

// Death Screen
function showDeathScreen(reason) {
    const deathScreen = document.getElementById('deathScreen');
    const deathMessage = document.getElementById('deathMessage');

    deathMessage.textContent = `${tamagotchi.name}이(가) ${reason} 세상을 떠났습니다...`;
    deathScreen.style.display = 'flex';
}

// Shop System
const shopItems = [
    // Special Items
    {
        id: 'instant_evolution',
        name: '즉시 진화',
        icon: '🚀',
        description: '즉시 다음 단계로 진화합니다',
        price: 50,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.evolve();
            }
        }
    },
    {
        id: 'time_machine',
        name: '타임머신',
        icon: '⏰',
        description: '나이 +5분 (진화 가속)',
        price: 40,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.age += 5;
                updateDisplay();
            }
        }
    },
    {
        id: 'golden_egg',
        name: '황금알',
        icon: '🥇',
        description: '케어 품질 +20',
        price: 60,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.careQuality = Math.min(100, tamagotchi.careQuality + 20);
                updateDisplay();
            }
        }
    },

    // Health & Medicine
    {
        id: 'medicine',
        name: '약',
        icon: '💊',
        description: '병을 치료합니다',
        price: 10,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.cure();
            }
        }
    },
    {
        id: 'vitamin',
        name: '비타민',
        icon: '💉',
        description: '행복도 +20, 포만감 +10',
        price: 25,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.happiness = Math.min(100, tamagotchi.happiness + 20);
                tamagotchi.fullness = Math.min(100, tamagotchi.fullness + 10);
                updateDisplay();
            }
        }
    },
    {
        id: 'super_medicine',
        name: '슈퍼 약',
        icon: '✨',
        description: '병 치료 + 행복도 +30',
        price: 35,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.cure();
                tamagotchi.happiness = Math.min(100, tamagotchi.happiness + 30);
                updateDisplay();
            }
        }
    },

    // Food Items
    {
        id: 'food_pack',
        name: '음식 팩',
        icon: '🍱',
        description: '포만감 +30',
        price: 15,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.fullness = Math.min(100, tamagotchi.fullness + 30);
                updateDisplay();
            }
        }
    },
    {
        id: 'deluxe_meal',
        name: '디럭스 식사',
        icon: '🍽️',
        description: '포만감 +50, 행복도 +10',
        price: 30,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.fullness = Math.min(100, tamagotchi.fullness + 50);
                tamagotchi.happiness = Math.min(100, tamagotchi.happiness + 10);
                updateDisplay();
            }
        }
    },

    // Happiness Items
    {
        id: 'happiness_boost',
        name: '행복 부스트',
        icon: '😊',
        description: '행복도 +30',
        price: 20,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.happiness = Math.min(100, tamagotchi.happiness + 30);
                updateDisplay();
            }
        }
    },
    {
        id: 'toy',
        name: '장난감',
        icon: '🎮',
        description: '행복도 +40',
        price: 25,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.happiness = Math.min(100, tamagotchi.happiness + 40);
                updateDisplay();
            }
        }
    },

    // Utility Items
    {
        id: 'auto_cleaner',
        name: '자동 청소기',
        icon: '🤖',
        description: '모든 똥 제거 + 행복도 +15',
        price: 20,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.clean();
                tamagotchi.happiness = Math.min(100, tamagotchi.happiness + 15);
                updateDisplay();
            }
        }
    },
    {
        id: 'energy_drink',
        name: '에너지 드링크',
        icon: '⚡',
        description: '모든 스탯 +15',
        price: 45,
        effect: () => {
            if (tamagotchi && tamagotchi.isAlive) {
                tamagotchi.fullness = Math.min(100, tamagotchi.fullness + 15);
                tamagotchi.happiness = Math.min(100, tamagotchi.happiness + 15);
                tamagotchi.careQuality = Math.min(100, tamagotchi.careQuality + 15);
                updateDisplay();
            }
        }
    }
];

function openShop() {
    if (!tamagotchi || !tamagotchi.isAlive || tamagotchi.isSleeping) return;

    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('shopScreen').style.display = 'block';

    // Render shop items
    const shopGrid = document.getElementById('shopGrid');
    shopGrid.innerHTML = '';

    shopItems.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'shop-item';

        const canAfford = coins >= item.price;
        if (!canAfford) {
            itemCard.classList.add('disabled');
        }

        itemCard.innerHTML = `
            <div class="shop-item-icon">${item.icon}</div>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-description">${item.description}</div>
            <div class="shop-item-price">🪙 ${item.price}</div>
            <button class="shop-buy-btn" onclick="buyItem('${item.id}')" ${!canAfford ? 'disabled' : ''}>
                ${canAfford ? '구매' : '코인 부족'}
            </button>
        `;

        shopGrid.appendChild(itemCard);
    });
}

function closeShop() {
    document.getElementById('shopScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'block';
}

function buyItem(itemId) {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;

    if (coins >= item.price) {
        coins -= item.price;
        updateDisplay();

        // Apply item effect
        item.effect();

        // Show purchase confirmation
        alert(`${item.name}을(를) 구매했습니다!`);

        // Refresh shop display
        openShop();
    } else {
        alert('코인이 부족합니다!');
    }
}

// Start button event
document.getElementById('startButton').addEventListener('click', startGame);

// Allow Enter key to start game
document.getElementById('nameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        startGame();
    }
});
