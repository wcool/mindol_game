// ==================== 상수 및 설정 ====================
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const POINTS_PER_BLOCK = 100;
const POINTS_PER_LINE = 500; // 줄 완성 시 기본 점수

// 테트로미노 모양 정의
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

// 테마별 색상
const THEMES = {
    default: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'],
    classic: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'],
    neon: ['#FF10F0', '#00FF41', '#FFFF00', '#FF3131', '#00D9FF', '#B026FF', '#FFD700'],
    ocean: ['#006994', '#0099CC', '#00BFFF', '#1E90FF', '#4682B4', '#5F9EA0', '#87CEEB'],
    fire: ['#FF4500', '#FF6347', '#FF7F50', '#FFA500', '#FFD700', '#FF8C00', '#DC143C'],
    sakura: ['#FFB7C5', '#FFC0CB', '#FFD1DC', '#FFE4E1', '#FFF0F5', '#FF69B4', '#FF1493'],
    galaxy: ['#4B0082', '#8A2BE2', '#9370DB', '#BA55D3', '#DA70D6', '#EE82EE', '#FF00FF']
};

// 테마별 배경 그라데이션
const THEME_BACKGROUNDS = {
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    classic: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
    neon: 'linear-gradient(135deg, #000000 0%, #1a0033 50%, #330066 100%)',
    ocean: 'linear-gradient(135deg, #001f3f 0%, #003d7a 50%, #0074D9 100%)',
    fire: 'linear-gradient(135deg, #2d0000 0%, #660000 50%, #cc0000 100%)',
    sakura: 'linear-gradient(135deg, #ffe4e9 0%, #ffc0cb 50%, #ff69b4 100%)',
    galaxy: 'linear-gradient(135deg, #0a0015 0%, #1a0033 25%, #2d1b69 50%, #4a148c 75%, #6a1b9a 100%)'
};

// 테마 적용 함수
function applyTheme(themeName) {
    gameState.currentTheme = themeName;
    document.body.style.background = THEME_BACKGROUNDS[themeName];

    // 테마별 특수 효과
    if (themeName === 'neon') {
        document.body.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 255, 0.3)';
    } else if (themeName === 'galaxy') {
        document.body.style.boxShadow = 'inset 0 0 100px rgba(138, 43, 226, 0.5)';
    } else {
        document.body.style.boxShadow = 'none';
    }

    drawBoard();
}


// ==================== 게임 상태 ====================
let gameState = {
    board: [],
    currentPiece: null,
    nextPiece: null,
    score: 0,
    level: 1,
    combo: 0, // 콤보 카운터
    gameOver: false,
    isPaused: false,
    waitingForClick: false, // 아이템 사용을 위해 클릭 대기 중
    pendingItem: null, // 대기 중인 아이템
    dropInterval: null,
    currentTheme: 'default',
    upcomingPieces: [], // 미래 예측 아이템용 대기열
    activeItems: {
        ghostBlock: false,
        futureSight: false,
        slowMotion: false,
        speedBoost: false,
        safetyNet: false
    },
    itemTimers: {}
};

// ==================== DOM 요소 ====================
const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const shopScreen = document.getElementById('shop-screen');

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');

const startGameBtn = document.getElementById('start-game-btn');
const shopBtn = document.getElementById('shop-btn');
const backToHomeBtn = document.getElementById('back-to-home-btn');
const backFromShopBtn = document.getElementById('back-from-shop-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

const currentScoreEl = document.getElementById('current-score');
const currentLevelEl = document.getElementById('current-level');
const totalPointsEl = document.getElementById('total-points');
const shopPointsEl = document.getElementById('shop-points');
const finalScoreEl = document.getElementById('final-score');
const earnedPointsEl = document.getElementById('earned-points');
const gameOverOverlay = document.getElementById('game-over-overlay');

const inventoryItemsEl = document.getElementById('inventory-items');

const pauseBtn = document.getElementById('pause-btn');
const restartGameBtn = document.getElementById('restart-game-btn');
const muteBtn = document.getElementById('mute-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('resume-btn');
const highScoreEl = document.getElementById('high-score');
const bestScoreEl = document.getElementById('best-score');
const newRecordEl = document.getElementById('new-record');

// ==================== 로컬 스토리지 관리 ====================
function getTotalPoints() {
    return parseInt(localStorage.getItem('tetris-points') || '0');
}

function setTotalPoints(points) {
    localStorage.setItem('tetris-points', points.toString());
    updatePointsDisplay();
}

function addPoints(points) {
    const current = getTotalPoints();
    setTotalPoints(current + points);
}

function getOwnedThemes() {
    const themes = localStorage.getItem('tetris-themes');
    return themes ? JSON.parse(themes) : ['default'];
}

function addOwnedTheme(theme) {
    const themes = getOwnedThemes();
    if (!themes.includes(theme)) {
        themes.push(theme);
        localStorage.setItem('tetris-themes', JSON.stringify(themes));
    }
}

function getInventory() {
    const inventory = localStorage.getItem('tetris-inventory');
    return inventory ? JSON.parse(inventory) : {};
}

function setInventory(inventory) {
    localStorage.setItem('tetris-inventory', JSON.stringify(inventory));
}

function addItemToInventory(itemId, count = 1) {
    const inventory = getInventory();
    inventory[itemId] = (inventory[itemId] || 0) + count;
    setInventory(inventory);
    updateInventoryDisplay();
}

function removeItemFromInventory(itemId) {
    const inventory = getInventory();
    if (inventory[itemId] && inventory[itemId] > 0) {
        inventory[itemId]--;
        if (inventory[itemId] === 0) {
            delete inventory[itemId];
        }
        setInventory(inventory);
        updateInventoryDisplay();
        return true;
    }
    return false;
}

function updatePointsDisplay() {
    const points = getTotalPoints();
    totalPointsEl.textContent = points.toLocaleString();
    shopPointsEl.textContent = points.toLocaleString();
}

// 최고 점수 (기존 저장 키와 겹치지 않는 새 키 사용)
function getHighScore() {
    return parseInt(localStorage.getItem('tetris-highscore') || '0');
}

function setHighScore(score) {
    localStorage.setItem('tetris-highscore', score.toString());
    updateHighScoreDisplay();
}

function updateHighScoreDisplay() {
    if (highScoreEl) {
        highScoreEl.textContent = getHighScore().toLocaleString();
    }
}

// ==================== 화면 전환 ====================
function showScreen(screen) {
    [homeScreen, gameScreen, shopScreen].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

// ==================== 게임 보드 초기화 ====================
function createBoard() {
    return Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

function drawBoard() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 보드의 블록 그리기
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (gameState.board[row][col]) {
                drawBlock(ctx, col, row, gameState.board[row][col]);
            }
        }
    }

    // 고스트 블록 그리기 (활성화된 경우)
    if (gameState.activeItems.ghostBlock && gameState.currentPiece) {
        drawGhostPiece();
    }

    // 현재 블록 그리기
    if (gameState.currentPiece) {
        drawPiece(ctx, gameState.currentPiece);
    }

    // 그리드 그리기
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }

    // 줄 제거 플래시 효과
    const now = performance.now();
    lineFlashes = lineFlashes.filter(f => now - f.start < FLASH_DURATION);
    lineFlashes.forEach(f => {
        const alpha = 1 - (now - f.start) / FLASH_DURATION;
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.8).toFixed(3)})`;
        ctx.fillRect(0, f.row * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
    });
}

// ==================== 줄 제거 플래시 ====================
const FLASH_DURATION = 300; // ms
let lineFlashes = [];

function animateFlashes() {
    if (lineFlashes.length > 0) {
        drawBoard();
        requestAnimationFrame(animateFlashes);
    }
}

function drawBlock(context, x, y, colorIndex) {
    const colors = THEMES[gameState.currentTheme];
    const color = colors[colorIndex - 1];

    context.fillStyle = color;
    context.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

    // 하이라이트 효과
    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
    context.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE / 3);
}

function drawPiece(context, piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(context, piece.x + x, piece.y + y, piece.color);
            }
        });
    });
}

function drawGhostPiece() {
    const ghostPiece = { ...gameState.currentPiece };
    while (!collision(ghostPiece, 0, 1)) {
        ghostPiece.y++;
    }

    ctx.globalAlpha = 0.3;
    ghostPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(ctx, ghostPiece.x + x, ghostPiece.y + y, ghostPiece.color);
            }
        });
    });
    ctx.globalAlpha = 1.0;
}

// ==================== 테트로미노 생성 ====================
function createPiece() {
    const shapes = Object.keys(SHAPES);
    const shapeKey = shapes[Math.floor(Math.random() * shapes.length)];
    const colors = THEMES[gameState.currentTheme];

    return {
        shape: SHAPES[shapeKey],
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[shapeKey][0].length / 2),
        y: 0,
        color: Math.floor(Math.random() * colors.length) + 1
    };
}

function drawNextPiece() {
    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (gameState.nextPiece) {
        const showFuture = gameState.activeItems.futureSight && gameState.upcomingPieces.length > 0;

        // 미래 예측 활성화 시 다음 블록을 위쪽에 그림
        const areaH = showFuture ? nextCanvas.height * 0.55 : nextCanvas.height;
        const offsetX = (nextCanvas.width / BLOCK_SIZE - gameState.nextPiece.shape[0].length) / 2;
        const offsetY = (areaH / BLOCK_SIZE - gameState.nextPiece.shape.length) / 2;

        gameState.nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(nextCtx, offsetX + x, offsetY + y, gameState.nextPiece.color);
                }
            });
        });

        // 미래 예측: 그 다음 2개 블록을 절반 크기로 아래쪽에 표시
        if (showFuture) {
            nextCtx.save();
            nextCtx.scale(0.5, 0.5);
            gameState.upcomingPieces.slice(0, 2).forEach((piece, i) => {
                const baseX = i * (nextCanvas.width); // 절반 스케일 기준 좌우 배치
                const px = baseX / BLOCK_SIZE + ((nextCanvas.width / BLOCK_SIZE) - piece.shape[0].length) / 2;
                const py = (nextCanvas.height * 1.25) / BLOCK_SIZE;
                piece.shape.forEach((row, y) => {
                    row.forEach((value, x) => {
                        if (value) {
                            drawBlock(nextCtx, px + x, py + y, piece.color);
                        }
                    });
                });
            });
            nextCtx.restore();
        }
    }
}

// 미래 예측 아이템용 블록 대기열
function pullNextPiece() {
    return gameState.upcomingPieces.length > 0 ? gameState.upcomingPieces.shift() : createPiece();
}

function ensureFutureQueue() {
    if (gameState.activeItems.futureSight) {
        while (gameState.upcomingPieces.length < 2) {
            gameState.upcomingPieces.push(createPiece());
        }
    }
}

// ==================== 충돌 감지 ====================
function collision(piece, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                if (newY >= 0 && gameState.board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// ==================== 블록 이동 및 회전 ====================
function movePiece(dx, dy) {
    if (!collision(gameState.currentPiece, dx, dy)) {
        gameState.currentPiece.x += dx;
        gameState.currentPiece.y += dy;
        return true;
    }
    return false;
}

function rotatePiece() {
    const rotated = gameState.currentPiece.shape[0].map((_, i) =>
        gameState.currentPiece.shape.map(row => row[i]).reverse()
    );

    const previousShape = gameState.currentPiece.shape;
    gameState.currentPiece.shape = rotated;

    if (collision(gameState.currentPiece, 0, 0)) {
        gameState.currentPiece.shape = previousShape;
    }
}

function dropPiece() {
    if (!movePiece(0, 1)) {
        mergePiece();
        playDropSound();

        // 블록을 놓을 때마다 50포인트 추가
        gameState.score += 50;
        currentScoreEl.textContent = gameState.score.toLocaleString();

        clearLines();

        gameState.currentPiece = gameState.nextPiece;
        gameState.nextPiece = pullNextPiece();
        ensureFutureQueue();
        drawNextPiece();

        if (collision(gameState.currentPiece, 0, 0)) {
            endGame();
        }
    }
}

function hardDrop() {
    while (movePiece(0, 1)) { }
    playHardDropSound();
    dropPiece();
}

// ==================== 블록 병합 및 줄 제거 ====================
function mergePiece() {
    gameState.currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = gameState.currentPiece.y + y;
                const boardX = gameState.currentPiece.x + x;
                if (boardY >= 0) {
                    gameState.board[boardY][boardX] = gameState.currentPiece.color;
                }
            }
        });
    });
}

// ==================== 파티클 시스템 ====================
let particles = [];

class Particle {
    constructor(x, y, color) {
        this.x = x * BLOCK_SIZE + BLOCK_SIZE / 2;
        this.y = y * BLOCK_SIZE + BLOCK_SIZE / 2;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10 - 5;
        this.vz = (Math.random() - 0.5) * 5;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
        this.scale = 1;
        this.alpha = 1;
        this.life = 1;
        this.size = BLOCK_SIZE;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.5; // 중력
        this.rotation += this.rotationSpeed;
        this.life -= 0.02;
        this.alpha = this.life;
        this.scale = 0.5 + this.life * 0.5;
        return this.life > 0;
    }

    draw(context) {
        context.save();
        context.globalAlpha = this.alpha;
        context.translate(this.x, this.y);
        context.rotate(this.rotation);
        context.scale(this.scale, this.scale);

        // 3D 효과를 위한 그림자
        context.shadowColor = 'rgba(0, 0, 0, 0.5)';
        context.shadowBlur = 10;
        context.shadowOffsetX = 5;
        context.shadowOffsetY = 5;

        const colors = THEMES[gameState.currentTheme];
        const color = colors[this.color - 1];

        context.fillStyle = color;
        context.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

        // 하이라이트
        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        context.fillRect(-this.size / 2, -this.size / 2, this.size, this.size / 3);

        context.restore();
    }
}

function updateParticles() {
    particles = particles.filter(p => p.update());

    if (particles.length > 0) {
        drawBoard();
        particles.forEach(p => p.draw(ctx));
        requestAnimationFrame(updateParticles);
    }
}

function clearLines() {
    let linesToClear = [];

    // 완성된 줄 찾기
    for (let row = ROWS - 1; row >= 0; row--) {
        if (gameState.board[row].every(cell => cell !== 0)) {
            linesToClear.push(row);
        }
    }

    if (linesToClear.length > 0) {
        // 줄 제거 플래시 효과 등록
        const flashStart = performance.now();
        linesToClear.forEach(row => {
            lineFlashes.push({ row: row, start: flashStart });
        });
        animateFlashes();

        // 파티클 생성
        linesToClear.forEach(row => {
            for (let col = 0; col < COLS; col++) {
                const color = gameState.board[row][col];
                if (color) {
                    // 각 블록당 여러 개의 파티클 생성
                    for (let i = 0; i < 3; i++) {
                        particles.push(new Particle(col, row, color));
                    }
                }
            }
        });

        // 파티클 애니메이션 시작
        if (particles.length > 0) {
            updateParticles();
        }

        // 줄 제거
        linesToClear.forEach(() => {
            for (let row = ROWS - 1; row >= 0; row--) {
                if (gameState.board[row].every(cell => cell !== 0)) {
                    gameState.board.splice(row, 1);
                    gameState.board.unshift(Array(COLS).fill(0));
                }
            }
        });

        const linesCleared = linesToClear.length;

        // 콤보 증가 (최대 10)
        gameState.combo = Math.min(gameState.combo + 1, 10);

        // 기본 점수: 줄당 500점
        let linePoints = linesCleared * POINTS_PER_LINE;

        // 콤보 보너스 (콤보 수 × 100점)
        const comboBonus = gameState.combo * 100;
        linePoints += comboBonus;

        // 스피드 부스트 배수 적용
        const pointsMultiplier = gameState.activeItems.speedBoost ? 2 : 1;
        linePoints *= pointsMultiplier;

        gameState.score += linePoints;
        currentScoreEl.textContent = gameState.score.toLocaleString();

        // 블록 터지는 효과음 재생 "뽀보보보복"
        playBlockBurstSound(gameState.combo);

        // 테트리스 (4줄 동시 제거) 알림 및 효과음
        if (linesCleared === 4) {
            playTetrisSound();
            showNotification(`🌟 테트리스! +${linePoints.toLocaleString()}점`);
        }

        // 콤보 표시 (콘솔 및 화면에 표시)
        if (gameState.combo > 1) {
            showComboNotification(gameState.combo, linePoints);
        }

        // 레벨 업
        const newLevel = Math.floor(gameState.score / 5000) + 1;
        if (newLevel > gameState.level) {
            playLevelUpSound();
            showNotification(`⬆️ 레벨 ${newLevel} 달성!`);
        }
        gameState.level = newLevel;
        currentLevelEl.textContent = gameState.level;
        updateGameSpeed();
    } else {
        // 줄을 완성하지 못하면 콤보 리셋
        gameState.combo = 0;
    }
}

function updateGameSpeed() {
    if (gameState.dropInterval) {
        clearInterval(gameState.dropInterval);
    }

    let baseSpeed = Math.max(100, 1000 - (gameState.level - 1) * 100);

    if (gameState.activeItems.slowMotion) {
        baseSpeed *= 2; // 50% 느리게
    }

    gameState.dropInterval = setInterval(() => {
        if (!gameState.isPaused && !gameState.gameOver) {
            dropPiece();
            drawBoard();
        }
    }, baseSpeed);
}

// ==================== 게임 시작/종료 ====================
function startGame() {
    gameState.board = createBoard();
    gameState.score = 0;
    gameState.level = 1;
    gameState.combo = 0; // 콤보 초기화
    gameState.gameOver = false;
    gameState.isPaused = false;
    gameState.currentPiece = createPiece();
    gameState.nextPiece = createPiece();
    gameState.upcomingPieces = [];
    gameState.activeItems = {
        ghostBlock: false,
        futureSight: false,
        slowMotion: false,
        speedBoost: false,
        safetyNet: false
    };
    gameState.itemTimers = {};

    currentScoreEl.textContent = '0';
    currentLevelEl.textContent = '1';
    gameOverOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    pauseBtn.textContent = '⏸ 일시정지';
    if (newRecordEl) newRecordEl.classList.add('hidden');

    // 파티클/플래시 초기화
    lineFlashes = [];

    // 테마 적용
    const ownedThemes = getOwnedThemes();
    if (ownedThemes.length > 1) {
        applyTheme(ownedThemes[ownedThemes.length - 1]);
    } else {
        applyTheme('default');
    }

    // 파티클 초기화
    particles = [];

    updateGameSpeed();
    drawNextPiece();
    drawBoard();
    updateInventoryDisplay();

    // 배경음악 시작 (약간의 지연 후)
    initAudio();
    setTimeout(() => {
        if (!isMuted) {
            playBackgroundMusic();
        }
    }, 100);

    showScreen(gameScreen);
}

function endGame() {
    // 세이프티 넷 확인 (아이템은 사용 시점에 이미 인벤토리에서 차감됨)
    if (gameState.activeItems.safetyNet) {
        gameState.activeItems.safetyNet = false;

        // 보드 상단 3줄 제거
        for (let i = 0; i < 3; i++) {
            gameState.board.shift();
            gameState.board.push(Array(COLS).fill(0));
        }

        gameState.currentPiece = createPiece();
        drawBoard();
        return;
    }

    gameState.gameOver = true;
    clearInterval(gameState.dropInterval);

    // 타이머 정리
    Object.values(gameState.itemTimers).forEach(timer => clearTimeout(timer));
    gameState.itemTimers = {};

    // 배경음악 정지
    stopBackgroundMusic();
    playGameOverSound();

    const earnedPoints = gameState.score;
    addPoints(earnedPoints);

    // 최고 점수 갱신
    const prevHigh = getHighScore();
    if (gameState.score > prevHigh) {
        setHighScore(gameState.score);
        if (newRecordEl) newRecordEl.classList.remove('hidden');
    } else {
        if (newRecordEl) newRecordEl.classList.add('hidden');
    }
    if (bestScoreEl) bestScoreEl.textContent = getHighScore().toLocaleString();

    finalScoreEl.textContent = gameState.score.toLocaleString();
    earnedPointsEl.textContent = earnedPoints.toLocaleString();
    gameOverOverlay.classList.remove('hidden');
}

// ==================== 콤보 알림 ====================
function showComboNotification(combo, points) {
    // 콘솔에 콤보 정보 출력
    console.log(`🔥 ${combo} COMBO! +${points.toLocaleString()}점`);
    showNotification(`🔥 ${combo} COMBO! +${points.toLocaleString()}점`);
}

// 범용 화면 알림 (테트리스, 레벨 업 등)
function showNotification(text) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 20px 40px;
        border-radius: 15px;
        font-size: 2rem;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        animation: comboPopup 1s ease-out;
        pointer-events: none;
    `;
    notification.textContent = text;
    document.body.appendChild(notification);

    // 1초 후 제거
    setTimeout(() => {
        notification.remove();
    }, 1000);
}


// ==================== 배경음악 시스템 ====================
let audioContext = null;
let bgmGainNode = null;
let bgmOscillators = [];
let isMusicPlaying = false;

// 음소거 상태 (로컬 스토리지에 저장)
let isMuted = localStorage.getItem('tetris-muted') === 'true';

function updateMuteButton() {
    if (muteBtn) {
        muteBtn.textContent = isMuted ? '🔇 소리 켜기' : '🔊 음소거';
    }
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('tetris-muted', isMuted.toString());
    updateMuteButton();

    if (isMuted) {
        stopBackgroundMusic();
    } else if (gameScreen.classList.contains('active') && !gameState.gameOver && !gameState.isPaused) {
        initAudio();
        playBackgroundMusic();
    }
}

// 테트리스 테마 멜로디 (Korobeiniki - 완전한 버전)
const tetrisMelody = [
    // A 파트
    { note: 659.25, duration: 400 }, // E5
    { note: 493.88, duration: 200 }, // B4
    { note: 523.25, duration: 200 }, // C5
    { note: 587.33, duration: 400 }, // D5
    { note: 523.25, duration: 200 }, // C5
    { note: 493.88, duration: 200 }, // B4
    { note: 440.00, duration: 400 }, // A4
    { note: 440.00, duration: 200 }, // A4
    { note: 523.25, duration: 200 }, // C5
    { note: 659.25, duration: 400 }, // E5
    { note: 587.33, duration: 200 }, // D5
    { note: 523.25, duration: 200 }, // C5
    { note: 493.88, duration: 600 }, // B4
    { note: 523.25, duration: 200 }, // C5
    { note: 587.33, duration: 400 }, // D5
    { note: 659.25, duration: 400 }, // E5
    { note: 523.25, duration: 400 }, // C5
    { note: 440.00, duration: 400 }, // A4
    { note: 440.00, duration: 400 }, // A4
    { note: 0, duration: 200 }, // 휴식

    // B 파트
    { note: 587.33, duration: 600 }, // D5
    { note: 698.46, duration: 200 }, // F5
    { note: 880.00, duration: 400 }, // A5
    { note: 783.99, duration: 200 }, // G5
    { note: 698.46, duration: 200 }, // F5
    { note: 659.25, duration: 600 }, // E5
    { note: 523.25, duration: 200 }, // C5
    { note: 659.25, duration: 400 }, // E5
    { note: 587.33, duration: 200 }, // D5
    { note: 523.25, duration: 200 }, // C5
    { note: 493.88, duration: 400 }, // B4
    { note: 493.88, duration: 200 }, // B4
    { note: 523.25, duration: 200 }, // C5
    { note: 587.33, duration: 400 }, // D5
    { note: 659.25, duration: 400 }, // E5
    { note: 523.25, duration: 400 }, // C5
    { note: 440.00, duration: 400 }, // A4
    { note: 440.00, duration: 400 }, // A4
    { note: 0, duration: 200 }, // 휴식
];

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        bgmGainNode = audioContext.createGain();
        bgmGainNode.gain.value = 0.15; // 볼륨 15%
        bgmGainNode.connect(audioContext.destination);
        console.log('AudioContext 초기화 완료');
    }
}

function playBackgroundMusic() {
    if (!audioContext) {
        console.error('AudioContext가 초기화되지 않았습니다.');
        return;
    }

    if (isMusicPlaying || isMuted) return;

    // AudioContext 재개 (브라우저 정책)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    isMusicPlaying = true;
    let melodyIndex = 0;

    function playNextNote() {
        if (!isMusicPlaying || !gameScreen.classList.contains('active')) {
            stopBackgroundMusic();
            return;
        }

        const note = tetrisMelody[melodyIndex];
        const now = audioContext.currentTime;

        // 휴식 음표가 아닐 때만 소리 재생
        if (note.note > 0) {
            const oscillator = audioContext.createOscillator();
            const noteGain = audioContext.createGain();

            oscillator.type = 'square';
            oscillator.frequency.value = note.note;

            noteGain.gain.setValueAtTime(0.08, now);
            noteGain.gain.exponentialRampToValueAtTime(0.01, now + note.duration / 1000);

            oscillator.connect(noteGain);
            noteGain.connect(bgmGainNode);

            oscillator.start(now);
            oscillator.stop(now + note.duration / 1000);

            bgmOscillators.push(oscillator);
        }

        melodyIndex = (melodyIndex + 1) % tetrisMelody.length;

        // 다음 음표 재생 (무한 반복)
        setTimeout(playNextNote, note.duration);
    }

    console.log('배경음악 재생 시작');
    playNextNote();
}

function stopBackgroundMusic() {
    isMusicPlaying = false;
    bgmOscillators.forEach(osc => {
        try {
            osc.stop();
        } catch (e) {
            // 이미 정지된 경우 무시
        }
    });
    bgmOscillators = [];
}


// 단일 톤 재생 헬퍼 (효과음용)
function playTone(frequency, duration, type = 'square', volume = 0.1, delay = 0) {
    if (isMuted) return;
    initAudio();
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const startTime = audioContext.currentTime + delay / 1000;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration / 1000);
}

// 이동 효과음
function playMoveSound() {
    playTone(220, 40, 'triangle', 0.06);
}

// 회전 효과음
function playRotateSound() {
    playTone(340, 60, 'triangle', 0.08);
}

// 블록 고정(착지) 효과음
function playDropSound() {
    playTone(140, 90, 'square', 0.09);
}

// 하드 드롭 효과음 (빠른 하강 스윕)
function playHardDropSound() {
    playTone(500, 50, 'sawtooth', 0.07);
    playTone(300, 50, 'sawtooth', 0.07, 40);
    playTone(180, 80, 'square', 0.09, 80);
}

// 테트리스(4줄) 팡파레
function playTetrisSound() {
    playTone(523.25, 120, 'square', 0.12);       // C5
    playTone(659.25, 120, 'square', 0.12, 110);  // E5
    playTone(783.99, 120, 'square', 0.12, 220);  // G5
    playTone(1046.50, 250, 'square', 0.14, 330); // C6
}

// 레벨 업 효과음 (상승 아르페지오)
function playLevelUpSound() {
    playTone(440, 100, 'triangle', 0.1);        // A4
    playTone(554.37, 100, 'triangle', 0.1, 90); // C#5
    playTone(659.25, 180, 'triangle', 0.12, 180); // E5
}

// 게임 오버 효과음 (하강음)
function playGameOverSound() {
    playTone(392, 200, 'sawtooth', 0.1);        // G4
    playTone(311.13, 200, 'sawtooth', 0.1, 180); // Eb4
    playTone(261.63, 200, 'sawtooth', 0.1, 360); // C4
    playTone(196, 450, 'sawtooth', 0.12, 540);   // G3
}

function playSoundEffect(frequency, duration = 100) {
    if (isMuted) return;
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);
}

// 블록 터지는 효과음 "뽀보보보복"
function playBlockBurstSound(combo) {
    if (isMuted) return;
    if (!audioContext) return;

    // 뽀보보보복 - 5개의 음을 빠르게 연속 재생
    const burstNotes = [
        { freq: 800, delay: 0 },      // 뽀
        { freq: 600, delay: 50 },     // 보
        { freq: 700, delay: 100 },    // 보
        { freq: 650, delay: 150 },    // 보
        { freq: 500, delay: 200 }     // 복
    ];

    // 콤보가 높을수록 음정이 높아짐
    const comboBoost = combo * 50;

    burstNotes.forEach(note => {
        setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine'; // 부드러운 소리
            oscillator.frequency.value = note.freq + comboBoost;

            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        }, note.delay);
    });
}


// ==================== 일시정지 ====================
function togglePause() {
    if (gameState.gameOver || !gameScreen.classList.contains('active')) {
        return;
    }

    gameState.isPaused = !gameState.isPaused;

    if (gameState.isPaused) {
        pauseOverlay.classList.remove('hidden');
        pauseBtn.textContent = '▶ 계속하기';
        stopBackgroundMusic();
    } else {
        pauseOverlay.classList.add('hidden');
        pauseBtn.textContent = '⏸ 일시정지';
        if (!isMuted) {
            initAudio();
            playBackgroundMusic();
        }
    }
}

// ==================== 키보드 입력 ====================
document.addEventListener('keydown', (e) => {
    if (gameState.gameOver || !gameScreen.classList.contains('active')) {
        return;
    }

    // 일시정지 토글 (일시정지 중에도 동작)
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
    }

    if (gameState.isPaused) {
        return;
    }

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            if (movePiece(-1, 0)) playMoveSound();
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (movePiece(1, 0)) playMoveSound();
            break;
        case 'ArrowDown':
            e.preventDefault();
            dropPiece();
            break;
        case 'ArrowUp':
        case ' ':
            e.preventDefault();
            rotatePiece();
            playRotateSound();
            break;
        case 'Enter':
            e.preventDefault();
            hardDrop();
            break;
    }

    drawBoard();
});

// ==================== 모바일 터치 입력 ====================
// 스와이프 좌/우: 이동, 아래: 소프트 드롭, 위: 하드 드롭, 탭: 회전
(function setupTouchControls() {
    const MOVE_THRESHOLD = 28;  // 한 칸 이동에 필요한 픽셀
    const DROP_THRESHOLD = 32;  // 한 칸 소프트 드롭에 필요한 픽셀
    const TAP_MAX_DIST = 12;
    const TAP_MAX_TIME = 300;
    const FLICK_UP_DIST = 50;

    let startX = 0, startY = 0, startTime = 0;
    let lastX = 0, lastY = 0;
    let totalDist = 0;

    function touchActive() {
        return !gameState.gameOver && !gameState.isPaused &&
            gameScreen.classList.contains('active') && gameState.currentPiece;
    }

    canvas.addEventListener('touchstart', (e) => {
        if (!touchActive()) return;
        e.preventDefault();
        const t = e.touches[0];
        startX = lastX = t.clientX;
        startY = lastY = t.clientY;
        startTime = Date.now();
        totalDist = 0;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (!touchActive()) return;
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - lastX;
        const dy = t.clientY - lastY;
        totalDist += Math.abs(dx) + Math.abs(dy);

        // 좌우 이동
        if (Math.abs(dx) >= MOVE_THRESHOLD) {
            const steps = Math.floor(Math.abs(dx) / MOVE_THRESHOLD);
            const dir = dx > 0 ? 1 : -1;
            for (let i = 0; i < steps; i++) {
                if (movePiece(dir, 0)) playMoveSound();
            }
            lastX += dir * steps * MOVE_THRESHOLD;
            drawBoard();
        }

        // 아래로 스와이프: 소프트 드롭
        if (dy >= DROP_THRESHOLD) {
            const steps = Math.floor(dy / DROP_THRESHOLD);
            for (let i = 0; i < steps; i++) {
                dropPiece();
                if (gameState.gameOver) break;
            }
            lastY += steps * DROP_THRESHOLD;
            drawBoard();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (!touchActive()) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        const elapsed = Date.now() - startTime;

        // 위로 빠르게 스와이프: 하드 드롭
        if (dy <= -FLICK_UP_DIST && Math.abs(dy) > Math.abs(dx)) {
            hardDrop();
            drawBoard();
            return;
        }

        // 짧은 탭: 회전
        if (totalDist <= TAP_MAX_DIST && elapsed <= TAP_MAX_TIME) {
            rotatePiece();
            playRotateSound();
            drawBoard();
        }
    }, { passive: false });
})();

// ==================== 아이템 시스템 ====================
const ITEM_INFO = {
    'slow-motion': { name: '슬로우 모션', icon: '⏱️', duration: 30000 },
    'ghost-block': { name: '고스트 블록', icon: '👻', duration: null },
    'block-change': { name: '블록 체인지', icon: '🔄', duration: null },
    'line-bomb': { name: '줄 폭파', icon: '💣', duration: null },
    'safety-net': { name: '세이프티 넷', icon: '🛡️', duration: null },
    'speed-boost': { name: '스피드 부스트', icon: '⚡', duration: 10000 },
    'perfect-line': { name: '퍼펙트 라인', icon: '🎯', duration: null },
    'future-sight': { name: '미래 예측', icon: '🔮', duration: null }
};

function useItem(itemId) {
    if (!removeItemFromInventory(itemId)) {
        return;
    }

    switch (itemId) {
        case 'slow-motion':
            activateSlowMotion();
            break;
        case 'ghost-block':
            gameState.activeItems.ghostBlock = true;
            break;
        case 'block-change':
            changeCurrentBlock();
            break;
        case 'line-bomb':
            clearBottomLine();
            break;
        case 'safety-net':
            gameState.activeItems.safetyNet = true;
            break;
        case 'speed-boost':
            activateSpeedBoost();
            break;
        case 'perfect-line':
            completePerfectLine();
            break;
        case 'future-sight':
            gameState.activeItems.futureSight = true;
            ensureFutureQueue();
            drawNextPiece();
            break;
    }

    drawBoard();
}

function activateSlowMotion() {
    gameState.activeItems.slowMotion = true;
    updateGameSpeed();

    if (gameState.itemTimers.slowMotion) {
        clearTimeout(gameState.itemTimers.slowMotion);
    }

    gameState.itemTimers.slowMotion = setTimeout(() => {
        gameState.activeItems.slowMotion = false;
        updateGameSpeed();
        delete gameState.itemTimers.slowMotion;
    }, 30000);
}

function activateSpeedBoost() {
    gameState.activeItems.speedBoost = true;

    if (gameState.itemTimers.speedBoost) {
        clearTimeout(gameState.itemTimers.speedBoost);
    }

    gameState.itemTimers.speedBoost = setTimeout(() => {
        gameState.activeItems.speedBoost = false;
        delete gameState.itemTimers.speedBoost;
    }, 10000);
}

function changeCurrentBlock() {
    gameState.currentPiece = createPiece();
    drawBoard();
}

function clearBottomLine() {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (gameState.board[row].some(cell => cell !== 0)) {
            // 파티클 생성
            for (let col = 0; col < COLS; col++) {
                const color = gameState.board[row][col];
                if (color) {
                    for (let i = 0; i < 3; i++) {
                        particles.push(new Particle(col, row, color));
                    }
                }
            }

            // 파티클 애니메이션 시작
            if (particles.length > 0) {
                updateParticles();
            }

            gameState.board.splice(row, 1);
            gameState.board.unshift(Array(COLS).fill(0));

            // 콤보 증가
            gameState.combo = Math.min(gameState.combo + 1, 10);

            // 점수 계산 (clearLines와 동일)
            let linePoints = POINTS_PER_LINE;
            const comboBonus = gameState.combo * 100;
            linePoints += comboBonus;
            const pointsMultiplier = gameState.activeItems.speedBoost ? 2 : 1;
            linePoints *= pointsMultiplier;

            gameState.score += linePoints;
            currentScoreEl.textContent = gameState.score.toLocaleString();

            // 효과음 재생
            playBlockBurstSound(gameState.combo);

            // 콤보 표시
            if (gameState.combo > 1) {
                showComboNotification(gameState.combo, linePoints);
            }

            break;
        }
    }
    drawBoard();
}

function completePerfectLine() {
    // 빈 줄 찾기
    for (let row = ROWS - 1; row >= 0; row--) {
        const emptyCount = gameState.board[row].filter(cell => cell === 0).length;
        if (emptyCount > 0 && emptyCount < COLS) {
            // 이 줄을 완성
            for (let col = 0; col < COLS; col++) {
                if (gameState.board[row][col] === 0) {
                    gameState.board[row][col] = Math.floor(Math.random() * 7) + 1;
                }
            }
            clearLines();
            break;
        }
    }
    drawBoard();
}

function updateInventoryDisplay() {
    const inventory = getInventory();
    const ownedThemes = getOwnedThemes();
    inventoryItemsEl.innerHTML = '';

    // 테마 정보
    const THEME_INFO = {
        'default': { name: '기본', icon: '🎮' },
        'classic': { name: '클래식', icon: '🎨' },
        'neon': { name: '네온', icon: '🌈' },
        'ocean': { name: '오션', icon: '🌊' },
        'fire': { name: '파이어', icon: '🔥' },
        'sakura': { name: '벚꽃', icon: '🌸' },
        'galaxy': { name: '갤럭시', icon: '🌌' }
    };

    // 테마 표시
    ownedThemes.forEach(themeId => {
        const info = THEME_INFO[themeId];
        const itemEl = document.createElement('div');
        itemEl.className = 'inventory-item inventory-theme';

        // 현재 적용 중인 테마 표시
        if (gameState.currentTheme === themeId) {
            itemEl.classList.add('active');
        }

        itemEl.innerHTML = `
            <span class="inventory-item-icon">${info.icon}</span>
            <span class="inventory-item-name">${info.name}</span>
            <span class="inventory-item-count">테마</span>
        `;

        itemEl.addEventListener('click', () => {
            applyTheme(themeId);
            updateInventoryDisplay(); // 활성 상태 업데이트
        });
        inventoryItemsEl.appendChild(itemEl);
    });

    // 일회용 아이템 표시
    Object.entries(inventory).forEach(([itemId, count]) => {
        if (count > 0) {
            const info = ITEM_INFO[itemId];
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';
            // 아이템 ID(kebab-case)를 activeItems 키(camelCase)로 변환
            const activeKey = itemId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            if (gameState.activeItems[activeKey]) {
                itemEl.classList.add('active');
            }

            itemEl.innerHTML = `
                <span class="inventory-item-icon">${info.icon}</span>
                <span class="inventory-item-name">${info.name}</span>
                <span class="inventory-item-count">×${count}</span>
            `;

            itemEl.addEventListener('click', () => useItem(itemId));
            inventoryItemsEl.appendChild(itemEl);
        }
    });
}

// ==================== 상점 시스템 ====================
function initShop() {
    const shopItems = document.querySelectorAll('.shop-item');

    shopItems.forEach(item => {
        const itemId = item.dataset.item;
        const price = parseInt(item.dataset.price);
        const type = item.dataset.type;
        const buyBtn = item.querySelector('.btn-buy');

        // 테마 아이템인 경우 소유 여부 확인
        if (type === 'theme') {
            const themeId = itemId.replace('theme-', '');
            const ownedThemes = getOwnedThemes();
            if (ownedThemes.includes(themeId)) {
                item.classList.add('owned');
                buyBtn.textContent = '보유중';
                buyBtn.disabled = true;
            }
        }

        buyBtn.addEventListener('click', () => {
            const currentPoints = getTotalPoints();

            if (currentPoints >= price) {
                setTotalPoints(currentPoints - price);

                if (type === 'theme') {
                    const themeId = itemId.replace('theme-', '');
                    addOwnedTheme(themeId);
                    applyTheme(themeId); // 테마 즉시 적용
                    item.classList.add('owned');
                    buyBtn.textContent = '보유중';
                    buyBtn.disabled = true;
                } else {
                    addItemToInventory(itemId);
                }

                updatePointsDisplay();
            } else {
                alert('포인트가 부족합니다!');
            }
        });
    });
}

// ==================== 이벤트 리스너 ====================
startGameBtn.addEventListener('click', startGame);
shopBtn.addEventListener('click', () => {
    showScreen(shopScreen);
    updatePointsDisplay();
});
backToHomeBtn.addEventListener('click', () => {
    if (gameState.dropInterval) {
        clearInterval(gameState.dropInterval);
    }
    Object.values(gameState.itemTimers).forEach(timer => clearTimeout(timer));
    stopBackgroundMusic();
    showScreen(homeScreen);
});
backFromShopBtn.addEventListener('click', () => showScreen(homeScreen));
restartBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);
restartGameBtn.addEventListener('click', startGame);
muteBtn.addEventListener('click', toggleMute);
homeBtn.addEventListener('click', () => {
    if (gameState.dropInterval) {
        clearInterval(gameState.dropInterval);
    }
    stopBackgroundMusic();
    showScreen(homeScreen);
});

// ==================== 초기화 ====================
updatePointsDisplay();
updateHighScoreDisplay();
updateMuteButton();
initShop();
console.log('테트리스 게임이 준비되었습니다!');
console.log('조작법: ← → 이동, ↑/Space 회전, ↓ 빠르게 내리기, Enter 즉시 낙하, P/Esc 일시정지');
console.log('모바일: 좌우 스와이프 이동, 아래 스와이프 내리기, 위로 스와이프 즉시 낙하, 탭 회전');
