'use strict';
// ═══════════════════════════════════════════
//  items.js – 아이템 데이터 & 게임 적용
// ═══════════════════════════════════════════

const ITEMS = [
    // ── 소모품 (Consumable) ───────────────────
    {
        id: 'shield',
        name: '방패',
        emoji: '🛡️',
        desc: '차량/기차 충돌 1회 무적!',
        detail: '구매 후 게임 시작 전 사용. 캐릭터에 방패 표시.',
        price: 180,
        type: 'consumable',
        color: '#64B5F6',
        rarity: 'rare',
    },
    {
        id: 'magnet',
        name: '코인 자석',
        emoji: '🧲',
        desc: '주변 코인을 자동 수집!',
        detail: '1판 동안 코인 수집 범위 3배 확대.',
        price: 120,
        type: 'consumable',
        color: '#EF5350',
        rarity: 'rare',
    },
    {
        id: 'coin2x',
        name: '코인 2배',
        emoji: '✨',
        desc: '이번 판 코인 수집량 2배!',
        detail: '1판 동안 모든 코인이 2개로 수집됨.',
        price: 100,
        type: 'consumable',
        color: '#FFD700',
        rarity: 'common',
    },
    {
        id: 'headstart',
        name: '헤드스타트',
        emoji: '🚀',
        desc: '25m 앞에서 시작!',
        detail: '게임 시작 시 25m 앞 안전지대에서 출발.',
        price: 150,
        type: 'consumable',
        color: '#AB47BC',
        rarity: 'rare',
    },
    // ── 코인팩 (일회성 구매) ──────────────────
    {
        id: 'coinpack_s',
        name: '코인팩 S',
        emoji: '💰',
        desc: '즉시 코인 60개 지급!',
        detail: '구매 즉시 코인 60개가 추가됩니다.',
        price: 20,  // 실제 코인 20개로 60개 구매
        type: 'coinpack',
        reward: 60,
        color: '#FFA726',
        rarity: 'common',
    },
    {
        id: 'coinpack_m',
        name: '코인팩 M',
        emoji: '💎',
        desc: '즉시 코인 200개 지급!',
        detail: '구매 즉시 코인 200개가 추가됩니다.',
        price: 60,
        type: 'coinpack',
        reward: 200,
        color: '#26C6DA',
        rarity: 'rare',
    },
    {
        id: 'coinpack_l',
        name: '코인팩 L',
        emoji: '👑',
        desc: '즉시 코인 600개 지급!',
        detail: '구매 즉시 코인 600개가 추가됩니다.',
        price: 160,
        type: 'coinpack',
        reward: 600,
        color: '#EC407A',
        rarity: 'epic',
    },
    // ── 영구 업그레이드 (Upgrade, 3단계) ───────
    {
        id: 'upg_speed',
        name: '스피드업',
        emoji: '⚡',
        desc: '이동 속도를 높여줘요!',
        detail: 'Lv1→0.14초, Lv2→0.12초, Lv3→0.10초',
        price: [80, 140, 220],
        type: 'upgrade',
        maxLevel: 3,
        color: '#66BB6A',
        rarity: 'common',
    },
    {
        id: 'upg_coinrange',
        name: '코인 감지',
        emoji: '📡',
        desc: '코인 수집 판정 범위 확대!',
        detail: 'Lv1→1.2배, Lv2→1.5배, Lv3→2배',
        price: [70, 130, 200],
        type: 'upgrade',
        maxLevel: 3,
        color: '#FFA726',
        rarity: 'common',
    },
];

const ITEM_RARITY_COLOR = {
    common: { bg: '#2d3748', text: '#a0aec0', label: 'NORMAL' },
    rare: { bg: '#1a365d', text: '#63b3ed', label: 'RARE' },
    epic: { bg: '#44337a', text: '#d6bcfa', label: 'EPIC' },
};

// ── 게임 중 활성 아이템 상태 ──────────────────
const ActiveItems = {
    shield: false,
    magnet: false,
    coin2x: false,
    headstart: false,

    reset() {
        this.shield = false;
        this.magnet = false;
        this.coin2x = false;
        this.headstart = false;
        this._shieldHitTime = 0;
    },
    activate(id) {
        if (id === 'shield') this.shield = true;
        if (id === 'magnet') this.magnet = true;
        if (id === 'coin2x') this.coin2x = true;
        if (id === 'headstart') this.headstart = true;
    },
    onHit() {
        // 방패가 있을 때만 막음
        if (this.shield) {
            // 쿨다운: 마지막 방패 발동 후 2초 이내 재호출 무시
            const now = Date.now();
            if (this._shieldHitTime && now - this._shieldHitTime < 2000) {
                return true; // 아직 쿨다운 중 → 계속 살아있음
            }
            this._shieldHitTime = now;
            this.shield = false;
            return true; // 살았다!
        }
        // 쿨다운 중이면 죽지 않음 (방패 소모 후 무적 시간)
        if (this._shieldHitTime && Date.now() - this._shieldHitTime < 2000) {
            return true;
        }
        return false;
    },
    getCoinValue() {
        const base = 1;
        const x2 = this.coin2x ? 2 : 1;
        return base * x2;
    },
    getCoinRadius() {
        const base = 0.55;
        const magnet = this.magnet ? 2.5 : 1;
        const upgMap = [1, 1.2, 1.5, 2];
        const upg = upgMap[Storage.getUpgrade('upg_coinrange')] || 1;
        return base * magnet * upg;
    },
    getHopTime() {
        const base = 0.16;
        const upgMap = [0.16, 0.14, 0.12, 0.10];
        return upgMap[Storage.getUpgrade('upg_speed')] || base;
    },
};
