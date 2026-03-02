'use strict';
// ═══════════════════════════════════════
//  SHOP – 캐릭터 + 아이템 샵
// ═══════════════════════════════════════

const Shop = (() => {
    let container = null;
    let previewCanvas = null, previewCtx = null;
    let previewChar = null;
    let previewAngle = 0, previewAnimId = null;
    let currentTab = 'char'; // 'char' | 'item'

    // ── 캐릭터 3D 프리뷰 ───────────────────────
    function renderPreview() {
        if (!previewCtx || !previewChar) return;
        const c = previewCtx, W = previewCanvas.width, H = previewCanvas.height;
        c.clearRect(0, 0, W, H);
        const grd = c.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W / 2);
        grd.addColorStop(0, 'rgba(255,255,255,0.08)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = grd; c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 4, 0, Math.PI * 2); c.fill();
        CharRenderer.render(c, previewChar, W / 2, H / 2 + 20 + Math.sin(previewAngle) * 4, 1.4, 0, 0, 'up', true);
        previewAngle += 0.04;
        previewAnimId = requestAnimationFrame(renderPreview);
    }
    function stopPreview() { if (previewAnimId) { cancelAnimationFrame(previewAnimId); previewAnimId = null; } }
    function startPreview(char) { stopPreview(); previewChar = char; previewAngle = 0; renderPreview(); }

    // ── 탭 전환 ────────────────────────────────
    function switchTab(tab) {
        currentTab = tab;
        container.querySelectorAll('.shop-tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        buildContent();
    }

    function buildContent() {
        if (currentTab === 'char') buildCharGrid();
        else buildItemGrid();
    }

    // ── 캐릭터 그리드 ──────────────────────────
    function buildCharGrid() {
        const grid = container.querySelector('#shop-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const coins = Storage.getCoins();
        const unlocked = Storage.getUnlocked();
        const selected = Storage.getSelected();

        CHARACTERS.forEach(c => {
            const isUnlocked = unlocked.includes(c.id);
            const isSel = c.id === selected;
            const canAfford = coins >= c.price;
            const rc = RARITY_COLOR[c.rarity];

            const card = document.createElement('div');
            card.className = 'shop-card' + (isSel ? ' selected' : '') + (isUnlocked ? ' owned' : '');
            card.style.cssText = `border-color:${rc.text}55;`;

            // 미니 캔버스
            const miniCanvas = document.createElement('canvas');
            miniCanvas.width = 80; miniCanvas.height = 80;
            miniCanvas.style.cssText = 'display:block;margin:0 auto;';
            const mc = miniCanvas.getContext('2d');
            CharRenderer.render(mc, c, 40, 58, 0.8, 0, 0, 'up', true);
            card.appendChild(miniCanvas);

            const info = document.createElement('div');
            info.className = 'shop-card-info';
            let btn;
            if (isUnlocked) {
                btn = `<button class="btn-shop ${isSel ? 'btn-selected' : 'btn-select'}" data-id="${c.id}" data-type="char">${isSel ? '✓ 사용 중' : '선택'}</button>`;
            } else if (c.price === 0) {
                btn = `<button class="btn-shop btn-select" data-id="${c.id}" data-type="char">선택</button>`;
            } else {
                btn = `<button class="btn-shop ${canAfford ? 'btn-buy' : 'btn-locked'}" data-id="${c.id}" data-type="char" ${canAfford ? '' : 'disabled'}>🪙 ${c.price}</button>`;
            }
            info.innerHTML = `<span class="rarity-badge" style="color:${rc.text};background:${rc.bg}">${rc.label}</span>
                <p class="char-name">${c.name}</p>
                <p class="char-desc">${c.desc}</p>${btn}`;
            card.appendChild(info);

            card.addEventListener('mouseenter', () => {
                startPreview(c);
                container.querySelector('#preview-name').textContent = c.name;
                container.querySelector('#preview-desc').textContent = c.desc;
            });
            grid.appendChild(card);
        });

        grid.querySelectorAll('[data-type="char"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const char = CHARACTERS.find(x => x.id === id);
                if (!char) return;
                if (Storage.isUnlocked(id) || char.price === 0) {
                    Storage.setSelected(id); Storage.unlockChar(id);
                    buildCharGrid(); startPreview(char);
                } else if (Storage.getCoins() >= char.price) {
                    Storage.setCoins(Storage.getCoins() - char.price);
                    Storage.unlockChar(id); Storage.setSelected(id);
                    updateCoinDisplay(); buildCharGrid(); startPreview(char);
                    showBuyEffect(btn, '🎉 구매!');
                }
            });
        });
    }

    // ── 아이템 그리드 ──────────────────────────
    function buildItemGrid() {
        const grid = container.querySelector('#shop-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const coins = Storage.getCoins();

        ITEMS.forEach(item => {
            const rc = ITEM_RARITY_COLOR[item.rarity];
            const card = document.createElement('div');
            card.className = 'shop-card item-card';
            card.style.cssText = `border-color:${rc.text}55;`;

            let statusHtml = '';
            let btnHtml = '';

            if (item.type === 'consumable') {
                const owned = Storage.getItemCount(item.id);
                const canAfford = coins >= item.price;
                statusHtml = `<span class="item-owned">보유: ${owned}개</span>`;
                btnHtml = `<button class="btn-shop ${canAfford ? 'btn-buy' : 'btn-locked'}" data-id="${item.id}" data-type="item" ${canAfford ? '' : 'disabled'}>🪙 ${item.price}</button>`;
            } else if (item.type === 'coinpack') {
                const canAfford = coins >= item.price;
                statusHtml = `<span class="item-owned" style="color:#FFD700">+${item.reward} 코인</span>`;
                btnHtml = `<button class="btn-shop ${canAfford ? 'btn-buy' : 'btn-locked'}" data-id="${item.id}" data-type="coinpack" ${canAfford ? '' : 'disabled'}>🪙 ${item.price}</button>`;
            } else if (item.type === 'upgrade') {
                const level = Storage.getUpgrade(item.id);
                const isMax = level >= item.maxLevel;
                const price = isMax ? 0 : item.price[level];
                const canAfford = !isMax && coins >= price;
                statusHtml = `<span class="item-owned">${isMax ? '⭐MAX' : `Lv${level}/${item.maxLevel}`}</span>`;
                btnHtml = isMax
                    ? `<button class="btn-shop btn-selected" disabled>MAX 달성!</button>`
                    : `<button class="btn-shop ${canAfford ? 'btn-buy' : 'btn-locked'}" data-id="${item.id}" data-type="upgrade" data-level="${level}" data-price="${price}" ${canAfford ? '' : 'disabled'}>🪙 ${price}</button>`;
            }

            card.innerHTML = `
                <div class="item-emoji">${item.emoji}</div>
                <div class="shop-card-info">
                    <span class="rarity-badge" style="color:${rc.text};background:${rc.bg}">${rc.label}</span>
                    <p class="char-name">${item.name}</p>
                    <p class="char-desc">${item.desc}</p>
                    ${statusHtml}
                    ${btnHtml}
                </div>`;

            card.addEventListener('mouseenter', () => {
                container.querySelector('#preview-name').textContent = item.emoji + ' ' + item.name;
                container.querySelector('#preview-desc').textContent = item.detail || item.desc;
            });
            grid.appendChild(card);
        });

        // 버튼 이벤트
        grid.querySelectorAll('[data-type="item"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = ITEMS.find(x => x.id === btn.dataset.id);
                if (!item || Storage.getCoins() < item.price) return;
                Storage.setCoins(Storage.getCoins() - item.price);
                Storage.addItem(item.id, 1);
                updateCoinDisplay(); buildItemGrid();
                showBuyEffect(btn, '✅ 구매!');
            });
        });
        grid.querySelectorAll('[data-type="coinpack"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = ITEMS.find(x => x.id === btn.dataset.id);
                if (!item || Storage.getCoins() < item.price) return;
                Storage.setCoins(Storage.getCoins() - item.price);
                Storage.addCoins(item.reward);
                updateCoinDisplay(); buildItemGrid();
                showBuyEffect(btn, `+${item.reward}🪙`);
            });
        });
        grid.querySelectorAll('[data-type="upgrade"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = ITEMS.find(x => x.id === btn.dataset.id);
                const level = parseInt(btn.dataset.level, 10);
                const price = parseInt(btn.dataset.price, 10);
                if (!item || Storage.getCoins() < price) return;
                Storage.setCoins(Storage.getCoins() - price);
                Storage.setUpgrade(item.id, level + 1);
                updateCoinDisplay(); buildItemGrid();
                showBuyEffect(btn, '⬆️ 업그레이드!');
            });
        });
    }

    function updateCoinDisplay() {
        const el = container.querySelector('#shop-coins');
        if (el) el.textContent = `🪙 ${Storage.getCoins()}`;
    }

    function showBuyEffect(btn, text) {
        const orig = btn.textContent;
        btn.textContent = text;
        btn.classList.add('btn-bought');
        setTimeout(() => buildContent(), 900);
    }

    return {
        mount(el) {
            container = el;
            previewCanvas = el.querySelector('#preview-canvas');
            if (previewCanvas) previewCtx = previewCanvas.getContext('2d');
            const initChar = CHARACTERS.find(c => c.id === Storage.getSelected()) || CHARACTERS[0];
            startPreview(initChar);
            container.querySelector('#preview-name').textContent = initChar.name;
            container.querySelector('#preview-desc').textContent = initChar.desc;
            updateCoinDisplay();
            // 탭 버튼 이벤트
            container.querySelectorAll('.shop-tab-btn').forEach(b => {
                b.addEventListener('click', () => switchTab(b.dataset.tab));
            });
            switchTab('char');
        },
        unmount() { stopPreview(); },
        refresh() { updateCoinDisplay(); buildContent(); },
    };
})();
