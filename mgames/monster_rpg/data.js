/* ============================================================
   data.js — 몬스터 헌터 RPG 데이터
   지역 16곳 × 몬스터 5종(일반 4 + 보스 1) = 80종
   펫 20종 + 캡슐 머신 3종
   ============================================================ */

/* ---------- 지역 & 몬스터 ---------- */
/* 스탯은 지역 번호(r: 0~15)와 슬롯(s: 0~3 일반, 보스)에 따라 산출 */
function mobStats(r, s, isBoss) {
  const hp   = Math.round(28 * Math.pow(1.85, r) * (1 + s * 0.18) * (isBoss ? 6 : 1));
  const atk  = Math.round(5 * Math.pow(1.5, r) * (1 + s * 0.12) * (isBoss ? 1.8 : 1));
  const def  = Math.round(Math.pow(1.5, r) * (isBoss ? 1.6 : 1));
  const exp  = Math.round(9 * Math.pow(1.78, r) * (1 + s * 0.2) * (isBoss ? 5 : 1));
  const gold = Math.round(7 * Math.pow(1.85, r) * (1 + s * 0.2) * (isBoss ? 6 : 1));
  const spd  = Math.max(1.05, 2.2 - r * 0.07) * (isBoss ? 0.85 : 1); // 공격 주기(초)
  return { hp, atk, def, exp, gold, spd };
}

const REGIONS = [
  {
    name: '푸른 초원', emoji: '🌿', theme: ['#d7f0c8', '#eef9e5'],
    mobs: [
      { name: '슬라임',     emoji: '🟢' },
      { name: '버섯돌이',   emoji: '🍄' },
      { name: '독침벌',     emoji: '🐝' },
      { name: '들쥐 도적',  emoji: '🐭' },
    ],
    boss: { name: '킹 슬라임', emoji: '👑' },
  },
  {
    name: '어둠의 숲', emoji: '🌲', theme: ['#c8dcc8', '#e2efe2'],
    mobs: [
      { name: '야생 늑대',   emoji: '🐺' },
      { name: '독거미',      emoji: '🕷️' },
      { name: '흡혈박쥐',    emoji: '🦇' },
      { name: '고블린',      emoji: '👺' },
    ],
    boss: { name: '고대 트렌트', emoji: '🌳' },
  },
  {
    name: '안개 습지', emoji: '🐸', theme: ['#cde3d8', '#e6f3ec'],
    mobs: [
      { name: '거대 개구리', emoji: '🐸' },
      { name: '늪 독사',     emoji: '🐍' },
      { name: '식인 물고기', emoji: '🐟' },
      { name: '늪 악어',     emoji: '🐊' },
    ],
    boss: { name: '히드라', emoji: '🐉' },
  },
  {
    name: '수정 동굴', emoji: '⛰️', theme: ['#d5d2e8', '#eae8f5'],
    mobs: [
      { name: '동굴 도마뱀', emoji: '🦎' },
      { name: '바위 전갈',   emoji: '🦂' },
      { name: '수정 골렘',   emoji: '🗿' },
      { name: '미믹 상자',   emoji: '🎁' },
    ],
    boss: { name: '동굴 트롤', emoji: '👹' },
  },
  {
    name: '작열 사막', emoji: '🏜️', theme: ['#f0e2c0', '#f9f2de'],
    mobs: [
      { name: '가시 선인장', emoji: '🌵' },
      { name: '사막 콘도르', emoji: '🦅' },
      { name: '저주 미라',   emoji: '🧟' },
      { name: '샌드웜',      emoji: '🪱' },
    ],
    boss: { name: '스핑크스', emoji: '🦁' },
  },
  {
    name: '영원 설원', emoji: '🏔️', theme: ['#dcebf5', '#f0f8fd'],
    mobs: [
      { name: '서리 늑대',   emoji: '🐺' },
      { name: '얼음 정령',   emoji: '❄️' },
      { name: '펭귄 전사',   emoji: '🐧' },
      { name: '예티',        emoji: '🦍' },
    ],
    boss: { name: '프로스트 드래곤', emoji: '🐲' },
  },
  {
    name: '분노 화산', emoji: '🌋', theme: ['#f5d5c5', '#fbeade'],
    mobs: [
      { name: '화염 임프',   emoji: '😈' },
      { name: '용암 골렘',   emoji: '🌋' },
      { name: '불도롱뇽',    emoji: '🦎' },
      { name: '화염 마귀',   emoji: '👿' },
    ],
    boss: { name: '이프리트', emoji: '🔥' },
  },
  {
    name: '칠흑 심연', emoji: '🌑', theme: ['#cfc9dd', '#e6e2f0'],
    mobs: [
      { name: '원혼',        emoji: '👻' },
      { name: '해골 기사',   emoji: '💀' },
      { name: '가고일',      emoji: '🗿' },
      { name: '리치',        emoji: '🧙' },
    ],
    boss: { name: '심연의 마왕', emoji: '👾' },
  },
  {
    name: '하늘 섬', emoji: '☁️', theme: ['#d8e8f8', '#eef5fc'],
    mobs: [
      { name: '바람 정령',   emoji: '🌬️' },
      { name: '하피',        emoji: '🦜' },
      { name: '구름 골렘',   emoji: '☁️' },
      { name: '그리폰',      emoji: '🦅' },
    ],
    boss: { name: '천둥새', emoji: '⛈️' },
  },
  {
    name: '버섯 왕국', emoji: '🍄', theme: ['#f3ddd3', '#faefe9'],
    mobs: [
      { name: '포자 슬라임',    emoji: '🫠' },
      { name: '독버섯 요정',    emoji: '🧚' },
      { name: '달팽이 기사',    emoji: '🐌' },
      { name: '딱정벌레 전사',  emoji: '🪲' },
    ],
    boss: { name: '버섯 대왕', emoji: '🍄' },
  },
  {
    name: '해저 도시', emoji: '🐚', theme: ['#c9e5ec', '#e5f4f8'],
    mobs: [
      { name: '상어 병사',    emoji: '🦈' },
      { name: '문어 마법사',  emoji: '🐙' },
      { name: '가시복',       emoji: '🐡' },
      { name: '랍스터 기사',  emoji: '🦞' },
    ],
    boss: { name: '크라켄', emoji: '🦑' },
  },
  {
    name: '고대 유적', emoji: '🏛️', theme: ['#e8e0cc', '#f5f0e2'],
    mobs: [
      { name: '살아있는 석상',  emoji: '🗿' },
      { name: '저주받은 항아리', emoji: '🏺' },
      { name: '유적 감시자',    emoji: '👁️' },
      { name: '황금 전갈',      emoji: '🦂' },
    ],
    boss: { name: '고대의 지니', emoji: '🧞' },
  },
  {
    name: '기계 도시', emoji: '⚙️', theme: ['#d9dde3', '#edf0f3'],
    mobs: [
      { name: '폭주 로봇',     emoji: '🤖' },
      { name: '감시 드론',     emoji: '🛸' },
      { name: '톱니 괴물',     emoji: '⚙️' },
      { name: '배터리 슬라임', emoji: '🔋' },
    ],
    boss: { name: '메가 타이탄', emoji: '🦾' },
  },
  {
    name: '환영의 미궁', emoji: '🌫️', theme: ['#e3d8e8', '#f2ecf5'],
    mobs: [
      { name: '트릭스터',     emoji: '🃏' },
      { name: '가면 원혼',    emoji: '🎭' },
      { name: '수정 눈알',    emoji: '🔮' },
      { name: '악몽 유니콘',  emoji: '🦄' },
    ],
    boss: { name: '이블아이 로드', emoji: '🧿' },
  },
  {
    name: '용의 둥지', emoji: '🐉', theme: ['#f0d8cc', '#f9ece5'],
    mobs: [
      { name: '새끼 드래곤',  emoji: '🐲' },
      { name: '드레이크',     emoji: '🦎' },
      { name: '사룡',         emoji: '🐍' },
      { name: '드래곤 임프',  emoji: '🦇' },
    ],
    boss: { name: '엘더 드래곤', emoji: '🐉' },
  },
  {
    name: '천상계', emoji: '🌟', theme: ['#f5eecb', '#fcf8e6'],
    mobs: [
      { name: '타락 천사',    emoji: '😇' },
      { name: '뇌신 병사',    emoji: '🌩️' },
      { name: '태양 수호자',  emoji: '🌞' },
      { name: '달 그림자',    emoji: '🌙' },
    ],
    boss: { name: '혼돈의 신', emoji: '🌌' },
  },
];

/* 각 몬스터에 스탯 부여 */
REGIONS.forEach((rg, r) => {
  rg.mobs.forEach((m, s) => Object.assign(m, mobStats(r, s, false)));
  Object.assign(rg.boss, mobStats(r, 3, true), { isBoss: true });
});

const BOSS_UNLOCK_KILLS = 10; // 지역별 일반 몬스터 처치 수 → 보스 도전 가능

/* ---------- 플레이어 성장 ---------- */
const PLAYER_BASE = { hp: 100, mp: 30, atk: 10, def: 2 };
const PLAYER_GROWTH = { hp: 20, mp: 6, atk: 3, def: 1.3 }; // 레벨당
function expNeed(lv) { return Math.round(25 * Math.pow(lv, 1.7)); }

/* ---------- 장비 (14단계) ---------- */
const WEAPONS = [
  { name: '나무 막대기', emoji: '🪵', atk: 0,    price: 0 },
  { name: '녹슨 단검',   emoji: '🗡️', atk: 5,    price: 120 },
  { name: '철검',        emoji: '⚔️', atk: 13,   price: 500 },
  { name: '강철 대검',   emoji: '🪓', atk: 26,   price: 1800 },
  { name: '은빛 창',     emoji: '🔱', atk: 46,   price: 6000 },
  { name: '미스릴 검',   emoji: '🌙', atk: 78,   price: 20000 },
  { name: '화염검',      emoji: '🔥', atk: 125,  price: 65000 },
  { name: '용살검',      emoji: '🐉', atk: 195,  price: 210000 },
  { name: '성검',        emoji: '✨', atk: 300,  price: 680000 },
  { name: '마왕의 마검', emoji: '😈', atk: 460,  price: 2000000 },
  { name: '심연검',      emoji: '🌑', atk: 700,  price: 6500000 },
  { name: '별조각 대검', emoji: '💫', atk: 1100, price: 20000000 },
  { name: '시공의 검',   emoji: '⏳', atk: 1700, price: 60000000 },
  { name: '신살검',      emoji: '🌌', atk: 2600, price: 150000000 },
];

const ARMORS = [
  { name: '천 옷',        emoji: '👕', def: 0,    hp: 0,     price: 0 },
  { name: '가죽 갑옷',    emoji: '🦺', def: 3,    hp: 40,    price: 150 },
  { name: '사슬 갑옷',    emoji: '⛓️', def: 8,    hp: 100,   price: 650 },
  { name: '철 갑옷',      emoji: '🛡️', def: 16,   hp: 220,   price: 2300 },
  { name: '은빛 갑옷',    emoji: '🥈', def: 28,   hp: 420,   price: 7500 },
  { name: '미스릴 갑옷',  emoji: '🌙', def: 46,   hp: 750,   price: 25000 },
  { name: '용비늘 갑옷',  emoji: '🐲', def: 72,   hp: 1250,  price: 80000 },
  { name: '수호자 갑옷',  emoji: '🏰', def: 108,  hp: 2000,  price: 260000 },
  { name: '성기사 갑옷',  emoji: '✨', def: 155,  hp: 3100,  price: 820000 },
  { name: '불멸의 갑주',  emoji: '💠', def: 220,  hp: 4800,  price: 2400000 },
  { name: '심연의 갑주',  emoji: '🌑', def: 340,  hp: 7500,  price: 7500000 },
  { name: '별빛 갑주',    emoji: '💫', def: 520,  hp: 12000, price: 24000000 },
  { name: '시공의 갑주',  emoji: '⏳', def: 800,  hp: 19000, price: 70000000 },
  { name: '신위의 갑주',  emoji: '🌌', def: 1200, hp: 30000, price: 180000000 },
];

/* ---------- 포션 ---------- */
const POTIONS = [
  { key: 'hp', name: 'HP 포션', emoji: '❤️', desc: 'HP 60% 회복', price: 40 },
  { key: 'mp', name: 'MP 포션', emoji: '💙', desc: 'MP 전부 회복', price: 60 },
];

/* ---------- 스킬 ---------- */
const SKILLS = [
  { key: 'smash',    name: '강타',   emoji: '💥', unlockLv: 2,  mp: 8,  cd: 3,
    desc: '2.2배 피해', mult: 2.2 },
  { key: 'fireball', name: '화염구', emoji: '🔥', unlockLv: 5,  mp: 15, cd: 6,
    desc: '3.2배 피해 (방어 무시)', mult: 3.2, ignoreDef: true },
  { key: 'heal',     name: '회복',   emoji: '💚', unlockLv: 8,  mp: 20, cd: 10,
    desc: 'HP 40% 회복', healPct: 0.4 },
  { key: 'thunder',  name: '낙뢰',   emoji: '⚡', unlockLv: 12, mp: 30, cd: 15,
    desc: '5배 피해 (방어 무시)', mult: 5, ignoreDef: true },
];

/* ============================================================
   펫 시스템
   rarity: N(일반) R(레어) E(에픽) L(전설) M(신화)
   bonus: 장착 시 % 보너스 / petAtk: 2.5초마다 공격력의 % 피해
   중복 획득 → 펫 레벨업(최대 5), 레벨당 보너스 +25%
   ============================================================ */
const RARITY = {
  N: { name: '일반', color: '#9aa5b1' },
  R: { name: '레어', color: '#4d9fff' },
  E: { name: '에픽', color: '#a855f7' },
  L: { name: '전설', color: '#ff9430' },
  M: { name: '신화', color: '#ff4d6d' },
};

const PETS = [
  /* 일반 (6) */
  { key: 'dog',     name: '멍멍이',     emoji: '🐶', rarity: 'N', bonus: { atkPct: 2 },              petAtk: 15 },
  { key: 'cat',     name: '야옹이',     emoji: '🐱', rarity: 'N', bonus: { goldPct: 3 },             petAtk: 15 },
  { key: 'hamster', name: '햄찌',       emoji: '🐹', rarity: 'N', bonus: { expPct: 3 },              petAtk: 15 },
  { key: 'rabbit',  name: '토실이',     emoji: '🐰', rarity: 'N', bonus: { hpPct: 3 },               petAtk: 15 },
  { key: 'chick',   name: '삐약이',     emoji: '🐤', rarity: 'N', bonus: { atkPct: 2 },              petAtk: 15 },
  { key: 'turtle',  name: '느북이',     emoji: '🐢', rarity: 'N', bonus: { hpPct: 4 },               petAtk: 12 },
  /* 레어 (5) */
  { key: 'fox',     name: '불꼬리 여우', emoji: '🦊', rarity: 'R', bonus: { atkPct: 5, goldPct: 3 }, petAtk: 25 },
  { key: 'panda',   name: '먹보 판다',   emoji: '🐼', rarity: 'R', bonus: { hpPct: 8 },              petAtk: 22 },
  { key: 'owl',     name: '현자 부엉이', emoji: '🦉', rarity: 'R', bonus: { expPct: 8 },             petAtk: 22 },
  { key: 'penguin', name: '펭펭',        emoji: '🐧', rarity: 'R', bonus: { goldPct: 8 },            petAtk: 22 },
  { key: 'wolf',    name: '흑랑',        emoji: '🐺', rarity: 'R', bonus: { atkPct: 6 },             petAtk: 28 },
  /* 에픽 (4) */
  { key: 'unicorn', name: '유니콘',      emoji: '🦄', rarity: 'E', bonus: { atkPct: 10, expPct: 5 },  petAtk: 40 },
  { key: 'babydragon', name: '아기 용',  emoji: '🐲', rarity: 'E', bonus: { atkPct: 12 },             petAtk: 45 },
  { key: 'griffin', name: '그리핀',      emoji: '🦅', rarity: 'E', bonus: { goldPct: 12, atkPct: 4 }, petAtk: 38 },
  { key: 'whale',   name: '하늘 고래',   emoji: '🐳', rarity: 'E', bonus: { hpPct: 15 },              petAtk: 35 },
  /* 전설 (3) */
  { key: 'phoenix', name: '불사조',      emoji: '🐦‍🔥', rarity: 'L', bonus: { atkPct: 18 },             petAtk: 60 },
  { key: 'thunderbeast', name: '뇌수',   emoji: '⚡', rarity: 'L', bonus: { atkPct: 15, goldPct: 10 }, petAtk: 55 },
  { key: 'moonrabbit', name: '달토끼',   emoji: '🌙', rarity: 'L', bonus: { expPct: 20, goldPct: 10 }, petAtk: 50 },
  /* 신화 (2) */
  { key: 'starspirit', name: '별의 정령', emoji: '🌟', rarity: 'M', bonus: { atkPct: 25, goldPct: 15, expPct: 15 }, petAtk: 90 },
  { key: 'spiritking', name: '정령왕',    emoji: '👑', rarity: 'M', bonus: { atkPct: 30, hpPct: 20 },  petAtk: 100 },
];

const PET_MAX_LV = 5;
/* 장착한 펫은 사냥으로 경험치를 얻어 레벨업 (몬스터 EXP만큼 획득) */
function petExpNeed(lv) { return Math.round(300 * Math.pow(3, lv - 1)); }
const PET_DUP_REFUND = 0.35; // 만렙 중복 → 캡슐 가격의 35% 골드 반환

/* ---------- 자동 사냥 ---------- */
const AUTO_UNLOCK_LV = 15; // 이 레벨부터 자동 사냥 사용 가능

/* ---------- 업적 ----------
   value(state) >= target 이면 달성 → 보상 수령 가능 */
const ACHIEVEMENTS = [
  { id: 'kill1',     name: '첫 사냥',       desc: '몬스터 1마리 처치',        reward: 100,      target: 1,        value: (s) => s.stats.kills },
  { id: 'kill100',   name: '사냥꾼',        desc: '몬스터 100마리 처치',      reward: 2000,     target: 100,      value: (s) => s.stats.kills },
  { id: 'kill1k',    name: '학살자',        desc: '몬스터 1,000마리 처치',    reward: 50000,    target: 1000,     value: (s) => s.stats.kills },
  { id: 'kill5k',    name: '전설의 헌터',   desc: '몬스터 5,000마리 처치',    reward: 1000000,  target: 5000,     value: (s) => s.stats.kills },
  { id: 'boss1',     name: '보스 슬레이어', desc: '보스 1마리 처치',          reward: 500,      target: 1,        value: (s) => s.stats.bossKills },
  { id: 'boss20',    name: '보스 정복자',   desc: '보스 20마리 처치',         reward: 30000,    target: 20,       value: (s) => s.stats.bossKills },
  { id: 'lv10',      name: '견습 졸업',     desc: '레벨 10 달성',             reward: 1000,     target: 10,       value: (s) => s.lv },
  { id: 'lv30',      name: '베테랑',        desc: '레벨 30 달성',             reward: 50000,    target: 30,       value: (s) => s.lv },
  { id: 'lv60',      name: '초월자',        desc: '레벨 60 달성',             reward: 1000000,  target: 60,       value: (s) => s.lv },
  { id: 'gold100k',  name: '부자',          desc: '누적 골드 10만 획득',      reward: 10000,    target: 100000,   value: (s) => s.stats.goldEarned },
  { id: 'gold10m',   name: '대부호',        desc: '누적 골드 1,000만 획득',   reward: 1000000,  target: 10000000, value: (s) => s.stats.goldEarned },
  { id: 'pet5',      name: '펫 친구',       desc: '펫 5종 수집',              reward: 5000,     target: 5,        value: (s) => Object.keys(s.pets).length },
  { id: 'pet20',     name: '펫 마스터',     desc: '펫 20종 모두 수집',        reward: 2000000,  target: 20,       value: (s) => Object.keys(s.pets).length },
  { id: 'region8',   name: '중간 계주',     desc: '지역 8곳 해금',            reward: 100000,   target: 8,        value: (s) => s.unlockedRegion + 1 },
  { id: 'region16',  name: '세계 정복',     desc: '지역 16곳 모두 해금',      reward: 5000000,  target: 16,       value: (s) => s.unlockedRegion + 1 },
  { id: 'codex80',   name: '도감 완성',     desc: '몬스터 80종 모두 발견',    reward: 10000000, target: 80,       value: (s) => Object.keys(s.codex).length },
];

/* 캡슐 머신 — unlockRegion: 해당 지역 해금 시 이용 가능 */
const GACHA_MACHINES = [
  { name: '일반 캡슐', emoji: '🥚', price: 500, unlockRegion: 0,
    rates: { N: 60, R: 30, E: 9, L: 1, M: 0 } },
  { name: '고급 캡슐', emoji: '🪺', price: 20000, unlockRegion: 5,
    rates: { N: 20, R: 45, E: 25, L: 8, M: 2 } },
  { name: '전설 캡슐', emoji: '🔮', price: 1000000, unlockRegion: 10,
    rates: { N: 0, R: 20, E: 45, L: 25, M: 10 } },
];
