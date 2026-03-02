// storage.js - 로컬스토리지 관리

const Storage = {
    KEYS: {
        COINS: 'streetcross_coins',
        UNLOCKED: 'streetcross_unlocked',
        SELECTED: 'streetcross_selected',
        HIGHSCORE: 'streetcross_highscore',
    },

    getCoins() {
        return parseInt(localStorage.getItem(this.KEYS.COINS) || '0', 10);
    },
    setCoins(n) {
        localStorage.setItem(this.KEYS.COINS, String(n));
    },
    addCoins(n) {
        this.setCoins(this.getCoins() + n);
    },

    getUnlocked() {
        const raw = localStorage.getItem(this.KEYS.UNLOCKED);
        return raw ? JSON.parse(raw) : ['chick'];
    },
    unlockChar(id) {
        const list = this.getUnlocked();
        if (!list.includes(id)) {
            list.push(id);
            localStorage.setItem(this.KEYS.UNLOCKED, JSON.stringify(list));
        }
    },
    isUnlocked(id) {
        return this.getUnlocked().includes(id);
    },

    getSelected() {
        return localStorage.getItem(this.KEYS.SELECTED) || 'chick';
    },
    setSelected(id) {
        localStorage.setItem(this.KEYS.SELECTED, id);
    },

    getHighScore() {
        return parseInt(localStorage.getItem(this.KEYS.HIGHSCORE) || '0', 10);
    },
    setHighScore(n) {
        if (n > this.getHighScore()) {
            localStorage.setItem(this.KEYS.HIGHSCORE, String(n));
        }
    },

    // ── 아이템 인벤토리 ──────────────────────
    getInventory() {
        const raw = localStorage.getItem('streetcross_inventory');
        return raw ? JSON.parse(raw) : {};
    },
    getItemCount(id) {
        return this.getInventory()[id] || 0;
    },
    addItem(id, count = 1) {
        const inv = this.getInventory();
        inv[id] = (inv[id] || 0) + count;
        localStorage.setItem('streetcross_inventory', JSON.stringify(inv));
    },
    useItem(id) {
        const inv = this.getInventory();
        if (!inv[id] || inv[id] <= 0) return false;
        inv[id]--;
        localStorage.setItem('streetcross_inventory', JSON.stringify(inv));
        return true;
    },
    // 영구 업그레이드 레벨
    getUpgrade(id) {
        return parseInt(localStorage.getItem('streetcross_upg_' + id) || '0', 10);
    },
    setUpgrade(id, level) {
        localStorage.setItem('streetcross_upg_' + id, String(level));
    },
};
