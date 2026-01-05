// Touch controls for Claw Machine game
(function () {
    function initClawTouchControls() {
        const upBtn = document.getElementById('upBtn');
        const downBtn = document.getElementById('downBtn');
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const grabBtn = document.getElementById('grabBtn');

        if (upBtn) {
            upBtn.addEventListener('click', function () {
                // Simulate ArrowUp key press
                const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
                document.dispatchEvent(event);
            });
        }

        if (downBtn) {
            downBtn.addEventListener('click', function () {
                const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
                document.dispatchEvent(event);
            });
        }

        if (leftBtn) {
            leftBtn.addEventListener('click', function () {
                const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
                document.dispatchEvent(event);
            });
        }

        if (rightBtn) {
            rightBtn.addEventListener('click', function () {
                const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
                document.dispatchEvent(event);
            });
        }

        if (grabBtn) {
            grabBtn.addEventListener('click', function () {
                const event = new KeyboardEvent('keydown', { key: ' ' });
                document.dispatchEvent(event);
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClawTouchControls);
    } else {
        initClawTouchControls();
    }
})();
