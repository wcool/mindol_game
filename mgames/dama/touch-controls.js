// Touch controls for Tamagotchi mini-game
(function () {
    // Wait for DOM to be ready
    function initTouchControls() {
        const moveLeftBtn = document.getElementById('moveLeftBtn');
        const moveRightBtn = document.getElementById('moveRightBtn');

        if (moveLeftBtn) {
            moveLeftBtn.addEventListener('click', function () {
                if (window.miniGame && window.miniGame.active) {
                    window.miniGame.player.x = Math.max(0, window.miniGame.player.x - 15);
                }
            });
        }

        if (moveRightBtn) {
            moveRightBtn.addEventListener('click', function () {
                if (window.miniGame && window.miniGame.active && window.miniGame.canvas) {
                    window.miniGame.player.x = Math.min(window.miniGame.canvas.width - 30, window.miniGame.player.x + 15);
                }
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTouchControls);
    } else {
        initTouchControls();
    }
})();
