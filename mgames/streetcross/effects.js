'use strict';
// ═══════════════════════════════════════════════════
//  effects.js – 사망 이펙트 & 효과음
// ═══════════════════════════════════════════════════

// ─── WEB AUDIO 효과음 ──────────────────────────────
const SFX = (() => {
    let ac = null;
    let muted = false;
    try { muted = localStorage.getItem('streetcross_muted') === '1'; } catch (e) { /* ignore */ }
    function ctx() {
        if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
        if (ac.state === 'suspended') ac.resume();
        return ac;
    }
    function osc(freq, type, dur, vol = 0.3, freqEnd = null) {
        if (muted) return;
        const c = ctx(), o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = type;
        o.frequency.setValueAtTime(freq, c.currentTime);
        if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + dur);
        g.gain.setValueAtTime(vol, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        o.start(); o.stop(c.currentTime + dur);
    }
    function noise(dur, vol = 0.25, hpFreq = 0) {
        if (muted) return;
        const c = ctx();
        const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource(); src.buffer = buf;
        const g = c.createGain();
        g.gain.setValueAtTime(vol, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        if (hpFreq > 0) {
            const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hpFreq;
            src.connect(hp); hp.connect(g);
        } else { src.connect(g); }
        g.connect(c.destination); src.start(); src.stop(c.currentTime + dur);
    }
    return {
        // 음소거 토글
        setMuted(m) {
            muted = !!m;
            try { localStorage.setItem('streetcross_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
        },
        isMuted() { return muted; },
        // 기차 - 쿵! + 기적 소리
        train() {
            noise(0.05, 0.6);                        // 충격 쿵
            osc(60, 'sawtooth', 0.4, 0.5);          // 저음 진동
            setTimeout(() => osc(1400, 'sine', 1.2, 0.18, 600), 120); // 기적
            setTimeout(() => noise(0.3, 0.3, 200), 200);
        },
        // 물 - 풍덩 + 방울
        water() {
            osc(500, 'sine', 0.25, 0.2, 100);       // 풍덩 하강
            noise(0.15, 0.18, 300);
            setTimeout(() => osc(800, 'sine', 0.15, 0.1, 400), 80);
            setTimeout(() => osc(600, 'sine', 0.15, 0.08, 300), 160);
            setTimeout(() => osc(700, 'sine', 0.12, 0.06, 350), 240);
        },
        // 차 - 퍽! 유리 충격
        car() {
            noise(0.08, 0.6);                        // 퍽 충격음
            osc(120, 'square', 0.3, 0.45);          // 차체 충격
            setTimeout(() => noise(0.2, 0.25, 800), 60); // 유리 고주파
            setTimeout(() => osc(80, 'sawtooth', 0.5, 0.3), 80);
        },
        // 코인
        coin() {
            osc(880, 'sine', 0.1, 0.15);
            setTimeout(() => osc(1320, 'sine', 0.12, 0.1), 70);
        },
        // 점프
        hop() {
            osc(220, 'sine', 0.07, 0.04, 320);
        },
    };
})();

// ─── SCREEN CRACK RENDERER ─────────────────────────
function drawScreenCracks(ctx, W, H, progress) {
    const cx = W / 2, cy = H / 2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, progress);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    const lines = [
        [[0, 0], [90, 70], [170, 30], [240, 100]],
        [[0, 0], [-80, 90], [-150, 50], [-210, 140]],
        [[0, 0], [35, 110], [90, 200], [60, 270]],
        [[0, 0], [-45, 120], [-100, 220], [-70, 300]],
        [[0, 0], [100, -50], [200, -20], [260, -90]],
        [[0, 0], [-90, -60], [-180, -35], [-250, -110]],
        [[0, 0], [15, -100], [50, -190], [25, -260]],
        [[0, 0], [-25, -110], [-50, -210], [5, -280]],
    ];
    for (const crack of lines) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let i = 1; i < crack.length; i++) {
            ctx.lineTo(cx + crack[i][0] * progress, cy + crack[i][1] * progress);
        }
        ctx.stroke();
    }
    // 충격점 원
    ctx.globalAlpha = 0.5 * progress;
    for (const r of [18, 36]) {
        ctx.beginPath(); ctx.arc(cx, cy, r * progress, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}

// ─── DEATH EFFECTS ENGINE ──────────────────────────
const DeathFX = (() => {
    let fx = null;
    let screenShake = 0;

    function trigger(type, px, py, W, H, charData) {
        fx = { type, px, py, W, H, charData, t: 0, particles: [] };

        if (type === 'water') {
            // 물방울 파티클
            for (let i = 0; i < 22; i++) {
                const a = (Math.PI * 2 * i / 22) + (Math.random() - 0.5) * 0.4;
                const spd = 90 + Math.random() * 130;
                fx.particles.push({ x: px, y: py, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 120, sz: 4 + Math.random() * 7, a: 1 });
            }
            fx.ripples = [
                { r: 0, a: 1.0, delay: 0.00 },
                { r: 0, a: 0.7, delay: 0.08 },
                { r: 0, a: 0.5, delay: 0.18 },
            ];
            SFX.water();
        }
        else if (type === 'train') {
            fx.charX = px; fx.charY = py;
            fx.vx = (Math.random() > 0.5 ? 1 : -1) * 350;
            fx.vy = -450;
            fx.spin = (Math.random() - 0.5) * 22;
            fx.angle = 0;
            // 충격선
            for (let i = 0; i < 14; i++) {
                const a = (Math.PI * 2 * i / 14);
                fx.particles.push({ x: px, y: py, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, a: 1, line: true });
            }
            screenShake = 1.2;
            SFX.train();
        }
        else if (type === 'car') {
            fx.charX = px; fx.charY = py;
            fx.scale = 0.85;
            fx.phase = 'zoom'; // zoom → splat
            fx.splat_t = 0;
            fx.crackProgress = 0;
            screenShake = 0.8;
            SFX.car();
        }
        // fall은 특별한 이펙트 없음
    }

    function update(dt, W, H) {
        screenShake = Math.max(0, screenShake - dt * 6);
        if (!fx) return;
        fx.t += dt;
        const t = fx.t;

        if (fx.type === 'water') {
            for (const p of fx.particles) {
                p.x += p.vx * dt; p.y += p.vy * dt;
                p.vy += 320 * dt; // 중력
                p.a -= dt * 1.6;
            }
            for (const r of fx.ripples) {
                if (t >= r.delay) { r.r += dt * 85; r.a -= dt * 1.4; }
            }
        }
        else if (fx.type === 'train') {
            fx.charX += fx.vx * dt;
            fx.charY += fx.vy * dt;
            fx.vy += 650 * dt;
            fx.angle += fx.spin * dt;
            for (const p of fx.particles) p.a -= dt * 5;
        }
        else if (fx.type === 'car') {
            if (fx.phase === 'zoom') {
                fx.scale += dt * 6;
                // 캐릭터 화면 중앙으로 돌진
                fx.charY += (H * 0.45 - fx.charY) * Math.min(1, dt * 5);
                if (fx.scale >= 4.5) { fx.phase = 'splat'; fx.splat_t = 0; }
            } else {
                fx.splat_t += dt;
                fx.crackProgress = Math.min(1, fx.splat_t * 4);
            }
        }

        if (t > 2.8) fx = null;
    }

    function getShakeOffset() {
        if (screenShake <= 0) return [0, 0];
        return [(Math.random() - 0.5) * screenShake * 12, (Math.random() - 0.5) * screenShake * 12];
    }

    function render(ctx, W, H) {
        if (!fx) return;
        const t = fx.t;

        // ── 물 첨벙 ──────────────────────────────────
        if (fx.type === 'water') {
            // 파문
            for (const r of fx.ripples) {
                if (r.a <= 0) continue;
                ctx.save();
                ctx.globalAlpha = Math.max(0, r.a);
                ctx.strokeStyle = '#81D4FA'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.ellipse(fx.px, fx.py, r.r, r.r * 0.38, 0, 0, Math.PI * 2);
                ctx.stroke(); ctx.restore();
            }
            // 물방울
            for (const p of fx.particles) {
                if (p.a <= 0) continue;
                ctx.save(); ctx.globalAlpha = Math.max(0, p.a);
                ctx.fillStyle = '#64B5F6';
                ctx.beginPath(); ctx.ellipse(p.x, p.y, p.sz * 0.45, p.sz, 0, 0, Math.PI * 2);
                ctx.fill(); ctx.restore();
            }
            // 캐릭터 가라앉기
            const sinkAlpha = Math.max(0, 1 - t * 2.5);
            if (sinkAlpha > 0) {
                ctx.save(); ctx.globalAlpha = sinkAlpha;
                ctx.translate(fx.px, fx.py + t * 70);
                ctx.scale(1, Math.max(0.05, 1 - t * 2));
                CharRenderer.render(ctx, fx.charData, 0, 0, 0.85, 0, 0, 'up', true);
                ctx.restore();
            }
            // "풍덩!" 텍스트
            if (t < 1.0) {
                ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t * 1.4);
                ctx.font = `bold ${36 + t * 14}px Outfit, sans-serif`;
                ctx.textAlign = 'center';
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
                ctx.strokeText('풍덩! 💦', fx.px, fx.py - 45 - t * 55);
                ctx.fillStyle = '#29B6F6';
                ctx.fillText('풍덩! 💦', fx.px, fx.py - 45 - t * 55);
                ctx.restore();
            }
        }

        // ── 기차에 날아가기 ───────────────────────────
        else if (fx.type === 'train') {
            // 충격 방사형 선
            for (const p of fx.particles) {
                if (p.a <= 0) continue;
                ctx.save(); ctx.globalAlpha = Math.max(0, p.a);
                ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(fx.px, fx.py);
                ctx.lineTo(fx.px + p.vx * 0.12, fx.py + p.vy * 0.12);
                ctx.stroke(); ctx.restore();
            }
            // ⭐ 별 빙글빙글
            for (let i = 0; i < 5; i++) {
                const a = fx.angle + i * (Math.PI * 2 / 5);
                const r = 30 + Math.sin(t * 8) * 6;
                ctx.save(); ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('⭐', fx.px + Math.cos(a) * r, fx.py + Math.sin(a) * r - 28);
                ctx.restore();
            }
            // 날아가는 캐릭터
            if (fx.charY < H + 150) {
                ctx.save();
                ctx.translate(fx.charX, fx.charY);
                ctx.rotate(fx.angle);
                CharRenderer.render(ctx, fx.charData, 0, 0, 0.85, 0.25, 0, 'up', true);
                ctx.restore();
            }
            // "쾅!!" 텍스트
            if (t < 0.55) {
                const pop = Math.max(0, 1 - t * 2.5);
                ctx.save(); ctx.globalAlpha = pop;
                ctx.font = `bold ${44 + (1 - pop) * 10}px Outfit, sans-serif`;
                ctx.textAlign = 'center';
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
                ctx.strokeText('쾅!! 🚂', W / 2, H / 2 - 30);
                ctx.fillStyle = '#FF3D00';
                ctx.fillText('쾅!! 🚂', W / 2, H / 2 - 30);
                ctx.restore();
            }
        }

        // ── 차에 화면 박치기 ──────────────────────────
        else if (fx.type === 'car') {
            if (fx.phase === 'zoom') {
                // 캐릭터가 점점 커지면서 돌진
                ctx.save();
                ctx.translate(W / 2, fx.charY);
                ctx.scale(fx.scale, fx.scale);
                CharRenderer.render(ctx, fx.charData, 0, 0, 0.85, 0, 0, 'up', false);
                ctx.restore();
                // 속도감 방사선
                ctx.save(); ctx.globalAlpha = 0.12 * Math.min(1, fx.scale / 2);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
                for (let i = 0; i < 18; i++) {
                    const a = (Math.PI * 2 * i / 18);
                    ctx.beginPath();
                    ctx.moveTo(W / 2 + Math.cos(a) * 18, H / 2 + Math.sin(a) * 18);
                    ctx.lineTo(W / 2 + Math.cos(a) * W, H / 2 + Math.sin(a) * H);
                    ctx.stroke();
                }
                ctx.restore();
            } else {
                const st = fx.splat_t;
                // 흰 번쩍임
                if (st < 0.08) {
                    ctx.save(); ctx.globalAlpha = 1 - st / 0.08;
                    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore();
                }
                // 납작하게 찌그러진 캐릭터 (얼굴이 화면에 비삐진 느낌)
                ctx.save();
                ctx.translate(W / 2, H / 2 + 10);
                const squishY = Math.max(0.12, 0.55 - st * 1.2);
                const squishX = 3.5 + st * 0.3;
                ctx.scale(squishX, squishY);
                CharRenderer.render(ctx, fx.charData, 0, 0, 0.85, 0, 0.8, 'up', false);
                ctx.restore();
                // 화면 균열
                if (fx.crackProgress > 0) {
                    drawScreenCracks(ctx, W, H, fx.crackProgress);
                }
                // "퍽!!" 텍스트
                if (st < 0.7) {
                    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - st * 1.8);
                    ctx.font = `bold 52px Outfit, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7;
                    ctx.strokeText('퍽!! 🚗', W / 2, H / 2 - 100);
                    ctx.fillStyle = '#FF6B6B';
                    ctx.fillText('퍽!! 🚗', W / 2, H / 2 - 100);
                    ctx.restore();
                }
                // 흔들린 후 어두워짐
                ctx.save(); ctx.globalAlpha = Math.min(0.5, st * 0.6);
                ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
            }
        }
    }

    return {
        trigger,
        update,
        render,
        getShakeOffset,
        isActive: () => fx !== null,
        clear: () => { fx = null; screenShake = 0; },
    };
})();
