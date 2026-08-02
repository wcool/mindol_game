// 게임 설정
const ROWS = 5;
const COLS = 9;
const CELL_WIDTH = 100;
const CELL_HEIGHT = 100;
let bossIndex = 0; // 보스 순차 등장을 위한 인덱스

// 게임 상태
let sunCount = 50;
let selectedPlant = null;
let gameBoard = [];
let plants = [];
let zombies = [];
let peas = [];
let suns = [];
let waveCount = 1;
let zombieCount = 0;
let gameRunning = true;
let zombiesPassed = 0; // 끝까지 도달한 좀비 수
let gamePaused = false; // 일시정지 상태
let totalZombiesSpawned = 0; // 지금까지 등장한 좀비 총 수 (승리 판정용)
let killCount = 0; // 처치한 좀비 수 (점수)
let spawnIntervalId = null; // 좀비 생성 인터벌 ID (재시작용)

// localStorage 저장 키
const STORAGE_KEY_BEST_WAVE = 'pvsz_best_wave';
const STORAGE_KEY_HIGH_SCORE = 'pvsz_high_score';
const STORAGE_KEY_MUTED = 'pvsz_muted';
let bestWave = parseInt(localStorage.getItem(STORAGE_KEY_BEST_WAVE), 10) || 1;
let highScore = parseInt(localStorage.getItem(STORAGE_KEY_HIGH_SCORE), 10) || 0;

// 식물 비용
const PLANT_COSTS = {
    sunflower: 50,
    peashooter: 100,
    wallnut: 50,
    cherrybomb: 150,
    snowpea: 175,
    repeater: 200,
    chomper: 150,
    threepeater: 250,
    gatling: 300,
    torchwood: 175,
    tallnut: 125,
    squash: 50,
    jalapeno: 125,
    potato: 25,
    peashooter2: 100,
    hypnoshroom: 75,
    gloomshroom: 200,
    doomshroom: 125,
    icepeashooter: 200
};

// 좀비 타입
const ZOMBIE_TYPES = [
    { icon: '🧟', health: 200, speed: 0.05, name: '일반좀비' },
    { icon: '🧟‍♂️', health: 300, speed: 0.04, name: '강한좀비' },
    { icon: '🧟‍♀️', health: 150, speed: 0.06, name: '빠른좀비' },
    { icon: '🦴', health: 400, speed: 0.03, name: '뼈좀비' },
    { icon: '🛡️', health: 600, speed: 0.025, name: '방패좀비' },
    { icon: '⚔️', health: 500, speed: 0.03, name: '전사좀비' },
    { icon: '💀', health: 800, speed: 0.02, name: '해골좀비' }
];

// 보스 좀비 타입
const BOSS_ZOMBIE_TYPES = [
    { icon: '👑', health: 1000, speed: 0.015, name: '좀비킹', size: 1.5 },
    { icon: '🤴', health: 800, speed: 0.02, name: '좀비왕', size: 1.4 },
    { icon: '👹', health: 1200, speed: 0.012, name: '악마좀비', size: 1.6 },
    { icon: '🐉', health: 1500, speed: 0.01, name: '드래곤좀비', size: 1.8 }
];

// 음향 효과 (Web Audio API로 합성 - 외부 파일 불필요)
let audioCtx = null;
let isMuted = localStorage.getItem(STORAGE_KEY_MUTED) === '1';

function getAudioCtx() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// 단일 톤 재생 헬퍼
function tone(freq, dur, type, vol, when, slideTo) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime + (when || 0);
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    }
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
}

// 음향 효과 재생 함수
function playSound(sound) {
    if (isMuted) return;
    try {
        switch (sound) {
            case 'shoot':
                tone(880, 0.07, 'square', 0.05, 0, 440);
                break;
            case 'hit':
                tone(220, 0.08, 'sawtooth', 0.07, 0, 110);
                break;
            case 'collectSun':
                tone(660, 0.09, 'sine', 0.12);
                tone(990, 0.12, 'sine', 0.12, 0.07);
                break;
            case 'plant':
                tone(330, 0.08, 'triangle', 0.12);
                tone(494, 0.1, 'triangle', 0.1, 0.06);
                break;
            case 'explosion':
                tone(120, 0.4, 'sawtooth', 0.2, 0, 40);
                tone(60, 0.5, 'square', 0.15, 0.03, 30);
                break;
            case 'wave':
                tone(523, 0.12, 'triangle', 0.12);
                tone(659, 0.12, 'triangle', 0.12, 0.1);
                tone(784, 0.2, 'triangle', 0.12, 0.2);
                break;
            case 'boss':
                tone(150, 0.3, 'sawtooth', 0.18, 0, 90);
                tone(150, 0.3, 'sawtooth', 0.18, 0.35, 90);
                break;
            case 'zombieDie':
                tone(300, 0.2, 'sawtooth', 0.09, 0, 80);
                break;
            case 'gameOver':
                tone(392, 0.25, 'triangle', 0.15);
                tone(311, 0.25, 'triangle', 0.15, 0.25);
                tone(233, 0.5, 'triangle', 0.15, 0.5);
                break;
            case 'win':
                tone(523, 0.15, 'triangle', 0.15);
                tone(659, 0.15, 'triangle', 0.15, 0.15);
                tone(784, 0.15, 'triangle', 0.15, 0.3);
                tone(1047, 0.4, 'triangle', 0.15, 0.45);
                break;
        }
    } catch (e) {
        // 오디오 미지원 환경에서는 무시
    }
}

// 초기화
function init() {
    createGrid();
    setupEventListeners();
    setupControlButtons();
    updateBestWaveDisplay();
    startGameLoop();
    spawnZombies();
    generateSun();
}

// 컨트롤 버튼 (음소거 / 일시정지 / 다시시작) 설정
function setupControlButtons() {
    const muteBtn = document.getElementById('muteBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const restartBtn = document.getElementById('restartBtn');

    if (muteBtn) {
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            localStorage.setItem(STORAGE_KEY_MUTED, isMuted ? '1' : '0');
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
            if (!isMuted) playSound('collectSun');
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            if (!gameRunning) return;
            gamePaused = !gamePaused;
            pauseBtn.textContent = gamePaused ? '▶️ 계속' : '⏸️ 일시정지';
            document.getElementById('gameBoard').classList.toggle('paused', gamePaused);
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }

    // 모바일 브라우저: 첫 터치/클릭에서 오디오 잠금 해제
    document.addEventListener('pointerdown', () => { getAudioCtx(); }, { once: true });
}

// 게임 다시시작
function restartGame() {
    if (spawnIntervalId) {
        clearInterval(spawnIntervalId);
        spawnIntervalId = null;
    }

    // 남아 있는 요소 정리
    zombies.forEach(z => {
        if (z.healthBar) z.healthBar.remove();
        z.element.remove();
    });
    peas.forEach(p => p.element.remove());
    document.querySelectorAll('.sun, .boss-alert, .wave-banner, .death-pop').forEach(el => el.remove());

    // 상태 초기화
    zombies = [];
    peas = [];
    plants = [];
    suns = [];
    sunCount = 50;
    waveCount = 1;
    zombieCount = 0;
    zombiesPassed = 0;
    totalZombiesSpawned = 0;
    killCount = 0;
    bossIndex = 0;
    selectedPlant = null;
    gamePaused = false;
    gameRunning = true;

    document.querySelectorAll('.plant-card').forEach(c => c.classList.remove('selected'));
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) pauseBtn.textContent = '⏸️ 일시정지';
    const status = document.getElementById('gameStatus');
    status.className = 'game-status';
    status.textContent = '';
    document.getElementById('gameBoard').classList.remove('paused');

    createGrid();
    updateSunCounter();
    updateWaveCount();
    updateZombieCount();
    updateBestWaveDisplay();
    spawnZombies();
    playSound('wave');
}

// 최고 기록 저장
function saveRecords() {
    if (waveCount > bestWave) {
        bestWave = waveCount;
        localStorage.setItem(STORAGE_KEY_BEST_WAVE, String(bestWave));
    }
    if (killCount > highScore) {
        highScore = killCount;
        localStorage.setItem(STORAGE_KEY_HIGH_SCORE, String(highScore));
    }
    updateBestWaveDisplay();
}

// 최고 기록 표시 갱신
function updateBestWaveDisplay() {
    const el = document.getElementById('bestWave');
    if (el) el.textContent = bestWave;
    const scoreEl = document.getElementById('highScore');
    if (scoreEl) scoreEl.textContent = highScore;
}

// 그리드 생성
function createGrid() {
    const board = document.getElementById('gameBoard');
    board.innerHTML = '';
    gameBoard = [];

    for (let row = 0; row < ROWS; row++) {
        gameBoard[row] = [];
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            // 첫 번째 열(왼쪽 끝)을 위험 영역으로 표시
            if (col === 0) {
                cell.classList.add('danger-zone');
            }
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', () => handleCellClick(row, col));
            board.appendChild(cell);
            gameBoard[row][col] = { plant: null, cell: cell };
        }
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    document.querySelectorAll('.plant-card').forEach(card => {
        card.addEventListener('click', () => {
            const plantType = card.dataset.plant;
            const cost = parseInt(card.dataset.cost);
            
            if (sunCount >= cost) {
                document.querySelectorAll('.plant-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedPlant = plantType;
            }
        });
    });
}

// 셀 클릭 처리
function handleCellClick(row, col) {
    if (!selectedPlant || !gameRunning) return;
    
    const cell = gameBoard[row][col];
    if (cell.plant) return; // 이미 식물이 있음
    
    const cost = PLANT_COSTS[selectedPlant];
    if (sunCount < cost) return;
    
    // 식물 배치
    placePlant(row, col, selectedPlant);
    sunCount -= cost;
    updateSunCounter();
    
    // 선택 해제
    selectedPlant = null;
    document.querySelectorAll('.plant-card').forEach(c => c.classList.remove('selected'));
}

// 식물 배치
function placePlant(row, col, type) {
    const cell = gameBoard[row][col].cell;
    const plant = document.createElement('div');
    plant.className = 'plant';
    
    const icons = {
        sunflower: '🌻',
        peashooter: '🌱',
        wallnut: '🥜',
        cherrybomb: '🍒',
        snowpea: '❄️',
        repeater: '🌿',
        chomper: '🪷',
        threepeater: '🌾',
        gatling: '🌰',
        torchwood: '🔥',
        tallnut: '🌰',
        squash: '🥔',
        jalapeno: '🌶️',
        potato: '🥔',
        peashooter2: '🌱',
        hypnoshroom: '🍄',
        gloomshroom: '💨',
        doomshroom: '💣',
        icepeashooter: '🧊'
    };
    
    const healthValues = {
        sunflower: 100,
        peashooter: 100,
        wallnut: 300,
        cherrybomb: 50,
        snowpea: 100,
        repeater: 100,
        chomper: 150,
        threepeater: 100,
        gatling: 100,
        torchwood: 200,
        tallnut: 500,
        squash: 50,
        jalapeno: 50,
        potato: 50,
        peashooter2: 100,
        hypnoshroom: 50,
        gloomshroom: 100,
        doomshroom: 50,
        icepeashooter: 100
    };
    
    plant.textContent = icons[type];
    plant.dataset.type = type;
    plant.dataset.row = row;
    plant.dataset.col = col;
    
    cell.appendChild(plant);
    cell.classList.add('has-plant');
    
    const maxHealth = healthValues[type];
    gameBoard[row][col].plant = {
        type: type,
        element: plant,
        row: row,
        col: col,
        health: maxHealth,
        maxHealth: maxHealth,
        lastShot: 0
    };
    
    // 체력 바 추가
    addHealthBar(gameBoard[row][col].plant, cell);
    
    plants.push(gameBoard[row][col].plant);
    playSound('plant'); // 식물 심기 효과음
    
    // 특수 식물 처리
    if (type === 'cherrybomb') {
        setTimeout(() => {
            explodeCherryBomb(row, col);
        }, 500);
    } else if (type === 'jalapeno') {
        setTimeout(() => {
            explodeJalapeno(row);
        }, 500);
    } else if (type === 'squash') {
        // 스쿼시는 좀비가 가까이 오면 즉시 공격
        setupSquash(row, col, gameBoard[row][col].plant);
    } else if (type === 'chomper') {
        // 촘퍼는 좀비를 잡아먹음
        setupChomper(row, col, gameBoard[row][col].plant);
    } else if (type === 'hypnoshroom') {
        // 최면버섯은 좀비를 아군으로 만듦
        setupHypnoshroom(row, col, gameBoard[row][col].plant);
    } else if (type === 'doomshroom') {
        // 둠슈룸은 큰 범위 폭발
        setTimeout(() => {
            explodeDoomshroom(row, col);
        }, 500);
    } else if (type === 'gloomshroom') {
        // 글로움슈룸은 주변 좀비에게 지속 피해
        setupGloomshroom(row, col, gameBoard[row][col].plant);
    }
}

// 좀비 생성
function spawnZombies() {
    if (!gameRunning) return;

    if (spawnIntervalId) clearInterval(spawnIntervalId);
    spawnIntervalId = setInterval(() => {
        if (!gameRunning) {
            clearInterval(spawnIntervalId);
            spawnIntervalId = null;
            return;
        }
        if (gamePaused) return; // 일시정지 중에는 생성하지 않음

        const row = Math.floor(Math.random() * ROWS);

        // 보스 좀비 생성 확률 감소 (웨이브 5 이상일 때 5% 확률)
        const bossChance = waveCount >= 5 ? 0.05 : 0;
        if (Math.random() < bossChance) {
            const boss = createBossZombie(row);
            zombies.push(boss);
            zombieCount++;
            totalZombiesSpawned++;
            updateZombieCount();
            // 보스 등장 알림
            showBossAlert(boss.type);
            playSound('boss');
        } else {
            const zombie = createZombie(row);
            zombies.push(zombie);
            zombieCount++;
            totalZombiesSpawned++;
            updateZombieCount();
        }

        // 웨이브 증가 (등장한 좀비 3마리마다)
        if (totalZombiesSpawned % 3 === 0) {
            waveCount++;
            updateWaveCount();
            showWaveBanner(waveCount);
            playSound('wave');
            saveRecords();
        }
    }, 10000); // 10초마다 좀비 생성
}

// 좀비 생성
function createZombie(row) {
    // 웨이브에 따라 더 강한 좀비 생성
    const zombieTypeIndex = Math.min(Math.floor(waveCount / 2), ZOMBIE_TYPES.length - 1);
    // 랜덤하게 좀비 타입 선택
    const randomType = Math.random() < 0.3 ? Math.min(zombieTypeIndex + 1, ZOMBIE_TYPES.length - 1) : zombieTypeIndex;
    const zombieType = ZOMBIE_TYPES[randomType];
    
    const zombie = document.createElement('div');
    zombie.className = 'zombie';
    zombie.textContent = zombieType.icon;
    zombie.dataset.row = row;
    
    const board = document.getElementById('gameBoard');
    board.appendChild(zombie);
    
    // 오른쪽 끝에서 시작 (게임 보드 내부, 마지막 열의 중앙)
    const cellWidth = 100 / COLS;
    const cellHeight = 100 / ROWS;
    // 마지막 열(COLS-1)의 중앙에서 시작
    let left = (COLS - 1) * cellWidth + cellWidth / 2;
    zombie.style.left = left + '%';
    zombie.style.top = (row * cellHeight + cellHeight / 2) + '%';
    zombie.style.position = 'absolute';
    zombie.style.transform = 'translate(-50%, -50%)';
    
    const zombieObj = {
        element: zombie,
        row: row,
        left: left,
        health: zombieType.health,
        maxHealth: zombieType.health,
        speed: zombieType.speed,
        type: zombieType.name,
        isBoss: false
    };
    
    // 체력 바 추가
    addZombieHealthBar(zombieObj);
    
    return zombieObj;
}

// 보스 좀비 생성
function createBossZombie(row) {
    const bossType = BOSS_ZOMBIE_TYPES[bossIndex];
    bossIndex = (bossIndex + 1) % BOSS_ZOMBIE_TYPES.length; // 다음 보스를 위해 인덱스 증가
    
    const zombie = document.createElement('div');
    zombie.className = 'zombie boss-zombie';
    zombie.textContent = bossType.icon;
    zombie.dataset.row = row;
    zombie.style.fontSize = (50 * bossType.size) + 'px';
    zombie.style.filter = 'drop-shadow(0 0 10px rgba(255, 0, 0, 0.8))';
    
    const board = document.getElementById('gameBoard');
    board.appendChild(zombie);
    
    const cellWidth = 100 / COLS;
    const cellHeight = 100 / ROWS;
    let left = (COLS - 1) * cellWidth + cellWidth / 2;
    zombie.style.left = left + '%';
    zombie.style.top = (row * cellHeight + cellHeight / 2) + '%';
    zombie.style.position = 'absolute';
    zombie.style.transform = 'translate(-50%, -50%)';
    
    const zombieObj = {
        element: zombie,
        row: row,
        left: left,
        health: bossType.health,
        maxHealth: bossType.health,
        speed: bossType.speed,
        type: bossType.name,
        isBoss: true
    };
    
    // 체력 바 추가
    addZombieHealthBar(zombieObj);
    
    return zombieObj;
}

// 보스 등장 알림
function showBossAlert(bossName) {
    const alert = document.createElement('div');
    alert.className = 'boss-alert';
    alert.textContent = `⚠️ 보스 등장: ${bossName} ⚠️`;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// 웨이브 시작 배너
function showWaveBanner(wave) {
    const banner = document.createElement('div');
    banner.className = 'wave-banner';
    banner.textContent = `🌊 웨이브 ${wave} 시작!`;
    document.body.appendChild(banner);

    setTimeout(() => {
        banner.remove();
    }, 2000);
}

// 완두콩 발사
function shootPea(plant) {
    const now = Date.now();
    let shootInterval = 1700; // 2000 -> 1700 (15% 빠르게)
    if (plant.type === 'repeater' || plant.type === 'gatling') {
        shootInterval = 850; // 1000 -> 850 (15% 빠르게)
    } else if (plant.type === 'threepeater') {
        shootInterval = 1275; // 1500 -> 1275 (15% 빠르게)
    }
    
    if (now - plant.lastShot < shootInterval) return;
    
    plant.lastShot = now;
    
    // 게임 보드에 직접 추가하여 전체를 가로지를 수 있도록
    const board = document.getElementById('gameBoard');
    const pea = document.createElement('div');
    pea.className = 'pea';
    
    const cellWidth = 100 / COLS;
    const cellHeight = 100 / ROWS;
    let left = (plant.col + 1) * cellWidth;
    let top = plant.row * cellHeight + cellHeight / 2;
    
    // 얼음 계열 총알 스타일 (버그 수정: 이전에는 선언 전의 peaObj를 참조해 오류 발생)
    if (plant.type === 'snowpea' || plant.type === 'icepeashooter') {
        pea.style.background = '#87ceeb';
        pea.style.border = '2px solid #4682b4';
        pea.style.boxShadow = '0 0 5px rgba(135, 206, 235, 0.8)';
        pea.classList.add('pea-snow');
    }

    pea.style.left = left + '%';
    pea.style.top = top + '%';
    pea.style.transform = 'translate(-50%, -50%)';
    pea.style.position = 'absolute';

    board.appendChild(pea);

    let damage = 18; // 기본 피해 +3 (15 -> 18)
    if (plant.type === 'repeater' || plant.type === 'gatling') damage = 28; // +3
    else if (plant.type === 'threepeater') damage = 23; // +3

    const peaObj = {
        element: pea,
        row: plant.row,
        left: left,
        speed: 3,
        isSnow: plant.type === 'snowpea' || plant.type === 'icepeashooter',
        isFire: plant.type === 'torchwood',
        damage: damage
    };
    
    // 토치우드는 불 총알 (+5 추가)
    if (plant.type === 'torchwood') {
        pea.style.background = '#ff4500';
        pea.style.border = '2px solid #ff0000';
        pea.style.boxShadow = '0 0 10px rgba(255, 69, 0, 0.8)';
        peaObj.damage = 35; // 30 + 5 = 35
    }
    
    // 리피터와 개틀링은 두 발 발사
    if (plant.type === 'repeater' || plant.type === 'gatling') {
        setTimeout(() => {
            const pea2 = document.createElement('div');
            pea2.className = 'pea';
            pea2.style.left = left + '%';
            pea2.style.top = top + '%';
            pea2.style.transform = 'translate(-50%, -50%)';
            pea2.style.position = 'absolute';
            board.appendChild(pea2);
            peas.push({
                element: pea2,
                row: plant.row,
                left: left,
                speed: 3,
                isSnow: false,
                isFire: false,
                damage: damage
            });
        }, 200);
    }
    
    // 쓰리피터는 3방향 발사
    if (plant.type === 'threepeater') {
        // 위쪽 행
        if (plant.row > 0) {
            setTimeout(() => {
                const peaUp = createPea(board, left, (plant.row - 1) * cellHeight + cellHeight / 2, plant.row - 1, damage);
                peas.push(peaUp);
            }, 100);
        }
        // 아래쪽 행
        if (plant.row < ROWS - 1) {
            setTimeout(() => {
                const peaDown = createPea(board, left, (plant.row + 1) * cellHeight + cellHeight / 2, plant.row + 1, damage);
                peas.push(peaDown);
            }, 100);
        }
    }
    
    peas.push(peaObj);
    playSound('shoot'); // 완두콩 발사 효과음
}

// 완두콩 생성 헬퍼 함수
function createPea(board, left, top, row, damage) {
    const pea = document.createElement('div');
    pea.className = 'pea';
    pea.style.left = left + '%';
    pea.style.top = top + '%';
    pea.style.transform = 'translate(-50%, -50%)';
    pea.style.position = 'absolute';
    board.appendChild(pea);
    
    return {
        element: pea,
        row: row,
        left: left,
        speed: 3,
        isSnow: false,
        isFire: false,
        damage: damage
    };
}

// 게임 루프
function startGameLoop() {
    setInterval(() => {
        if (!gameRunning || gamePaused) return;

        updateZombies();
        updatePeas();
        checkCollisions();
        checkGameOver();
        updatePlantCards();
    }, 50);
}

// 좀비 제거 헬퍼 (체력바/요소 정리, 카운트 갱신, 처치 시 이펙트)
function destroyZombie(zombie, killed) {
    if (zombie.healthBar) zombie.healthBar.remove();

    if (killed) {
        killCount++;
        playSound('zombieDie');
        saveRecords();
        // 사망 이펙트
        const pop = document.createElement('div');
        pop.className = 'death-pop';
        pop.textContent = '💥';
        pop.style.left = zombie.element.style.left;
        pop.style.top = zombie.element.style.top;
        document.getElementById('gameBoard').appendChild(pop);
        setTimeout(() => pop.remove(), 400);
    }

    zombie.element.remove();
    const idx = zombies.indexOf(zombie);
    if (idx > -1) zombies.splice(idx, 1);
    zombieCount--;
    updateZombieCount();
}

// 좀비 피격 플래시
function flashZombie(zombie) {
    zombie.element.classList.add('zombie-hit');
    setTimeout(() => {
        zombie.element.classList.remove('zombie-hit');
    }, 150);
}

// 좀비 업데이트
function updateZombies() {
    // 뒤에서부터 순회 (제거 시 인덱스 건너뛰기 방지)
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        const cellWidth = 100 / COLS;
        const cellHeight = 100 / ROWS;

        // 좀비의 현재 열 계산 (정확한 위치 기반)
        // 좀비의 left는 셀 중앙 기준이므로, 셀 범위 내에 있는지 확인
        const zombieCol = Math.floor((zombie.left / 100) * COLS);
        const currentCol = Math.min(Math.max(0, zombieCol), COLS - 1);

        if (zombie.isHypnotized) {
            // 최면 상태의 좀비는 오른쪽으로 이동
            zombie.left += Math.abs(zombie.speed); // 항상 양의 속도로 오른쪽으로 이동
            zombie.element.style.left = zombie.left + '%';

            // 화면 밖으로 나가면 제거 (끝까지 도달해도 게임 오버 아님)
            if (zombie.left > 110) {
                destroyZombie(zombie, false);
                continue;
            }
        } else {
            // 같은 행의 식물 확인 - 좀비가 식물이 있는 셀 범위 내에 있는지 확인
            let hasPlantInFront = false;
            if (gameBoard[zombie.row]) {
                // 현재 셀과 바로 앞 셀 확인
                for (let col = currentCol; col >= 0 && col >= currentCol - 1; col--) {
                    if (gameBoard[zombie.row][col]?.plant !== null) {
                        const plantCellLeft = col * cellWidth;
                        const plantCellRight = (col + 1) * cellWidth;
                        // 좀비가 식물 셀 범위 내에 있거나 거의 도달했으면 멈춤
                        if (zombie.left <= plantCellRight && zombie.left >= plantCellLeft - cellWidth * 0.3) {
                            hasPlantInFront = true;
                            break;
                        }
                    }
                }
            }
            
            // 식물이 앞에 있으면 멈추고 공격, 없으면 계속 이동
            if (!hasPlantInFront) {
                zombie.left -= zombie.speed;
                zombie.element.style.left = zombie.left + '%';
            }
            
            // 좀비가 왼쪽 끝(첫 번째 열)에 도달하면 통과 처리
            if (zombie.left < cellWidth && !zombie.hasPassed) {
                zombie.hasPassed = true;
                zombiesPassed++;
                // 5마리 이상 통과하면 게임 오버
                if (zombiesPassed >= 5) {
                    gameOver(false);
                }
            }
            
            // 좀비가 화면 밖으로 나가면 제거
            if (zombie.left < -10) {
                destroyZombie(zombie, false);
                continue;
            }
        }

        // 좀비 위치 업데이트 (항상 중앙 정렬)
        const top = zombie.row * cellHeight + cellHeight / 2;
        zombie.element.style.top = top + '%';

        // 체력 바 업데이트
        updateZombieHealthBar(zombie);
    }
}

// 완두콩 업데이트
function updatePeas() {
    // 뒤에서부터 순회 (제거 시 인덱스 건너뛰기 방지)
    for (let i = peas.length - 1; i >= 0; i--) {
        const pea = peas[i];
        pea.left += pea.speed;
        const cellHeight = 100 / ROWS;
        const top = pea.row * cellHeight + cellHeight / 2;

        pea.element.style.left = pea.left + '%';
        pea.element.style.top = top + '%';

        // 완두콩이 화면 밖으로 나가면 제거
        if (pea.left > 110) {
            pea.element.remove();
            peas.splice(i, 1);
        }
    }

    // 완두콩 발사 (계속 발사하도록 수정)
    plants.forEach(plant => {
        if (plant.type === 'peashooter' || plant.type === 'snowpea' || plant.type === 'repeater' ||
            plant.type === 'threepeater' || plant.type === 'gatling' || plant.type === 'peashooter2' ||
            plant.type === 'icepeashooter') {
            // 같은 행에 좀비가 있는지 확인
            const hasZombieInRow = zombies.some(z => z.row === plant.row);
            if (hasZombieInRow) {
                shootPea(plant);
            }
        }
    });
}

// 충돌 감지
function checkCollisions() {
    // 완두콩-좀비 충돌 (뒤에서부터 순회하여 제거 시 인덱스 문제 방지)
    for (let pi = peas.length - 1; pi >= 0; pi--) {
        const pea = peas[pi];
        for (let zi = zombies.length - 1; zi >= 0; zi--) {
            const zombie = zombies[zi];
            if (pea.row !== zombie.row) continue;

            // 충돌 감지
            if (Math.abs(pea.left - zombie.left) < 3) {
                playSound('hit'); // 좀비 피격 효과음
                // 좀비 체력 감소
                let damage = pea.damage || 18; // 기본 +3

                // 불 총알은 더 큰 피해
                if (pea.isFire) {
                    damage = 30;
                }

                zombie.health -= damage;
                flashZombie(zombie); // 피격 플래시

                // 스노우피는 좀비 속도 감소
                if (pea.isSnow) {
                    zombie.speed = Math.max(zombie.speed * 0.5, 0.03);
                }

                // 완두콩 제거
                pea.element.remove();
                peas.splice(pi, 1);

                // 좀비 체력이 0 이하면 제거
                if (zombie.health <= 0) {
                    destroyZombie(zombie, true);
                }
                break; // 이 완두콩은 소멸했으므로 다음 완두콩으로
            }
        }
    }

    // 좀비와 식물 충돌 (공격) - 일반 좀비만 식물 공격
    zombies.forEach(zombie => {
        if (!zombie.isHypnotized) { // 최면 상태가 아닌 좀비만 식물 공격
            for (let pi = plants.length - 1; pi >= 0; pi--) {
                const plant = plants[pi];
                if (zombie.row === plant.row) {
                    const cellWidth = 100 / COLS;

                    // 식물이 있는 셀의 위치 범위
                    const plantCellLeft = plant.col * cellWidth;
                    const plantCellRight = (plant.col + 1) * cellWidth;

                    // 좀비가 식물 셀 범위 내에 있으면 공격
                    // 좀비가 식물 셀에 도달했거나 약간 앞에 있어도 공격 가능하도록
                    if (zombie.left <= plantCellRight && zombie.left >= plantCellLeft - cellWidth * 0.2) {
                        // 식물 체력 감소 (좀비가 공격)
                        const attackDamage = zombie.isBoss ? 2 : 1;
                        plant.health -= attackDamage;
                        updatePlantHealthBar(plant);

                        // 식물이 죽으면 제거
                        if (plant.health <= 0) {
                            if (plant.healthBar) plant.healthBar.remove();
                            plant.element.remove();
                            gameBoard[plant.row][plant.col].cell.classList.remove('has-plant');
                            gameBoard[plant.row][plant.col].plant = null;
                            plants.splice(pi, 1);
                        }
                    }
                }
            }
        }
    });

    // 최면 좀비와 일반 좀비 충돌 (최면 좀비가 일반 좀비 공격)
    zombies.forEach(hypnotizedZombie => {
        if (hypnotizedZombie.isHypnotized) {
            for (let oi = zombies.length - 1; oi >= 0; oi--) {
                const otherZombie = zombies[oi];
                if (!otherZombie.isHypnotized && hypnotizedZombie.row === otherZombie.row) {
                    // 충돌 감지 (최면 좀비가 일반 좀비를 공격)
                    if (Math.abs(hypnotizedZombie.left - otherZombie.left) < 5) { // 겹쳤을 때 공격
                        const now = Date.now();
                        if (now - hypnotizedZombie.lastAttack > 1000) { // 1초에 한 번 공격
                            hypnotizedZombie.lastAttack = now;
                            // 일반 좀비 체력 감소
                            otherZombie.health -= hypnotizedZombie.attackPower; // 최면 좀비의 공격력 사용
                            flashZombie(otherZombie);

                            // 공격 애니메이션/피드백
                            hypnotizedZombie.element.style.transform = 'translate(-50%, -50%) scale(1.1)';
                            setTimeout(() => {
                                hypnotizedZombie.element.style.transform = 'translate(-50%, -50%) scale(1)';
                            }, 100);

                            // 일반 좀비 체력이 0 이하면 제거
                            if (otherZombie.health <= 0) {
                                destroyZombie(otherZombie, true);
                            }
                        }
                    }
                }
            }
        }
    });
}

// 해바라기로 태양 생성
function generateSunFromSunflower(plant) {
    const now = Date.now();
    if (!plant.lastSun || now - plant.lastSun > 8500) { // 10초 -> 8.5초 (15% 빠르게)
        plant.lastSun = now;
        createSun(plant.row, plant.col);
    }
}

// 태양 생성
function createSun(row, col) {
    const cell = gameBoard[row][col].cell;
    const sun = document.createElement('div');
    sun.className = 'sun';
    sun.textContent = '☀️';
    
    const left = (col + 0.5) * (100 / COLS);
    sun.style.left = left + '%';
    sun.style.top = '0%';
    
    cell.appendChild(sun);
    
    sun.addEventListener('click', () => {
        sunCount += 25;
        playSound('collectSun'); // 태양 수집 효과음
        updateSunCounter();
        sun.remove();
    });
    
    // 5초 후 자동 제거
    setTimeout(() => {
        if (sun.parentNode) {
            sun.remove();
        }
    }, 5000);
}

// 랜덤 태양 생성
function generateSun() {
    setInterval(() => {
        if (!gameRunning || gamePaused) return;

        const row = Math.floor(Math.random() * ROWS);
        const col = Math.floor(Math.random() * COLS);
        createSun(row, col);
    }, 12750); // 15초 -> 12.75초 (15% 빠르게)
}

// 해바라기 태양 생성 처리
setInterval(() => {
    if (!gameRunning || gamePaused) return;
    
    plants.forEach(plant => {
        if (plant.type === 'sunflower') {
            generateSunFromSunflower(plant);
        }
    });
}, 850); // 1000 -> 850 (15% 빠르게)

// 태양 카운터 업데이트
function updateSunCounter() {
    document.getElementById('sunCount').textContent = sunCount;
}

// 웨이브 카운터 업데이트
function updateWaveCount() {
    document.getElementById('waveCount').textContent = waveCount;
}

// 좀비 카운터 업데이트
function updateZombieCount() {
    document.getElementById('zombieCount').textContent = zombieCount;
    const passedElement = document.getElementById('zombiePassed');
    if (passedElement) {
        passedElement.textContent = zombiesPassed;
    }
}

// 식물 카드 업데이트 (비용에 따라 활성/비활성)
function updatePlantCards() {
    document.querySelectorAll('.plant-card').forEach(card => {
        const cost = parseInt(card.dataset.cost);
        if (sunCount < cost) {
            card.classList.add('disabled');
        } else {
            card.classList.remove('disabled');
        }
    });
}

// 게임 오버 체크
function checkGameOver() {
    // 총 20마리 이상 등장한 뒤 모든 좀비를 물리치면 승리
    // (버그 수정: 이전에는 남은 좀비 수(zombieCount)로 비교해 승리가 불가능했음)
    if (zombies.length === 0 && totalZombiesSpawned >= 20) {
        gameOver(true);
    }
}

// 체력 바 추가 (식물)
function addHealthBar(plant, cell) {
    const healthBar = document.createElement('div');
    healthBar.className = 'health-bar';
    const healthFill = document.createElement('div');
    healthFill.className = 'health-bar-fill';
    healthFill.style.width = '100%';
    const healthText = document.createElement('div');
    healthText.className = 'health-text';
    healthText.textContent = `${Math.ceil(plant.health)}/${plant.maxHealth}`;
    
    healthBar.appendChild(healthFill);
    healthBar.appendChild(healthText);
    cell.appendChild(healthBar);
    
    plant.healthBar = healthBar;
    plant.healthFill = healthFill;
    plant.healthText = healthText;
}

// 체력 바 업데이트 (식물)
function updatePlantHealthBar(plant) {
    if (!plant.healthBar) return;
    const percentage = (plant.health / plant.maxHealth) * 100;
    plant.healthFill.style.width = percentage + '%';
    plant.healthText.textContent = `${Math.ceil(plant.health)}/${plant.maxHealth}`;
    
    if (percentage < 30) {
        plant.healthFill.className = 'health-bar-fill low';
    } else if (percentage < 60) {
        plant.healthFill.className = 'health-bar-fill medium';
    } else {
        plant.healthFill.className = 'health-bar-fill';
    }
}

// 체력 바 추가 (좀비)
function addZombieHealthBar(zombie) {
    const healthBar = document.createElement('div');
    healthBar.className = 'health-bar';
    healthBar.style.position = 'absolute';
    healthBar.style.bottom = '-15px';
    healthBar.style.left = '50%';
    healthBar.style.transform = 'translateX(-50%)';
    healthBar.style.width = '60px';
    
    const healthFill = document.createElement('div');
    healthFill.className = 'health-bar-fill';
    healthFill.style.width = '100%';
    
    const healthText = document.createElement('div');
    healthText.className = 'health-text';
    healthText.textContent = `${Math.ceil(zombie.health)}`;
    
    healthBar.appendChild(healthFill);
    healthBar.appendChild(healthText);
    zombie.element.appendChild(healthBar);
    
    zombie.healthBar = healthBar;
    zombie.healthFill = healthFill;
    zombie.healthText = healthText;
}

// 체력 바 업데이트 (좀비)
function updateZombieHealthBar(zombie) {
    if (!zombie.healthBar) return;
    const percentage = (zombie.health / zombie.maxHealth) * 100;
    zombie.healthFill.style.width = percentage + '%';
    zombie.healthText.textContent = `${Math.ceil(zombie.health)}`;
    
    if (percentage < 30) {
        zombie.healthFill.className = 'health-bar-fill low';
    } else if (percentage < 60) {
        zombie.healthFill.className = 'health-bar-fill medium';
    } else {
        zombie.healthFill.className = 'health-bar-fill';
    }
}

// 체리폭탄 폭발
function explodeCherryBomb(row, col) {
    const plant = gameBoard[row][col].plant;
    if (!plant || plant.type !== 'cherrybomb') return;

    playSound('explosion'); // 폭발 효과음

    // 주변 좀비에게 피해 (뒤에서부터 순회하여 여러 마리 동시 처치 가능)
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        const zombieCol = Math.floor((zombie.left / 100) * COLS);

        // 같은 행 또는 인접한 행, 그리고 가까운 열
        if (Math.abs(zombie.row - row) <= 1 && Math.abs(zombieCol - col) <= 1) {
            zombie.health -= 100;
            flashZombie(zombie);
            if (zombie.health <= 0) {
                destroyZombie(zombie, true);
            }
        }
    }

    // 폭발 애니메이션
    plant.element.textContent = '💥';
    setTimeout(() => {
        if (plant.healthBar) plant.healthBar.remove();
        plant.element.remove();
        gameBoard[row][col].cell.classList.remove('has-plant');
        gameBoard[row][col].plant = null;
        const plantIndex = plants.indexOf(plant);
        if (plantIndex > -1) plants.splice(plantIndex, 1);
    }, 300);
}

// 할라피뇨 폭발 (한 행 전체)
function explodeJalapeno(row) {
    const plant = gameBoard[row].find(cell => cell.plant && cell.plant.type === 'jalapeno');
    if (!plant || !plant.plant) return;
    
    const col = plant.plant.col;

    playSound('explosion'); // 폭발 효과음

    // 같은 행의 모든 좀비에게 피해 (뒤에서부터 순회)
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        if (zombie.row === row) {
            zombie.health -= 200;
            flashZombie(zombie);
            if (zombie.health <= 0) {
                destroyZombie(zombie, true);
            }
        }
    }

    // 폭발 애니메이션
    plant.plant.element.textContent = '🔥';
    setTimeout(() => {
        if (plant.plant.healthBar) plant.plant.healthBar.remove();
        plant.plant.element.remove();
        gameBoard[row][col].cell.classList.remove('has-plant');
        gameBoard[row][col].plant = null;
        const plantIndex = plants.indexOf(plant.plant);
        if (plantIndex > -1) plants.splice(plantIndex, 1);
    }, 300);
}

// 스쿼시 설정
function setupSquash(row, col, plant) {
    const checkSquash = setInterval(() => {
        if (!plant || !gameBoard[row][col].plant) {
            clearInterval(checkSquash);
            return;
        }
        if (!gameRunning || gamePaused) return;

        // 같은 행의 좀비 확인
        const cellWidth = 100 / COLS;
        const plantLeft = col * cellWidth;
        const nearbyZombie = zombies.find(z =>
            z.row === row &&
            Math.abs(z.left - plantLeft) < cellWidth * 2
        );

        if (nearbyZombie) {
            // 스쿼시 공격
            playSound('explosion');
            nearbyZombie.health -= 500;
            if (nearbyZombie.health <= 0) {
                destroyZombie(nearbyZombie, true);
            }

            // 스쿼시 제거
            plant.element.textContent = '💥';
            setTimeout(() => {
                if (plant.healthBar) plant.healthBar.remove();
                plant.element.remove();
                gameBoard[row][col].cell.classList.remove('has-plant');
                gameBoard[row][col].plant = null;
                const plantIndex = plants.indexOf(plant);
                if (plantIndex > -1) plants.splice(plantIndex, 1);
            }, 300);
            clearInterval(checkSquash);
        }
    }, 100);
}

// 촘퍼 설정
function setupChomper(row, col, plant) {
    const checkChomper = setInterval(() => {
        if (!plant || !gameBoard[row][col].plant) {
            clearInterval(checkChomper);
            return;
        }
        if (!gameRunning || gamePaused) return;

        // 같은 행의 좀비 확인 (같은 열 또는 바로 앞)
        const cellWidth = 100 / COLS;
        const plantLeft = col * cellWidth;
        const nearbyZombie = zombies.find(z =>
            z.row === row &&
            Math.abs(z.left - plantLeft) < cellWidth * 1.5
        );

        if (nearbyZombie && !plant.isEating) {
            // 촘퍼가 좀비를 잡아먹음
            plant.isEating = true;
            plant.element.textContent = '😋';
            playSound('hit');

            setTimeout(() => {
                if (zombies.indexOf(nearbyZombie) > -1) {
                    destroyZombie(nearbyZombie, true);
                }

                plant.isEating = false;
                plant.element.textContent = '🪷';
            }, 2000);
        }
    }, 100);
}

// 글로움슈룸 설정 (주변 좀비에게 지속 피해)
function setupGloomshroom(row, col, plant) {
    const checkGloom = setInterval(() => {
        if (!plant || gameBoard[row][col].plant !== plant) {
            clearInterval(checkGloom);
            return;
        }
        if (!gameRunning || gamePaused) return;

        const cellWidth = 100 / COLS;
        const plantLeft = (col + 0.5) * cellWidth;
        let hitAny = false;

        // 인접 행 포함 주변 좀비에게 피해 (뒤에서부터 순회)
        for (let i = zombies.length - 1; i >= 0; i--) {
            const z = zombies[i];
            if (z.isHypnotized) continue;
            if (Math.abs(z.row - row) <= 1 && Math.abs(z.left - plantLeft) < cellWidth * 1.5) {
                z.health -= 8;
                flashZombie(z);
                hitAny = true;
                if (z.health <= 0) {
                    destroyZombie(z, true);
                }
            }
        }

        if (hitAny) {
            playSound('hit');
            plant.element.textContent = '🌫️';
            setTimeout(() => {
                if (gameBoard[row][col].plant === plant) {
                    plant.element.textContent = '💨';
                }
            }, 200);
        }
    }, 1000);
}

// 최면 버섯 설정
function setupHypnoshroom(row, col, plant) {
    // 1초 후 주변 좀비를 찾아 최면 효과 적용
    setTimeout(() => {
        const cellWidth = 100 / COLS;
        const plantLeft = col * cellWidth;
        
        // 가장 가까운 좀비 찾기
        let targetZombie = null;
        let minDistance = Infinity;

        zombies.forEach(zombie => {
            const zombieRow = zombie.row;
            const zombieCol = Math.floor((zombie.left / 100) * COLS);
            const distance = Math.sqrt(Math.pow(zombieRow - row, 2) + Math.pow(zombieCol - col, 2));

            // 같은 행에 있고, 일정 거리 이내의 좀비만 고려
            if (zombieRow === row && distance < minDistance && !zombie.isHypnotized) {
                minDistance = distance;
                targetZombie = zombie;
            }
        });

        if (targetZombie) {
            targetZombie.isHypnotized = true;
            targetZombie.element.style.filter = 'hue-rotate(120deg) brightness(1.5)'; // 색상 변경
            targetZombie.element.textContent += '✨'; // 최면 효과 표시
            targetZombie.speed = 0.05; // 최면 좀비는 오른쪽으로 이동
            targetZombie.attackPower = 50; // 최면 좀비의 공격력
            targetZombie.lastAttack = 0; // 마지막 공격 시간

            // 최면 버섯은 한 번 사용 후 사라짐
            if (plant.healthBar) plant.healthBar.remove();
            plant.element.remove();
            gameBoard[row][col].cell.classList.remove('has-plant');
            gameBoard[row][col].plant = null;
            const plantIndex = plants.indexOf(plant);
            if (plantIndex > -1) plants.splice(plantIndex, 1);
        } else {
            // 최면 효과를 줄 좀비가 없으면 버섯은 그대로 유지
        }
    }, 1000); // 1초 후 최면 효과 적용
}

// 둠슈룸 폭발 (큰 범위)
function explodeDoomshroom(row, col) {
    const plant = gameBoard[row][col].plant;
    if (!plant || plant.type !== 'doomshroom') return;
    
    playSound('explosion'); // 폭발 효과음

    // 넓은 범위의 좀비에게 피해 (뒤에서부터 순회)
    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];
        const zombieCol = Math.floor((zombie.left / 100) * COLS);

        // 2칸 반경 내의 모든 좀비에게 피해
        if (Math.abs(zombie.row - row) <= 2 && Math.abs(zombieCol - col) <= 2) {
            zombie.health -= 500; // 큰 피해
            flashZombie(zombie);
            if (zombie.health <= 0) {
                destroyZombie(zombie, true);
            }
        }
    }

    // 폭발 애니메이션
    plant.element.textContent = '💥';
    setTimeout(() => {
        if (plant.healthBar) plant.healthBar.remove();
        plant.element.remove();
        gameBoard[row][col].cell.classList.remove('has-plant');
        gameBoard[row][col].plant = null;
        const plantIndex = plants.indexOf(plant);
        if (plantIndex > -1) plants.splice(plantIndex, 1);
    }, 300);
}

// 게임 오버
function gameOver(won) {
    gameRunning = false;
    gamePaused = false;
    playSound(won ? 'win' : 'gameOver'); // 게임 오버/승리 효과음
    saveRecords(); // 최고 기록 저장
    const status = document.getElementById('gameStatus');
    status.className = 'game-status ' + (won ? 'win' : 'lose');
    status.textContent = (won ? '🎉 승리! 🎉' : '💀 게임 오버 💀') +
        ` (웨이브 ${waveCount} · 처치 ${killCount}마리)`;
}

// 게임 시작
init();

