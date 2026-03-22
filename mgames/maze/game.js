// ═══════════════════════════════════════════════════
// 🐭 생쥐의 점프 어드벤처 - game.js (v2)
// ═══════════════════════════════════════════════════

// ── ITEM DEFINITIONS ────────────────────────────────
const CONSUMABLE_DEFS = [
    { id: 'star', emoji: '🌟', name: '무적 별', desc: '시작 3초 무적', price: 90 },
    { id: 'revive', emoji: '🪄', name: '부활 부적', desc: '1회 부활', price: 150 },
    { id: 'clover', emoji: '🍀', name: '행운의 클로버', desc: '치즈 2배', price: 50 },
    { id: 'mushroom', emoji: '🍄', name: '버섯', desc: '치즈 생성 증가', price: 65 },
];
const SKILL_DEFS = [
    { id: 'shield', emoji: '🛡️', name: '방패', desc: '가시 피해 1회 무시', price: 80 },
    { id: 'extraHeart', emoji: '❤️', name: '여분의 하트', desc: '시작 하트 +1', price: 100 },
    { id: 'jumpBooster', emoji: '🚀', name: '점프 부스터', desc: '점프력 +25%', price: 60 },
    { id: 'cheeseMagnet', emoji: '🧲', name: '치즈 자석', desc: '치즈 수집 범위 확대', price: 70 },
    { id: 'speedShoes', emoji: '👟', name: '스피드 신발', desc: '이동속도 +30%', price: 55 },
    { id: 'doubleJump', emoji: '🌀', name: '이중 점프', desc: '공중 추가 점프', price: 120 },
    { id: 'cheeseRadar', emoji: '🧀', name: '치즈 감지기', desc: '치즈 위치 표시', price: 40 },
    { id: 'catBell', emoji: '🐾', name: '고양이 방울', desc: '고양이 접근 경고', price: 45 },
    { id: 'dash', emoji: '💨', name: '대시', desc: 'S키로 순간이동', price: 85 },
    { id: 'wizardHat', emoji: '🎩', name: '마법사 모자', desc: '가시 피해 50% 무시', price: 110 },
    { id: 'slowClock', emoji: '⏱️', name: '슬로우 시계', desc: '고양이 속도 -50%', price: 95 },
];

// ── CONSTANTS ────────────────────────────────────────
const GRAV = 0.55;
const PW = 30, PH = 28;      // 생쥐 크기 (더 축소)
const CW = 76, CH = 65;      // 고양이 크기 (확대)
const CHW = 30, CHH = 28;      // 치즈
const SPW = 24, SPH = 18;      // 가시
const PLH = 26, PLD = 20;      // 플랫폼 높이, 깊이
const INV_DUR = 100;
const BLINK_DUR = 42;

// ── GLOBAL STATE ─────────────────────────────────────
let canvas, ctx, W, H;
let GST = 'home'; // game state
let currentLevel = 1;
let hearts = 3;
let levelCoins = 0, sessionCoins = 0;

let save = { coins: 0, bestLevel: 0, skills: {}, inventory: {} };

const player = {
    x: 0, y: 0, vx: 0, vy: 0,
    onGround: false, facing: 1,
    animT: 0,
    invTimer: 0, blinkTimer: 0,
    deathState: 0, deathTimer: 0,
    djUsed: false, dashCD: 0,
    shieldHP: 0, reviveReady: false,
    conEffect: null, conTimer: 0,
    cheeseMult: 1,
};

let platforms = [], cats = [], spikes = [], cheeses = [], particles = [];
let flag = null, levelH = 0, cameraY = 0;

const keys = {};
let shopTab = 'consumable', selectedCon = null;
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);

// ── INIT ─────────────────────────────────────────────
window.addEventListener('load', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    loadSave();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', e => { delete keys[e.code]; });
    
    if (isTouchDevice) {
        const mc = document.getElementById('mobileControls');
        if (mc) mc.style.display = 'flex';
        setupMobileControls();
    }
    
    showScreen('home');
    requestAnimationFrame(mainLoop);
});

function setupMobileControls() {
    const bindBtn = (id, key, actionFn) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const press = (e) => {
            if (e.cancelable) e.preventDefault();
            keys[key] = true;
            if (actionFn && GST === 'game') actionFn();
        };
        const release = (e) => {
            if (e.cancelable) e.preventDefault();
            delete keys[key];
        };
        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
    };
    bindBtn('btnLeft', 'ArrowLeft');
    bindBtn('btnRight', 'ArrowRight');
    bindBtn('btnJump', 'Space', doJump);
    bindBtn('btnDash', 'KeyS', doDash);
}

function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}

// ── SAVE ─────────────────────────────────────────────
function loadSave() {
    try { 
        const d = JSON.parse(localStorage.getItem('mjump2')); 
        if (d) Object.assign(save, d); 
        if (isNaN(save.coins) || save.coins == null) save.coins = 0;
    } catch (e) { }
}
function writeSave() { localStorage.setItem('mjump2', JSON.stringify(save)); }

// ── SCREENS ──────────────────────────────────────────
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const map = {
        home: 'homeScreen', shop: 'shopScreen', preGame: 'preGameScreen',
        game: 'gameScreen', levelClear: 'levelClearScreen', gameOver: 'gameOverScreen'
    };
    const el = document.getElementById(map[name] || name + 'Screen');
    if (el) el.classList.add('active');
    GST = name;
    if (name === 'home') setupHome();
    if (name === 'shop') buildShop();
    if (name === 'preGame') buildPreGame();
}
function navigateToPreGame() { showScreen('preGame'); }

function setupHome() {
    const c = document.getElementById('homeCoinCount'); if (c) c.textContent = save.coins;
    const b = document.getElementById('bestScoreDisplay'); if (b) b.textContent = '최고 레벨: ' + (save.bestLevel || 0);
}

// ── INPUT ────────────────────────────────────────────
function onKeyDown(e) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (keys[e.code]) return;
    keys[e.code] = true;
    if (GST !== 'game') return;
    if (e.code === 'Space' || e.code === 'ArrowUp') doJump();
    if (e.code === 'KeyS' || e.code === 'ShiftLeft') doDash();
}

function doJump() {
    if (player.deathState) return;
    if (player.onGround) {
        // 점프력 하향 조정 (발판에는 충분히 여유있게 닿음)
        player.vy = -(13.5 * (save.skills.jumpBooster ? 1.25 : 1));
        player.onGround = false;
    } else if (save.skills.doubleJump && !player.djUsed) {
        player.vy = -(12.0 * (save.skills.jumpBooster ? 1.25 : 1));
        player.djUsed = true;
    }
}
function doDash() {
    if (!save.skills.dash || player.dashCD > 0 || player.deathState) return;
    player.vx = player.facing * 20;
    player.dashCD = 65;
    spawnPfx(player.x + PW / 2, player.y + PH / 2, '#a78bfa', 8);
}

// ── SHOP ─────────────────────────────────────────────
function switchShopTab(tab) {
    shopTab = tab;
    document.getElementById('tabConsumable').classList.toggle('active', tab === 'consumable');
    document.getElementById('tabSkill').classList.toggle('active', tab === 'skill');
    buildShop();
}
function buildShop() {
    const el = document.getElementById('shopCoinCount'); if (el) el.textContent = save.coins;
    const grid = document.getElementById('shopGrid'); if (!grid) return;
    grid.innerHTML = '';
    const list = shopTab === 'consumable' ? CONSUMABLE_DEFS : SKILL_DEFS;
    list.forEach(item => {
        const isSkill = shopTab === 'skill';
        const owned = isSkill ? !!save.skills[item.id] : (save.inventory[item.id] || 0);
        const canBuy = save.coins >= item.price;
        const div = document.createElement('div');
        div.className = 'shop-item' + (isSkill && owned ? ' owned' : '');
        const badge = (!isSkill && owned > 0) ? `<div class="shop-count">×${owned}</div>` : '';
        const btn = isSkill && owned
            ? `<div class="shop-equipped-badge">✓ 장착됨</div>`
            : `<button class="shop-buy-btn" ${!canBuy ? 'disabled' : ''} onclick="buyItem('${item.id}','${shopTab}')">🪙 ${item.price}</button>`;
        div.innerHTML = `${badge}<div class="shop-emoji">${item.emoji}</div>
      <div class="shop-name">${item.name}</div>
      <div class="shop-desc">${item.desc}</div>${btn}`;
        grid.appendChild(div);
    });
}
function buyItem(id, type) {
    const def = (type === 'consumable' ? CONSUMABLE_DEFS : SKILL_DEFS).find(d => d.id === id);
    if (!def || save.coins < def.price) return;
    save.coins -= def.price;
    if (type === 'skill') save.skills[id] = true;
    else save.inventory[id] = (save.inventory[id] || 0) + 1;
    writeSave(); buildShop(); setupHome();
}

// ── PRE-GAME ─────────────────────────────────────────
function buildPreGame() {
    document.getElementById('pregameLevel').textContent = currentLevel;
    selectedCon = null;
    const box = document.getElementById('pregameItems');
    box.innerHTML = '';
    const none = document.createElement('div');
    none.className = 'pregame-item selected'; none.id = 'con-none';
    none.innerHTML = '<div class="pi-emoji">🚫</div><div class="pi-name">없음</div>';
    none.onclick = () => selectCon(null);
    box.appendChild(none);
    CONSUMABLE_DEFS.forEach(item => {
        const cnt = save.inventory[item.id] || 0;
        const div = document.createElement('div');
        div.className = 'pregame-item' + (cnt === 0 ? ' empty' : '');
        div.id = 'con-' + item.id;
        div.innerHTML = `<div class="pi-emoji">${item.emoji}</div><div class="pi-name">${item.name}</div><div class="pi-count">×${cnt}</div>`;
        div.onclick = () => { if (cnt > 0) selectCon(item.id); };
        box.appendChild(div);
    });
    const eqList = document.getElementById('equippedList');
    const equipped = SKILL_DEFS.filter(s => save.skills[s.id]);
    eqList.innerHTML = equipped.length ? '' : '<span style="color:var(--muted);font-size:13px">장착된 스킬 없음</span>';
    equipped.forEach(s => { const b = document.createElement('div'); b.className = 'eq-badge'; b.textContent = s.emoji + ' ' + s.name; eqList.appendChild(b); });
}
function selectCon(id) {
    selectedCon = id;
    document.querySelectorAll('.pregame-item').forEach(e => e.classList.remove('selected'));
    const el = document.getElementById(id ? 'con-' + id : 'con-none'); if (el) el.classList.add('selected');
}

// ── LEVEL GENERATION ─────────────────────────────────
function genLevel(lvl) {
    platforms = []; cats = []; spikes = []; cheeses = []; particles = [];
    flag = null;
    levelH = 2200 + lvl * 150; // 맵 전체 높이(상하 간격) 대폭 증가!
    const safeW = 240; // 첫 플랫폼 넒게
    // 시작 플랫폼
    platforms.push({ x: W / 2 - safeW / 2, y: levelH - 60, w: safeW, safe: true, goal: false });

    // 맵 높이가 줄어든 것에 비해 발판 개수는 늘려, 세로 거리를 완전 가깝게!
    const count = 15 + lvl * 2;
    const topY = 200, botY = levelH - 200; // 시작 발판과 가까워지도록 botY 조절
    const span = botY - topY;
    
    let currentX = W / 2;
    let flowDir = (Math.random() < 0.5) ? 1 : -1;

    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const baseY = botY - t * span;

        const isRest = (i % 5 === 4);
        // 가로 길이 대폭 증가
        let pw = isRest ? Math.min(W * 0.55, 320) : Math.max(140, 260 - lvl * 2 - Math.random() * 40);
        let px;

        // 자연스럽게 한 방향(flowDir)으로 진행하며 맵 가장자리에서 튕기는 로직 (지그재그 최소화)
        let jumpDist = 80 + Math.random() * 90;
        
        // 가끔 중앙부근에서 자연스럽게 방향 전환 (15% 확률)
        if (Math.random() < 0.15) flowDir *= -1;
        
        currentX += flowDir * jumpDist;

        // 화면 밖으로 나가지 않도록 경계 반전 처리
        const margin = 30;
        if (currentX < margin + pw / 2) {
            currentX = margin + pw / 2 + Math.random() * 40;
            flowDir = 1;
        } else if (currentX > W - margin - pw / 2) {
            currentX = W - margin - pw / 2 - Math.random() * 40;
            flowDir = -1;
        }

        px = currentX - pw / 2;

        // 세로 위치는 일정 간격(baseY)을 유지하면서 아주 작은 오차만 주어 훨씬 "똑바르게" 배열됨
        const py = Math.max(topY + 30, Math.min(botY - 20, baseY + (Math.random() - 0.5) * 12));

        platforms.push({ x: px, y: py, w: pw, safe: false, goal: false, isRest });

        // 치즈 (풍부하게)
        let chProb = 0.8;
        const usingMushroom = (selectedCon === 'mushroom' && save.inventory['mushroom'] > 0);
        if (usingMushroom) chProb = 1.0; // 버섯 효과
        if (Math.random() < chProb) {
            let nc = isRest ? 2 + Math.floor(Math.random() * 2) : 1;
            if (usingMushroom) nc += 1 + Math.floor(Math.random() * 2); // 추가 생성
            for (let c = 0; c < nc; c++) {
                const cx = px + 16 + Math.random() * Math.max(1, pw - 32);
                cheeses.push({ x: cx, y: py - CHH - 3, t: Math.random() * 6.28, collected: false });
            }
        }

        // 장애물: level1부터 무작위 종류로 생성
        if (lvl >= 1 && !isRest && pw > 90 && Math.random() < Math.min(0.20 + lvl * 0.05, 0.50)) {
            const obw = SPW + Math.random() * 20; // 가로 길이를 약간 다양하게
            const sx = px + 20 + Math.random() * (pw - obw - 40);
            spikes.push({ 
                x: sx, y: py - SPH - 2, 
                w: obw, h: SPH,
                type: Math.floor(Math.random() * 3) // 0: 가시, 1: 불꽃, 2: 독늪
            });
        }

        // 고양이: 다양한 색상 및 생김새 추가
        if (lvl >= 1 && pw >= 110 && Math.random() < Math.min(0.20 + lvl * 0.05, 0.45)) {
            const spd = (0.6 + lvl * 0.07) * (save.skills.slowClock ? 0.5 : 1);
            cats.push({
                x: px + 12, y: py - CH,
                vx: spd, minX: px + 6, maxX: px + pw - CW - 6,
                animT: 0, stunned: false, stunTimer: 0, facing: 1,
                colorType: Math.floor(Math.random() * 6),
                accessory: Math.floor(Math.random() * 4), // 0:화난눈썹, 1:선글라스, 2:왕관, 3:볼터치
            });
        }
    }

    // 골 플랫폼 및 깃발
    // 마지막 일반 발판과 너무 멀어지지 않도록, 마지막 발판의 x좌표 부근에 배치
    const lastP = platforms[platforms.length - 1];
    let goalX = lastP.x + lastP.w / 2 - 100;
    goalX = Math.max(20, Math.min(W - 220, goalX)); // 화면 안쪽으로 좌표 제한

    platforms.push({ x: goalX, y: topY - 20, w: 200, safe: true, goal: true });
    flag = { x: goalX + 86, y: topY - 80, anim: 0 }; // 깃발은 골 발판의 중앙 부근에 배치

    // 플레이어 시작
    const sp = platforms[0];
    player.x = sp.x + sp.w / 2 - PW / 2; player.y = sp.y - PH - 2;
    player.vx = 0; player.vy = 0; player.onGround = false;
    player.djUsed = false; player.dashCD = 0;
    player.deathState = 0; player.deathTimer = 0;
    player.invTimer = 0; player.blinkTimer = 0;
    player.shieldHP = save.skills.shield ? 1 : 0;
    player.reviveReady = false;
    player.conEffect = null; player.conTimer = 0; player.cheeseMult = 1;
    player.killedByCat = false; player.catHitFacing = 1;
    cameraY = player.y - H * 0.75;   // 플레이어를 화면 하단에 위치
}

// ── GAME START ────────────────────────────────────────
function startGame() {
    levelCoins = 0;
    genLevel(currentLevel);
    // 소모품 적용
    if (selectedCon && (save.inventory[selectedCon] || 0) > 0) {
        save.inventory[selectedCon]--;
        writeSave();
        applyConsumable(selectedCon);
    }
    buildHUD();
    showScreen('game');
}

function applyConsumable(id) {
    switch (id) {
        case 'star': player.invTimer = 200; break;
        case 'revive': player.reviveReady = true; break;
        case 'clover': player.cheeseMult = 2; break;
        case 'mushroom': player.conEffect = 'mushroom'; player.conTimer = 99999; break; // 레벨 전체 유지
    }
}

function addHeart() {
    const max = 3 + (save.skills.extraHeart ? 1 : 0);
    if (hearts < max) { hearts++; updateHudHearts(); }
}

// ── HUD ──────────────────────────────────────────────
function buildHUD() {
    const max = 3 + (save.skills.extraHeart ? 1 : 0);
    hearts = max;
    updateHudHearts();
    const lv = document.getElementById('hudLevel'); if (lv) lv.textContent = currentLevel;
    const co = document.getElementById('hudCoins'); if (co) co.textContent = save.coins;
    // Skills
    const sk = document.getElementById('hudSkills'); if (sk) {
        sk.innerHTML = '';
        SKILL_DEFS.filter(s => save.skills[s.id]).forEach(s => {
            const d = document.createElement('div'); d.className = 'skill-hud active';
            d.id = 'hud-skill-' + s.id; d.innerHTML = s.emoji + ' ' + s.name; sk.appendChild(d);
        });
    }
    // Consumable HUD
    const ch = document.getElementById('hudConsumable'); if (ch) {
        ch.innerHTML = '';
        if (selectedCon) {
            const def = CONSUMABLE_DEFS.find(c => c.id === selectedCon);
            if (def) { const d = document.createElement('div'); d.className = 'con-hud'; d.innerHTML = def.emoji + ' ' + def.name + ' <span class="con-hud-key">자동</span>'; ch.appendChild(d); }
        }
    }
    
    // Mobile Dash Button
    const dashBtn = document.getElementById('btnDash');
    if (dashBtn && isTouchDevice) {
        dashBtn.style.display = save.skills.dash ? 'flex' : 'none';
    }
}
function updateHudHearts() {
    const max = 3 + (save.skills.extraHeart ? 1 : 0);
    const el = document.getElementById('hudHearts'); if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < max; i++) {
        const s = document.createElement('span');
        s.className = 'heart-icon' + (i >= hearts ? ' heart-empty' : '');
        s.textContent = '❤️'; el.appendChild(s);
    }
}
function updateHudCoins() {
    const el = document.getElementById('hudCoins'); if (el) el.textContent = save.coins;
}

// ── COLLISION ─────────────────────────────────────────
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resolveGround(dt = 1) {
    player.onGround = false;
    for (const p of platforms) {
        if (player.x + PW > p.x && player.x < p.x + p.w) {
            // 착지 검사 (위에서 아래로 떨어질 때만 작동하는 통과형 발판)
            const prevBottom = player.y + PH - player.vy * (dt || 1);
            if (player.vy >= 0 && prevBottom <= p.y + 4 && player.y + PH >= p.y && player.y + PH <= p.y + PLH + 4) {
                player.y = p.y - PH; player.vy = 0; player.onGround = true; player.djUsed = false;
                break;
            }
        }
    }
}

// ── DAMAGE ───────────────────────────────────────────
function damage() {
    if (player.invTimer > 0 || player.deathState) return;
    hearts--;
    updateHudHearts();
    if (hearts <= 0) {
        if (player.reviveReady) { player.reviveReady = false; hearts = 1; updateHudHearts(); player.invTimer = 180; return; }
        killPlayer(); return;
    }
    player.invTimer = INV_DUR;
    player.blinkTimer = BLINK_DUR;
    spawnPfx(player.x + PW / 2 - cameraY, player.y + PH / 2, '#ff4444', 10);
}

function killPlayer() {
    player.deathState = 1; player.vy = -11; player.vx = 0; player.deathTimer = 0;
    spawnPfx(player.x + PW / 2, player.y + PH / 2, '#ff2244', 20);
}

// ── PARTICLES (world coords) ──────────────────────────
function spawnPfx(wx, wy, col, n) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4;
        particles.push({ wx, wy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, col, life: 50 + Math.random() * 20, maxLife: 70, r: 4 + Math.random() * 3 });
    }
}

// ── MAIN LOOP ─────────────────────────────────────────
let lastTS = 0;
function mainLoop(ts) {
    requestAnimationFrame(mainLoop);
    const dt = Math.min((ts - lastTS) / 16.67, 3); lastTS = ts;
    if (GST === 'game') update(dt);
    draw();
}

// ── UPDATE ────────────────────────────────────────────
function update(dt) {
    // 소모품 타이머
    if (player.conTimer > 0) { player.conTimer -= dt; if (player.conTimer <= 0) player.conEffect = null; }

    // 사망 애니메이션
    if (player.deathState >= 1) {
        player.deathTimer += dt;
        player.x += player.vx * dt; player.y += player.vy * dt; player.vy += GRAV * dt;
        for (const p of particles) { p.wx += p.vx * dt; p.wy += p.vy * dt; p.vy += 0.2 * dt; p.life -= dt; }
        particles = particles.filter(p => p.life > 0);
        if (player.deathState === 1 && player.deathTimer > 80) {
            player.deathState = 2; // 중복 호출 방지
            doGameOver();
        }
        return;
    }

    // 무적/깜빡임
    if (player.invTimer > 0) player.invTimer -= dt;
    if (player.blinkTimer > 0) player.blinkTimer -= dt;
    if (player.dashCD > 0) player.dashCD -= dt;

    // 이동속도 상향 (5.8 -> 6.5)
    const spd = (save.skills.speedShoes ? 1.3 : 1) * 6.5;
    if (keys['ArrowLeft']) { player.vx -= 1.8 * dt; player.facing = -1; }
    if (keys['ArrowRight']) { player.vx += 1.8 * dt; player.facing = 1; }
    player.vx *= 0.80; player.vx = Math.max(-spd, Math.min(spd, player.vx));
    player.vy += GRAV * dt; player.vy = Math.min(player.vy, 18);
    player.x += player.vx * dt; player.y += player.vy * dt;

    // 벽 통과
    if (player.x + PW < 0) player.x = W;
    if (player.x > W) player.x = -PW;

    resolveGround(dt);

    // 바닥 추락
    if (player.y > levelH + 200) { damage(); if (player.deathState === 0) respawn(); }

    // 치즈 수집
    const magnetRange = save.skills.cheeseMagnet ? 80 : 0;
    cheeses.forEach(c => {
        const cx = c.x + CHW / 2;
        const cy = c.y + CHH / 2;
        const px = player.x + PW / 2;
        const py = player.y + PH / 2;
        const dist = Math.hypot(cx - px, cy - py);
        
        if (!c.collected && (aabb(player.x, player.y, PW, PH, c.x, c.y, CHW, CHH) || dist < magnetRange)) {
            c.collected = true;
            levelCoins += player.cheeseMult;
            save.coins += player.cheeseMult;
            sessionCoins += player.cheeseMult;
            writeSave();
            spawnPfx(c.x + CHW / 2, c.y, '#ffd700', 6);
            updateHudCoins();
        }
    });

    // 고양이 충돌
    if (player.invTimer <= 0) {
        for (const c of cats) {
            if (!c.stunned && aabb(player.x, player.y, PW, PH, c.x, c.y, CW, CH)) { 
                if (player.reviveReady) {
                    player.reviveReady = false;
                    hearts = Math.max(1, hearts);
                    updateHudHearts();
                    player.invTimer = 180;
                    spawnPfx(player.x + PW / 2 - cameraY, player.y + PH / 2, '#a78bfa', 15);
                } else {
                    player.killedByCat = true;
                    player.catHitFacing = c.facing;
                    killPlayer(); 
                }
                break; 
            }
        }
    }

    // 가시 충돌 (발 부분만)
    if (player.invTimer <= 0) {
        for (const s of spikes) {
            if (aabb(player.x + 4, player.y + PH - 10, PW - 8, 12, s.x, s.y, s.w, s.h)) {
                if (save.skills.shield && player.shieldHP > 0) { player.shieldHP--; player.invTimer = 60; }
                else if (save.skills.wizardHat && Math.random() < 0.5) { player.invTimer = 40; }
                else damage();
                break;
            }
        }
    }

    // 깃발
    if (flag && aabb(player.x, player.y, PW, PH, flag.x, flag.y, 28, 60)) { doClear(); return; }

    // 고양이 이동
    const slow = player.conEffect === 'slow';
    cats.forEach(c => {
        if (c.stunned) { c.stunTimer -= dt; if (c.stunTimer <= 0) c.stunned = false; return; }
        c.animT += dt * (slow ? 0.3 : 1);
        c.x += c.vx * dt * (slow ? 0.3 : 1);
        if (c.x <= c.minX) { c.x = c.minX; c.vx = Math.abs(c.vx); c.facing = 1; }
        if (c.x >= c.maxX) { c.x = c.maxX; c.vx = -Math.abs(c.vx); c.facing = -1; }
    });

    // 고양이 방울 경고
    if (save.skills.catBell) {
        const near = cats.some(c => !c.stunned && Math.hypot(c.x - player.x, c.y - player.y) < 130);
        const bd = document.getElementById('hud-skill-catBell');
        if (bd) { bd.style.background = near ? 'rgba(239,68,68,.4)' : ''; bd.style.borderColor = near ? '#ef4444' : ''; }
    }

    // 애니메이션
    cheeses.forEach(c => { if (!c.collected) c.t += 0.05 * dt; });
    if (flag) flag.anim += 0.05 * dt;
    player.animT += (Math.abs(player.vx) > 0.5 || !player.onGround) ? 0.1 * dt : 0;

    // 카메라
    const targetCY = player.y - H * 0.55;
    cameraY += (targetCY - cameraY) * 0.1 * dt;
    cameraY = Math.min(cameraY, levelH - H);

    // 파티클
    for (const p of particles) { p.wx += p.vx * dt; p.wy += p.vy * dt; p.vy += 0.2 * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
}

function respawn() {
    const near = [...platforms].sort((a, b) => Math.abs(a.y - player.y) - Math.abs(b.y - player.y))[0] || platforms[0];
    player.x = near.x + near.w / 2 - PW / 2; player.y = near.y - PH - 2;
    player.vx = 0; player.vy = 0;
}

function doClear() {
    const bonus = 50 + currentLevel * 10;
    save.coins += bonus; writeSave(); sessionCoins += bonus;
    document.getElementById('clearCoins').textContent = `+${levelCoins} (보너스 +${bonus}) 🪙`;
    let hs = ''; for (let i = 0; i < hearts; i++) hs += '❤️';
    document.getElementById('clearHearts').textContent = hs || '없음';
    showScreen('levelClear');
}
function nextLevel() { currentLevel++; if (currentLevel > save.bestLevel) { save.bestLevel = currentLevel; writeSave(); } showScreen('preGame'); }

function doGameOver() {
    document.getElementById('gameoverLevel').textContent = currentLevel;
    document.getElementById('gameoverCoins').textContent = sessionCoins + ' 🪙';
    setTimeout(() => { currentLevel = 1; sessionCoins = 0; hearts = 3; showScreen('gameOver'); }, 1600);
}

// ── WORLD → SCREEN ────────────────────────────────────
function wy(y) { return y - cameraY; }

// ── DRAW ──────────────────────────────────────────────
function draw() {
    if (GST !== 'game') { ctx.clearRect(0, 0, W, H); return; }
    drawBg();
    drawPlatforms();
    drawSpikes();
    drawCheeses();
    drawFlag();
    drawCats();
    drawMouse();
    drawParticles();
    if (save.skills.cheeseRadar) drawRadar();
    drawScratch();
}

// ── BACKGROUND ────────────────────────────────────────
function drawBg() {
    // 다크 우주 배경
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#08001a'); g.addColorStop(1, '#0a1230');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 별
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 45; i++) {
        const sx = (i * 137 + 7) % W;
        const starY = ((i * 91 + Math.floor(cameraY * 0.03)) % H + H) % H;
        ctx.beginPath(); ctx.arc(sx, starY, i % 6 === 0 ? 1.6 : 0.8, 0, Math.PI * 2); ctx.fill();
    }
    // 원경 구름 (나무 대신)
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 4; i++) {
        const cx2 = (i * 280 + 60) % (W + 100) - 50;
        const cy2 = ((i * 130 + Math.floor(cameraY * 0.01)) % (H * 2) + H * 2) % (H * 2) - H * 0.5;
        ctx.beginPath(); ctx.ellipse(cx2, cy2, 80, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx2 + 50, cy2 - 10, 55, 16, 0, 0, Math.PI * 2); ctx.fill();
    }
}


// ── PLATFORMS (3D) ────────────────────────────────────
function drawPlatforms() {
    for (const p of platforms) {
        const sY = wy(p.y); if (sY + PLH + PLD < -5 || sY > H + 5) continue;
        const topC = p.goal ? '#4ade80' : p.safe ? '#6ee7b7' : '#5a9a3b';
        const sdC = p.goal ? '#15803d' : p.safe ? '#059669' : '#3a6e20';
        const hiC = p.goal ? '#86efac' : p.safe ? '#a7f3d0' : '#7acc4a';

        // 옆면 (3D 깊이)
        ctx.fillStyle = sdC;
        ctx.fillRect(p.x, sY + PLH, p.w, PLD);

        // 윗면
        ctx.fillStyle = topC;
        ctx.fillRect(p.x, sY, p.w, PLH);

        // 하이라이트
        ctx.fillStyle = hiC;
        ctx.fillRect(p.x, sY, p.w, 5);

        // 테두리
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
        ctx.strokeRect(p.x, sY, p.w, PLH);

        // 잔디 (골 플랫폼 제외, 매우 작은 점으로)
        if (!p.goal) {
            ctx.fillStyle = '#7bce3a';
            for (let g = 0; g < Math.floor(p.w / 24); g++) {
                const gx = p.x + g * 24 + 12;
                ctx.beginPath(); ctx.moveTo(gx - 2, sY); ctx.lineTo(gx, sY - 5); ctx.lineTo(gx + 2, sY); ctx.closePath(); ctx.fill();
            }
        }
    }
}

// ── OBSTACLES (Spikes array) ────────────────────────────────────────────
function drawSpikes() {
    const t = Date.now() / 150;
    for (const s of spikes) {
        const sY = wy(s.y); if (sY < -30 || sY > H + 30) continue;
        
        ctx.save();
        if (s.type === 1) {
            // 불꽃 (Fire)
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(s.x, sY + s.h);
            for(let i=0; i<=s.w; i+=s.w/5){
                const fhy = s.y + s.h - 4 - Math.abs(Math.sin(t + i))*12;
                ctx.lineTo(s.x + i, wy(fhy));
            }
            ctx.lineTo(s.x + s.w, sY + s.h);
            ctx.fill();
            
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(s.x + 2, sY + s.h);
            for(let i=0; i<=s.w-4; i+=s.w/3){
                const fhy = s.y + s.h - Math.abs(Math.sin(t*1.5 + i))*8;
                ctx.lineTo(s.x + 2 + i, wy(fhy));
            }
            ctx.lineTo(s.x + s.w - 2, sY + s.h);
            ctx.fill();
        } else if (s.type === 2) {
            // 독늪 (Poison)
            ctx.fillStyle = '#84cc16';
            ctx.beginPath(); ctx.roundRect(s.x, sY + s.h - 8, s.w, 8, 4); ctx.fill();
            
            // 뽀글거리는 방울
            ctx.fillStyle = '#bef264';
            for (let i = 0; i < 3; i++) {
                const bY = sY + s.h - 10 - ((t * 0.5 + i * 2) % 1) * 15;
                const bX = s.x + (i * s.w / 3) + 4;
                const r = 2 + Math.sin(t + i*2)*1;
                ctx.globalAlpha = Math.max(0, 1 - ((t * 0.5 + i * 2) % 1));
                ctx.beginPath(); ctx.arc(bX, bY, r, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        } else {
            // 강철 가시 (Spikes)
            const colors = ['#666', '#999', '#555'];
            const n = Math.ceil(s.w / 10);
            const sw = s.w / n;
            for (let i = 0; i < n; i++) {
                const sx = s.x + i * sw;
                ctx.fillStyle = colors[i % 3];
                ctx.beginPath(); ctx.moveTo(sx, sY + s.h); ctx.lineTo(sx + sw / 2, sY); ctx.lineTo(sx + sw, sY + s.h); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.beginPath(); ctx.moveTo(sx + 2, sY + s.h - 2); ctx.lineTo(sx + sw / 2, sY + 2); ctx.lineTo(sx + sw / 2 + 1, sY + s.h - 2); ctx.closePath(); ctx.fill();
            }
        }
        ctx.restore();
    }
}

// ── CHEESE ────────────────────────────────────────────
function drawCheeses() {
    for (const c of cheeses) {
        if (c.collected) continue;
        const sY = wy(c.y) + Math.sin(c.t) * 4; if (sY < -40 || sY > H + 20) continue;
        ctx.save();
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12 + Math.sin(c.t * 2) * 5;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(c.x, sY + CHH); ctx.lineTo(c.x + CHW, sY + CHH);
        ctx.lineTo(c.x + CHW * 0.78, sY); ctx.lineTo(c.x + CHW * 0.12, sY);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#cc8800';
        [[c.x + 6, sY + 10], [c.x + 16, sY + 16], [c.x + 20, sY + 7]].forEach(([hx, hy]) => {
            ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
    }
}

// ── FLAG ──────────────────────────────────────────────
function drawFlag() {
    if (!flag) return;
    const fy = wy(flag.y); if (fy < -80 || fy > H + 30) return;
    const fx = flag.x;
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(fx + 14, fy); ctx.lineTo(fx + 14, fy + 65); ctx.stroke();
    ctx.save();
    ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 18;
    const wave = Math.sin(flag.anim * 2) * 6;
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.moveTo(fx + 14, fy);
    ctx.quadraticCurveTo(fx + 34, fy + 12 + wave, fx + 14, fy + 24);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(fx + 14, fy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

const CAT_COLORS = [
    { base: '#4a4a5a', tummy: '#e8e8ea', eye: '#ffcc00', ear: '#ffb3ba', nose: '#ff7788' }, // 클래식 회색
    { base: '#f59e0b', tummy: '#fef3c7', eye: '#10b981', ear: '#fcd34d', nose: '#fb7185' }, // 치즈냥이
    { base: '#1e1e24', tummy: '#f8fafc', eye: '#fbbf24', ear: '#f472b6', nose: '#f43f5e' }, // 턱시도 까망
    { base: '#f8fafc', tummy: '#e2e8f0', eye: '#3b82f6', ear: '#ffb3ba', nose: '#fca5a5' }, // 새하얀 백묘
    { base: '#8b5cf6', tummy: '#ddd6fe', eye: '#f59e0b', ear: '#c084fc', nose: '#e879f9' }, // 보라색 마법냥
    { base: '#d4a373', tummy: '#faedcd', eye: '#14b8a6', ear: '#ffb3ba', nose: '#e5989b' }  // 베이지 뱅갈냥
];

// ── CATS ──────────────────────────────────────────────
function drawCats() {
    for (const c of cats) {
        const sY = wy(c.y); if (sY < -70 || sY > H + 20) continue;
        const fc = c.facing, cx = c.x + CW / 2, cy = sY + CH / 2;
        
        const ct = CAT_COLORS[c.colorType || 0];
        const col = c.stunned ? '#9999ee' : ct.base;
        const tummyCol = c.stunned ? '#ccccff' : ct.tummy;
        const eyeColor = c.stunned ? '#aaa' : ct.eye;
        const earCol = c.stunned ? '#9999cc' : ct.ear;
        const noseCol = c.stunned ? '#aaa' : ct.nose;
        const bounce = Math.abs(Math.sin(c.animT * 0.4)) * 3;

        ctx.save();
        if (c.stunned) ctx.globalAlpha = 0.7;

        // 크기 확대 스케일 적용
        ctx.translate(cx, cy);
        ctx.scale(1.3, 1.3);
        ctx.translate(-cx, -cy);

        // 그림자
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(cx, sY + CH + 3, 20, 6, 0, 0, Math.PI * 2); ctx.fill();

        const by = cy - bounce + 4; // 움직임에 따른 들썩거림 적용

        // 살랑이는 꼬리
        const tailAng = Math.sin(c.animT * 0.3) * 0.4;
        ctx.save();
        ctx.translate(cx - fc * 16, by + 4);
        ctx.rotate(fc * tailAng);
        ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-15 * fc, -15, -10 * fc, -28); ctx.stroke();
        ctx.restore();

        // 4개의 앙증맞은 다리
        ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
        const legWalk = Math.sin(c.animT * 0.5) * 6;
        const lx1 = cx - 10, lx2 = cx - 4, lx3 = cx + 6, lx4 = cx + 12;
        ctx.beginPath(); ctx.moveTo(lx1, by + 6); ctx.lineTo(lx1 - legWalk, by + 16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx2, by + 6); ctx.lineTo(lx2 + legWalk, by + 16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx3, by + 6); ctx.lineTo(lx3 - legWalk, by + 16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx4, by + 6); ctx.lineTo(lx4 + legWalk, by + 16); ctx.stroke();

        // 뚱뚱하고 둥근 몸통
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(cx, by, 22, 15, 0, 0, Math.PI * 2); ctx.fill();
        
        // 배색(뱃살)
        ctx.fillStyle = tummyCol;
        ctx.beginPath(); ctx.ellipse(cx + fc * 2, by + 5, 14, 7, 0, 0, Math.PI * 2); ctx.fill();

        // 호랑이 줄무늬 (일부 고양이에 한해 등무늬 추가)
        if (c.colorType === 1 || c.colorType === 5) {
            ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, by - 14); ctx.lineTo(cx, by - 4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - 5, by - 11); ctx.lineTo(cx - 5, by - 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 5, by - 11); ctx.lineTo(cx + 5, by - 2); ctx.stroke();
        }

        // 머리 부분
        const hx = cx + fc * 15, hy = by - 12;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(hx, hy, 14, 0, Math.PI * 2); ctx.fill();

        // 뾰족한 두 귀
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(hx - 8, hy - 8); ctx.lineTo(hx - 12, hy - 22); ctx.lineTo(hx, hy - 12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx + 8, hy - 8); ctx.lineTo(hx + 12, hy - 22); ctx.lineTo(hx, hy - 12); ctx.fill();
        
        // 귓속
        ctx.fillStyle = earCol;
        ctx.beginPath(); ctx.moveTo(hx - 7, hy - 10); ctx.lineTo(hx - 10, hy - 18); ctx.lineTo(hx - 3, hy - 13); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx + 7, hy - 10); ctx.lineTo(hx + 10, hy - 18); ctx.lineTo(hx + 3, hy - 13); ctx.fill();

        // 눈
        ctx.fillStyle = eyeColor;
        ctx.beginPath(); ctx.arc(hx + fc * 4, hy - 1, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + fc * 13, hy - 1, 3.5, 0, Math.PI * 2); ctx.fill();

        // 까만 눈동자
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.ellipse(hx + fc * 4 + fc, hy - 1, 1.2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx + fc * 13 + fc, hy - 1, 1.2, 2.5, 0, 0, Math.PI * 2); ctx.fill();

        // Accessory 생김새!
        const acc = c.accessory || 0;
        if (!c.stunned) {
            if (acc === 0 || acc === 2) {
                // 화난 눈썹 (기본 & 왕관)
                ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(hx + fc * 0, hy - 6); ctx.lineTo(hx + fc * 6, hy - 3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(hx + fc * 17, hy - 6); ctx.lineTo(hx + fc * 11, hy - 3); ctx.stroke();
            } else if (acc === 1) {
                // 쿨한 힙스터 선글라스
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.roundRect(hx + fc * 2 - 3, hy - 5, 8, 5, 2); ctx.fill();
                ctx.beginPath(); ctx.roundRect(hx + fc * 11 - 3, hy - 5, 8, 5, 2); ctx.fill();
                ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(hx + fc * 7, hy - 3); ctx.lineTo(hx + fc * 10, hy - 3); ctx.stroke();
            } else if (acc === 3) {
                // 발그레한 귀여운 볼터치 (화난 눈썹 대신 순한 얼굴)
                ctx.fillStyle = 'rgba(255, 100, 120, 0.4)';
                ctx.beginPath(); ctx.ellipse(hx + fc * 0, hy + 2, 3, 2, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(hx + fc * 17, hy + 2, 3, 2, 0, 0, Math.PI*2); ctx.fill();
            }
            if (acc === 2) {
                // 금빛 왕관
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.moveTo(hx - 4, hy - 14); ctx.lineTo(hx - 7, hy - 22); ctx.lineTo(hx - 1, hy - 18); ctx.lineTo(hx + 3, hy - 24); ctx.lineTo(hx + 6, hy - 18); ctx.lineTo(hx + 11, hy - 22); ctx.lineTo(hx + 8, hy - 13); ctx.fill();
            }
        }

        // 코와 W 모양 고양이 입
        ctx.fillStyle = noseCol;
        ctx.beginPath(); ctx.arc(hx + fc * 9, hy + 3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(hx + fc * 9, hy + 4); ctx.quadraticCurveTo(hx + fc * 6, hy + 7, hx + fc * 5, hy + 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx + fc * 9, hy + 4); ctx.quadraticCurveTo(hx + fc * 12, hy + 7, hx + fc * 13, hy + 5); ctx.stroke();

        // 기절 별
        if (c.stunned) {
            for (let i = 0; i < 3; i++) {
                const ang = c.animT * 2.5 + i * Math.PI * 2 / 3;
                ctx.fillStyle = '#fee'; ctx.font = 'bold 13px serif';
                ctx.fillText('★', hx + Math.cos(ang) * 16 - 6, hy - 24 + Math.sin(ang) * 5);
            }
        }
        ctx.restore();
    }
}

// ── MOUSE CHARACTER ───────────────────────────────────
function drawMouse() {
    const isDying = player.deathState === 1;
    const isWh = player.blinkTimer > 0 && Math.floor(player.blinkTimer / 4) % 2 === 0;
    const sY = wy(player.y);
    const cx = player.x + PW / 2, cy = sY + PH / 2;
    const fc = player.facing;
    const t = player.animT;

    ctx.save();
    
    // 크기 더 축소 스케일 적용
    ctx.translate(cx, cy);
    ctx.scale(0.6, 0.6);
    ctx.translate(-cx, -cy);

    // 사망 무지개 이펙트 & 회전
    if (isDying) {
        const hue = (player.deathTimer * 6) % 360;
        ctx.shadowColor = `hsl(${hue},100%,60%)`; ctx.shadowBlur = 35;
        ctx.globalAlpha = Math.max(0.3, 1 - player.deathTimer / 80);
        // 중앙 기준으로 회전 추가
        ctx.translate(cx, cy);
        ctx.rotate(player.deathTimer * 0.2);
        ctx.translate(-cx, -cy);
    }
    // 무적 shimmer
    else if (player.invTimer > 0 && !isWh) {
        ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 20;
    }

    // 몸 색상
    let col = isDying ? `hsl(${(player.deathTimer * 8) % 360},100%,70%)` : isWh ? '#ffffff' : '#d8d8dc';
    let belly = isWh ? '#fff' : '#f0f0f0', earIn = isWh ? '#ffe8ed' : '#ffb3c1';

    // 그림자
    ctx.globalAlpha = isDying ? 0.08 : 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(cx, sY + PH + 6, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = isDying ? Math.max(0.3, 1 - player.deathTimer / 80) : 1;

    // 꼬리
    const tw = Math.sin(t * 0.5) * 7;
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - fc * 20, cy + 6);
    ctx.bezierCurveTo(cx - fc * 33, cy + tw, cx - fc * 40, cy - 10 + tw, cx - fc * 35, cy - 22);
    ctx.stroke();

    // 다리 (걷기 애니메이션)
    const ls = player.onGround ? Math.sin(t * 0.65) * 9 : 9;
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    // 왼쪽 다리
    ctx.beginPath(); ctx.moveTo(cx - 7, cy + 12); ctx.lineTo(cx - 9, cy + 22 + ls); ctx.stroke();
    // 오른쪽 다리
    ctx.beginPath(); ctx.moveTo(cx + 7, cy + 12); ctx.lineTo(cx + 9, cy + 22 - ls); ctx.stroke();
    // 발
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(cx - 9, cy + 22 + ls, 6, 3.5, fc * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 9, cy + 22 - ls, 6, 3.5, -fc * 0.3, 0, Math.PI * 2); ctx.fill();

    // 몸통
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(cx, cy + 6, 22, 16, 0, 0, Math.PI * 2); ctx.fill();
    // 배
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(cx + fc * 3, cy + 9, 11, 10, 0, 0, Math.PI * 2); ctx.fill();
    // 하이라이트
    if (!isWh) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.ellipse(cx - 6, cy - 1, 10, 7, -0.3, 0, Math.PI * 2); ctx.fill();
    }

    // 머리
    const hx = cx + fc * 13, hy = cy - 14;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(hx, hy, 18, 0, Math.PI * 2); ctx.fill();
    if (!isWh) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.arc(hx - fc * 4, hy - 5, 9, 0, Math.PI * 2); ctx.fill();
    }

    // 귀 (앞귀, 뒷귀)
    [[fc * 7, fc * 0.4, hy - 16], [fc * -3, -fc * 0.3, hy - 15]].forEach(([eox, eTilt, eyOff]) => {
        const ex = hx + eox;
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(ex, eyOff, 8, 12, eTilt, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = earIn; ctx.beginPath(); ctx.ellipse(ex, eyOff, 5, 8, eTilt, 0, Math.PI * 2); ctx.fill();
    });

    // 눈
    ctx.fillStyle = '#1a0a2e';
    ctx.beginPath(); ctx.arc(hx + fc * 9, hy - 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isWh ? '#888' : '#4433dd';
    ctx.beginPath(); ctx.arc(hx + fc * 9, hy - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(hx + fc * 9.7, hy - 5.5, 1.4, 0, Math.PI * 2); ctx.fill();

    // 코
    ctx.fillStyle = '#ff6080';
    ctx.beginPath(); ctx.arc(hx + fc * 16, hy + 2, 3, 0, Math.PI * 2); ctx.fill();

    // 수염
    ctx.strokeStyle = 'rgba(50,50,50,0.3)'; ctx.lineWidth = 1.2;
    [-5, 0, 5].forEach(w => {
        ctx.beginPath();
        ctx.moveTo(hx + fc * 13, hy + w);
        ctx.lineTo(hx + fc * 26, hy + w * 1.5);
        ctx.stroke();
    });

    ctx.restore();
}

// ── PARTICLES ─────────────────────────────────────────
function drawParticles() {
    for (const p of particles) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.wx, wy(p.wy), p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ── CHEESE RADAR ──────────────────────────────────────
function drawRadar() {
    cheeses.filter(c => !c.collected).forEach(c => {
        const sy2 = wy(c.y), dx = c.x + CHW / 2 - W / 2;
        if (sy2 >= 20 && sy2 <= H - 20) return;
        const ang = Math.atan2(sy2 < 0 ? -1 : 1, dx);
        const ex = Math.max(20, Math.min(W - 20, W / 2 + Math.cos(ang) * 100)), ey = sy2 < 0 ? 24 : H - 24;
        ctx.save(); ctx.fillStyle = 'rgba(255,215,0,.75)';
        ctx.translate(ex, ey); ctx.rotate(ang + Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-7, 6); ctx.lineTo(7, 6); ctx.closePath(); ctx.fill();
        ctx.restore();
    });
}

// ── CAT SCRATCH ANIMATION ─────────────────────────────
function drawScratch() {
    if (player.deathState >= 1 && player.killedByCat && player.deathTimer < 16) {
        const cx = player.x + PW / 2;
        const cy = wy(player.y) + PH / 2;
        
        ctx.save();
        ctx.translate(cx, cy);
        const dir = player.catHitFacing || 1;
        
        const p = player.deathTimer / 8; // 0 ~ 2.0
        ctx.globalAlpha = Math.max(0, 1 - (player.deathTimer - 6)/10);
        
        ctx.lineCap = 'round';
        
        // 3개의 할퀴기 궤적
        const offsets = [-16, 0, 16];
        for (let i = 0; i < 3; i++) {
            // 가운데 선이 조금 더 길고 빠름
            const t = Math.max(0, Math.min(1, p - Math.abs(offsets[i])*0.015));
            if (t > 0) {
                const startX = offsets[i] - 30 * dir;
                const startY = -35 + Math.abs(offsets[i]) * 0.8;
                const endX = startX + (60 * t) * dir;
                const endY = startY + (80 * t);
                
                // 바깥쪽 붉은 이펙트
                ctx.strokeStyle = `rgba(239,68,68,${ctx.globalAlpha})`; 
                ctx.lineWidth = 12;
                ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
                
                // 안쪽 하얀 섬광
                ctx.strokeStyle = `rgba(255,255,255,${ctx.globalAlpha})`; 
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
            }
        }
        ctx.restore();
    }
}
