/* ============================================================
   game.js — 쾌감 ASMR 터치 v2
   아이템 40종 × 스테이지 20 (스테이지당 2개 아이템)
   드래그 문지르기, 볼륨 조절, 콤보 최대 x2.5
   ============================================================ */

/* ---------- 아이템 정의 (40종 = 스테이지 20 × 2) ---------- */
/* shape: circle | squircle | tile — 셀 모양 */
const ITEMS = [
  /* S1. 팝팝 */
  { key: 'bubblewrap',  name: '뽁뽁이',        emoji: '🫧', desc: '톡톡 터뜨려 보세요',          theme: ['#bfe6ff', '#e3f4ff'], cells: 36, shape: 'circle'   },
  { key: 'popit',       name: '팝잇',          emoji: '🔘', desc: '말랑말랑 눌러 보세요',        theme: ['#ffd6e8', '#ffeef6'], cells: 36, shape: 'circle'   },
  /* S2. 물 */
  { key: 'waterdrop',   name: '물방울',        emoji: '💧', desc: '똑, 똑, 떨어지는 소리',       theme: ['#c9f0ee', '#e8fbfa'], cells: 25, shape: 'circle'   },
  { key: 'stream',      name: '시냇물',        emoji: '🏞️', desc: '졸졸 흐르는 물소리',          theme: ['#c3e8db', '#e4f7f0'], cells: 25, shape: 'squircle' },
  /* S3. 타건 */
  { key: 'keyboard',    name: '기계식 키보드', emoji: '⌨️', desc: '따각따각 타건의 맛',          theme: ['#dcd6ff', '#f0edff'], cells: 36, shape: 'tile'     },
  { key: 'typewriter',  name: '타자기',        emoji: '🔡', desc: '찰칵— 아홉 번마다 띵!',       theme: ['#e5ddd0', '#f5f0e8'], cells: 36, shape: 'tile'     },
  /* S4. 말랑 */
  { key: 'slime',       name: '슬라임',        emoji: '🟢', desc: '쭈욱— 눌러서 뭉개기',         theme: ['#d3f5c8', '#ecfbe6'], cells: 25, shape: 'squircle' },
  { key: 'jelly',       name: '젤리',          emoji: '🍮', desc: '탱글탱글 흔들흔들',           theme: ['#ffe3c2', '#fff2e2'], cells: 25, shape: 'squircle' },
  /* S5. 종이 */
  { key: 'paper',       name: '종이 찢기',     emoji: '📄', desc: '좌악— 시원하게 찢기',         theme: ['#f3ecd9', '#faf6ec'], cells: 25, shape: 'tile'     },
  { key: 'pageflip',    name: '책장 넘기기',   emoji: '📖', desc: '사락— 넘어가는 페이지',       theme: ['#ead9c8', '#f7efe6'], cells: 25, shape: 'tile'     },
  /* S6. 차가움 */
  { key: 'ice',         name: '얼음',          emoji: '🧊', desc: '쨍— 갈라지는 청량함',         theme: ['#d4f1fb', '#eefaff'], cells: 25, shape: 'tile'     },
  { key: 'snow',        name: '눈 밟기',       emoji: '❄️', desc: '뽀드득— 첫눈의 감촉',         theme: ['#e8f2fa', '#f8fcff'], cells: 25, shape: 'squircle' },
  /* S7. 기포 */
  { key: 'soda',        name: '탄산수',        emoji: '🥤', desc: '치이익— 터지는 기포',         theme: ['#ffe9c7', '#fff6e6'], cells: 25, shape: 'circle'   },
  { key: 'soapbubble',  name: '비눗방울',      emoji: '⚪', desc: '퐁— 터지는 무지개 방울',      theme: ['#e3ecff', '#f1f5ff'], cells: 25, shape: 'circle'   },
  /* S8. 커팅 */
  { key: 'soap',        name: '비누 커팅',     emoji: '🧼', desc: '사각사각 잘리는 결',          theme: ['#fbd8f0', '#fdeef8'], cells: 25, shape: 'tile'     },
  { key: 'chalk',       name: '분필 커팅',     emoji: '🖍️', desc: '서걱— 부서지는 단면',         theme: ['#f0e4ee', '#f9f2f8'], cells: 25, shape: 'tile'     },
  /* S9. 나무 */
  { key: 'wood',        name: '나무 블록',     emoji: '🪵', desc: '통통 울리는 나무 소리',       theme: ['#ead9c3', '#f7efe3'], cells: 25, shape: 'squircle' },
  { key: 'bamboo',      name: '대나무',        emoji: '🎋', desc: '딱— 딱— 맑은 죽향',          theme: ['#d9ecc9', '#eef8e4'], cells: 25, shape: 'tile'     },
  /* S10. 알갱이 */
  { key: 'sand',        name: '키네틱 샌드',   emoji: '🏖️', desc: '사르르 부서지는 모래',        theme: ['#f5e6c8', '#fbf4e4'], cells: 25, shape: 'squircle' },
  { key: 'rice',        name: '쌀 붓기',       emoji: '🍚', desc: '차르르 쏟아지는 낟알',        theme: ['#f1ecdf', '#faf7f0'], cells: 25, shape: 'circle'   },
  /* S11. 유리 */
  { key: 'glass',       name: '유리잔',        emoji: '🥂', desc: '팅— 맑게 울리는 소리',        theme: ['#e2f0f5', '#f2fafc'], cells: 16, shape: 'circle'   },
  { key: 'marble',      name: '유리구슬',      emoji: '🔮', desc: '차각— 또르르 구르는',         theme: ['#e0e0f5', '#f0f0fc'], cells: 16, shape: 'circle'   },
  /* S12. 바람 */
  { key: 'windchime',   name: '풍경',          emoji: '🎐', desc: '바람이 연주하는 차임',        theme: ['#d7eef7', '#ecf8fc'], cells: 16, shape: 'circle'   },
  { key: 'woodchime',   name: '나무 풍경',     emoji: '🎏', desc: '토독— 나무의 화음',           theme: ['#e3e8d5', '#f2f5ea'], cells: 16, shape: 'squircle' },
  /* S13. 비 */
  { key: 'rain',        name: '빗소리 창가',   emoji: '🌧️', desc: '토독토독 젖어드는 밤',        theme: ['#cfd8e8', '#e7ecf5'], cells: 16, shape: 'squircle' },
  { key: 'umbrella',    name: '우산 빗방울',   emoji: '☂️', desc: '통통— 우산 위 연주',          theme: ['#d6dcf0', '#ebeef9'], cells: 16, shape: 'circle'   },
  /* S14. 탄성 */
  { key: 'spring',      name: '스프링',        emoji: '🌀', desc: '뾰용— 튀어오르는 탄성',       theme: ['#e0e5ff', '#f0f2ff'], cells: 16, shape: 'circle'   },
  { key: 'rubberband',  name: '고무줄',        emoji: '🪢', desc: '팅— 튕기는 저음의 여운',      theme: ['#f5ddd3', '#fbf0ea'], cells: 16, shape: 'tile'     },
  /* S15. 명상 목재 */
  { key: 'moktak',      name: '목탁',          emoji: '🪘', desc: '통— 마음이 고요해지는',       theme: ['#e8dcc8', '#f6f0e4'], cells: 16, shape: 'circle'   },
  { key: 'beads',       name: '염주',          emoji: '📿', desc: '차르륵— 굴러가는 알',         theme: ['#e2d5c3', '#f3ece1'], cells: 16, shape: 'circle'   },
  /* S16. 금속 종 */
  { key: 'bell',        name: '핸드벨',        emoji: '🔔', desc: '뎅그렁— 퍼지는 여운',         theme: ['#fff0c9', '#fff9e7'], cells: 16, shape: 'circle'   },
  { key: 'triangle',    name: '트라이앵글',    emoji: '🔺', desc: '칭— 은빛으로 반짝이는',       theme: ['#f0eddc', '#f9f8ee'], cells: 16, shape: 'tile'     },
  /* S17. 반짝임 */
  { key: 'crystal',     name: '크리스탈',      emoji: '💎', desc: '반짝이는 배음의 화음',        theme: ['#e6d9f7', '#f4edfc'], cells: 16, shape: 'tile'     },
  { key: 'musicbox',    name: '오르골',        emoji: '🎠', desc: '한 음씩 흐르는 멜로디',       theme: ['#fadfe8', '#fdf1f5'], cells: 16, shape: 'circle'   },
  /* S18. 자연 */
  { key: 'fire',        name: '모닥불',        emoji: '🔥', desc: '타닥타닥 튀는 불티',          theme: ['#f7dcc7', '#fcefe4'], cells: 9,  shape: 'squircle' },
  { key: 'wave',        name: '파도',          emoji: '🌊', desc: '쏴아— 밀려오는 포말',         theme: ['#c8dff0', '#e5f1fa'], cells: 9,  shape: 'squircle' },
  /* S19. 우주 */
  { key: 'aurora',      name: '오로라',        emoji: '🌌', desc: '너울거리는 빛의 화음',        theme: ['#d5d8f0', '#e9ebf8'], cells: 9,  shape: 'squircle' },
  { key: 'starlight',   name: '별빛',          emoji: '✨', desc: '반짝— 쏟아지는 별들',         theme: ['#dcd8ee', '#efedf8'], cells: 9,  shape: 'circle'   },
  /* S20. 깊은 공명 */
  { key: 'singingbowl', name: '싱잉볼',        emoji: '🕉️', desc: '웅— 깊은 명상의 공명',        theme: ['#f0e2d0', '#f9f2e8'], cells: 9,  shape: 'circle'   },
  { key: 'gong',        name: '징',            emoji: '🥁', desc: '두웅— 온몸을 감싸는 울림',    theme: ['#eadfcb', '#f7f1e5'], cells: 9,  shape: 'circle'   },
];

/* 보상/가격 자동 산출 — 아이템당 약 20~25회 클릭이면 다음 구매 가능 */
const REWARD = ITEMS.map((_, i) => Math.max(1, Math.round(Math.pow(1.3, i))));
const PRICE = ITEMS.map((_, i) =>
  i === 0 ? 0 : Math.round(REWARD[i - 1] * (18 + i * 0.5)));

const TOTAL_STAGES = ITEMS.length / 2; // 20
const SAVE_KEY = 'asmr_touch_save_v2';

/* ---------- 상태 ---------- */
const state = {
  money: 0,
  owned: [0],
  current: 0,
  combo: 0,
  lastClick: 0,
};

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const grid = $('grid');
const fxLayer = $('fx-layer');
const playArea = $('play-area');

/* ---------- 저장/불러오기 ---------- */
function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    money: state.money, owned: state.owned, current: state.current,
  }));
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d) return;
    state.money = d.money || 0;
    state.owned = Array.isArray(d.owned) && d.owned.length ? d.owned : [0];
    state.current = state.owned.includes(d.current) ? d.current : 0;
  } catch (e) { /* 저장 데이터 손상 시 초기 상태 사용 */ }
}

/* ---------- 유틸 ---------- */
function stage() { return Math.ceil(state.owned.length / 2); }
function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'K';
  return String(n);
}
function comboMultiplier() {
  return 1 + Math.min(state.combo, 60) * 0.025; // 최대 x2.5
}

/* ---------- HUD ---------- */
function renderHUD() {
  $('stage-label').textContent = `${stage()} / ${TOTAL_STAGES}`;
  $('money-label').textContent = fmt(Math.floor(state.money));
  const comboEl = $('combo-label');
  if (state.combo >= 5) {
    comboEl.textContent = `${state.combo} (x${comboMultiplier().toFixed(2)})`;
    comboEl.classList.add('combo-hot');
  } else {
    comboEl.textContent = '-';
    comboEl.classList.remove('combo-hot');
  }
}

/* ---------- 플레이 영역 ---------- */
function renderPlayArea() {
  const item = ITEMS[state.current];
  $('item-emoji').textContent = item.emoji;
  $('item-name').textContent = item.name;
  $('item-desc').textContent = item.desc;

  playArea.style.background =
    `radial-gradient(circle at 50% 35%, ${item.theme[1]}, ${item.theme[0]})`;
  document.body.style.background = item.theme[0];
  grid.style.setProperty('--cell-tint', item.theme[0]);
  grid.dataset.shape = item.shape;

  grid.innerHTML = '';
  const cols = Math.round(Math.sqrt(item.cells));
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let i = 0; i < item.cells; i++) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.textContent = item.emoji;
    cell.style.animationDelay = `${(i % cols) * 0.03 + Math.floor(i / cols) * 0.03}s`;
    cell.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      lastRubCell = cell;
      touchCell(cell, e);
    });
    grid.appendChild(cell);
  }
}

/* ---------- 문지르기 (드래그로 연속 터치) ---------- */
let rubbing = false;
let lastRubCell = null;

playArea.addEventListener('pointerdown', () => { rubbing = true; });
window.addEventListener('pointerup', () => { rubbing = false; lastRubCell = null; });
window.addEventListener('pointercancel', () => { rubbing = false; lastRubCell = null; });

playArea.addEventListener('pointermove', (e) => {
  if (!rubbing) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (el && el.classList.contains('cell') && el !== lastRubCell) {
    lastRubCell = el;
    touchCell(el, e);
  }
});

/* ---------- 셀 터치 ---------- */
let lastSoundAt = 0;

function touchCell(cell, e) {
  if (cell.classList.contains('popped')) return;

  AudioEngine.resume();
  const item = ITEMS[state.current];
  const rect = playArea.getBoundingClientRect();
  const relX = (e.clientX - rect.left) / rect.width;

  // 사운드 (과도한 동시 발음 방지: 30ms 간격 제한)
  const nowT = performance.now();
  if (nowT - lastSoundAt >= 30) {
    lastSoundAt = nowT;
    AudioEngine.sounds[item.key](relX);
  }

  // 콤보
  state.combo = (nowT - state.lastClick < 1000) ? state.combo + 1 : 1;
  state.lastClick = nowT;

  // 보상
  const gain = Math.ceil(REWARD[state.current] * comboMultiplier());
  state.money += gain;

  // 셀 팝 애니메이션 후 재생성
  cell.classList.add('popped');
  setTimeout(() => cell.classList.remove('popped'), 700 + Math.random() * 500);

  const fx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  spawnCoinFx(fx.x, fx.y, gain);
  spawnParticles(fx.x, fx.y, item.theme[0]);
  spawnRipple(fx.x, fx.y);

  renderHUD();
  updateShopStates();
  save();
}

/* ---------- 이펙트 ---------- */
function spawnCoinFx(x, y, gain) {
  const el = document.createElement('div');
  el.className = 'coin-fx';
  el.textContent = `+${gain}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  fxLayer.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.background = color;
    const ang = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 50;
    p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(ang) * dist - 20}px`);
    fxLayer.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

function spawnRipple(x, y) {
  const r = document.createElement('div');
  r.className = 'ripple';
  r.style.left = `${x}px`;
  r.style.top = `${y}px`;
  fxLayer.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

/* ---------- 상점 ---------- */
function buildShop() {
  const scroll = $('shop-scroll');
  ITEMS.forEach((item, i) => {
    if (i % 2 === 0) { // 스테이지 구분선
      const div = document.createElement('div');
      div.className = 'shop-divider';
      div.textContent = `S${i / 2 + 1}`;
      scroll.appendChild(div);
    }
    const btn = document.createElement('button');
    btn.className = 'shop-item';
    btn.id = `shop-${i}`;
    btn.innerHTML = `
      <span class="shop-emoji">${item.emoji}</span>
      <span class="shop-name">${item.name}</span>
      <span class="shop-price"></span>`;
    btn.addEventListener('click', () => onShopClick(i));
    scroll.appendChild(btn);
  });
}

function updateShopStates() {
  ITEMS.forEach((item, i) => {
    const btn = $(`shop-${i}`);
    const priceEl = btn.querySelector('.shop-price');
    const isOwned = state.owned.includes(i);
    const nextToBuy = !isOwned && i === state.owned.length; // 순서대로 해금
    const lockedFar = !isOwned && !nextToBuy;

    btn.classList.toggle('owned', isOwned);
    btn.classList.toggle('active', i === state.current);
    btn.classList.toggle('locked', lockedFar);
    btn.classList.toggle('affordable', nextToBuy && state.money >= PRICE[i]);

    if (isOwned) priceEl.textContent = '보유중';
    else if (nextToBuy) priceEl.textContent = `🪙 ${fmt(PRICE[i])}`;
    else priceEl.textContent = '🔒';
  });
}

function onShopClick(i) {
  AudioEngine.resume();
  const item = ITEMS[i];

  if (state.owned.includes(i)) { // 보유중 → 교체
    state.current = i;
    renderPlayArea();
    updateShopStates();
    save();
    return;
  }

  if (i !== state.owned.length) {
    AudioEngine.uiDeny();
    toast(`먼저 ${ITEMS[state.owned.length].name}을(를) 구매하세요 🔒`);
    return;
  }

  if (state.money < PRICE[i]) {
    AudioEngine.uiDeny();
    toast(`코인이 부족해요! (${fmt(PRICE[i] - Math.floor(state.money))} 더 필요)`);
    return;
  }

  // 구매!
  state.money -= PRICE[i];
  state.owned.push(i);
  state.current = i;
  state.combo = 0;

  AudioEngine.uiBuy();
  if (state.owned.length % 2 === 0) { // 짝을 완성 → 스테이지 달성
    setTimeout(() => AudioEngine.uiStageUp(), 300);
    toast(`✨ 스테이지 ${stage()} 달성! — ${item.name} 획득`);
  } else {
    toast(`🎁 ${item.name} 획득!`);
  }

  renderPlayArea();
  renderHUD();
  updateShopStates();
  save();

  $(`shop-${i}`).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

  if (state.owned.length === ITEMS.length) {
    setTimeout(showClear, 800);
  }
}

/* ---------- 토스트 / 클리어 ---------- */
let toastTimer = null;
function toast(msg) {
  const el = $('stage-toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

function showClear() {
  $('clear-overlay').classList.remove('hidden');
  confetti();
}

function confetti() {
  const rect = playArea.getBoundingClientRect();
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      spawnParticles(Math.random() * rect.width, Math.random() * rect.height * 0.6,
        `hsl(${Math.random() * 360}, 80%, 70%)`);
    }, i * 50);
  }
}

/* ---------- 볼륨 컨트롤 ---------- */
$('mute-btn').addEventListener('click', () => {
  AudioEngine.init();
  const muted = AudioEngine.toggleMute();
  $('mute-btn').textContent = muted ? '🔇' : '🔊';
});
$('vol-slider').addEventListener('input', (e) => {
  AudioEngine.init();
  AudioEngine.setVolume(e.target.value / 100);
});

/* ---------- 초기화 ---------- */
$('start-btn').addEventListener('click', () => {
  AudioEngine.init();
  AudioEngine.resume();
  $('start-overlay').classList.add('hidden');
});

$('clear-close-btn').addEventListener('click', () => {
  $('clear-overlay').classList.add('hidden');
});

setInterval(() => {
  if (state.combo > 0 && performance.now() - state.lastClick > 1500) {
    state.combo = 0;
    renderHUD();
  }
}, 500);

load();
buildShop();
renderPlayArea();
renderHUD();
updateShopStates();
