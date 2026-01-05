// 게임 상태
const gameState = {
    gold: 100,
    lives: 10,
    score: 0,
    wave: 1,
    stage: 1,
    coins: 0,
    isRunning: false,
    isPaused: false,
    towers: [],
    enemies: [],
    projectiles: [],
    waveEnemies: [],
    waveTimer: 0,
    lastTime: 0,
    currentScreen: 'home', // 'home', 'game', 'shop'
    isDragging: false,
    dragTower: null,
    dragStartX: 0,
    dragStartY: 0,
    selectedTowerType: 'basic', // 선택된 타워 타입
    shopItems: [
        { id: 'damage', name: '공격력 강화', cost: 50, effect: '타워 공격력 +10', owned: 0 },
        { id: 'range', name: '범위 확장', cost: 75, effect: '타워 범위 +20', owned: 0 },
        { id: 'speed', name: '공격 속도', cost: 60, effect: '타워 공격 속도 +20%', owned: 0 },
        { id: 'gold', name: '골드 부스터', cost: 40, effect: '적 처치 시 골드 +5', owned: 0 },
        { id: 'life', name: '생명력 증가', cost: 100, effect: '생명력 +3', owned: 0 },
        { id: 'critical', name: '크리티컬 공격', cost: 120, effect: '타워 크리티컬 확률 +15%', owned: 0 },
        { id: 'splash', name: '스플래시 공격', cost: 150, effect: '타워 범위 공격 가능', owned: 0 },
        { id: 'freeze', name: '빙결 공격', cost: 200, effect: '적 이동 속도 감소', owned: 0 },
        { id: 'poison', name: '독 공격', cost: 180, effect: '적 지속 데미지', owned: 0 },
        { id: 'chain', name: '체인 공격', cost: 250, effect: '여러 적 동시 공격', owned: 0 },
        { id: 'laser', name: '레이저 타워', cost: 300, effect: '강력한 레이저 공격', owned: 0 },
        { id: 'missile', name: '미사일 타워', cost: 350, effect: '장거리 미사일 공격', owned: 0 },
        { id: 'lightning', name: '번개 타워', cost: 400, effect: '전기 공격으로 체인 데미지', owned: 0 },
        { id: 'ice', name: '얼음 타워', cost: 450, effect: '적 빙결 및 슬로우', owned: 0 },
        { id: 'fire', name: '화염 타워', cost: 500, effect: '화염 지속 데미지', owned: 0 },
        { id: 'gold_mine', name: '골드 광산', cost: 80, effect: '자동 골드 생성', owned: 0 },
        { id: 'score_boost', name: '점수 부스터', cost: 90, effect: '적 처치 시 점수 +10', owned: 0 },
        { id: 'wave_skip', name: '웨이브 스킵', cost: 150, effect: '다음 웨이브 즉시 시작', owned: 0 },
        { id: 'tower_discount', name: '타워 할인', cost: 70, effect: '타워 구매 비용 -20%', owned: 0 },
        { id: 'repair', name: '자동 수리', cost: 120, effect: '생명력 자동 회복', owned: 0 },
        { id: 'shield', name: '방어막', cost: 200, effect: '생명력 보호막 생성', owned: 0 },
        { id: 'time_slow', name: '시간 감속', cost: 300, effect: '적 이동 속도 감소', owned: 0 },
        { id: 'nuke', name: '핵폭탄', cost: 500, effect: '화면 전체 적 제거', owned: 0 },
        { id: 'heal', name: '치유의 빛', cost: 100, effect: '생명력 완전 회복', owned: 0 },
        { id: 'double_gold', name: '골드 더블', cost: 150, effect: '골드 획득량 2배', owned: 0 },
        { id: 'lucky_shot', name: '행운의 사격', cost: 80, effect: '크리티컬 확률 +25%', owned: 0 },
        { id: 'armor_pierce', name: '갑옷 관통', cost: 200, effect: '보스 데미지 +50%', owned: 0 },
        { id: 'rapid_fire', cost: 120, name: '연발 사격', effect: '공격 속도 +50%', owned: 0 },
        { id: 'mega_range', name: '메가 범위', cost: 250, effect: '타워 범위 +100', owned: 0 },
        { id: 'vampire', name: '흡혈 공격', cost: 300, effect: '적 처치 시 생명력 회복', owned: 0 },
        { id: 'summon', name: '소환 마법', cost: 400, effect: '임시 타워 소환', owned: 0 },
        { id: 'teleport', name: '순간이동', cost: 180, effect: '타워 위치 변경 가능', owned: 0 },
        { id: 'clone', name: '타워 복제', cost: 350, effect: '기존 타워 복사', owned: 0 },
        { id: 'upgrade_all', name: '전체 업그레이드', cost: 600, effect: '모든 타워 강화', owned: 0 },
        { id: 'golden_tower', name: '황금 타워', cost: 800, effect: '최강 타워 생성', owned: 0 },
        { id: 'rainbow_shot', name: '무지개 사격', cost: 450, effect: '모든 속성 공격', owned: 0 },
        { id: 'time_machine', name: '시간 기계', cost: 1000, effect: '웨이브 되돌리기', owned: 0 },
        { id: 'wish', name: '소원의 별', cost: 1500, effect: '원하는 아이템 무료 획득', owned: 0 }
    ]
};

// 게임 설정
const config = {
    towerCost: 50,
    towerDamage: 25,
    towerRange: 100,
    towerFireRate: 1000,
    enemySpeed: 0.8,
    enemyHealth: 25,
    enemyReward: 10,
    bossHealth: 200,
    bossSpeed: 0.5,
    bossReward: 50,
    waveDelay: 3000,
    gridSize: 40
};

// Canvas 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 경로
const path = [
    { x: 0, y: 300 },
    { x: 200, y: 300 },
    { x: 200, y: 100 },
    { x: 400, y: 100 },
    { x: 400, y: 500 },
    { x: 600, y: 500 },
    { x: 600, y: 300 },
    { x: 800, y: 300 }
];

// 타워 클래스
class Tower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.range = config.towerRange + (gameState.shopItems.find(item => item.id === 'range').owned * 20) + (gameState.shopItems.find(item => item.id === 'mega_range').owned * 100);
        this.damage = config.towerDamage + (gameState.shopItems.find(item => item.id === 'damage').owned * 10);
        this.fireRate = config.towerFireRate * (1 - gameState.shopItems.find(item => item.id === 'speed').owned * 0.2) * (1 - gameState.shopItems.find(item => item.id === 'rapid_fire').owned * 0.5);
        this.lastFire = 0;
        this.target = null;
        this.criticalChance = gameState.shopItems.find(item => item.id === 'critical').owned * 0.15 + gameState.shopItems.find(item => item.id === 'lucky_shot').owned * 0.25;

        // 타워 타입 결정 (가장 높은 레벨의 아이템 기준)
        this.towerType = this.getTowerType();
    }

    getTowerType() {
        const items = gameState.shopItems;
        if (items.find(item => item.id === 'golden_tower').owned > 0) return 'golden';
        if (items.find(item => item.id === 'laser').owned > 0) return 'laser';
        if (items.find(item => item.id === 'missile').owned > 0) return 'missile';
        if (items.find(item => item.id === 'lightning').owned > 0) return 'lightning';
        if (items.find(item => item.id === 'ice').owned > 0) return 'ice';
        if (items.find(item => item.id === 'fire').owned > 0) return 'fire';
        if (items.find(item => item.id === 'rainbow_shot').owned > 0) return 'rainbow';
        return 'basic';
    }

    update(enemies, currentTime) {
        this.target = null;
        let closestDistance = this.range;

        for (let enemy of enemies) {
            const distance = Math.sqrt(
                Math.pow(this.x - enemy.x, 2) + Math.pow(this.y - enemy.y, 2)
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                this.target = enemy;
            }
        }

        if (this.target && currentTime - this.lastFire > this.fireRate) {
            // 크리티컬 공격 체크
            const isCritical = Math.random() < this.criticalChance;
            const finalDamage = isCritical ? this.damage * 2 : this.damage;

            // 타워 타입에 따른 특별 효과
            let projectileType = 'basic';
            let specialDamage = finalDamage;

            switch (this.towerType) {
                case 'laser':
                    projectileType = 'laser';
                    specialDamage = finalDamage * 1.5;
                    break;
                case 'missile':
                    projectileType = 'missile';
                    specialDamage = finalDamage * 1.3;
                    break;
                case 'lightning':
                    projectileType = 'lightning';
                    specialDamage = finalDamage * 1.2;
                    break;
                case 'ice':
                    projectileType = 'ice';
                    specialDamage = finalDamage * 0.8; // 데미지는 낮지만 슬로우 효과
                    break;
                case 'fire':
                    projectileType = 'fire';
                    specialDamage = finalDamage * 1.1;
                    break;
                case 'golden':
                    projectileType = 'golden';
                    specialDamage = finalDamage * 2;
                    break;
                case 'rainbow':
                    projectileType = 'rainbow';
                    specialDamage = finalDamage * 1.4;
                    break;
            }

            gameState.projectiles.push(new Projectile(
                this.x, this.y, this.target, specialDamage, isCritical, projectileType
            ));
            this.lastFire = currentTime;
        }
    }

    draw() {
        // 타워 타입에 따른 색상과 모양
        let towerColor = '#4299e1';
        let towerEmoji = '🏰';
        let rangeColor = 'rgba(66, 153, 225, 0.3)';

        switch (this.towerType) {
            case 'laser':
                towerColor = '#ff0000';
                towerEmoji = '🔴';
                rangeColor = 'rgba(255, 0, 0, 0.3)';
                break;
            case 'missile':
                towerColor = '#ff6600';
                towerEmoji = '🚀';
                rangeColor = 'rgba(255, 102, 0, 0.3)';
                break;
            case 'lightning':
                towerColor = '#ffff00';
                towerEmoji = '⚡';
                rangeColor = 'rgba(255, 255, 0, 0.3)';
                break;
            case 'ice':
                towerColor = '#00ffff';
                towerEmoji = '❄️';
                rangeColor = 'rgba(0, 255, 255, 0.3)';
                break;
            case 'fire':
                towerColor = '#ff4400';
                towerEmoji = '🔥';
                rangeColor = 'rgba(255, 68, 0, 0.3)';
                break;
            case 'golden':
                towerColor = '#ffd700';
                towerEmoji = '👑';
                rangeColor = 'rgba(255, 215, 0, 0.3)';
                break;
            case 'rainbow':
                towerColor = '#ff00ff';
                towerEmoji = '🌈';
                rangeColor = 'rgba(255, 0, 255, 0.3)';
                break;
        }

        ctx.fillStyle = towerColor;
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);

        if (gameState.isRunning) {
            ctx.strokeStyle = rangeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = '#2d3748';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(towerEmoji, this.x, this.y + 5);
    }
}

// 적 클래스
class Enemy {
    constructor(isBoss = false) {
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.isBoss = isBoss;

        if (isBoss) {
            this.health = config.bossHealth + (gameState.stage - 1) * 100;
            this.maxHealth = this.health;
            this.speed = config.bossSpeed;
            this.reward = config.bossReward;
        } else {
            this.health = config.enemyHealth + (gameState.wave - 1) * 8 + (gameState.stage - 1) * 15;
            this.maxHealth = this.health;
            this.speed = config.enemySpeed;
            this.reward = config.enemyReward;
        }
    }

    update() {
        if (this.pathIndex >= path.length - 1) {
            gameState.lives--;
            return false;
        }

        const targetPoint = path[this.pathIndex + 1];
        const dx = targetPoint.x - this.x;
        const dy = targetPoint.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            this.pathIndex++;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        return true;
    }

    draw() {
        const size = this.isBoss ? 40 : 24;
        const offset = size / 2;

        ctx.fillStyle = this.isBoss ? '#9b2c2c' : '#e53e3e';
        ctx.fillRect(this.x - offset, this.y - offset, size, size);

        ctx.fillStyle = '#2d3748';
        ctx.font = this.isBoss ? '24px Arial' : '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.isBoss ? '👹' : '👾', this.x, this.y + (this.isBoss ? 6 : 4));

        // 체력바
        const barWidth = this.isBoss ? 50 : 30;
        const barHeight = this.isBoss ? 6 : 4;
        const healthPercent = this.health / this.maxHealth;

        ctx.fillStyle = '#e53e3e';
        ctx.fillRect(this.x - barWidth / 2, this.y - (this.isBoss ? 30 : 20), barWidth, barHeight);

        ctx.fillStyle = '#48bb78';
        ctx.fillRect(this.x - barWidth / 2, this.y - (this.isBoss ? 30 : 20), barWidth * healthPercent, barHeight);
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            let goldReward = this.reward;
            let scoreReward = this.reward;

            // 골드 부스터 아이템 효과
            const goldBooster = gameState.shopItems.find(item => item.id === 'gold');
            if (goldBooster.owned > 0) {
                goldReward += goldBooster.owned * 5;
            }

            // 골드 더블 아이템 효과
            const doubleGold = gameState.shopItems.find(item => item.id === 'double_gold');
            if (doubleGold.owned > 0) {
                goldReward *= 2;
            }

            // 점수 부스터 아이템 효과
            const scoreBooster = gameState.shopItems.find(item => item.id === 'score_boost');
            if (scoreBooster.owned > 0) {
                scoreReward += scoreBooster.owned * 10;
            }

            // 흡혈 공격 아이템 효과
            const vampire = gameState.shopItems.find(item => item.id === 'vampire');
            if (vampire.owned > 0) {
                gameState.lives = Math.min(gameState.lives + 1, 10 + (gameState.shopItems.find(item => item.id === 'life').owned * 3));
            }

            gameState.gold += goldReward;
            gameState.score += scoreReward;
            return false;
        }
        return true;
    }
}

// 발사체 클래스
class Projectile {
    constructor(x, y, target, damage, isCritical = false, type = 'basic') {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.isCritical = isCritical;
        this.type = type;
        this.speed = 5;

        // 타입에 따른 속도 조정
        switch (type) {
            case 'laser':
                this.speed = 8;
                break;
            case 'missile':
                this.speed = 4;
                break;
            case 'lightning':
                this.speed = 10;
                break;
            case 'ice':
                this.speed = 3;
                break;
            case 'fire':
                this.speed = 6;
                break;
            case 'golden':
                this.speed = 7;
                break;
            case 'rainbow':
                this.speed = 6;
                break;
        }
    }

    update() {
        if (!this.target) return false;

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            if (!this.target.takeDamage(this.damage)) {
                const index = gameState.enemies.indexOf(this.target);
                if (index > -1) {
                    gameState.enemies.splice(index, 1);
                }
            }
            return false;
        }

        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
        return true;
    }

    draw() {
        let color = '#f6ad55';
        let size = 3;

        if (this.isCritical) {
            color = '#ff0000';
            size = 5;
        }

        // 타입에 따른 색상과 크기
        switch (this.type) {
            case 'laser':
                color = '#ff0000';
                size = 4;
                // 레이저 효과
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + (this.target.x - this.x) * 0.1, this.y + (this.target.y - this.y) * 0.1);
                ctx.stroke();
                break;
            case 'missile':
                color = '#ff6600';
                size = 6;
                break;
            case 'lightning':
                color = '#ffff00';
                size = 5;
                // 번개 효과
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + (this.target.x - this.x) * 0.15, this.y + (this.target.y - this.y) * 0.15);
                ctx.stroke();
                break;
            case 'ice':
                color = '#00ffff';
                size = 4;
                break;
            case 'fire':
                color = '#ff4400';
                size = 5;
                break;
            case 'golden':
                color = '#ffd700';
                size = 7;
                break;
            case 'rainbow':
                color = '#ff00ff';
                size = 6;
                // 무지개 효과
                const hue = (Date.now() / 10) % 360;
                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                ctx.fill();
                return;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 게임 초기화
function initGame() {
    gameState.towers = [];
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.waveEnemies = [];
    gameState.waveTimer = 0;
    gameState.gold = 100;
    gameState.lives = 10 + (gameState.shopItems.find(item => item.id === 'life').owned * 3);
    gameState.score = 0;
    gameState.wave = 1;
    gameState.isRunning = false;
    gameState.isPaused = false;

    updateUI();
}

// 웨이브 생성
function createWave() {
    const enemyCount = 2 + gameState.wave * 1.2;
    gameState.waveEnemies = [];

    for (let i = 0; i < enemyCount; i++) {
        gameState.waveEnemies.push(new Enemy());
    }

    // 3웨이브마다 보스 생성
    if (gameState.wave % 3 === 0) {
        gameState.waveEnemies.push(new Enemy(true));
    }
}

// 게임 업데이트
function updateGame(currentTime) {
    if (!gameState.isRunning || gameState.isPaused) return;

    if (gameState.waveEnemies.length === 0 && gameState.enemies.length === 0) {
        gameState.waveTimer += 16;
        if (gameState.waveTimer > config.waveDelay) {
            gameState.wave++;

            // 10웨이브마다 스테이지 클리어
            if (gameState.wave > 10) {
                stageComplete();
                return;
            }

            createWave();
            gameState.waveTimer = 0;
        }
    }

    if (gameState.waveEnemies.length > 0 && gameState.enemies.length < 3) {
        gameState.enemies.push(gameState.waveEnemies.shift());
    }

    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        if (!gameState.enemies[i].update()) {
            gameState.enemies.splice(i, 1);
        }
    }

    for (let tower of gameState.towers) {
        tower.update(gameState.enemies, currentTime);
    }

    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        if (!gameState.projectiles[i].update()) {
            gameState.projectiles.splice(i, 1);
        }
    }

    if (gameState.lives <= 0) {
        gameOver();
    }

    updateUI();
}

// 스테이지 완료
function stageComplete() {
    gameState.isRunning = false;

    // 점수를 코인으로 변환
    const earnedCoins = Math.floor(gameState.score / 10);
    gameState.coins += earnedCoins;

    alert(`스테이지 ${gameState.stage} 클리어!\n획득한 코인: ${earnedCoins}개\n총 코인: ${gameState.coins}개`);

    gameState.stage++;
    gameState.currentScreen = 'home';
    renderHomeScreen();
}

// 게임 오버
function gameOver() {
    gameState.isRunning = false;

    // 점수를 코인으로 변환
    const earnedCoins = Math.floor(gameState.score / 10);
    gameState.coins += earnedCoins;

    alert(`게임 오버!\n최종 점수: ${gameState.score}\n획득한 코인: ${earnedCoins}개\n총 코인: ${gameState.coins}개`);

    gameState.currentScreen = 'home';
    renderHomeScreen();
}

// 게임 렌더링
function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 경로 그리기
    ctx.strokeStyle = '#a0aec0';
    ctx.lineWidth = 40;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    // 격자 그리기
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += config.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += config.gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // 타워 그리기
    for (let tower of gameState.towers) {
        tower.draw();
    }

    // 적 그리기
    for (let enemy of gameState.enemies) {
        enemy.draw();
    }

    // 발사체 그리기
    for (let projectile of gameState.projectiles) {
        projectile.draw();
    }

    // 게임 정보 표시 (화면 상단)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 300, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`💰 골드: ${gameState.gold}`, 20, 35);
    ctx.fillText(`🌊 웨이브: ${gameState.wave}`, 20, 60);
    ctx.fillText(`🎯 점수: ${gameState.score}`, 20, 85);
    ctx.fillText(`❤️ 생명력: ${gameState.lives}`, 20, 110);

    // 타워 종류별 버튼들
    const buttonWidth = 120;
    const buttonHeight = 35;
    const startX = canvas.width - 150;
    const startY = 20;
    const spacing = 45;

    // 기본 타워 버튼 (항상 사용 가능)
    const basicTowerCost = gameState.shopItems.find(item => item.id === 'tower_discount').owned > 0 ?
        config.towerCost * 0.8 : config.towerCost;

    if (gameState.gold >= basicTowerCost) {
        drawButton('🏰 기본', startX, startY, buttonWidth, buttonHeight, '#4299e1');
    } else {
        drawButton('🏰 기본', startX, startY, buttonWidth, buttonHeight, '#a0aec0');
    }

    // 레이저 타워 버튼
    const laserItem = gameState.shopItems.find(item => item.id === 'laser');
    if (laserItem.owned > 0) {
        if (gameState.gold >= basicTowerCost) {
            drawButton('🔴 레이저', startX, startY + spacing, buttonWidth, buttonHeight, '#ff0000');
        } else {
            drawButton('🔴 레이저', startX, startY + spacing, buttonWidth, buttonHeight, '#a0aec0');
        }
    }

    // 미사일 타워 버튼
    const missileItem = gameState.shopItems.find(item => item.id === 'missile');
    if (missileItem.owned > 0) {
        if (gameState.gold >= basicTowerCost) {
            drawButton('🚀 미사일', startX, startY + spacing * 2, buttonWidth, buttonHeight, '#ff6600');
        } else {
            drawButton('🚀 미사일', startX, startY + spacing * 2, buttonWidth, buttonHeight, '#a0aec0');
        }
    }

    // 번개 타워 버튼
    const lightningItem = gameState.shopItems.find(item => item.id === 'lightning');
    if (lightningItem.owned > 0) {
        if (gameState.gold >= basicTowerCost) {
            drawButton('⚡ 번개', startX, startY + spacing * 3, buttonWidth, buttonHeight, '#ffff00');
        } else {
            drawButton('⚡ 번개', startX, startY + spacing * 3, buttonWidth, buttonHeight, '#a0aec0');
        }
    }

    // 얼음 타워 버튼
    const iceItem = gameState.shopItems.find(item => item.id === 'ice');
    if (iceItem.owned > 0) {
        if (gameState.gold >= basicTowerCost) {
            drawButton('❄️ 얼음', startX, startY + spacing * 4, buttonWidth, buttonHeight, '#00ffff');
        } else {
            drawButton('❄️ 얼음', startX, startY + spacing * 4, buttonWidth, buttonHeight, '#a0aec0');
        }
    }

    // 화염 타워 버튼
    const fireItem = gameState.shopItems.find(item => item.id === 'fire');
    if (fireItem.owned > 0) {
        if (gameState.gold >= basicTowerCost) {
            drawButton('🔥 화염', startX, startY + spacing * 5, buttonWidth, buttonHeight, '#ff4400');
        } else {
            drawButton('🔥 화염', startX, startY + spacing * 5, buttonWidth, buttonHeight, '#a0aec0');
        }
    }

    // 황금 타워 버튼
    const goldenItem = gameState.shopItems.find(item => item.id === 'golden_tower');
    if (goldenItem.owned > 0) {
        if (gameState.gold >= basicTowerCost) {
            drawButton('👑 황금', startX, startY + spacing * 6, buttonWidth, buttonHeight, '#ffd700');
        } else {
            drawButton('👑 황금', startX, startY + spacing * 6, buttonWidth, buttonHeight, '#a0aec0');
        }
    }

    // 무지개 타워 버튼
    const rainbowItem = gameState.shopItems.find(item => item.id === 'rainbow_shot');
    if (rainbowItem.owned > 0) {
        if (gameState.gold >= basicTowerCost) {
            drawButton('🌈 무지개', startX, startY + spacing * 7, buttonWidth, buttonHeight, '#ff00ff');
        } else {
            drawButton('🌈 무지개', startX, startY + spacing * 7, buttonWidth, buttonHeight, '#a0aec0');
        }
    }

    // 드래그 중인 타워 표시
    if (gameState.isDragging && gameState.dragTower) {
        let towerColor = 'rgba(66, 153, 225, 0.5)';
        let towerEmoji = '🏰';
        let rangeColor = 'rgba(66, 153, 225, 0.3)';

        switch (gameState.selectedTowerType) {
            case 'laser':
                towerColor = 'rgba(255, 0, 0, 0.5)';
                towerEmoji = '🔴';
                rangeColor = 'rgba(255, 0, 0, 0.3)';
                break;
            case 'missile':
                towerColor = 'rgba(255, 102, 0, 0.5)';
                towerEmoji = '🚀';
                rangeColor = 'rgba(255, 102, 0, 0.3)';
                break;
            case 'lightning':
                towerColor = 'rgba(255, 255, 0, 0.5)';
                towerEmoji = '⚡';
                rangeColor = 'rgba(255, 255, 0, 0.3)';
                break;
            case 'ice':
                towerColor = 'rgba(0, 255, 255, 0.5)';
                towerEmoji = '❄️';
                rangeColor = 'rgba(0, 255, 255, 0.3)';
                break;
            case 'fire':
                towerColor = 'rgba(255, 68, 0, 0.5)';
                towerEmoji = '🔥';
                rangeColor = 'rgba(255, 68, 0, 0.3)';
                break;
            case 'golden':
                towerColor = 'rgba(255, 215, 0, 0.5)';
                towerEmoji = '👑';
                rangeColor = 'rgba(255, 215, 0, 0.3)';
                break;
            case 'rainbow':
                towerColor = 'rgba(255, 0, 255, 0.5)';
                towerEmoji = '🌈';
                rangeColor = 'rgba(255, 0, 255, 0.3)';
                break;
            default:
                towerColor = 'rgba(66, 153, 225, 0.5)';
                towerEmoji = '🏰';
                rangeColor = 'rgba(66, 153, 225, 0.3)';
        }

        ctx.fillStyle = towerColor;
        ctx.fillRect(gameState.dragStartX - 15, gameState.dragStartY - 15, 30, 30);

        ctx.fillStyle = '#2d3748';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(towerEmoji, gameState.dragStartX, gameState.dragStartY + 5);

        // 범위 표시
        ctx.strokeStyle = rangeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gameState.dragStartX, gameState.dragStartY, config.towerRange, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// 홈 화면 렌더링
function renderHomeScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경
    ctx.fillStyle = '#f7fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 제목
    ctx.fillStyle = '#4a5568';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏰 타워 디펜스', canvas.width / 2, 100);

    // 스테이지 정보
    ctx.font = '24px Arial';
    ctx.fillText(`스테이지 ${gameState.stage}`, canvas.width / 2, 160);
    ctx.fillText(`보유 코인: ${gameState.coins}개`, canvas.width / 2, 200);

    // 버튼들
    drawButton('전투 시작', canvas.width / 2 - 150, 300, 120, 50, '#4299e1');
    drawButton('상점', canvas.width / 2 + 30, 300, 120, 50, '#48bb78');
}

// 상점 화면 렌더링
function renderShopScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경
    ctx.fillStyle = '#f7fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 제목
    ctx.fillStyle = '#4a5568';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🛒 상점', canvas.width / 2, 60);
    ctx.font = '20px Arial';
    ctx.fillText(`보유 코인: ${gameState.coins}개`, canvas.width / 2, 90);

    // 아이템들 (스크롤 가능한 레이아웃)
    const itemsPerRow = 3;
    const itemWidth = 240;
    const itemHeight = 100;
    const startX = 20;
    const startY = 150;
    const scrollOffset = Math.max(0, Math.min(gameState.shopScroll || 0, (gameState.shopItems.length / itemsPerRow) * (itemHeight + 20) - 400));

    // 아이템 그리기
    gameState.shopItems.forEach((item, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = startX + col * (itemWidth + 10);
        const y = startY + row * (itemHeight + 10) - scrollOffset;

        // 화면 밖에 있는 아이템은 그리지 않음
        if (y < startY - itemHeight || y > canvas.height) return;

        // 아이템 박스
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, itemWidth, itemHeight);
        ctx.strokeRect(x, y, itemWidth, itemHeight);

        // 아이템 정보
        ctx.fillStyle = '#2d3748';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(item.name, x + 10, y + 25);

        ctx.font = '12px Arial';
        ctx.fillStyle = '#718096';
        ctx.fillText(item.effect, x + 10, y + 45);
        ctx.fillText(`보유: ${item.owned}개`, x + 10, y + 60);

        // 가격
        ctx.fillStyle = '#f6ad55';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${item.cost} 코인`, x + itemWidth - 10, y + 25);

        // 구매 버튼
        const canAfford = gameState.coins >= item.cost;
        drawButton('구매', x + itemWidth - 60, y + itemHeight - 25, 50, 20, canAfford ? '#4299e1' : '#a0aec0');
    });

    // 스크롤 버튼들
    if (scrollOffset > 0) {
        drawButton('▲', canvas.width - 50, 150, 40, 30, '#4299e1');
    }
    if (scrollOffset < (gameState.shopItems.length / itemsPerRow) * (itemHeight + 20) - 400) {
        drawButton('▼', canvas.width - 50, canvas.height - 80, 40, 30, '#4299e1');
    }

    // 뒤로가기 버튼
    drawButton('뒤로가기', 50, 50, 100, 40, '#e53e3e');
}

// 버튼 그리기
function drawButton(text, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + width / 2, y + height / 2 + 5);
}

// UI 업데이트
function updateUI() {
    if (gameState.currentScreen === 'game') {
        document.getElementById('gold').textContent = gameState.gold;
        document.getElementById('lives').textContent = gameState.lives;
        document.getElementById('score').textContent = gameState.score;
        document.getElementById('wave').textContent = gameState.wave;
    }
}

// 게임 루프
function gameLoop(currentTime) {
    if (gameState.currentScreen === 'game') {
        updateGame(currentTime);
        renderGame();
    } else if (gameState.currentScreen === 'home') {
        renderHomeScreen();
    } else if (gameState.currentScreen === 'shop') {
        renderShopScreen();
    }
    requestAnimationFrame(gameLoop);
}

// 마우스 이벤트
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 캔버스 스케일 고려한 좌표 변환 (모바일 대응)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    if (gameState.currentScreen === 'home') {
        // 전투 시작 버튼
        if (canvasX > canvas.width / 2 - 150 && canvasX < canvas.width / 2 - 30 && canvasY > 300 && canvasY < 350) {
            gameState.currentScreen = 'game';
            initGame();
            gameState.isRunning = true;
            createWave();
        }
        // 상점 버튼
        else if (canvasX > canvas.width / 2 + 30 && canvasX < canvas.width / 2 + 150 && canvasY > 300 && canvasY < 350) {
            gameState.currentScreen = 'shop';
        }
    }
    else if (gameState.currentScreen === 'shop') {
        // 뒤로가기 버튼
        if (canvasX > 50 && canvasX < 150 && canvasY > 50 && canvasY < 90) {
            gameState.currentScreen = 'home';
        }

        // 스크롤 버튼들
        if (x > canvas.width - 50 && x < canvas.width - 10) {
            if (y > 150 && y < 180) { // 위로 스크롤
                gameState.shopScroll = Math.max(0, (gameState.shopScroll || 0) - 50);
            } else if (y > canvas.height - 80 && y < canvas.height - 50) { // 아래로 스크롤
                gameState.shopScroll = Math.min((gameState.shopItems.length / 3) * 110 - 400, (gameState.shopScroll || 0) + 50);
            }
        }

        // 아이템 구매
        const itemsPerRow = 3;
        const itemWidth = 240;
        const itemHeight = 100;
        const startX = 20;
        const startY = 150;
        const scrollOffset = Math.max(0, Math.min(gameState.shopScroll || 0, (gameState.shopItems.length / itemsPerRow) * (itemHeight + 20) - 400));

        gameState.shopItems.forEach((item, index) => {
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const itemX = startX + col * (itemWidth + 10);
            const itemY = startY + row * (itemHeight + 10) - scrollOffset;

            // 화면 밖에 있는 아이템은 클릭 불가
            if (itemY < startY - itemHeight || itemY > canvas.height) return;

            // 구매 버튼 클릭
            if (x > itemX + itemWidth - 60 && x < itemX + itemWidth - 10 &&
                y > itemY + itemHeight - 25 && y < itemY + itemHeight - 5) {
                if (gameState.coins >= item.cost) {
                    gameState.coins -= item.cost;
                    item.owned++;
                    alert(`${item.name} 구매 완료!\n효과: ${item.effect}`);
                } else {
                    alert('코인이 부족합니다!');
                }
            }
        });

        // 마우스 이동 이벤트 (드래그 중 타워 위치 업데이트)
        canvas.addEventListener('mousemove', (e) => {
            if (gameState.isDragging && gameState.dragTower) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                gameState.dragStartX = x;
                gameState.dragStartY = y;
            }
        });

        // 마우스 우클릭 이벤트 (드래그 취소)
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (gameState.isDragging && gameState.dragTower) {
                const towerCost = gameState.shopItems.find(item => item.id === 'tower_discount').owned > 0 ?
                    config.towerCost * 0.8 : config.towerCost;
                gameState.gold += towerCost;
                gameState.isDragging = false;
                gameState.dragTower = null;
                gameState.selectedTowerType = 'basic';
                updateUI();
            }
        });
    }
    else if (gameState.currentScreen === 'game' && gameState.isRunning && !gameState.isPaused) {
        // 타워 버튼들 클릭 처리
        const buttonWidth = 120;
        const buttonHeight = 35;
        const startX = canvas.width - 150;
        const startY = 20;
        const spacing = 45;
        const basicTowerCost = gameState.shopItems.find(item => item.id === 'tower_discount').owned > 0 ?
            config.towerCost * 0.8 : config.towerCost;

        // 기본 타워 버튼
        if (x > startX && x < startX + buttonWidth && y > startY && y < startY + buttonHeight) {
            if (gameState.gold >= basicTowerCost) {
                gameState.selectedTowerType = 'basic';
                gameState.isDragging = true;
                gameState.dragTower = { x: x, y: y };
                gameState.dragStartX = x;
                gameState.dragStartY = y;
                gameState.gold -= basicTowerCost;
                updateUI();
            }
        }
        // 레이저 타워 버튼
        else if (x > startX && x < startX + buttonWidth && y > startY + spacing && y < startY + spacing + buttonHeight) {
            const laserItem = gameState.shopItems.find(item => item.id === 'laser');
            if (laserItem.owned > 0 && gameState.gold >= basicTowerCost) {
                gameState.selectedTowerType = 'laser';
                gameState.isDragging = true;
                gameState.dragTower = { x: x, y: y };
                gameState.dragStartX = x;
                gameState.dragStartY = y;
                gameState.gold -= basicTowerCost;
                updateUI();
            }
        }
        // 미사일 타워 버튼
        else if (x > startX && x < startX + buttonWidth && y > startY + spacing * 2 && y < startY + spacing * 2 + buttonHeight) {
            const missileItem = gameState.shopItems.find(item => item.id === 'missile');
            if (missileItem.owned > 0 && gameState.gold >= basicTowerCost) {
                gameState.selectedTowerType = 'missile';
                gameState.isDragging = true;
                gameState.dragTower = { x: x, y: y };
                gameState.dragStartX = x;
                gameState.dragStartY = y;
                gameState.gold -= basicTowerCost;
                updateUI();
            }
        }
        // 번개 타워 버튼
        else if (x > startX && x < startX + buttonWidth && y > startY + spacing * 3 && y < startY + spacing * 3 + buttonHeight) {
            const lightningItem = gameState.shopItems.find(item => item.id === 'lightning');
            if (lightningItem.owned > 0 && gameState.gold >= basicTowerCost) {
                gameState.selectedTowerType = 'lightning';
                gameState.isDragging = true;
                gameState.dragTower = { x: x, y: y };
                gameState.dragStartX = x;
                gameState.dragStartY = y;
                gameState.gold -= basicTowerCost;
                updateUI();
            }
        }
        // 얼음 타워 버튼
        else if (x > startX && x < startX + buttonWidth && y > startY + spacing * 4 && y < startY + spacing * 4 + buttonHeight) {
            const iceItem = gameState.shopItems.find(item => item.id === 'ice');
            if (iceItem.owned > 0 && gameState.gold >= basicTowerCost) {
                gameState.selectedTowerType = 'ice';
                gameState.isDragging = true;
                gameState.dragTower = { x: x, y: y };
                gameState.dragStartX = x;
                gameState.dragStartY = y;
                gameState.gold -= basicTowerCost;
                updateUI();
            }
        }
        // 화염 타워 버튼
        else if (x > startX && x < startX + buttonWidth && y > startY + spacing * 5 && y < startY + spacing * 5 + buttonHeight) {
            const fireItem = gameState.shopItems.find(item => item.id === 'fire');
            if (fireItem.owned > 0 && gameState.gold >= basicTowerCost) {
                gameState.selectedTowerType = 'fire';
                gameState.isDragging = true;
                gameState.dragTower = { x: x, y: y };
                gameState.dragStartX = x;
                gameState.dragStartY = y;
                gameState.gold -= basicTowerCost;
                updateUI();
            }
        }
        // 황금 타워 버튼
        else if (x > startX && x < startX + buttonWidth && y > startY + spacing * 6 && y < startY + spacing * 6 + buttonHeight) {
            const goldenItem = gameState.shopItems.find(item => item.id === 'golden_tower');
            if (goldenItem.owned > 0 && gameState.gold >= basicTowerCost) {
                gameState.selectedTowerType = 'golden';
                gameState.isDragging = true;
                gameState.dragTower = { x: x, y: y };
                gameState.dragStartX = x;
                gameState.dragStartY = y;
                gameState.gold -= basicTowerCost;
                updateUI();
            }
        }
        // 무지개 타워 버튼
        else if (x > startX && x < startX + buttonWidth && y > startY + spacing * 7 && y < startY + spacing * 7 + buttonHeight) {
            const rainbowItem = gameState.shopItems.find(item => item.id === 'rainbow_shot');
            if (rainbowItem.owned > 0 && gameState.gold >= basicTowerCost) {
                gameState.selectedTowerType = 'rainbow';
                gameState.isDragging = true;
                gameState.dragTower = { x: x, y: y };
                gameState.dragStartX = x;
                gameState.dragStartY = y;
                gameState.gold -= basicTowerCost;
                updateUI();
            }
        }
        // 드래그 중인 타워 놓기
        else if (gameState.isDragging && gameState.dragTower) {
            const gridX = Math.floor(x / config.gridSize) * config.gridSize + config.gridSize / 2;
            const gridY = Math.floor(y / config.gridSize) * config.gridSize + config.gridSize / 2;

            let onPath = false;
            for (let i = 0; i < path.length - 1; i++) {
                const p1 = path[i];
                const p2 = path[i + 1];
                const distance = distanceToLine(gridX, gridY, p1.x, p1.y, p2.x, p2.y);
                if (distance < 30) {
                    onPath = true;
                    break;
                }
            }

            if (!onPath) {
                let canPlace = true;
                for (let tower of gameState.towers) {
                    const distance = Math.sqrt(
                        Math.pow(gridX - tower.x, 2) + Math.pow(gridY - tower.y, 2)
                    );
                    if (distance < config.gridSize) {
                        canPlace = false;
                        break;
                    }
                }

                if (canPlace) {
                    // 선택된 타워 타입으로 타워 생성
                    const tower = new Tower(gridX, gridY);
                    tower.towerType = gameState.selectedTowerType; // 강제로 타워 타입 설정
                    gameState.towers.push(tower);
                    gameState.isDragging = false;
                    gameState.dragTower = null;
                    updateUI();
                } else {
                    // 타워를 놓을 수 없는 위치면 골드 환불
                    const towerCost = gameState.shopItems.find(item => item.id === 'tower_discount').owned > 0 ?
                        config.towerCost * 0.8 : config.towerCost;
                    gameState.gold += towerCost;
                    gameState.isDragging = false;
                    gameState.dragTower = null;
                    updateUI();
                }
            } else {
                // 경로 위에 놓으려고 하면 골드 환불
                const towerCost = gameState.shopItems.find(item => item.id === 'tower_discount').owned > 0 ?
                    config.towerCost * 0.8 : config.towerCost;
                gameState.gold += towerCost;
                gameState.isDragging = false;
                gameState.dragTower = null;
                updateUI();
            }
        }
    }
});

// 선과 점 사이의 거리 계산
function distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// 버튼 이벤트
document.getElementById('startBtn').addEventListener('click', () => {
    if (gameState.currentScreen === 'game' && !gameState.isRunning) {
        gameState.isRunning = true;
        gameState.isPaused = false;
        createWave();
        gameState.waveTimer = 0;
    }
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    if (gameState.currentScreen === 'game' && gameState.isRunning) {
        gameState.isPaused = !gameState.isPaused;
        document.getElementById('pauseBtn').textContent =
            gameState.isPaused ? '계속하기' : '일시정지';
    }
});

document.getElementById('restartBtn').addEventListener('click', () => {
    if (gameState.currentScreen === 'game') {
        initGame();
        gameState.isRunning = false;
        gameState.isPaused = false;
        document.getElementById('pauseBtn').textContent = '일시정지';
    }
});

// 게임 초기화 및 시작
gameState.currentScreen = 'home';
gameLoop(0); 
