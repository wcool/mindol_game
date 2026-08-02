// Touch controls for Tamagotchi mini-game
(function () {
    var MOVE_STEP = 15;
    var HOLD_REPEAT_MS = 80;

    function movePlayer(dir) {
        var mg = window.miniGame;
        if (!mg || !mg.active || !mg.canvas) return;
        if (dir < 0) {
            mg.player.x = Math.max(0, mg.player.x - MOVE_STEP);
        } else {
            mg.player.x = Math.min(mg.canvas.width - 30, mg.player.x + MOVE_STEP);
        }
    }

    // 버튼을 누르고 있으면 계속 이동
    function bindHoldButton(btn, dir) {
        var holdTimer = null;

        function start(e) {
            if (e.cancelable) e.preventDefault();
            movePlayer(dir);
            stop();
            holdTimer = setInterval(function () {
                movePlayer(dir);
            }, HOLD_REPEAT_MS);
        }

        function stop() {
            if (holdTimer) {
                clearInterval(holdTimer);
                holdTimer = null;
            }
        }

        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', stop);
        btn.addEventListener('touchcancel', stop);
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', stop);
        btn.addEventListener('mouseleave', stop);
    }

    // 캔버스 터치/드래그로 플레이어 직접 이동
    function bindCanvasTouch(canvas) {
        function moveToTouch(e) {
            var mg = window.miniGame;
            if (!mg || !mg.active || !mg.canvas) return;
            if (e.cancelable) e.preventDefault();
            var touch = e.touches ? e.touches[0] : e;
            var rect = canvas.getBoundingClientRect();
            var scaleX = canvas.width / rect.width;
            var x = (touch.clientX - rect.left) * scaleX;
            mg.player.x = Math.max(0, Math.min(mg.canvas.width - 30, x - 15));
        }

        canvas.addEventListener('touchstart', moveToTouch, { passive: false });
        canvas.addEventListener('touchmove', moveToTouch, { passive: false });
    }

    function initTouchControls() {
        var moveLeftBtn = document.getElementById('moveLeftBtn');
        var moveRightBtn = document.getElementById('moveRightBtn');
        var canvas = document.getElementById('gameCanvas');

        if (moveLeftBtn) bindHoldButton(moveLeftBtn, -1);
        if (moveRightBtn) bindHoldButton(moveRightBtn, 1);
        if (canvas) bindCanvasTouch(canvas);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTouchControls);
    } else {
        initTouchControls();
    }
})();
