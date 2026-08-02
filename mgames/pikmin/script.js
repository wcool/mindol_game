// 전역 변수
let gameState = {
    garden: new Array(9).fill(null),
    selectedSeedType: null,
    exp: 0,
    collection: {
        plants: [],   // 심어본 씨앗 종류
        blooms: []    // 꽃을 피워본 종류
    }
};

// 저장 키 (localStorage)
const SAVE_KEY = 'pikminBloomSave';
const MUTE_KEY = 'pikminBloomMuted';

// DOM 요소들
let elements = {};

// ===== 사운드 엔진 (Web Audio API) =====
const SoundEngine = {
    ctx: null,
    muted: localStorage.getItem(MUTE_KEY) === '1',

    getContext() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    },

    tone(freq, duration, type = 'sine', volume = 0.15, delay = 0) {
        if (this.muted) return;
        const ctx = this.getContext();
        if (!ctx) return;
        const t0 = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(volume, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duration);
    },

    click() { this.tone(600, 0.06, 'square', 0.06); },
    select() { this.tone(880, 0.08, 'triangle', 0.12); },
    plant() {
        this.tone(392, 0.1, 'sine', 0.15);
        this.tone(523, 0.12, 'sine', 0.15, 0.09);
    },
    water() {
        this.tone(700, 0.05, 'sine', 0.1);
        this.tone(900, 0.05, 'sine', 0.1, 0.06);
        this.tone(1100, 0.08, 'sine', 0.08, 0.12);
    },
    harvest() {
        this.tone(330, 0.08, 'square', 0.12);
        this.tone(494, 0.08, 'square', 0.12, 0.08);
        this.tone(659, 0.15, 'square', 0.12, 0.16);
    },
    bloom() {
        this.tone(523, 0.1, 'triangle', 0.12);
        this.tone(659, 0.1, 'triangle', 0.12, 0.1);
        this.tone(784, 0.2, 'triangle', 0.12, 0.2);
    },
    error() { this.tone(200, 0.15, 'sawtooth', 0.08); },

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
        return this.muted;
    }
};

// 초기화 함수
function initializeGame() {
    console.log('Initializing game...');

    // 요소들 찾기
    elements = {
        gardenGrid: document.getElementById('garden-grid'),
        plantBtn: document.getElementById('plant-btn'),
        waterAllBtn: document.getElementById('water-all-btn'),
        mushroomBtn: document.getElementById('mushroom-btn'),
        plantModal: document.getElementById('plant-modal'),
        modalClose: document.querySelector('.modal-close'),
        plantCountEl: document.getElementById('plant-count'),
        bloomCountEl: document.getElementById('bloom-count'),
        expEl: document.getElementById('exp'),
        notifications: document.getElementById('notifications'),
        gardenView: document.getElementById('garden-view'),
        collectionView: document.getElementById('collection-view'),
        settingsView: document.getElementById('settings-view'),
        gardenBtn: document.getElementById('garden-btn'),
        collectionBtn: document.getElementById('collection-btn'),
        settingsBtn: document.getElementById('settings-btn'),
        muteBtn: document.getElementById('mute-btn'),
        saveBtn: document.getElementById('save-btn'),
        loadBtn: document.getElementById('load-btn'),
        resetBtn: document.getElementById('reset-btn'),
        collectionGrid: document.getElementById('collection-grid')
    };

    console.log('Elements found:', elements);

    // 정원 슬롯 생성
    createGardenSlots();

    // 저장된 게임 자동 불러오기
    loadGame(true);

    // 이벤트 리스너 설정
    setupEventListeners();

    // 음소거 버튼 초기 상태
    updateMuteButton();

    // 초기 화면 설정
    showView('garden');

    // 디스플레이 업데이트
    updateDisplay();

    console.log('Game initialized successfully!');
    showNotification('피크민 블룸에 오신 것을 환영합니다! 🌸');

    // 주기적으로 게임 업데이트 (식물 성장)
    setInterval(updateGame, 1000); // 1초마다 업데이트
}

function createGardenSlots() {
    if (!elements.gardenGrid) {
        console.error('Garden grid not found!');
        return;
    }

    elements.gardenGrid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        slot.className = 'garden-slot empty';
        slot.setAttribute('data-index', i);
        slot.innerHTML = '<span>+</span>';
        elements.gardenGrid.appendChild(slot);
    }
    console.log('Garden slots created');
}

function setupEventListeners() {
    // 식물 심기 버튼
    if (elements.plantBtn) {
        elements.plantBtn.addEventListener('click', showPlantModal);
        console.log('Plant button listener added');
    }

    // 물주기 버튼
    if (elements.waterAllBtn) {
        elements.waterAllBtn.addEventListener('click', waterAllPlants);
    }

    // 버섯 부수기 버튼
    if (elements.mushroomBtn) {
        elements.mushroomBtn.addEventListener('click', harvestMushrooms);
    }

    // 모달 닫기 버튼
    if (elements.modalClose) {
        elements.modalClose.addEventListener('click', () => hidePlantModal(true));
    }

    // 모달 외부 클릭으로 닫기
    if (elements.plantModal) {
        elements.plantModal.addEventListener('click', (e) => {
            if (e.target === elements.plantModal) {
                // 모달 외부 클릭 시에는 씨앗 타입을 리셋하지 않음
                hidePlantModal(false);
            }
        });
    }

    // 씨앗 선택 - 직접 각 옵션에 리스너 추가
    setTimeout(() => {
        document.querySelectorAll('.seed-option').forEach(option => {
            option.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const type = this.getAttribute('data-type');
                console.log('Seed option clicked:', type);
                if (type) {
                    selectSeedType(type);
                }
            });
        });
        console.log('Seed options listeners added');
    }, 100);

    // 정원 슬롯 클릭
    if (elements.gardenGrid) {
        elements.gardenGrid.addEventListener('click', (e) => {
            const slot = e.target.closest('.garden-slot');
            if (slot) {
                const index = parseInt(slot.getAttribute('data-index'));
                handleSlotClick(index);
            }
        });
    }

    // 네비게이션
    if (elements.gardenBtn) {
        elements.gardenBtn.addEventListener('click', () => { SoundEngine.click(); showView('garden'); });
    }
    if (elements.collectionBtn) {
        elements.collectionBtn.addEventListener('click', () => { SoundEngine.click(); showView('collection'); });
    }
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', () => { SoundEngine.click(); showView('settings'); });
    }

    // 음소거 토글 버튼
    if (elements.muteBtn) {
        elements.muteBtn.addEventListener('click', () => {
            const muted = SoundEngine.toggleMute();
            updateMuteButton();
            if (!muted) SoundEngine.click();
            showNotification(muted ? '소리가 꺼졌습니다 🔇' : '소리가 켜졌습니다 🔊');
        });
    }

    // 저장 / 불러오기 / 리셋 버튼
    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', () => {
            saveGame();
            SoundEngine.select();
            showNotification('게임이 저장되었습니다! 💾', 'success');
        });
    }
    if (elements.loadBtn) {
        elements.loadBtn.addEventListener('click', () => {
            if (loadGame(false)) {
                SoundEngine.select();
                showNotification('게임을 불러왔습니다! 📂', 'success');
                showView('garden');
            } else {
                SoundEngine.error();
                showNotification('저장된 게임이 없습니다! 📂', 'warning');
            }
        });
    }
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => {
            if (confirm('정말 게임을 처음부터 다시 시작할까요?')) {
                resetGame();
            }
        });
    }

    // 도감 탭 전환
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SoundEngine.click();
            renderCollection(btn.getAttribute('data-tab'));
        });
    });
}

function updateMuteButton() {
    if (elements.muteBtn) {
        elements.muteBtn.textContent = SoundEngine.muted ? '🔇 음소거' : '🔊 소리';
    }
}

// ===== 저장 / 불러오기 =====
function saveGame() {
    try {
        const data = {
            garden: gameState.garden,
            exp: gameState.exp,
            collection: gameState.collection,
            savedAt: Date.now()
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
    } catch (err) {
        console.error('Save failed:', err);
        return false;
    }
}

function loadGame(silent = false) {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.garden)) return false;

        gameState.garden = data.garden.slice(0, 9);
        while (gameState.garden.length < 9) gameState.garden.push(null);
        gameState.exp = typeof data.exp === 'number' ? data.exp : 0;
        gameState.collection = data.collection && Array.isArray(data.collection.plants)
            ? data.collection
            : { plants: [], blooms: [] };

        // 정원 다시 그리기
        for (let i = 0; i < 9; i++) {
            updatePlantDisplay(i);
        }
        updateDisplay();
        if (!silent) console.log('Game loaded');
        return true;
    } catch (err) {
        console.error('Load failed:', err);
        return false;
    }
}

function resetGame() {
    gameState.garden = new Array(9).fill(null);
    gameState.selectedSeedType = null;
    gameState.exp = 0;
    gameState.collection = { plants: [], blooms: [] };
    localStorage.removeItem(SAVE_KEY);
    for (let i = 0; i < 9; i++) {
        updatePlantDisplay(i);
    }
    updateDisplay();
    SoundEngine.harvest();
    showView('garden');
    showNotification('게임이 초기화되었습니다! 🔄 새로 시작해보세요!');
}

// ===== 도감(수집) 화면 =====
const COLLECTION_TYPES = ['red', 'blue', 'yellow', 'mushroom'];
const TYPE_ICONS = { red: '🔴', blue: '🔵', yellow: '🟡', mushroom: '🍄' };

function renderCollection(tab = 'plants') {
    if (!elements.collectionGrid) return;
    elements.collectionGrid.innerHTML = '';

    if (tab === 'plants' || tab === 'blooms') {
        const owned = tab === 'plants' ? gameState.collection.plants : gameState.collection.blooms;
        const label = tab === 'plants' ? '심어본 씨앗' : '피워낸 꽃';
        let anyOwned = false;

        COLLECTION_TYPES.forEach(type => {
            const has = owned.includes(type);
            if (has) anyOwned = true;
            const item = document.createElement('div');
            item.className = 'collection-item' + (has ? '' : ' locked');
            item.innerHTML = `
                <div class="item-icon">${has ? (tab === 'blooms' ? '🌸' : TYPE_ICONS[type]) : '❓'}</div>
                <div class="item-name">${has ? getTypeName(type) : '???'}</div>
            `;
            elements.collectionGrid.appendChild(item);
        });

        if (!anyOwned) {
            const empty = document.createElement('div');
            empty.className = 'collection-empty';
            empty.textContent = tab === 'plants'
                ? '아직 심어본 식물이 없어요. 정원에서 씨앗을 심어보세요! 🌱'
                : '아직 피워낸 꽃이 없어요. 식물을 잘 키워보세요! 🌸';
            elements.collectionGrid.appendChild(empty);
        }
    } else if (tab === 'achievements') {
        const achievements = [
            { icon: '🌱', name: '첫 씨앗 심기', done: gameState.collection.plants.length > 0 },
            { icon: '🌸', name: '첫 꽃 피우기', done: gameState.collection.blooms.length > 0 },
            { icon: '🍄', name: '버섯 부수기 (EXP 50)', done: gameState.exp >= 50 },
            { icon: '⭐', name: 'EXP 200 달성', done: gameState.exp >= 200 },
            { icon: '👑', name: '모든 종류 심기', done: COLLECTION_TYPES.every(t => gameState.collection.plants.includes(t)) }
        ];
        achievements.forEach(a => {
            const item = document.createElement('div');
            item.className = 'collection-item' + (a.done ? '' : ' locked');
            item.innerHTML = `
                <div class="item-icon">${a.done ? a.icon : '🔒'}</div>
                <div class="item-name">${a.name}</div>
            `;
            elements.collectionGrid.appendChild(item);
        });
    }
}

function showView(viewName) {
    // 모든 뷰 숨기기
    if (elements.gardenView) elements.gardenView.style.display = 'none';
    if (elements.collectionView) elements.collectionView.style.display = 'none';
    if (elements.settingsView) elements.settingsView.style.display = 'none';

    // 네비게이션 버튼 활성화 해제
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 선택된 뷰 보이기
    switch (viewName) {
        case 'garden':
            if (elements.gardenView) elements.gardenView.style.display = 'block';
            if (elements.gardenBtn) elements.gardenBtn.classList.add('active');
            break;
        case 'collection':
            if (elements.collectionView) elements.collectionView.style.display = 'block';
            if (elements.collectionBtn) elements.collectionBtn.classList.add('active');
            {
                const activeTab = document.querySelector('.tab-btn.active');
                renderCollection(activeTab ? activeTab.getAttribute('data-tab') : 'plants');
            }
            break;
        case 'settings':
            if (elements.settingsView) elements.settingsView.style.display = 'block';
            if (elements.settingsBtn) elements.settingsBtn.classList.add('active');
            break;
    }
}

function showPlantModal() {
    console.log('Showing plant modal');
    if (elements.plantModal) {
        elements.plantModal.style.display = 'flex';
        gameState.selectedSeedType = null;

        // 선택 상태 초기화
        document.querySelectorAll('.seed-option').forEach(option => {
            option.classList.remove('selected');
        });
    }
}

function hidePlantModal(resetSeedType = true) {
    if (elements.plantModal) {
        elements.plantModal.style.display = 'none';
        if (resetSeedType) {
            gameState.selectedSeedType = null;
            console.log('Modal closed and seed type reset');
        } else {
            console.log('Modal closed but seed type preserved');
        }
    }
}

function selectSeedType(type) {
    console.log('Seed type selected:', type);
    gameState.selectedSeedType = type;
    console.log('GameState after selection:', gameState);

    // 선택 상태 업데이트
    document.querySelectorAll('.seed-option').forEach(option => {
        option.classList.remove('selected');
    });

    const selectedOption = document.querySelector(`[data-type="${type}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }

    SoundEngine.select();
    showNotification(`${getTypeName(type)} 선택됨! 이제 정원 슬롯을 클릭하세요.`);

    // 모달을 자동으로 닫기 (모바일 UX 개선)
    hidePlantModal(false);
}

function handleSlotClick(index) {
    console.log('Slot clicked:', index, 'Selected type:', gameState.selectedSeedType);
    console.log('Full gameState:', gameState);
    console.log('typeof selectedSeedType:', typeof gameState.selectedSeedType);

    if (!gameState.selectedSeedType) {
        console.log('No seed selected, showing notification');
        SoundEngine.error();
        showNotification('먼저 씨앗을 선택해주세요! 🌱');
        return;
    }

    if (gameState.garden[index]) {
        SoundEngine.error();
        showNotification('이 슬롯에는 이미 식물이 심어져 있습니다! 🪴');
        return;
    }

    console.log('Proceeding to plant seed with type:', gameState.selectedSeedType);
    plantSeed(index);
}

function plantSeed(index) {
    console.log('Planting seed at index:', index);

    const plant = {
        id: Date.now(),
        type: gameState.selectedSeedType,
        stage: 'seed',
        plantedAt: Date.now(),
        lastWatered: Date.now(),
        waterLevel: 100
    };

    gameState.garden[index] = plant;

    // 도감에 기록
    if (!gameState.collection.plants.includes(plant.type)) {
        gameState.collection.plants.push(plant.type);
    }

    updatePlantDisplay(index);
    updateDisplay();
    popSlot(index);
    SoundEngine.plant();
    saveGame();

    showNotification(`${getTypeName(gameState.selectedSeedType)} 씨앗을 심었습니다! 🌱`);
    hidePlantModal(false);
}

// 슬롯 팝 애니메이션 (심기/수확 피드백)
function popSlot(index) {
    const slot = elements.gardenGrid && elements.gardenGrid.children[index];
    if (!slot) return;
    slot.classList.remove('slot-pop');
    void slot.offsetWidth; // 애니메이션 재시작
    slot.classList.add('slot-pop');
}

// 슬롯 위에 경험치 팝업 표시
function showExpPopup(index, text) {
    const slot = elements.gardenGrid && elements.gardenGrid.children[index];
    if (!slot) return;
    const popup = document.createElement('div');
    popup.className = 'exp-popup';
    popup.textContent = text;
    slot.appendChild(popup);
    setTimeout(() => {
        if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 1000);
}

// 슬롯 위에 이모지 파티클 뿌리기
function spawnParticles(index, emoji, count = 5) {
    const slot = elements.gardenGrid && elements.gardenGrid.children[index];
    if (!slot) return;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.textContent = emoji;
        p.style.left = (30 + Math.random() * 40) + '%';
        p.style.top = (30 + Math.random() * 40) + '%';
        p.style.setProperty('--px', (Math.random() * 60 - 30) + 'px');
        p.style.setProperty('--py', (-20 - Math.random() * 40) + 'px');
        slot.appendChild(p);
        setTimeout(() => {
            if (p.parentNode) p.parentNode.removeChild(p);
        }, 700);
    }
}

function updatePlantDisplay(index) {
    const slot = elements.gardenGrid.children[index];
    const plant = gameState.garden[index];

    if (!slot) return;

    if (!plant) {
        slot.className = 'garden-slot empty';
        slot.innerHTML = '<span>+</span>';
        delete slot.dataset.plantId;
        delete slot.dataset.stage;
        return;
    }

    const timeSincePlanted = Date.now() - plant.plantedAt;
    let stage = 'seed';

    if (timeSincePlanted > 5000) { // 5초 후
        stage = 'sprout';
    }
    if (timeSincePlanted > 15000) { // 15초 후
        stage = 'mature';
    }
    if (timeSincePlanted > 30000 && plant.waterLevel > 50) { // 30초 후
        stage = 'bloom';
    }

    const prevStage = plant.stage;
    plant.stage = stage;

    // 단계가 바뀌었거나 다른 식물일 때만 다시 그리기
    // (매초 innerHTML을 갈아엎으면 CSS 애니메이션이 계속 리셋되는 버그 수정)
    const needsRender = slot.dataset.plantId !== String(plant.id) || slot.dataset.stage !== stage;
    if (needsRender) {
        slot.className = 'garden-slot planted';
        slot.innerHTML = createPlantHTML(plant);
        slot.dataset.plantId = String(plant.id);
        slot.dataset.stage = stage;

        // 버섯은 다 자라면(만개 포함) 부술 수 있음
        if (plant.type === 'mushroom' && (stage === 'mature' || stage === 'bloom')) {
            slot.classList.add('ready');
        }
    }

    // 꽃이 처음 피었을 때 축하 효과 (게임 진행 중에만)
    if (stage === 'bloom' && prevStage && prevStage !== 'bloom') {
        SoundEngine.bloom();
        spawnParticles(index, '🌸', 6);
        if (plant.type !== 'mushroom' && !gameState.collection.blooms.includes(plant.type)) {
            gameState.collection.blooms.push(plant.type);
            showNotification(`${getTypeName(plant.type)} 꽃이 피었습니다! 도감에 기록됐어요! 📖`, 'success');
            saveGame();
        }
    }
}

function createPlantHTML(plant) {
    const stages = {
        seed: '🌱',
        sprout: createSproutHTML(plant),
        mature: createMatureHTML(plant),
        bloom: createBloomHTML(plant)
    };

    return `
        <div class="plant ${plant.type} ${plant.stage}">
            ${stages[plant.stage]}
            <div class="plant-info">${getTypeName(plant.type)}</div>
        </div>
    `;
}

function createSproutHTML(plant) {
    return `
        <div class="pikmin-head ${plant.type}"></div>
        <div class="pikmin-leaf"></div>
    `;
}

function createMatureHTML(plant) {
    let html = `
        <div class="pikmin-head ${plant.type}"></div>
        <div class="pikmin-leaf"></div>
    `;

    if (plant.type === 'mushroom') {
        html += '<div class="mushroom-stem"></div>';
    }

    return html;
}

function createBloomHTML(plant) {
    let html = `
        <div class="pikmin-head ${plant.type}"></div>
        <div class="pikmin-leaf"></div>
        <div class="pikmin-flower ${plant.type}"></div>
    `;

    if (plant.type === 'mushroom') {
        html += '<div class="mushroom-stem"></div>';
    }

    return html;
}

function waterAllPlants() {
    let watered = 0;

    for (let i = 0; i < 9; i++) {
        const plant = gameState.garden[i];
        if (plant && plant.waterLevel < 100) {
            plant.lastWatered = Date.now();
            plant.waterLevel = 100;
            spawnParticles(i, '💧', 3);
            watered++;
        }
    }

    if (watered > 0) {
        SoundEngine.water();
        showNotification(`${watered}개 식물에 물을 주었습니다! 💧`);
        saveGame();
    } else {
        showNotification('물이 필요한 식물이 없습니다! 💧');
    }

    updateDisplay();
}

function harvestMushrooms() {
    let harvested = 0;

    for (let i = 0; i < 9; i++) {
        const plant = gameState.garden[i];
        // 버그 수정: 30초 후 'bloom' 단계가 된 버섯도 부술 수 있도록 함
        if (plant && plant.type === 'mushroom' && (plant.stage === 'mature' || plant.stage === 'bloom')) {
            gameState.garden[i] = null;
            updatePlantDisplay(i);
            popSlot(i);
            showExpPopup(i, '+50 EXP');
            spawnParticles(i, '💥', 5);
            harvested++;
            gameState.exp += 50;
        }
    }

    if (harvested > 0) {
        SoundEngine.harvest();
        showNotification(`${harvested}개의 버섯을 부쉈습니다! +${harvested * 50} EXP 🍄💥`);
        saveGame();
    } else {
        SoundEngine.error();
        showNotification('부술 수 있는 버섯이 없습니다! 🍄');
    }

    updateDisplay();
}

let autoSaveTick = 0;

function updateGame() {
    // 모든 식물의 성장 상태 업데이트
    for (let i = 0; i < 9; i++) {
        const plant = gameState.garden[i];
        if (plant) {
            // 물 부족 체크
            const timeSinceWatered = Date.now() - plant.lastWatered;
            if (timeSinceWatered > 300000) { // 5분 후
                plant.waterLevel = Math.max(0, plant.waterLevel - 10);
            }
            // 식물 표시 업데이트 (성장 단계 포함)
            updatePlantDisplay(i);
        }
    }
    updateDisplay();

    // 10초마다 자동 저장
    autoSaveTick++;
    if (autoSaveTick >= 10) {
        autoSaveTick = 0;
        saveGame();
    }
}

function getTypeName(type) {
    const names = {
        red: '빨간 피크민',
        blue: '파란 피크민',
        yellow: '노란 피크민',
        mushroom: '버섯'
    };
    return names[type] || type;
}

function updateDisplay() {
    const plantCount = gameState.garden.filter(plant => plant !== null).length;
    const bloomCount = gameState.garden.filter(plant =>
        plant && plant.stage === 'bloom'
    ).length;

    if (elements.plantCountEl) elements.plantCountEl.textContent = plantCount;
    if (elements.bloomCountEl) elements.bloomCountEl.textContent = bloomCount;
    if (elements.expEl) elements.expEl.textContent = gameState.exp;
}

function showNotification(message, type = 'info') {
    if (!elements.notifications) return;

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    if (type === 'warning') {
        notification.style.borderLeftColor = '#FFA500';
    } else if (type === 'success') {
        notification.style.borderLeftColor = '#32CD32';
    }

    elements.notifications.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// 게임 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// 페이지를 떠날 때 자동 저장
window.addEventListener('beforeunload', () => {
    saveGame();
});

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'm':
        case 'M':
            harvestMushrooms();
            break;
        case 'w':
        case 'W':
            waterAllPlants();
            break;
        case 'p':
        case 'P':
            showPlantModal();
            break;
    }
});
