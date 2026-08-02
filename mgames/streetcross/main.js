'use strict';
// ═══════════════════════════════════════
//  MAIN.JS – 화면 전환 & 게임 연결 & 일시정지/음소거
// ═══════════════════════════════════════

(function () {
    // ─── 화면 전환 ──────────────────────────
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
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

        onGameOver = (score, coins, isRecord) => {
            document.getElementById('result-score').textContent = `${score}m`;
            document.getElementById('result-coins').textContent = `🪙 ${coins}`;
            document.getElementById('result-highscore').textContent = `${Storage.getHighScore()}m`;
            document.getElementById('result-newrecord').classList.toggle('hidden', !isRecord);
            document.getElementById('overlay-gameover').classList.remove('hidden');
        };
    }

    // ─── 일시정지 ──────────────────────────
    function togglePause() {
        const overlay = document.getElementById('overlay-pause');
        if (Game.isPaused()) {
            overlay.classList.add('hidden');
            Game.resume();
        } else if (Game.pause()) {
            overlay.classList.remove('hidden');
        }
    }

    function goHome() {
        document.getElementById('overlay-pause').classList.add('hidden');
        document.getElementById('overlay-gameover').classList.add('hidden');
        Game.stop();
        document.getElementById('mobile-controls').classList.remove('visible');
        showScreen('screen-home');
        updateHome();
    }

    // ─── 음소거 ────────────────────────────
    function updateMuteBtn() {
        const btn = document.getElementById('btn-mute');
        const muted = SFX.isMuted();
        btn.textContent = muted ? '🔇' : '🔊';
        btn.title = muted ? '소리 켜기' : '소리 끄기';
        btn.classList.toggle('muted', muted);
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
    document.getElementById('btn-home').addEventListener('click', goHome);

    // Pause (일시정지 / 계속하기 / 다시 시작 / 홈으로)
    document.getElementById('btn-pause').addEventListener('click', togglePause);
    document.getElementById('btn-resume').addEventListener('click', togglePause);
    document.getElementById('btn-pause-restart').addEventListener('click', () => {
        document.getElementById('overlay-pause').classList.add('hidden');
        Game.reset();
        Game.resume();
    });
    document.getElementById('btn-pause-home').addEventListener('click', goHome);

    // ESC / P 키로 일시정지 토글
    document.addEventListener('keydown', e => {
        if (e.code !== 'Escape' && e.code !== 'KeyP') return;
        if (!document.getElementById('screen-game').classList.contains('active')) return;
        if (!document.getElementById('overlay-gameover').classList.contains('hidden')) return;
        togglePause();
    });

    // Mute
    document.getElementById('btn-mute').addEventListener('click', () => {
        SFX.setMuted(!SFX.isMuted());
        updateMuteBtn();
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
        const touch = e.changedTouches[0];
        const dx = touch.clientX - swipeStart.x;
        const dy = touch.clientY - swipeStart.y;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        if (adx < 15 && ady < 15) {
            // 핫바 버튼 탭이면 이동하지 않음 (아이템 사용과 충돌 방지)
            if (!Game.hitTestHotbar(touch.clientX, touch.clientY)) Game.enqueueMove(0, 1);
        }
        else if (adx > ady) { Game.enqueueMove(dx > 0 ? 1 : -1, 0); }
        else { Game.enqueueMove(0, dy < 0 ? 1 : -1); }
        swipeStart = null;
    }, { passive: true });

    // ─── 초기화 ────────────────────────────
    showScreen('screen-home');
    updateHome();
    updateMuteBtn();
})();
