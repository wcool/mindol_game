'use strict';
// ═══════════════════════════════════════════════════════
//  길건너 친구들 – GAME ENGINE
// ═══════════════════════════════════════════════════════

const TILE = 72, COLS = 9, VIEW_ROWS = 11;
let HOP_TIME = 0.16;   // items can change this

// ─── LANE GENERATORS ────────────────────────────────────
const LANE_TYPES = ['grass', 'grass', 'road', 'road', 'road', 'river', 'rail'];

function makeLane(row, type) {
    const lane = { row, type, obstacles: [], coins: [] };
    const dir = Math.random() < 0.5 ? 1 : -1;

    if (type === 'grass') {
        const treeCols = [];
        for (let c = 0; c < COLS; c++) {
            if (Math.random() < 0.18) treeCols.push(c);
        }
        lane.obstacles = treeCols.map(col => ({ col, w: 1 }));
        for (let c = 0; c < COLS; c++) {
            if (!treeCols.includes(c) && Math.random() < 0.15)
                lane.coins.push({ col: c, x: c * TILE + TILE / 2, collected: false, phase: Math.random() * Math.PI * 2 });
        }
    } else if (type === 'road') {
        const speed = (0.8 + Math.random() * 1.4) * dir;
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            lane.obstacles.push({
                x: Math.random() * COLS * TILE,
                w: 1.5 + Math.random(),
                speed,
                color: ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'][Math.floor(Math.random() * 6)]
            });
        }
        if (Math.random() < 0.12) lane.coins.push({ col: Math.floor(Math.random() * COLS), x: Math.random() * COLS * TILE, collected: false, phase: 0, road: true });
    } else if (type === 'river') {
        const speed = (0.5 + Math.random() * 0.8) * dir;
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            lane.obstacles.push({
                x: (i / count) * COLS * TILE + Math.random() * TILE,
                w: 1.5 + Math.random() * 1.5,
                speed,
                isLog: true,
            });
        }
    } else if (type === 'rail') {
        const speed = (3 + Math.random() * 2) * dir;
        lane.obstacles.push({ x: dir > 0 ? -4 * TILE : COLS * TILE * 1.5, w: 3, speed, isTrain: true, waitTime: 3 + Math.random() * 4, timer: 0, active: false });
        for (let c = 0; c < COLS; c++) {
            if (Math.random() < 0.2) lane.coins.push({ col: c, x: c * TILE + TILE / 2, collected: false, phase: Math.random() * Math.PI * 2 });
        }
    }
    return lane;
}

// ─── MAIN GAME OBJECT ───────────────────────────────────
const Game = (() => {
    let canvas, ctx, animId;
    let lastTime = 0;
    let blinkTimer = 0, blinkOpen = true;
    let shieldFlash = 0;
    let coinPopups = [];

    // ─── 아이템 핫바 ────────────────────────────────────
    const HOTBAR_ITEMS = [
        { id: 'shield', emoji: '🛡️', label: '방패' },
        { id: 'magnet', emoji: '🧲', label: '자석' },
        { id: 'coin2x', emoji: '✨', label: '2배' },
    ];
    const HOTBAR_SIZE = 54;   // 버튼 크기
    const HOTBAR_PAD = 8;    // 간격
    let itemUsePopup = null;  // 아이템 사용 팝업

    const state = {
        running: false,
        score: 0,
        sessionCoins: 0,
        dead: false,
        deadTimer: 0,
    };

    const player = {
        col: 4, row: 0,
        x: 0, y: 0,
        targetX: 0, targetY: 0,
        hopT: 1,
        hopArc: 0,
        squash: 0,
        facing: 'up',
        onLog: null,
        maxRow: 0,
        invincibleTimer: 0,  // 방패 발동 후 무적 시간
    };

    let lanes = [];
    let cameraRowOffset = 0;
    let charData = null;

    // ─── INPUT ──────────────────────────────────────────
    const keys = {};
    let moveQueue = [];

    function onKey(e) {
        if (!state.running || state.dead) return;
        const map = {
            ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
            KeyW: [0, 1], KeyS: [0, -1], KeyA: [-1, 0], KeyD: [1, 0],
        };
        if (map[e.code]) { e.preventDefault(); enqueueMove(...map[e.code]); }
    }

    function enqueueMove(dx, dy) {
        if (moveQueue.length < 2) moveQueue.push({ dx, dy });
    }

    // ─── LANE MANAGEMENT ────────────────────────────────
    function initLanes() {
        lanes = [];
        for (let r = 0; r <= 4; r++) lanes.push(makeLane(r, 'grass'));
        for (let r = 5; r < VIEW_ROWS + 8; r++) generateNextLane(r);
    }

    function generateNextLane(row) {
        let type;
        if (row <= 1) { type = 'grass'; }
        else {
            const pool = row < 5 ? ['grass', 'grass', 'grass', 'road'] : LANE_TYPES;
            type = pool[Math.floor(Math.random() * pool.length)];
        }
        lanes.push(makeLane(row, type));
    }

    // ─── UPDATE ─────────────────────────────────────────
    function update(dt) {
        if (state.dead) {
            state.deadTimer += dt;
            DeathFX.update(dt, canvas.width, canvas.height);
            return;
        }

        // 아이템: HOP_TIME 적용
        HOP_TIME = (typeof ActiveItems !== 'undefined') ? ActiveItems.getHopTime() : 0.16;

        // Blink
        blinkTimer += dt;
        if (blinkTimer > 3.0) { blinkOpen = false; if (blinkTimer > 3.12) { blinkOpen = true; blinkTimer = 0; } }

        // Process move queue
        if (player.hopT >= 1 && moveQueue.length > 0) {
            const { dx, dy } = moveQueue.shift();
            tryMove(dx, dy);
        }

        // Animate hop
        if (player.hopT < 1) {
            player.hopT = Math.min(1, player.hopT + dt / HOP_TIME);
            const t = player.hopT;
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            player.x = lerp(player.x, player.targetX, ease);
            player.y = lerp(player.y, player.targetY, ease);
            player.hopArc = Math.sin(t * Math.PI);
            player.squash = t > 0.85 ? (1 - t) / 0.15 : 0;
        } else {
            player.x = player.targetX;
            player.y = player.targetY;
            player.hopArc = 0;
        }

        // Update obstacles
        const totalW = COLS * TILE;
        for (const lane of lanes) {
            for (const obs of lane.obstacles) {
                if (obs.speed !== undefined) {
                    if (obs.isTrain) {
                        if (!obs.active) {
                            obs.timer += dt;
                            if (obs.timer >= obs.waitTime) { obs.active = true; obs.timer = 0; }
                        } else {
                            obs.x += obs.speed * TILE * dt;
                            if (Math.abs(obs.x) > COLS * TILE * 2) {
                                obs.active = false;
                                obs.waitTime = 3 + Math.random() * 5;
                                obs.timer = 0;
                                obs.x = obs.speed > 0 ? -4 * TILE : COLS * TILE * 1.5;
                            }
                        }
                    } else {
                        obs.x += obs.speed * TILE * dt;
                        if (obs.x > totalW + obs.w * TILE) obs.x = -obs.w * TILE;
                        if (obs.x < -obs.w * TILE) obs.x = totalW + obs.w * TILE;
                    }
                }
                if (obs.isLog && player.onLog === obs) {
                    player.x += obs.speed * TILE * dt;
                    player.targetX = player.x;
                    player.col = Math.round((player.x - TILE / 2) / TILE);
                }
            }
        }

        // Coin collection
        for (const lane of lanes) {
            for (const coin of lane.coins) {
                if (!coin.collected) {
                    coin.phase = (coin.phase || 0) + dt * 3;
                    const radius = TILE * ((typeof ActiveItems !== 'undefined') ? ActiveItems.getCoinRadius() : 0.55);
                    if (player.row === lane.row && Math.abs(player.x - coin.x) < radius) {
                        coin.collected = true;
                        const val = (typeof ActiveItems !== 'undefined') ? ActiveItems.getCoinValue() : 1;
                        state.sessionCoins += val;
                        Storage.addCoins(val);
                        showCoinPopup(val);
                        SFX.coin();
                    }
                }
            }
        }

        // Camera smooth follow
        const targetCamRow = player.row - 3;
        cameraRowOffset += (targetCamRow - cameraRowOffset) * Math.min(1, dt * 8);

        // Generate new lanes ahead
        const maxLaneRow = lanes.reduce((m, l) => Math.max(m, l.row), 0);
        if (player.row + 10 > maxLaneRow) generateNextLane(maxLaneRow + 1);

        // Cull old lanes
        lanes = lanes.filter(l => l.row >= player.row - 6);

        // Death: fell off bottom
        if (player.row < cameraRowOffset - 1) die('fall');

        // Collision
        // 무적 타이머 감소
        if (player.invincibleTimer > 0) player.invincibleTimer -= dt;

        if (player.hopT >= 1) checkCollisions();
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function tryMove(dx, dy) {
        const nx = player.col + dx;
        const ny = player.row + dy;
        if (nx < 0 || nx >= COLS) return;
        if (ny < 0) return;

        const targetLane = getLane(ny);
        if (targetLane) {
            for (const obs of targetLane.obstacles) {
                if (!obs.speed && obs.col === nx) return;
            }
        }

        player.col = nx;
        player.row = ny;
        if (ny > player.maxRow) { player.maxRow = ny; state.score = ny; }

        player.targetX = nx * TILE + TILE / 2;
        player.targetY = getScreenY(ny);
        player.hopT = 0;
        player.onLog = null;
        SFX.hop();

        if (dy > 0) player.facing = 'up';
        else if (dy < 0) player.facing = 'down';
        else if (dx > 0) player.facing = 'right';
        else player.facing = 'left';
    }

    function checkCollisions() {
        // 방패 발동 후 무적 시간 중이면 충돌 스킵 (단, 강은 항상 체크)
        const isInvincible = player.invincibleTimer > 0;

        const lane = getLane(player.row);
        if (!lane) return;
        const px = player.x, pw = TILE * 0.42;

        if (!isInvincible && lane.type === 'road') {
            for (const obs of lane.obstacles) {
                const ox1 = obs.x, ox2 = obs.x + obs.w * TILE;
                if (px + pw > ox1 && px - pw < ox2) {
                    if (typeof ActiveItems !== 'undefined' && ActiveItems.onHit()) {
                        showShieldBlock();
                        player.invincibleTimer = 1.5; // 1.5초 무적
                        return;
                    }
                    die('car'); return;
                }
            }
        } else if (!isInvincible && lane.type === 'rail') {
            for (const obs of lane.obstacles) {
                if (!obs.active) continue;
                const ox1 = obs.x, ox2 = obs.x + obs.w * TILE;
                if (px + pw > ox1 && px - pw < ox2) {
                    if (typeof ActiveItems !== 'undefined' && ActiveItems.onHit()) {
                        showShieldBlock();
                        player.invincibleTimer = 1.5;
                        return;
                    }
                    die('train'); return;
                }
            }
        } else if (lane.type === 'river') {
            let onLog = false;
            for (const obs of lane.obstacles) {
                const ox1 = obs.x, ox2 = obs.x + obs.w * TILE;
                if (px + pw * 0.6 > ox1 && px - pw * 0.6 < ox2) { onLog = true; player.onLog = obs; break; }
            }
            if (!onLog) { die('water'); return; }
        }

        if (player.x < -TILE * 0.5 || player.x > COLS * TILE + TILE * 0.5) die('fall');
    }

    function getLane(row) { return lanes.find(l => l.row === row) || null; }
    function getScreenY(row) { return (VIEW_ROWS - 1 - (row - Math.floor(cameraRowOffset))) * TILE + TILE / 2; }

    function die(reason) {
        if (state.dead) return;
        state.dead = true;
        state.deadTimer = 0;
        Storage.setHighScore(state.score);
        const px = player.x, py = getScreenY(player.row);
        DeathFX.trigger(reason, px, py, canvas.width, canvas.height, charData);
        const delay = (reason === 'car') ? 2200 : (reason === 'train') ? 2000 : 1600;
        setTimeout(() => {
            if (typeof onGameOver === 'function') onGameOver(state.score, state.sessionCoins);
        }, delay);
    }

    function showCoinPopup(val = 1) {
        coinPopups.push({ x: player.x, y: getScreenY(player.row) - 20, alpha: 1, vy: -60, val });
    }

    function showShieldBlock() {
        shieldFlash = 0.5;
    }

    // ─── 아이템 핫바 계산 ────────────────────────────────
    function getHotbarRect(idx) {
        const W = canvas.width, H = canvas.height;
        const x = W - HOTBAR_SIZE - HOTBAR_PAD;
        const y = H - (HOTBAR_SIZE + HOTBAR_PAD) * (HOTBAR_ITEMS.length - idx) - HOTBAR_PAD;
        return { x, y, w: HOTBAR_SIZE, h: HOTBAR_SIZE };
    }

    function onCanvasClick(e) {
        if (state.dead || !state.running) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        HOTBAR_ITEMS.forEach((item, idx) => {
            const r = getHotbarRect(idx);
            if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                tryUseItem(item.id, item.emoji, item.label);
            }
        });
    }

    function onCanvasTouch(e) {
        for (const touch of e.changedTouches) {
            onCanvasClick({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    function tryUseItem(id, emoji, label) {
        if (typeof ActiveItems === 'undefined') return;
        // 이미 활성화 중이면 무시
        if (ActiveItems[id]) {
            showItemPopup(`${emoji} 이미 활성화됨!`, '#aaa');
            return;
        }
        // headstart는 게임 중 사용 불가
        if (id === 'headstart') return;
        // 인벤토리에서 소모
        if (!Storage.useItem(id)) {
            showItemPopup(`${emoji} 없음!`, '#ff6b6b');
            return;
        }
        ActiveItems.activate(id);
        showItemPopup(`${emoji} ${label} 활성화!`, '#6C63FF');
        if (id === 'shield') shieldFlash = 0.3;
    }

    function showItemPopup(text, color) {
        itemUsePopup = { text, color, alpha: 1, timer: 0 };
    }

    function drawHotbar(dt) {
        const W = canvas.width;
        HOTBAR_ITEMS.forEach((item, idx) => {
            const r = getHotbarRect(idx);
            const owned = Storage.getItemCount(item.id);
            const active = typeof ActiveItems !== 'undefined' && ActiveItems[item.id];

            // 배경 원
            ctx.save();
            ctx.globalAlpha = owned > 0 ? 0.85 : 0.35;
            ctx.fillStyle = active ? 'rgba(108,99,255,0.7)' : 'rgba(0,0,0,0.5)';
            ctx.strokeStyle = active ? '#6C63FF' : (owned > 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)');
            ctx.lineWidth = active ? 3 : 1.5;
            ctx.beginPath();
            ctx.roundRect(r.x, r.y, r.w, r.h, 14);
            ctx.fill(); ctx.stroke();

            // 이모지
            ctx.globalAlpha = owned > 0 ? 1 : 0.35;
            ctx.font = '26px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.emoji, r.x + r.w / 2, r.y + r.h / 2 - 2);

            // 보유 개수
            if (owned > 0) {
                ctx.fillStyle = active ? '#fff' : '#FFD700';
                ctx.font = 'bold 11px Outfit, sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`×${owned}`, r.x + r.w - 4, r.y + r.h - 3);
            }

            // 활성화 표시 (초록 점)
            if (active) {
                ctx.globalAlpha = 0.9 + Math.sin(Date.now() / 300) * 0.1;
                ctx.fillStyle = '#4ade80';
                ctx.beginPath();
                ctx.arc(r.x + 11, r.y + 11, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        // 아이템 사용 팝업
        if (itemUsePopup && itemUsePopup.alpha > 0) {
            itemUsePopup.timer += dt;
            itemUsePopup.alpha = Math.max(0, 1 - itemUsePopup.timer * 1.5);
            ctx.save();
            ctx.globalAlpha = itemUsePopup.alpha;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath(); ctx.roundRect(W / 2 - 100, 50, 200, 36, 10); ctx.fill();
            ctx.fillStyle = itemUsePopup.color;
            ctx.font = 'bold 15px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(itemUsePopup.text, W / 2, 68);
            ctx.restore();
        }
    }

    function render(dt) {
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // 화면 흔들림
        const [sx, sy_s] = DeathFX.getShakeOffset();
        ctx.save();
        ctx.translate(sx, sy_s);

        // Lanes
        const visStart = Math.floor(cameraRowOffset) - 1;
        const visEnd = visStart + VIEW_ROWS + 2;
        for (let r = visStart; r <= visEnd; r++) {
            drawLane(getLane(r), r, getScreenY(r));
        }

        // Coins
        for (let r = visStart; r <= visEnd; r++) {
            const lane = getLane(r);
            if (!lane) continue;
            for (const coin of lane.coins) {
                if (!coin.collected) drawCoin(coin.x, getScreenY(r), coin.phase);
            }
        }

        // Player (사망 이펙트 중에는 이펙트가 그림)
        if (!state.dead) {
            const px2 = player.x, py2 = getScreenY(player.row);

            // 방패 버블 효과
            if (typeof ActiveItems !== 'undefined' && ActiveItems.shield) {
                const t = Date.now() / 1000;
                const pulse = 1 + Math.sin(t * 4) * 0.08;
                const r = 38 * pulse;

                // 외부 글로우
                const grd = ctx.createRadialGradient(px2, py2 - 28, r * 0.3, px2, py2 - 28, r * 1.4);
                grd.addColorStop(0, 'rgba(100,181,246,0.18)');
                grd.addColorStop(1, 'rgba(100,181,246,0)');
                ctx.save();
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.ellipse(px2, py2 - 28, r * 1.4, r * 1.2, 0, 0, Math.PI * 2);
                ctx.fill();

                // 버블 테두리 (파란 원)
                ctx.strokeStyle = `rgba(100,181,246,${0.55 + Math.sin(t * 4) * 0.2})`;
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#64B5F6';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.ellipse(px2, py2 - 28, r, r * 0.85, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // 반짝이 하이라이트
                ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.1;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(px2 - r * 0.28, py2 - r * 0.82, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
                ctx.fill();

                // 방패 아이콘 (위에 작게)
                ctx.globalAlpha = 0.9;
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🛡️', px2, py2 - r - 8);

                ctx.restore();
            }

            CharRenderer.render(ctx, charData, px2, py2, 0.85, player.hopArc, player.squash, player.facing, blinkOpen);
        }

        // Coin popups
        coinPopups = coinPopups.filter(p => p.alpha > 0);
        for (const p of coinPopups) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.val > 1 ? '#FF6B6B' : '#FFD700';
            ctx.font = 'bold 18px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.val > 1 ? `+${p.val}` : '+1', p.x, p.y);
            ctx.restore();
            p.y += p.vy * dt;
            p.alpha -= dt * 1.8;
        }

        // Score HUD
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath(); ctx.roundRect(W / 2 - 55, 10, 110, 40, 12); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🏃 ${state.score}m`, W / 2, 36);

        // Coins HUD
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath(); ctx.roundRect(W - 110, 10, 100, 40, 12); ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🪙 ${state.sessionCoins}`, W - 60, 36);

        ctx.restore(); // 흔들림 복원

        // 아이템 핫바 (shake 제외)
        drawHotbar(dt);

        // 방패 플래시
        if (shieldFlash > 0) {
            shieldFlash -= dt * 3;
            ctx.save();
            ctx.globalAlpha = Math.max(0, shieldFlash * 0.5);
            ctx.fillStyle = '#64B5F6';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // 사망 이펙트
        if (state.dead) DeathFX.render(ctx, W, H);

        // Dead 배경 어두워지기
        if (state.dead && state.deadTimer > 1.2) {
            const alpha = Math.min(0.5, (state.deadTimer - 1.2) * 1.2);
            ctx.fillStyle = `rgba(0,0,0,${alpha})`;
            ctx.fillRect(0, 0, W, H);
        }
    }

    function drawLane(lane, row, sy) {
        const W = COLS * TILE;
        if (!lane) {
            ctx.fillStyle = '#5a7a3a';
            ctx.fillRect(0, sy - TILE / 2, W, TILE);
            return;
        }
        const colors = {
            grass: ['#6abf4b', '#5aaf3b'],
            road: ['#4a4a5a', '#3e3e4e'],
            river: ['#3a8fdf', '#2e7fcf'],
            rail: ['#666677', '#555566'],
        };
        const col = colors[lane.type] || ['#5a7a3a', '#4a6a2a'];
        ctx.fillStyle = col[row % 2];
        ctx.fillRect(0, sy - TILE / 2, W, TILE);

        if (lane.type === 'grass') {
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, sy - TILE / 2, W, TILE);
            for (const obs of lane.obstacles) drawTree(obs.col * TILE + TILE / 2, sy);
        } else if (lane.type === 'road') {
            ctx.strokeStyle = 'rgba(255,255,200,0.3)';
            ctx.setLineDash([24, 16]);
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
            ctx.setLineDash([]);
            for (const obs of lane.obstacles) drawCar(obs.x, sy, obs.w, obs.color, obs.speed > 0);
        } else if (lane.type === 'river') {
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 2;
            for (let x = 0; x < W; x += 40) {
                ctx.beginPath();
                ctx.arc(x + (Date.now() / 1000 * 20) % 40, sy, 8, Math.PI, 0);
                ctx.stroke();
            }
            for (const obs of lane.obstacles) drawLog(obs.x, sy, obs.w);
        } else if (lane.type === 'rail') {
            ctx.fillStyle = '#8B6914';
            for (let x = 0; x < W; x += 20) ctx.fillRect(x, sy - 4, 12, 8);
            ctx.fillStyle = '#AAA';
            ctx.fillRect(0, sy - 6, W, 4);
            ctx.fillRect(0, sy + 2, W, 4);
            for (const obs of lane.obstacles) {
                if (obs.active) drawTrain(obs.x, sy, obs.w, obs.speed > 0);
            }
            const warning = lane.obstacles[0];
            if (warning && !warning.active && warning.timer > warning.waitTime - 1.5) {
                if (Math.sin(Date.now() / 80) > 0) {
                    ctx.fillStyle = 'rgba(255,50,50,0.18)';
                    ctx.fillRect(0, sy - TILE / 2, W, TILE);
                }
            }
        }
    }

    function drawTree(cx, cy) {
        drawBox3D(ctx, cx, cy, 12, 14, '#8B5E3C', 6);
        drawBox3D(ctx, cx, cy - 14, 36, 20, '#2d7a2d', 12);
        drawBox3D(ctx, cx + 2, cy - 34, 28, 16, '#3a9e3a', 10);
        drawBox3D(ctx, cx + 4, cy - 50, 20, 14, '#4ec04e', 8);
    }

    function drawCar(x, sy, w, color, facingRight) {
        const cw = w * TILE, ch = TILE * 0.62;
        const cx = x + cw / 2;
        ctx.save();
        drawBox3D(ctx, cx, sy + ch * 0.2, cw, ch * 0.6, color, 10);
        drawBox3D(ctx, cx - cw * 0.05, sy - ch * 0.1, cw * 0.65, ch * 0.45, lighten(color, 0.2), 8);
        ctx.fillStyle = 'rgba(180,230,255,0.7)';
        ctx.fillRect(cx - cw * 0.22, sy - ch * 0.35, cw * 0.18, ch * 0.2);
        ctx.fillRect(cx + cw * 0.02, sy - ch * 0.35, cw * 0.18, ch * 0.2);
        ctx.fillStyle = '#FFFDE7';
        ctx.beginPath(); ctx.arc(facingRight ? x + cw - 4 : x + 4, sy + 4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function drawLog(x, sy, w) {
        const lw = w * TILE;
        drawBox3D(ctx, x + lw / 2, sy + 6, lw, 18, '#8B5E3C', 8);
        ctx.strokeStyle = darken('#8B5E3C', 0.2);
        ctx.lineWidth = 2;
        for (let i = 1; i < w; i++) {
            ctx.beginPath(); ctx.moveTo(x + i * TILE, sy - 3); ctx.lineTo(x + i * TILE, sy + 6); ctx.stroke();
        }
    }

    function drawTrain(x, sy, w, facingRight) {
        const tw = w * TILE;
        drawBox3D(ctx, x + tw / 2, sy + 14, tw, 36, '#c0392b', 12);
        const fx = facingRight ? x + tw - TILE * 0.7 : x;
        drawBox3D(ctx, fx + TILE * 0.35, sy - 4, TILE * 0.8, 28, '#e74c3c', 10);
        ctx.fillStyle = 'rgba(180,230,255,0.7)';
        ctx.fillRect(fx + TILE * 0.1, sy - TILE * 0.3, TILE * 0.3, TILE * 0.22);
        ctx.fillStyle = '#fff8'; ctx.beginPath(); ctx.arc(facingRight ? x + tw : x, sy, 6, 0, Math.PI * 2); ctx.fill();
    }

    function drawCoin(cx, sy, phase) {
        const bob = Math.sin(phase) * 3;
        ctx.save();
        ctx.translate(cx, sy - 8 + bob);
        const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
        grd.addColorStop(0, 'rgba(255,215,0,0.6)');
        grd.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFA000';
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        ctx.restore();
    }

    // ─── LOOP ────────────────────────────────────────────
    function loop(ts) {
        const dt = Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;
        try {
            update(dt);
            render(dt);
        } catch (e) {
            console.error('Game loop error:', e);
        }
        animId = requestAnimationFrame(loop);
    }

    // ─── PUBLIC API ──────────────────────────────────────
    return {
        init(cvs, char) {
            canvas = cvs; ctx = cvs.getContext('2d');
            charData = char;
            document.addEventListener('keydown', onKey);
            canvas.addEventListener('click', onCanvasClick);
            canvas.addEventListener('touchstart', onCanvasTouch, { passive: true });
            this.reset();
        },
        reset() {
            cameraRowOffset = 0;
            player.col = 4; player.row = 0;
            player.x = player.targetX = 4 * TILE + TILE / 2;
            player.y = player.targetY = getScreenY(0);
            player.hopT = 1; player.hopArc = 0; player.squash = 0;
            player.facing = 'up'; player.onLog = null; player.maxRow = 0;
            player.invincibleTimer = 0;
            state.score = 0; state.sessionCoins = 0;
            state.dead = false; state.deadTimer = 0;
            blinkTimer = 0; blinkOpen = true;
            shieldFlash = 0;
            moveQueue = [];
            coinPopups = [];
            itemUsePopup = null;
            DeathFX.clear();
            // 헤드스타트 아이템 적용
            if (typeof ActiveItems !== 'undefined' && ActiveItems.headstart) {
                player.row = 25; player.maxRow = 25; state.score = 25;
                player.x = player.targetX = 4 * TILE + TILE / 2;
                cameraRowOffset = 22;
            }
            initLanes();
            // 위치 갱신
            player.y = player.targetY = getScreenY(player.row);
        },
        start() {
            state.running = true;
            lastTime = performance.now();
            animId = requestAnimationFrame(loop);
        },
        stop() {
            state.running = false;
            if (animId) cancelAnimationFrame(animId);
            document.removeEventListener('keydown', onKey);
            if (canvas) {
                canvas.removeEventListener('click', onCanvasClick);
                canvas.removeEventListener('touchstart', onCanvasTouch);
            }
        },
        setChar(char) { charData = char; },
        enqueueMove,
        getScore() { return state.score; },
        getSessionCoins() { return state.sessionCoins; },
    };
})();

// GameOver callback (set by index)
let onGameOver = null;
