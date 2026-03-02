'use strict';
// ═══════════════════════════════════════
//  MAIN.JS – 화면 전환 & 게임 연결
// ═══════════════════════════════════════

(function () {
    // ─── 화면 전환 ──────────────────────────
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    // ─── Canvas 크기 설정 ──────────────────
    function resizeCanvas() {
        const canvas = document.getElementById('game-canvas');
        const W = Math.min(window.innerWidth, 648); // COLS(9) * TILE(72)
        const H = Math.min(window.innerHeight, 792); // VIEW_ROWS(11) * TILE(72)
        canvas.width = W;
        canvas.height = H;
        // adjust tile to fit screen
        const tileW = Math.floor(W / COLS);
        if (typeof TILE !== 'undefined') {
            // patch TILE dynamically
        }
    }

    // ─── 모바일 판별 ───────────────────────
    function isMobile() {
        return 'ontouchstart' in window || window.matchMedia('(pointer:coarse)').matches;
    }

    // ─── 홈화면 업데이트 ───────────────────
    function updateHome() {
        document.getElementById('home-coin-display').textContent = `🪙 ${Storage.getCoins()}`;
        document.getElementById('home-highscore').textContent = `${Storage.getHighScore()}m`;
        const sel = CHARACTERS.find(c => c.id === Storage.getSelected()) || CHARACTERS[0];
        document.getElementById('home-char-name').textContent = sel.name;
        renderHomePreview(sel);
    }

    let homePreviewAnimId = null;
    let homePreviewAngle = 0;
    function renderHomePreview(char) {
        if (homePreviewAnimId) cancelAnimationFrame(homePreviewAnimId);
        const canvas = document.getElementById('home-preview-canvas');
        const ctx = canvas.getContext('2d');
        function frame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const bob = Math.sin(homePreviewAngle) * 5;
            CharRenderer.render(ctx, char, canvas.width / 2, canvas.height / 2 + 20 + bob, 1.5, 0, 0, 'up', true);
            homePreviewAngle += 0.035;
            homePreviewAnimId = requestAnimationFrame(frame);
        }
        frame();
    }

    // ─── 게임 시작 ─────────────────────────
    function applyActiveItems() {
        ActiveItems.reset();
        // headstart만 게임 시작 전 자동 소모 (위치 설정 필요)
        // shield/magnet/coin2x는 게임 중 핫바에서 수동 사용
        if (Storage.getItemCount('headstart') > 0 && Storage.useItem('headstart')) {
            ActiveItems.activate('headstart');
        }
    }

    function startGame() {
        if (homePreviewAnimId) { cancelAnimationFrame(homePreviewAnimId); homePreviewAnimId = null; }
        applyActiveItems();
        showScreen('screen-game');

        const canvas = document.getElementById('game-canvas');
        canvas.width = Math.min(window.innerWidth, COLS * TILE);
        canvas.height = Math.min(window.innerHeight, VIEW_ROWS * TILE);

        const sel = CHARACTERS.find(c => c.id === Storage.getSelected()) || CHARACTERS[0];
        Game.init(canvas, sel);
        Game.start();

        // Mobile controls
        const mc = document.getElementById('mobile-controls');
        if (isMobile()) mc.classList.add('visible');

        onGameOver = (score, coins) => {
            document.getElementById('result-score').textContent = `${score}m`;
            document.getElementById('result-coins').textContent = `🪙 ${coins}`;
            document.getElementById('result-highscore').textContent = `${Storage.getHighScore()}m`;
            document.getElementById('overlay-gameover').classList.remove('hidden');
        };
    }

    // ─── 이벤트 바인딩 ─────────────────────
    // Home → Start
    document.getElementById('btn-start').addEventListener('click', startGame);

    // Home → Shop
    document.getElementById('btn-shop').addEventListener('click', () => {
        if (homePreviewAnimId) { cancelAnimationFrame(homePreviewAnimId); homePreviewAnimId = null; }
        showScreen('screen-shop');
        Shop.mount(document.getElementById('screen-shop'));
    });

    // Shop → Back
    document.getElementById('btn-shop-back').addEventListener('click', () => {
        Shop.unmount();
        showScreen('screen-home');
        updateHome();
    });

    // Game Over → Retry
    document.getElementById('btn-retry').addEventListener('click', () => {
        document.getElementById('overlay-gameover').classList.add('hidden');
        Game.reset();
    });

    // Game Over → Home
    document.getElementById('btn-home').addEventListener('click', () => {
        document.getElementById('overlay-gameover').classList.add('hidden');
        Game.stop();
        const mc = document.getElementById('mobile-controls');
        mc.classList.remove('visible');
        showScreen('screen-home');
        updateHome();
    });

    // Pause
    document.getElementById('btn-pause').addEventListener('click', () => {
        Game.stop();
        // Simple pause: show gameover-like panel with resume
        // For now, go home
        const mc = document.getElementById('mobile-controls');
        mc.classList.remove('visible');
        showScreen('screen-home');
        updateHome();
    });

    // D-pad
    const dpadMap = {
        'dpad-up': [0, 1], 'dpad-down': [0, -1],
        'dpad-left': [-1, 0], 'dpad-right': [1, 0],
    };
    Object.entries(dpadMap).forEach(([id, dir]) => {
        const btn = document.getElementById(id);
        function press(e) { e.preventDefault(); if (document.getElementById('screen-game').classList.contains('active')) Game.enqueueMove(...dir); }
        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('mousedown', press);
    });

    // Swipe support
    let swipeStart = null;
    document.getElementById('game-canvas').addEventListener('touchstart', e => {
        swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    document.getElementById('game-canvas').addEventListener('touchend', e => {
        if (!swipeStart) return;
        const dx = e.changedTouches[0].clientX - swipeStart.x;
        const dy = e.changedTouches[0].clientY - swipeStart.y;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        if (adx < 15 && ady < 15) { Game.enqueueMove(0, 1); }
        else if (adx > ady) { Game.enqueueMove(dx > 0 ? 1 : -1, 0); }
        else { Game.enqueueMove(0, dy < 0 ? 1 : -1); }
        swipeStart = null;
    }, { passive: true });

    // ─── 초기화 ────────────────────────────
    showScreen('screen-home');
    updateHome();
})();
