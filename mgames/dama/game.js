// Tamagotchi Game - Complete Implementation

// Game State
let tamagotchi = null;
let gameTimers = {};
let coins = 0;
let poopCount = 0;
let isGameActive = false;
let inventory = [];
let isPaused = false;
let feedingUntil = 0; // 먹이 애니메이션 중 스프라이트 덮어쓰기 방지
let miniGameHighScore = 0;

// ===== localStorage 저장 =====
const STORAGE_KEYS = {
    coins: 'dama_coins',
    highScore: 'dama_highScore',
    muted: 'dama_muted'
};

function loadPersistentData() {
    try {
        coins = parseInt(localStorage.getItem(STORAGE_KEYS.coins), 10) || 0;
        miniGameHighScore = parseInt(localStorage.getItem(STORAGE_KEYS.highScore), 10) || 0;
        SoundFX.muted = localStorage.getItem(STORAGE_KEYS.muted) === '1';
    } catch (e) { /* localStorage 사용 불가 시 무시 */ }
}

function savePersistentData() {
    try {
        localStorage.setItem(STORAGE_KEYS.coins, String(coins));
        localStorage.setItem(STORAGE_KEYS.highScore, String(miniGameHighScore));
    } catch (e) { /* 무시 */ }
}

// ===== 사운드 엔진 (Web Audio API) =====
const SoundFX = {
    ctx: null,
    muted: false,
    ensureCtx() {
        if (!this.ctx) {
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) this.ctx = new AC();
            } catch (e) { this.ctx = null; }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    },
    tone(freq, duration, type, volume, delay) {
        const ctx = this.ctx;
        if (!ctx) return;
        const t0 = ctx.currentTime + (delay || 0);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(volume || 0.15, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.05);
    },
    play(name) {
        if (this.muted) return;
        if (!this.ensureCtx()) return;
        switch (name) {
            case 'click':
                this.tone(600, 0.06, 'square', 0.08);
                break;
            case 'feed':
                this.tone(440, 0.1, 'square', 0.12);
                this.tone(660, 0.12, 'square', 0.12, 0.1);
                break;
            case 'coin':
                this.tone(880, 0.06, 'square', 0.1);
                this.tone(1320, 0.1, 'square', 0.1, 0.06);
                break;
            case 'clean':
                this.tone(500, 0.08, 'triangle', 0.12);
                this.tone(350, 0.1, 'triangle', 0.1, 0.08);
                break;
            case 'cure':
                this.tone(523, 0.1, 'sine', 0.12);
                this.tone(659, 0.1, 'sine', 0.12, 0.1);
                this.tone(784, 0.15, 'sine', 0.12, 0.2);
                break;
            case 'evolve':
                this.tone(523, 0.12, 'square', 0.12);
                this.tone(659, 0.12, 'square', 0.12, 0.12);
                this.tone(784, 0.12, 'square', 0.12, 0.24);
                this.tone(1047, 0.3, 'square', 0.12, 0.36);
                break;
            case 'death':
                this.tone(392, 0.25, 'sawtooth', 0.1);
                this.tone(311, 0.25, 'sawtooth', 0.1, 0.25);
                this.tone(233, 0.5, 'sawtooth', 0.1, 0.5);
                break;
            case 'buy':
                this.tone(784, 0.08, 'square', 0.12);
                this.tone(1047, 0.15, 'square', 0.12, 0.08);
                break;
            case 'gamestart':
                this.tone(440, 0.08, 'square', 0.1);
                this.tone(554, 0.08, 'square', 0.1, 0.08);
                this.tone(659, 0.12, 'square', 0.1, 0.16);
                break;
            case 'gameover':
                this.tone(659, 0.1, 'triangle', 0.12);
                this.tone(523, 0.2, 'triangle', 0.12, 0.1);
                break;
            case 'record':
                this.tone(659, 0.1, 'square', 0.12);
                this.tone(784, 0.1, 'square', 0.12, 0.1);
                this.tone(1047, 0.1, 'square', 0.12, 0.2);
                this.tone(1319, 0.25, 'square', 0.12, 0.3);
                break;
        }
    }
};

function toggleMute() {
    SoundFX.muted = !SoundFX.muted;
    try {
        localStorage.setItem(STORAGE_KEYS.muted, SoundFX.muted ? '1' : '0');
    } catch (e) { /* 무시 */ }
    updateMuteButton();
    if (!SoundFX.muted) SoundFX.play('click');
}

function updateMuteButton() {
    const btn = document.getElementById('muteButton');
    if (btn) {
        btn.textContent = SoundFX.muted ? '🔇' : '🔊';
        btn.title = SoundFX.muted ? '소리 켜기' : '소리 끄기';
    }
}

// ===== 일시정지 / 다시 시작 =====
let pauseStartTime = 0;

function togglePause() {
    if (!isGameActive || !tamagotchi || !tamagotchi.isAlive) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseStartTime = Date.now();
    } else {
        // 일시정지한 시간만큼 병 타이머 보정 (일시정지 중 죽지 않도록)
        const pausedFor = Date.now() - pauseStartTime;
        if (tamagotchi && tamagotchi.sickTime) {
            tamagotchi.sickTime += pausedFor;
        }
    }
    SoundFX.play('click');
    const overlay = document.getElementById('pauseOverlay');
    const btn = document.getElementById('pauseButton');
    if (overlay) overlay.style.display = isPaused ? 'flex' : 'none';
    if (btn) {
        btn.textContent = isPaused ? '▶️' : '⏸️';
        btn.title = isPaused ? '계속하기' : '일시정지';
    }
}

function restartGame() {
    if (confirm('정말 처음부터 다시 시작하시겠습니까?')) {
        savePersistentData();
        location.reload();
    }
}

// ===== 시각 효과 헬퍼 =====
function bounceSprite() {
    const sprite = document.getElementById('tamagotchiSprite');
    if (!sprite) return;
    sprite.classList.remove('bounce');
    // 리플로우 강제로 애니메이션 재시작
    void sprite.offsetWidth;
    sprite.classList.add('bounce');
}

function showFloatText(text) {
    const container = document.querySelector('.tamagotchi-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.left = (35 + Math.random() * 30) + '%';
    container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

function showToast(message) {
    const old = document.getElementById('gameToast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'gameToast';
    toast.className = 'game-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2200);
}


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

// miniGame을 전역 스코프에 노출 (터치 컨트롤용)
window.miniGame = miniGame;

// Evolution stages with sprites - Expanded with many varieties
const evolutionStages = [
    // Stage 0: Egg
    { name: 'egg', sprite: 'images/egg.png', emoji: '🥚', stage: 0, minAge: 0 },

    // Stage 1: Baby (1 form)
    { name: 'baby', sprite: 'images/baby.png', emoji: '👶', stage: 1, minAge: 5 },

    // Stage 2: Child (3 forms based on care)
    { name: 'child_happy', sprite: 'images/child_happy.png', emoji: '😊', stage: 2, minAge: 10, minCare: 70 },
    { name: 'child_normal', sprite: 'images/child_normal.png', emoji: '😐', stage: 2, minAge: 10, minCare: 40, maxCare: 70 },
    { name: 'child_sad', sprite: 'images/child_sad.png', emoji: '😢', stage: 2, minAge: 10, maxCare: 40 },

    // Stage 3: Teen (5 forms based on stats)
    { name: 'teen_energetic', sprite: 'images/teen_energetic.png', emoji: '⚡', stage: 3, minAge: 15, minHappiness: 80 },
    { name: 'teen_healthy', sprite: 'images/teen_healthy.png', emoji: '💪', stage: 3, minAge: 15, minFullness: 80, minHappiness: 60 },
    { name: 'teen_smart', sprite: 'images/teen_smart.png', emoji: '🧠', stage: 3, minAge: 15, minCare: 70 },
    { name: 'teen_lazy', sprite: 'images/teen_lazy.png', emoji: '😴', stage: 3, minAge: 15, maxFullness: 40 },
    { name: 'teen_grumpy', sprite: 'images/teen_grumpy.png', emoji: '😠', stage: 3, minAge: 15, maxHappiness: 40 },

    // Stage 4: Adult (15+ forms based on care quality and stats)
    // Legendary forms (90+ care)
    { name: 'adult_angel', sprite: 'images/adult_angel.png', emoji: '😇', stage: 4, minAge: 20, minCare: 90 },
    { name: 'adult_star', sprite: 'images/adult_star.png', emoji: '⭐', stage: 4, minAge: 20, minCare: 90, minHappiness: 90 },

    // Great forms (70-90 care)
    { name: 'adult_unicorn', sprite: 'images/adult_unicorn.png', emoji: '🦄', stage: 4, minAge: 20, minCare: 70, maxCare: 90 },
    { name: 'adult_dragon', sprite: 'images/adult_dragon.png', emoji: '🐉', stage: 4, minAge: 20, minCare: 70, minFullness: 70 },
    { name: 'adult_phoenix', sprite: 'images/adult_phoenix.png', emoji: '🔥', stage: 4, minAge: 20, minCare: 70, minHappiness: 80 },
    { name: 'adult_butterfly', sprite: '🦋', emoji: '🦋', stage: 4, minAge: 20, minCare: 70, minHappiness: 75 },

    // Good forms (50-70 care)
    { name: 'adult_cat', sprite: '🐱', emoji: '🐱', stage: 4, minAge: 20, minCare: 50, maxCare: 70 },
    { name: 'adult_dog', sprite: '🐶', emoji: '🐶', stage: 4, minAge: 20, minCare: 50, maxCare: 70, minHappiness: 60 },
    { name: 'adult_rabbit', sprite: '🐰', emoji: '🐰', stage: 4, minAge: 20, minCare: 50, maxCare: 70 },
    { name: 'adult_bear', sprite: '🐻', emoji: '🐻', stage: 4, minAge: 20, minCare: 50, maxCare: 70, minFullness: 60 },

    // Average forms (30-50 care)
    { name: 'adult_frog', sprite: '🐸', emoji: '🐸', stage: 4, minAge: 20, minCare: 30, maxCare: 50 },
    { name: 'adult_turtle', sprite: '🐢', emoji: '🐢', stage: 4, minAge: 20, minCare: 30, maxCare: 50 },
    { name: 'adult_snail', sprite: '🐌', emoji: '🐌', stage: 4, minAge: 20, minCare: 30, maxCare: 50, maxHappiness: 50 },

    // Poor forms (below 30 care)
    { name: 'adult_ghost', sprite: '👻', emoji: '👻', stage: 4, minAge: 20, maxCare: 30 },
    { name: 'adult_alien', sprite: '👾', emoji: '👾', stage: 4, minAge: 20, maxCare: 30, maxHappiness: 40 },
    { name: 'adult_zombie', sprite: '🧟', emoji: '🧟', stage: 4, minAge: 20, maxCare: 30, maxFullness: 30 },
    { name: 'adult_skull', sprite: '💀', emoji: '💀', stage: 4, minAge: 20, maxCare: 20 }
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
            SoundFX.play('feed');
            animateFeeding(foodType);
            showFloatText(`+${food.fullness} 🍚`);
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
            SoundFX.play('clean');
            showFloatText('+5 ✨');
            updateDisplay();
        }
    }

    cure() {
        if (this.isSick) {
            this.isSick = false;
            this.sickTime = null;
            document.getElementById('sickIndicator').style.display = 'none';
            this.happiness = Math.min(100, this.happiness + 10);
            SoundFX.play('cure');
            showFloatText('+10 💊');
            bounceSprite();
            updateDisplay();
        }
    }

    update() {
        if (!this.isAlive || isPaused) return;

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
        // 미니게임 진행 중이면 종료
        if (miniGame.active) {
            miniGame.active = false;
            clearInterval(miniGame.spawnInterval);
        }
        // 잠자는 상태로 죽은 경우 화면 밝기 복구
        document.querySelector('.game-screen').classList.remove('sleeping');
        savePersistentData();
        SoundFX.play('death');
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
    SoundFX.play('gamestart');
    updateMuteButton();
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
    if (Date.now() < feedingUntil) return; // 먹이 애니메이션 중에는 덮어쓰지 않음

    const stage = evolutionStages[tamagotchi.evolutionStage];
    const spriteElement = document.getElementById('tamagotchiSprite');

    // Check if sprite is an image path or emoji
    if (stage.sprite.endsWith('.png')) {
        // Use image
        spriteElement.innerHTML = `<img src="${stage.sprite}" alt="${stage.name}" style="width: 100%; height: 100%; image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;">`;
    } else {
        // Use emoji
        spriteElement.textContent = stage.sprite;
    }
}

// Timers
function startTimers() {
    // Age timer (every minute)
    gameTimers.age = setInterval(() => {
        if (!tamagotchi || !tamagotchi.isAlive || isPaused) return;
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
            if (tamagotchi && tamagotchi.isAlive && !isPaused && !tamagotchi.isSleeping && tamagotchi.fullness > 30) {
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
            if (tamagotchi && tamagotchi.isAlive && !isPaused && !tamagotchi.isSick && !tamagotchi.isSleeping) {
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
            if (tamagotchi && tamagotchi.isAlive && !isPaused) {
                tamagotchi.sleep();
            }
        }, evolutionInterval - 60000); // 4 minutes

        // Schedule wake up at 4:50
        gameTimers.evolutionWake = setTimeout(() => {
            if (tamagotchi && tamagotchi.isAlive && tamagotchi.isSleeping) {
                tamagotchi.wakeUp();
            }
        }, evolutionInterval - 10000); // 4 minutes 50 seconds

        // Schedule evolution at 5:00
        gameTimers.evolutionEvolve = setTimeout(function fireEvolution() {
            if (!tamagotchi || !tamagotchi.isAlive) return;
            if (isPaused) {
                // 일시정지 중이면 잠시 후 다시 시도
                gameTimers.evolutionEvolve = setTimeout(fireEvolution, 1000);
                return;
            }
            tamagotchi.evolve();
            scheduleEvolution(); // Schedule next evolution
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
    feedingUntil = Date.now() + 500;
    sprite.textContent = foodEmojis[foodType];
    bounceSprite();

    setTimeout(() => {
        feedingUntil = 0;
        updateSprite(); // 이미지/이모지 단계 모두 올바르게 복원
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
    miniGame.popups = []; // 떠오르는 점수 표시
    miniGame.endTime = Date.now() + 30000; // 30초 후 종료
    miniGame.lastFrame = Date.now();

    // Reset player position
    miniGame.player.x = 135;

    SoundFX.play('gamestart');

    // Start game loop
    requestAnimationFrame(updateMiniGame);

    // Spawn coins
    miniGame.spawnInterval = setInterval(spawnCoin, 1000);
}

function spawnCoin() {
    if (!miniGame.active || isPaused) return;

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

    const now = Date.now();

    // 일시정지 중이면 종료 시간을 뒤로 밀고 그리기만 유지
    if (isPaused) {
        miniGame.endTime += now - miniGame.lastFrame;
        miniGame.lastFrame = now;
        requestAnimationFrame(updateMiniGame);
        return;
    }
    miniGame.lastFrame = now;

    // 시간 종료 체크
    if (now >= miniGame.endTime) {
        endMiniGame();
        return;
    }

    const ctx = miniGame.ctx;
    const canvas = miniGame.canvas;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.font = '30px Arial';
    ctx.fillText(evolutionStages[tamagotchi.evolutionStage].emoji, miniGame.player.x, miniGame.player.y);

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
            savePersistentData();
            SoundFX.play('coin');
            // 떠오르는 +1 표시
            miniGame.popups.push({ x: coin.x, y: coin.y, alpha: 1 });
            updateDisplay();
        }

        // Remove if off screen
        if (coin.y > canvas.height) {
            miniGame.coins.splice(i, 1);
        }
    }

    // 떠오르는 점수 표시 업데이트
    for (let i = miniGame.popups.length - 1; i >= 0; i--) {
        const p = miniGame.popups[i];
        p.y -= 1.5;
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
            miniGame.popups.splice(i, 1);
            continue;
        }
        ctx.fillStyle = `rgba(255, 200, 0, ${p.alpha})`;
        ctx.font = 'bold 18px Arial';
        ctx.fillText('+1', p.x, p.y);
    }

    // Draw score
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('코인: ' + miniGame.score, 10, 30);

    // 남은 시간 표시
    const remainSec = Math.max(0, Math.ceil((miniGame.endTime - now) / 1000));
    ctx.fillText('⏱️ ' + remainSec + '초', canvas.width - 90, 30);

    // 최고 기록 표시
    ctx.fillStyle = '#666';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('최고: ' + miniGameHighScore, 10, 52);

    requestAnimationFrame(updateMiniGame);
}

function endMiniGame() {
    if (!miniGame.active) return; // 중복 실행 방지
    miniGame.active = false;
    clearInterval(miniGame.spawnInterval);

    // 최고 기록 갱신 확인
    let newRecord = false;
    if (miniGame.score > miniGameHighScore) {
        miniGameHighScore = miniGame.score;
        newRecord = true;
    }
    savePersistentData();

    if (tamagotchi) {
        tamagotchi.happiness = Math.min(100, tamagotchi.happiness + miniGame.score * 2);
        updateDisplay();
    }

    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'block';

    if (newRecord && miniGame.score > 0) {
        SoundFX.play('record');
        showToast(`🎉 신기록! 코인 ${miniGame.score}개 획득!`);
    } else {
        SoundFX.play('gameover');
        showToast(`미니게임 종료! 코인 ${miniGame.score}개 획득 (최고: ${miniGameHighScore})`);
    }
    bounceSprite();
}

// Keyboard controls for mini-game
document.addEventListener('keydown', (e) => {
    if (!miniGame.active) return;

    if (e.key === 'ArrowLeft') {
        e.preventDefault(); // 화면 스크롤 방지
        miniGame.player.x = Math.max(0, miniGame.player.x - 15);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
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
    SoundFX.play('evolve');

    setTimeout(() => {
        // Show new form
        const stage = evolutionStages[tamagotchi.evolutionStage];

        // Check if sprite is an image or emoji
        if (stage.sprite.endsWith('.png')) {
            evolutionAnimation.innerHTML = `<img src="${stage.sprite}" alt="${stage.name}" style="width: 120px; height: 120px; image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;">`;
        } else {
            evolutionAnimation.textContent = stage.sprite;
        }

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
        savePersistentData();
        updateDisplay();

        // Apply item effect
        item.effect();

        // Show purchase confirmation
        SoundFX.play('buy');
        showToast(`${item.name}을(를) 구매했습니다!`);

        // Refresh shop display
        openShop();
    } else {
        SoundFX.play('click');
        showToast('코인이 부족합니다!');
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

// Header buttons (mute / pause / restart)
const muteButtonEl = document.getElementById('muteButton');
if (muteButtonEl) muteButtonEl.addEventListener('click', toggleMute);

const pauseButtonEl = document.getElementById('pauseButton');
if (pauseButtonEl) pauseButtonEl.addEventListener('click', togglePause);

const restartButtonEl = document.getElementById('restartButton');
if (restartButtonEl) restartButtonEl.addEventListener('click', restartGame);

// 일시정지 오버레이 클릭 시 재개
const pauseOverlayEl = document.getElementById('pauseOverlay');
if (pauseOverlayEl) pauseOverlayEl.addEventListener('click', togglePause);

// 저장된 데이터 불러오기 (코인, 최고 기록, 음소거 설정)
loadPersistentData();
updateMuteButton();
