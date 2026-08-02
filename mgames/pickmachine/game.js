// 게임 상태 관리
const GameState = {
    HOME: 'home',
    GAME: 'game',
    COLLECTION: 'collection'
};

let currentState = GameState.HOME;
let collectedDolls = {}; // { dollId: count }
let currentGameDolls = []; // 현재 게임의 인형들
let gameStats = { plays: 0, wins: 0 }; // 누적 통계

// ===== 사운드 엔진 (Web Audio API, 외부 파일 없음) =====
const SFX = (() => {
    let ctx = null;
    let muted = localStorage.getItem('clawMachineMuted') === '1';

    function getCtx() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    // 간단한 톤 재생 헬퍼
    function tone(freq, duration, opts = {}) {
        if (muted) return;
        const ac = getCtx();
        if (!ac) return;
        const { type = 'sine', volume = 0.12, delay = 0, slideTo = null } = opts;
        const t0 = ac.currentTime + delay;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + duration);
        }
        gain.gain.setValueAtTime(volume, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.05);
    }

    return {
        isMuted: () => muted,
        toggleMute() {
            muted = !muted;
            localStorage.setItem('clawMachineMuted', muted ? '1' : '0');
            if (!muted) tone(660, 0.08, { type: 'square', volume: 0.08 });
            return muted;
        },
        move() { tone(320, 0.05, { type: 'square', volume: 0.04 }); },
        click() { tone(520, 0.06, { type: 'triangle', volume: 0.1 }); },
        descend() { tone(220, 0.6, { type: 'sawtooth', volume: 0.06, slideTo: 110 }); },
        rise() { tone(110, 0.6, { type: 'sawtooth', volume: 0.05, slideTo: 220 }); },
        grab() {
            tone(180, 0.12, { type: 'square', volume: 0.12 });
            tone(140, 0.15, { type: 'square', volume: 0.1, delay: 0.1 });
        },
        miss() { tone(280, 0.3, { type: 'sawtooth', volume: 0.1, slideTo: 90 }); },
        drop() { tone(420, 0.12, { type: 'triangle', volume: 0.12, slideTo: 200 }); },
        win(rarity) {
            // 승리 팡파레 (도, 미, 솔, 도)
            [523, 659, 784, 1047].forEach((f, i) => {
                tone(f, 0.18, { type: 'triangle', volume: 0.12, delay: i * 0.12 });
            });
            // 레어 이상은 추가 반짝임 효과음
            if (rarity === 'super_rare' || rarity === 'secret') {
                [1319, 1568, 2093].forEach((f, i) => {
                    tone(f, 0.25, { type: 'sine', volume: 0.09, delay: 0.55 + i * 0.13 });
                });
            }
        }
    };
})();

// 로컬 스토리지에서 데이터 로드
function loadGameData() {
    try {
        const saved = localStorage.getItem('clawMachineCollection');
        if (saved) {
            collectedDolls = JSON.parse(saved) || {};
        }
    } catch (e) {
        collectedDolls = {};
    }
    try {
        const savedStats = localStorage.getItem('clawMachineStats');
        if (savedStats) {
            const parsed = JSON.parse(savedStats);
            gameStats.plays = parsed.plays || 0;
            gameStats.wins = parsed.wins || 0;
        }
    } catch (e) {
        gameStats = { plays: 0, wins: 0 };
    }
}

// 로컬 스토리지에 데이터 저장
function saveGameData() {
    localStorage.setItem('clawMachineCollection', JSON.stringify(collectedDolls));
    localStorage.setItem('clawMachineStats', JSON.stringify(gameStats));
}

// 화면 전환
function switchScreen(state) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    switch (state) {
        case GameState.HOME:
            document.getElementById('home-screen').classList.add('active');
            updateHomeStats();
            break;
        case GameState.GAME:
            document.getElementById('game-screen').classList.add('active');
            initGame();
            break;
        case GameState.COLLECTION:
            document.getElementById('collection-screen').classList.add('active');
            renderCollection();
            break;
    }

    currentState = state;
}

// 홈 화면 통계 업데이트
function updateHomeStats() {
    const collectedCount = Object.keys(collectedDolls).length;
    const totalCount = DOLLS_DATA.length;
    const rate = Math.round((collectedCount / totalCount) * 100);

    document.getElementById('collected-count').textContent = `${collectedCount} / ${totalCount}`;
    document.getElementById('collection-rate').textContent = `${rate}%`;

    const winsElement = document.getElementById('total-wins');
    if (winsElement) {
        winsElement.textContent = `${gameStats.wins}회`;
    }
}

// 등급별 랜덤 인형 선택
function getRandomDollByRarity() {
    const random = Math.random() * 100;
    let rarity;

    if (random < RARITY_WEIGHTS.secret) {
        rarity = 'secret';
    } else if (random < RARITY_WEIGHTS.secret + RARITY_WEIGHTS.super_rare) {
        rarity = 'super_rare';
    } else if (random < RARITY_WEIGHTS.secret + RARITY_WEIGHTS.super_rare + RARITY_WEIGHTS.rare) {
        rarity = 'rare';
    } else {
        rarity = 'common';
    }

    const dollsOfRarity = DOLLS_DATA.filter(d => d.rarity === rarity);
    return dollsOfRarity[Math.floor(Math.random() * dollsOfRarity.length)];
}

// 게임 초기화
function initGame() {
    currentGameDolls = [];
    const container = document.getElementById('dolls-container');
    container.innerHTML = '';

    // 집게에 남아있는 인형 정리
    caughtDollElement = null;
    document.querySelectorAll('#claw .doll-item').forEach(el => el.remove());

    // 30-50개의 랜덤 인형 생성
    const dollCount = 30 + Math.floor(Math.random() * 21);

    for (let i = 0; i < dollCount; i++) {
        const doll = getRandomDollByRarity();
        currentGameDolls.push(doll);

        const dollElement = document.createElement('div');
        dollElement.className = `doll-item ${doll.rarity}`;
        dollElement.dataset.dollId = doll.id;

        // 실제 이미지 사용 - 인형 데이터의 이미지 경로 사용
        const img = document.createElement('img');
        // 인형 데이터에 이미지가 있으면 사용, 없으면 등급별 기본 이미지 사용
        img.src = doll.image || getPlaceholderImage(doll.rarity);
        img.alt = doll.name;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        dollElement.appendChild(img);

        // 랜덤 위치 배치 - 하단 영역에만 배치
        const maxX = container.clientWidth - 70;
        const maxY = container.clientHeight - 70;
        const minY = maxY * 0.6; // 하단 60% 지점부터 시작

        dollElement.style.left = Math.random() * maxX + 'px';
        dollElement.style.top = (minY + Math.random() * (maxY - minY)) + 'px';

        container.appendChild(dollElement);
    }

    resetClawPosition();
}

// 등급별 플레이스홀더 이미지 (생성된 이미지 사용)
function getPlaceholderImage(rarity) {
    const images = {
        common: [
            'assets/dolls/individual/common_bunny.png',
            'assets/dolls/individual/common_bear.png',
            'assets/dolls/individual/common_cat.png',
            'assets/dolls/individual/common_dog.png'
        ],
        rare: [
            'assets/dolls/individual/rare_fox.png',
            'assets/dolls/individual/rare_panda.png',
            'assets/dolls/individual/rare_penguin.png'
        ],
        super_rare: [
            'assets/dolls/individual/super_rare_unicorn.png',
            'assets/dolls/individual/super_rare_dragon.png'
        ],
        secret: [
            'assets/dolls/individual/secret_rainbow.png'
        ]
    };

    const rarityImages = images[rarity] || images.common;
    return rarityImages[Math.floor(Math.random() * rarityImages.length)];
}

// 등급별 이모지
function getDollEmoji(rarity) {
    const emojis = {
        common: ['🐰', '🐻', '🐱', '🐶', '🐼', '🦊', '🐿️', '🐹', '🐧', '🦆'],
        rare: ['✨🐰', '✨🐻', '✨🐱', '✨🐶', '✨🐼', '✨🦊', '✨🐧', '✨🦉'],
        super_rare: ['🌟🐰', '🌟🐻', '🌟🐱', '🌟🐶', '🌟🐼', '🌟🦊', '🌟🦄'],
        secret: ['🌈🦄', '🌈✨', '🌈⭐', '🌈💎', '🌈👑']
    };

    const emojiList = emojis[rarity] || emojis.common;
    return emojiList[Math.floor(Math.random() * emojiList.length)];
}

// 집게 위치 관리
let clawPosition = { x: 50, y: 0 }; // 퍼센트 단위
let isGrabbing = false;

function resetClawPosition() {
    clawPosition = { x: 50, y: 0 };
    updateClawPosition();
}

function updateClawPosition() {
    const container = document.getElementById('claw-container');
    container.style.left = `${clawPosition.x}%`;
    container.style.top = `${clawPosition.y}px`;
}

// 키보드 조작
document.addEventListener('keydown', (e) => {
    if (currentState !== GameState.GAME || isGrabbing) return;
    // 결과 모달이 열려 있으면 조작 금지
    if (document.getElementById('result-modal').classList.contains('active')) return;

    switch (e.key.toLowerCase()) {
        case 'arrowleft':
            e.preventDefault(); // 화면 스크롤 방지
            clawPosition.x = Math.max(10, clawPosition.x - 5);
            updateClawPosition();
            SFX.move();
            break;
        case 'arrowright':
            e.preventDefault();
            clawPosition.x = Math.min(90, clawPosition.x + 5);
            updateClawPosition();
            SFX.move();
            break;
        case 'arrowup':
            e.preventDefault();
            clawPosition.y = Math.max(0, clawPosition.y - 10);
            updateClawPosition();
            SFX.move();
            break;
        case 'arrowdown':
            e.preventDefault();
            clawPosition.y = Math.min(50, clawPosition.y + 10);
            updateClawPosition();
            SFX.move();
            break;
        case 's':
        case ' ':
            e.preventDefault(); // 스페이스바 스크롤 방지
            startGrabbing();
            break;
    }
});

// 뽑기 시작
function startGrabbing() {
    if (isGrabbing) return;
    isGrabbing = true;

    gameStats.plays++;
    saveGameData();

    const claw = document.getElementById('claw');
    const cable = document.getElementById('claw-cable');

    // 집게 내려가기
    claw.classList.add('grabbing');
    SFX.descend();
    let currentHeight = 100;

    const dropInterval = setInterval(() => {
        currentHeight += 10;
        cable.style.height = currentHeight + 'px';

        if (currentHeight >= 400) {
            clearInterval(dropInterval);
            SFX.grab();

            // 인형 잡기 시도
            setTimeout(() => {
                const caughtDoll = tryToCatchDoll();

                // 집게 올라가기
                SFX.rise();
                const riseInterval = setInterval(() => {
                    currentHeight -= 10;
                    cable.style.height = currentHeight + 'px';

                    if (currentHeight <= 100) {
                        clearInterval(riseInterval);
                        cable.style.height = '100px';

                        if (caughtDoll) {
                            // 성공 시 경품 출구로 이동
                            moveToExit(claw, caughtDoll);
                        } else {
                            // 실패
                            claw.classList.remove('grabbing');
                            isGrabbing = false;
                            SFX.miss();
                            setTimeout(() => {
                                if (confirm('아쉽게도 놓쳤습니다! 다시 시도하시겠습니까?')) {
                                    // 계속 플레이
                                } else {
                                    switchScreen(GameState.HOME);
                                }
                            }, 500);
                        }
                    }
                }, 50);
            }, 500);
        }
    }, 50);
}

// 경품 출구로 이동
function moveToExit(claw, caughtDoll) {
    const container = document.getElementById('claw-container');
    const startX = clawPosition.x;
    const targetX = 50; // 중앙으로 이동
    const duration = 1000; // 1초
    const startTime = Date.now();

    const moveInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 부드러운 이동 (easeInOutQuad)
        const easeProgress = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        clawPosition.x = startX + (targetX - startX) * easeProgress;
        updateClawPosition();

        if (progress >= 1) {
            clearInterval(moveInterval);

            // 인형 떨어뜨리기
            setTimeout(() => {
                claw.classList.remove('grabbing');
                SFX.drop();
                if (caughtDollElement) {
                    const dropped = caughtDollElement;
                    caughtDollElement = null;
                    dropped.classList.add('dropping');
                    setTimeout(() => dropped.remove(), 500);
                }
                setTimeout(() => {
                    isGrabbing = false;
                    showResult(caughtDoll);
                }, 400);
            }, 300);
        }
    }, 16); // ~60fps
}

// 집게에 매달린 인형 요소
let caughtDollElement = null;

// 인형 잡기 시도
function tryToCatchDoll() {
    const clawContainer = document.getElementById('claw-container');
    const clawRect = clawContainer.getBoundingClientRect();
    const dolls = document.querySelectorAll('.doll-item');

    for (let dollElement of dolls) {
        if (dollElement.classList.contains('caught')) continue;
        const dollRect = dollElement.getBoundingClientRect();

        // 충돌 감지
        if (
            clawRect.left < dollRect.right &&
            clawRect.right > dollRect.left &&
            clawRect.top < dollRect.bottom &&
            clawRect.bottom > dollRect.top
        ) {
            // 성공 확률 (등급별로 다름)
            const dollId = parseInt(dollElement.dataset.dollId);
            const doll = DOLLS_DATA.find(d => d.id === dollId);

            let successRate = 0.7; // 기본 70%
            if (doll.rarity === 'rare') successRate = 0.5;
            if (doll.rarity === 'super_rare') successRate = 0.3;
            if (doll.rarity === 'secret') successRate = 0.15;

            if (Math.random() < successRate) {
                // 잡은 인형을 집게에 매달아 함께 이동시키기
                dollElement.style.left = '';
                dollElement.style.top = '';
                dollElement.classList.add('caught');
                document.getElementById('claw').appendChild(dollElement);
                caughtDollElement = dollElement;
                return doll;
            }
        }
    }

    return null;
}

// 승리 축하 색종이 효과
function launchConfetti() {
    const modal = document.getElementById('result-modal');
    const colors = ['#FFD700', '#FF6B9D', '#60A5FA', '#A855F7', '#4ADE80', '#FFA07A'];

    for (let i = 0; i < 40; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = colors[i % colors.length];
        const size = 6 + Math.random() * 7;
        piece.style.width = size + 'px';
        piece.style.height = size + 'px';
        piece.style.animationDelay = (Math.random() * 0.6) + 's';
        piece.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
        modal.appendChild(piece);
        setTimeout(() => piece.remove(), 3500);
    }
}

// 결과 표시
function showResult(doll) {
    const modal = document.getElementById('result-modal');
    const isNew = !collectedDolls[doll.id];

    // 도감에 추가
    if (collectedDolls[doll.id]) {
        collectedDolls[doll.id]++;
    } else {
        collectedDolls[doll.id] = 1;
    }
    gameStats.wins++;
    saveGameData();

    SFX.win(doll.rarity);

    // 모달 내용 설정
    document.getElementById('result-icon').textContent = isNew ? '🎉' : '✨';
    document.getElementById('result-title').textContent = isNew ? '새로운 인형 획득!' : '인형 획득!';
    document.getElementById('result-doll-img').src = doll.image;
    document.getElementById('result-doll-img').alt = doll.name;
    document.getElementById('result-name').textContent = doll.name;

    const rarityElement = document.getElementById('result-rarity');
    rarityElement.className = `result-rarity rarity-${doll.rarity}`;
    rarityElement.textContent = getRarityText(doll.rarity);

    document.getElementById('result-status').textContent = isNew
        ? '도감에 새로 등록되었습니다!'
        : `보유 개수: ${collectedDolls[doll.id]}개`;

    modal.classList.add('active');
    launchConfetti();
}

// 등급 텍스트
function getRarityText(rarity) {
    const texts = {
        common: '기본',
        rare: '레어',
        super_rare: '슈퍼레어',
        secret: '시크릿'
    };
    return texts[rarity] || '기본';
}

// 도감 렌더링
function renderCollection(filterRarity = 'all') {
    const grid = document.getElementById('collection-grid');
    grid.innerHTML = '';

    const collectedCount = Object.keys(collectedDolls).length;
    document.getElementById('collection-progress').textContent = `${collectedCount} / ${DOLLS_DATA.length}`;

    const filteredDolls = filterRarity === 'all'
        ? DOLLS_DATA
        : DOLLS_DATA.filter(d => d.rarity === filterRarity);

    filteredDolls.forEach(doll => {
        const isUnlocked = collectedDolls[doll.id] > 0;
        const count = collectedDolls[doll.id] || 0;

        const item = document.createElement('div');
        item.className = `collection-item ${isUnlocked ? 'unlocked' : 'locked'} ${doll.rarity}`;

        const imgSrc = isUnlocked ? doll.image : '';
        const imgHtml = isUnlocked
            ? `<img src="${imgSrc}" alt="${doll.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
            : '❓';

        item.innerHTML = `
            <div class="collection-item-img">
                ${imgHtml}
            </div>
            <div class="collection-item-name">
                ${isUnlocked ? doll.name : '???'}
            </div>
            <div class="collection-item-rarity rarity-${doll.rarity}">
                ${getRarityText(doll.rarity)}
            </div>
            ${isUnlocked ? `<div class="collection-item-count">보유: ${count}개</div>` : ''}
        `;

        grid.appendChild(item);
    });
}

// 이벤트 리스너
document.getElementById('start-game-btn').addEventListener('click', () => {
    SFX.click();
    switchScreen(GameState.GAME);
});

document.getElementById('collection-btn').addEventListener('click', () => {
    SFX.click();
    switchScreen(GameState.COLLECTION);
});

document.getElementById('back-to-home').addEventListener('click', () => {
    if (isGrabbing) return; // 뽑기 중에는 이동 금지
    SFX.click();
    switchScreen(GameState.HOME);
});

document.getElementById('back-to-home-2').addEventListener('click', () => {
    SFX.click();
    switchScreen(GameState.HOME);
});

document.getElementById('continue-btn').addEventListener('click', () => {
    SFX.click();
    document.getElementById('result-modal').classList.remove('active');
});

// 인형 다시 채우기 버튼
document.getElementById('restart-game').addEventListener('click', () => {
    if (isGrabbing) return;
    SFX.click();
    initGame();
});

// 사운드 켜기/끄기 토글
const soundToggleBtn = document.getElementById('sound-toggle');

function updateSoundToggle() {
    const muted = SFX.isMuted();
    soundToggleBtn.textContent = muted ? '🔇' : '🔊';
    soundToggleBtn.title = muted ? '소리 켜기' : '소리 끄기';
}

soundToggleBtn.addEventListener('click', () => {
    SFX.toggleMute();
    updateSoundToggle();
});

updateSoundToggle();

// 도감 필터
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        SFX.click();
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderCollection(e.target.dataset.rarity);
    });
});

// 초기화
loadGameData();
updateHomeStats();
