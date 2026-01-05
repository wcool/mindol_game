// 전역 변수
let gameState = {
    garden: new Array(9).fill(null),
    selectedSeedType: null,
    exp: 0
};

// DOM 요소들
let elements = {};

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
        settingsBtn: document.getElementById('settings-btn')
    };

    console.log('Elements found:', elements);

    // 정원 슬롯 생성
    createGardenSlots();

    // 이벤트 리스너 설정
    setupEventListeners();

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
        elements.gardenBtn.addEventListener('click', () => showView('garden'));
    }
    if (elements.collectionBtn) {
        elements.collectionBtn.addEventListener('click', () => showView('collection'));
    }
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', () => showView('settings'));
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

    showNotification(`${getTypeName(type)} 선택됨! 이제 정원 슬롯을 클릭하세요.`);

    // 모달을 자동으로 닫기 (모바일 UX 개선)
    hidePlantModal();
}

function handleSlotClick(index) {
    console.log('Slot clicked:', index, 'Selected type:', gameState.selectedSeedType);
    console.log('Full gameState:', gameState);
    console.log('typeof selectedSeedType:', typeof gameState.selectedSeedType);

    if (!gameState.selectedSeedType) {
        console.log('No seed selected, showing notification');
        showNotification('먼저 씨앗을 선택해주세요! 🌱');
        return;
    }

    if (gameState.garden[index]) {
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
    updatePlantDisplay(index);
    updateDisplay();

    showNotification(`${getTypeName(gameState.selectedSeedType)} 씨앗을 심었습니다! 🌱`);
    hidePlantModal();
}

function updatePlantDisplay(index) {
    const slot = elements.gardenGrid.children[index];
    const plant = gameState.garden[index];

    if (!slot) return;

    if (!plant) {
        slot.className = 'garden-slot empty';
        slot.innerHTML = '<span>+</span>';
        return;
    }

    slot.className = 'garden-slot planted';

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

    plant.stage = stage;
    slot.innerHTML = createPlantHTML(plant);

    if (plant.type === 'mushroom' && stage === 'mature') {
        slot.classList.add('ready');
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
            watered++;
        }
    }

    if (watered > 0) {
        showNotification(`${watered}개 식물에 물을 주었습니다! 💧`);
    } else {
        showNotification('물이 필요한 식물이 없습니다! 💧');
    }

    updateDisplay();
}

function harvestMushrooms() {
    let harvested = 0;

    for (let i = 0; i < 9; i++) {
        const plant = gameState.garden[i];
        if (plant && plant.type === 'mushroom' && plant.stage === 'mature') {
            gameState.garden[i] = null;
            updatePlantDisplay(i);
            harvested++;
            gameState.exp += 50;
        }
    }

    if (harvested > 0) {
        showNotification(`${harvested}개의 버섯을 부쉈습니다! +${harvested * 50} EXP 🍄💥`);
    } else {
        showNotification('부술 수 있는 버섯이 없습니다! 🍄');
    }

    updateDisplay();
}

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