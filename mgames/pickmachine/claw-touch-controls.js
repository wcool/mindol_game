// Touch controls for Claw Machine game
(function () {
    // 키 입력을 시뮬레이션
    function pressKey(key) {
        const event = new KeyboardEvent('keydown', { key: key });
        document.dispatchEvent(event);
    }

    // 방향 버튼: 누르고 있으면 반복 이동 (터치/마우스 모두 지원)
    function bindHoldButton(btn, key) {
        if (!btn) return;

        let repeatTimer = null;

        function start(e) {
            e.preventDefault(); // 터치 시 화면 스크롤 및 고스트 클릭 방지
            if (repeatTimer !== null) return;
            pressKey(key);
            repeatTimer = setInterval(function () {
                pressKey(key);
            }, 130);
        }

        function stop() {
            if (repeatTimer !== null) {
                clearInterval(repeatTimer);
                repeatTimer = null;
            }
        }

        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', stop);
        btn.addEventListener('touchcancel', stop);
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', stop);
        btn.addEventListener('mouseleave', stop);
    }

    function initClawTouchControls() {
        bindHoldButton(document.getElementById('upBtn'), 'ArrowUp');
        bindHoldButton(document.getElementById('downBtn'), 'ArrowDown');
        bindHoldButton(document.getElementById('leftBtn'), 'ArrowLeft');
        bindHoldButton(document.getElementById('rightBtn'), 'ArrowRight');

        // 뽑기 버튼: 한 번 탭 (중복 실행은 게임 내 isGrabbing이 방지)
        const grabBtn = document.getElementById('grabBtn');
        if (grabBtn) {
            grabBtn.addEventListener('touchstart', function (e) {
                e.preventDefault();
                pressKey(' ');
            }, { passive: false });
            grabBtn.addEventListener('click', function () {
                pressKey(' ');
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
