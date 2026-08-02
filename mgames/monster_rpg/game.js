/* ============================================================
   game.js — 몬스터 헌터 RPG 게임 로직
   ============================================================ */

const SAVE_KEY = 'monster_rpg_save_v1';

/* ---------- 상태 ---------- */
const state = {
  lv: 1, exp: 0, gold: 0,
  hp: PLAYER_BASE.hp, mp: PLAYER_BASE.mp,
  weapon: 0, armor: 0,
  potions: { hp: 2, mp: 1 },
  pets: {},          // { 펫key: { lv, exp } }
  activePet: null,
  region: 0,
  unlockedRegion: 0,
  kills: REGIONS.map(() => 0),
  bossDown: REGIONS.map(() => false),
  codex: {},                                    // { 몬스터이름: 처치 수 }
  stats: { kills: 0, bossKills: 0, goldEarned: 0 },
  achClaimed: {},                               // { 업적id: true }
  autoHunt: false,
  lastTs: 0,                                    // 오프라인 보상용 마지막 저장 시각
};

let mob = null;            // 현재 몬스터 { data, hp, nextAtkAt }
let lastAttackAt = 0;      // 플레이어 공격 GCD
const skillReadyAt = [0, 0, 0, 0];
let shopTab = 'weapon';
let mpRegenAcc = 0;
let petNextAtkAt = 0;

/* ---------- 펫 헬퍼 ---------- */
function petData() { return state.activePet ? PETS.find((p) => p.key === state.activePet) : null; }
function petLv() {
  if (!state.activePet) return 0;
  const e = state.pets[state.activePet];
  return e ? e.lv : 1;
}
function petPct(kind) {
  const p = petData();
  if (!p || !p.bonus[kind]) return 0;
  return p.bonus[kind] * (1 + 0.25 * (petLv() - 1)); // 펫 레벨당 보너스 +25%
}

/* ---------- 파생 스탯 ---------- */
function maxHp() { return Math.round((PLAYER_BASE.hp + PLAYER_GROWTH.hp * (state.lv - 1) + ARMORS[state.armor].hp) * (1 + petPct('hpPct') / 100)); }
function maxMp() { return PLAYER_BASE.mp + PLAYER_GROWTH.mp * (state.lv - 1); }
function atk()   { return Math.round((PLAYER_BASE.atk + PLAYER_GROWTH.atk * (state.lv - 1) + WEAPONS[state.weapon].atk) * (1 + petPct('atkPct') / 100)); }
function def()   { return Math.floor(PLAYER_BASE.def + PLAYER_GROWTH.def * (state.lv - 1) + ARMORS[state.armor].def); }

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const battleArea = $('battle-area');
const monsterBox = $('monster-box');
const fxLayer = $('fx-layer');

/* ---------- 저장/불러오기 ---------- */
function save() {
  state.lastTs = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d) return;
    Object.assign(state, d);
    state.kills = REGIONS.map((_, i) => (d.kills && d.kills[i]) || 0);
    state.bossDown = REGIONS.map((_, i) => (d.bossDown && d.bossDown[i]) || false);
    // 구버전 저장(펫 값이 숫자 레벨) → { lv, exp } 형태로 마이그레이션
    Object.keys(state.pets || {}).forEach((k) => {
      if (typeof state.pets[k] === 'number') state.pets[k] = { lv: state.pets[k], exp: 0 };
    });
    // 구버전 저장에 없던 필드 보정
    if (!state.codex) state.codex = {};
    if (!state.stats) {
      // 기존 지역별 처치 수로 통계 소급 적용
      state.stats = {
        kills: state.kills.reduce((a, b) => a + b, 0),
        bossKills: state.bossDown.filter(Boolean).length,
        goldEarned: 0,
      };
    }
    if (!state.achClaimed) state.achClaimed = {};
    state.hp = Math.min(state.hp, maxHp());
    state.mp = Math.min(state.mp, maxMp());
  } catch (e) { /* 손상된 저장 → 새 게임 */ }
}

/* ---------- 유틸 ---------- */
function fmt(n) {
  if (n >= 1000000000) return (n / 1000000000).toFixed(n % 1000000000 ? 1 : 0) + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'K';
  return String(Math.floor(n));
}
function rand(a, b) { return a + Math.random() * (b - a); }

let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden', 'show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2000);
}

/* ---------- 몬스터 스폰 ---------- */
function spawnMob(isBoss = false) {
  const rg = REGIONS[state.region];
  const data = isBoss ? rg.boss : rg.mobs[Math.floor(Math.random() * rg.mobs.length)];
  mob = {
    data,
    hp: data.hp,
    nextAtkAt: performance.now() + data.spd * 1000,
  };
  monsterBox.classList.remove('dead');
  monsterBox.classList.toggle('boss', !!isBoss);
  if (isBoss) AudioFX.bossRoar();
  renderMob();
  renderBossBtn();
}

/* ---------- 플레이어 공격 ---------- */
function playerAttack(mult = 1, ignoreDef = false, skillFx = null) {
  if (!mob || mob.hp <= 0) return false;

  const isCrit = Math.random() < 0.15;
  const base = atk() * rand(0.85, 1.15) * mult * (isCrit ? 1.8 : 1);
  const dmg = Math.max(1, Math.round(base - (ignoreDef ? 0 : mob.data.def)));

  mob.hp = Math.max(0, mob.hp - dmg);

  // 이펙트
  if (skillFx) skillFx();
  else if (isCrit) AudioFX.crit();
  else AudioFX.hit();

  spawnDmgNum(dmg, isCrit, mult > 1);
  monsterBox.classList.remove('shake');
  void monsterBox.offsetWidth;
  monsterBox.classList.add('shake');
  if (isCrit) {
    battleArea.classList.remove('crit-flash');
    void battleArea.offsetWidth;
    battleArea.classList.add('crit-flash');
  }

  if (mob.hp <= 0) killMob();
  renderMob();
  return true;
}

function onTapMonster(e) {
  e.preventDefault();
  AudioFX.init(); AudioFX.resume();
  const t = performance.now();
  if (t - lastAttackAt < 250) return; // 연타 GCD
  lastAttackAt = t;
  playerAttack();
}

/* ---------- 몬스터 처치 ---------- */
function killMob() {
  const d = mob.data;
  AudioFX.kill();
  monsterBox.classList.add('dead');

  const goldGain = Math.round(d.gold * (1 + petPct('goldPct') / 100));
  const expGain = Math.round(d.exp * (1 + petPct('expPct') / 100));
  state.gold += goldGain;
  gainExp(expGain);
  gainPetExp(d.exp);
  spawnLootFx(`+${fmt(goldGain)} 🪙  +${expGain} EXP`);

  // 도감 / 통계
  state.codex[d.name] = (state.codex[d.name] || 0) + 1;
  state.stats.kills++;
  state.stats.goldEarned += goldGain;
  if (d.isBoss) state.stats.bossKills++;

  if (d.isBoss) {
    state.bossDown[state.region] = true;
    if (state.region === REGIONS.length - 1) {
      AudioFX.victory();
      setTimeout(() => $('win-overlay').classList.remove('hidden'), 900);
    } else if (state.unlockedRegion === state.region) {
      state.unlockedRegion++;
      AudioFX.victory();
      toast(`🎉 ${REGIONS[state.unlockedRegion].name} 지역 해금!`);
      renderRegionBar();
    }
  } else {
    state.kills[state.region]++;
  }

  save();
  renderAll();
  setTimeout(() => spawnMob(false), 750);
}

/* ---------- 경험치/레벨 ---------- */
function gainExp(n) {
  state.exp += n;
  let leveled = false;
  while (state.exp >= expNeed(state.lv)) {
    state.exp -= expNeed(state.lv);
    state.lv++;
    leveled = true;
  }
  if (leveled) {
    state.hp = maxHp();
    state.mp = maxMp();
    AudioFX.levelup();
    toast(`⬆️ 레벨 업! Lv.${state.lv}`);
    spawnLevelFx();
    renderSkills(); // 새 스킬 해금 반영
  }
}

/* ---------- 펫 경험치 ---------- */
function gainPetExp(n) {
  const p = petData();
  if (!p) return;
  const e = state.pets[p.key];
  if (!e || e.lv >= PET_MAX_LV) return;
  e.exp += n;
  let leveled = false;
  while (e.lv < PET_MAX_LV && e.exp >= petExpNeed(e.lv)) {
    e.exp -= petExpNeed(e.lv);
    e.lv++;
    leveled = true;
  }
  if (e.lv >= PET_MAX_LV) e.exp = 0;
  if (leveled) {
    AudioFX.levelup();
    toast(`${p.emoji} ${p.name} 레벨 업! Lv.${e.lv} — ${petBonusText(p, e.lv)}`);
    renderPetSprite();
    renderPlayer(); // 펫 보너스 상승 반영
  }
}

/* ---------- 몬스터의 공격 / 틱 ---------- */
function tick() {
  const t = performance.now();

  if (mob && mob.hp > 0) {
    // 공격 예고 연출
    monsterBox.classList.toggle('winding', mob.nextAtkAt - t < 450);

    if (t >= mob.nextAtkAt) {
      mob.nextAtkAt = t + mob.data.spd * 1000;
      const dmg = Math.max(1, Math.round(mob.data.atk * rand(0.9, 1.1) - def()));
      state.hp = Math.max(0, state.hp - dmg);
      AudioFX.hurt();
      spawnPlayerDmg(dmg);
      monsterBox.classList.remove('lunge');
      void monsterBox.offsetWidth;
      monsterBox.classList.add('lunge');
      document.body.classList.remove('hurt-flash');
      void document.body.offsetWidth;
      document.body.classList.add('hurt-flash');

      if (state.hp <= 0) return onDeath();
      renderPlayer();
    }
  }

  // 자동 사냥 (0.6초 간격 자동 공격)
  if (state.autoHunt && state.lv >= AUTO_UNLOCK_LV && mob && mob.hp > 0
      && t - lastAttackAt >= 600) {
    lastAttackAt = t;
    playerAttack();
  }

  // 펫 자동 공격 (2.5초마다, 공격력의 일정 %)
  const pd = petData();
  if (pd && mob && mob.hp > 0 && t >= petNextAtkAt) {
    petNextAtkAt = t + 2500;
    const dmg = Math.max(1, Math.round(atk() * (pd.petAtk / 100) * rand(0.9, 1.1)));
    mob.hp = Math.max(0, mob.hp - dmg);
    spawnPetAtkFx(pd.emoji, dmg);
    AudioFX.hit();
    if (mob.hp <= 0) killMob();
    renderMob();
  }

  // MP 자연 회복 (초당 1)
  mpRegenAcc += 0.1;
  if (mpRegenAcc >= 1) {
    mpRegenAcc = 0;
    if (state.mp < maxMp()) {
      state.mp = Math.min(maxMp(), state.mp + 1);
      renderPlayer();
    }
  }

  renderSkillCooldowns();
}

function onDeath() {
  AudioFX.death();
  const lost = Math.floor(state.gold * 0.1);
  state.gold -= lost;
  state.hp = maxHp();
  state.mp = maxMp();
  toast(`💀 쓰러졌다... 🪙 ${fmt(lost)} 잃고 부활 (HP 회복)`);
  spawnMob(false);
  save();
  renderAll();
}

/* ---------- 스킬 ---------- */
function useSkill(i) {
  AudioFX.init(); AudioFX.resume();
  const sk = SKILLS[i];
  const t = performance.now();

  if (state.lv < sk.unlockLv) { AudioFX.deny(); toast(`Lv.${sk.unlockLv}에 해금됩니다`); return; }
  if (t < skillReadyAt[i]) { AudioFX.deny(); return; }
  if (state.mp < sk.mp) { AudioFX.deny(); toast('MP가 부족해요!'); return; }

  if (sk.healPct) {
    state.mp -= sk.mp;
    const amount = Math.round(maxHp() * sk.healPct);
    state.hp = Math.min(maxHp(), state.hp + amount);
    AudioFX.heal();
    spawnHealFx(amount);
  } else {
    if (!mob || mob.hp <= 0) { AudioFX.deny(); return; }
    state.mp -= sk.mp;
    const fx = { smash: AudioFX.smash, fireball: AudioFX.fireball, thunder: AudioFX.thunder }[sk.key];
    playerAttack(sk.mult, sk.ignoreDef, fx);
    spawnSkillEmoji(sk.emoji);
  }

  skillReadyAt[i] = t + sk.cd * 1000;
  renderPlayer();
  save();
}

/* ---------- 포션 ---------- */
function usePotion(key) {
  AudioFX.init(); AudioFX.resume();
  if (state.potions[key] <= 0) { AudioFX.deny(); toast('포션이 없어요! 상점에서 구매하세요'); return; }
  if (key === 'hp') {
    if (state.hp >= maxHp()) { AudioFX.deny(); return; }
    state.potions.hp--;
    const amount = Math.round(maxHp() * 0.6);
    state.hp = Math.min(maxHp(), state.hp + amount);
    AudioFX.heal();
    spawnHealFx(amount);
  } else {
    if (state.mp >= maxMp()) { AudioFX.deny(); return; }
    state.potions.mp--;
    state.mp = maxMp();
    AudioFX.heal();
  }
  renderPlayer();
  renderPotions();
  save();
}

/* ---------- 이펙트 ---------- */
function fxEl(cls, text, x, y) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  fxLayer.appendChild(el);
  return el;
}
function mobCenter() {
  const r = monsterBox.getBoundingClientRect();
  const b = battleArea.getBoundingClientRect();
  return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height * 0.35 };
}
function spawnDmgNum(dmg, isCrit, isSkill) {
  const c = mobCenter();
  const el = fxEl('dmg-num' + (isCrit ? ' crit' : '') + (isSkill ? ' skill' : ''),
    `${isCrit ? '💥' : ''}${fmt(dmg)}`,
    c.x + rand(-40, 40), c.y + rand(-16, 10));
  setTimeout(() => el.remove(), 800);
}
function spawnPlayerDmg(dmg) {
  const b = battleArea.getBoundingClientRect();
  const el = fxEl('dmg-num player-dmg', `-${fmt(dmg)}`, b.width / 2 + rand(-30, 30), b.height - 60);
  setTimeout(() => el.remove(), 800);
}
function spawnHealFx(amount) {
  const b = battleArea.getBoundingClientRect();
  const el = fxEl('dmg-num heal-num', `+${fmt(amount)} 💚`, b.width / 2 + rand(-20, 20), b.height - 70);
  setTimeout(() => el.remove(), 900);
}
function spawnLootFx(text) {
  const c = mobCenter();
  const el = fxEl('loot-fx', text, c.x, c.y + 55);
  setTimeout(() => el.remove(), 1100);
}
function spawnSkillEmoji(emoji) {
  const c = mobCenter();
  const el = fxEl('skill-emoji', emoji, c.x, c.y + 10);
  setTimeout(() => el.remove(), 550);
}
function spawnLevelFx() {
  const b = battleArea.getBoundingClientRect();
  const el = fxEl('level-fx', 'LEVEL UP!', b.width / 2, b.height / 2);
  setTimeout(() => el.remove(), 1200);
}
function spawnPetAtkFx(emoji, dmg) {
  const c = mobCenter();
  const el = fxEl('pet-atk-fx', emoji, c.x - 65, c.y + 45);
  setTimeout(() => el.remove(), 500);
  const num = fxEl('dmg-num pet-dmg', fmt(dmg), c.x + rand(-30, 30), c.y + 25);
  setTimeout(() => num.remove(), 800);
}

/* ---------- 펫 스프라이트 ---------- */
function renderPetSprite() {
  const el = $('pet-sprite');
  const p = petData();
  if (!p) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.textContent = p.emoji;
  el.title = `${p.name} Lv.${petLv()}`;
}

/* ---------- 렌더링 ---------- */
function setBar(fillId, textId, cur, max) {
  $(fillId).style.width = `${Math.max(0, Math.min(100, (cur / max) * 100))}%`;
  $(textId).textContent = `${fmt(cur)} / ${fmt(max)}`;
}

function renderPlayer() {
  $('player-level').textContent = `Lv.${state.lv}`;
  $('player-gold').textContent = `🪙 ${fmt(state.gold)}`;
  setBar('player-hp-fill', 'player-hp-text', state.hp, maxHp());
  setBar('player-mp-fill', 'player-mp-text', state.mp, maxMp());
  setBar('player-exp-fill', 'player-exp-text', state.exp, expNeed(state.lv));
  $('shop-gold').textContent = `🪙 ${fmt(state.gold)}`;
}

function renderMob() {
  if (!mob) return;
  $('monster-emoji').textContent = mob.data.emoji;
  $('monster-name').textContent = (mob.data.isBoss ? '👑 ' : '') + mob.data.name;
  setBar('monster-hp-fill', 'monster-hp-text', mob.hp, mob.data.hp);
}

function renderRegionBar() {
  const bar = $('region-bar');
  bar.innerHTML = '';
  REGIONS.forEach((rg, i) => {
    const btn = document.createElement('button');
    btn.className = 'region-chip'
      + (i === state.region ? ' active' : '')
      + (i > state.unlockedRegion ? ' locked' : '');
    btn.textContent = i > state.unlockedRegion ? '🔒' : rg.emoji;
    btn.title = rg.name;
    btn.addEventListener('click', () => {
      AudioFX.init(); AudioFX.resume();
      if (i > state.unlockedRegion) {
        AudioFX.deny();
        toast(`${REGIONS[i - 1].name}의 보스를 처치하면 열려요`);
        return;
      }
      state.region = i;
      applyRegionTheme();
      spawnMob(false);
      renderRegionBar();
      renderKillProgress();
      save();
    });
    bar.appendChild(btn);
  });
}

function applyRegionTheme() {
  const rg = REGIONS[state.region];
  $('region-title').textContent = `${rg.emoji} ${rg.name}`;
  battleArea.style.background =
    `radial-gradient(circle at 50% 30%, ${rg.theme[1]}, ${rg.theme[0]})`;
  document.body.style.background = rg.theme[0];
}

function renderKillProgress() {
  const k = state.kills[state.region];
  const done = state.bossDown[state.region];
  $('kill-progress').textContent = done
    ? '✅ 보스 클리어 — 자유 사냥'
    : `사냥 ${Math.min(k, BOSS_UNLOCK_KILLS)} / ${BOSS_UNLOCK_KILLS} → 보스 도전`;
  renderBossBtn();
}

function renderBossBtn() {
  const btn = $('boss-btn');
  const canFight = state.kills[state.region] >= BOSS_UNLOCK_KILLS;
  const isBossNow = mob && mob.data.isBoss && mob.hp > 0;
  btn.classList.toggle('hidden', !canFight || isBossNow);
  btn.textContent = state.bossDown[state.region] ? '👑 보스 재도전' : '👑 보스 도전!';
}

function renderSkills() {
  SKILLS.forEach((sk, i) => {
    const btn = $(`skill-${i}`);
    const locked = state.lv < sk.unlockLv;
    btn.classList.toggle('locked', locked);
    btn.innerHTML = locked
      ? `<span class="sk-emoji">🔒</span><span class="sk-name">Lv.${sk.unlockLv}</span>`
      : `<span class="sk-emoji">${sk.emoji}</span><span class="sk-name">${sk.name}</span>
         <span class="sk-mp">MP${sk.mp}</span><span class="sk-cd"></span>`;
    btn.title = `${sk.name} — ${sk.desc} (MP ${sk.mp}, 쿨타임 ${sk.cd}초)`;
  });
}

function renderSkillCooldowns() {
  const t = performance.now();
  SKILLS.forEach((sk, i) => {
    const cdEl = $(`skill-${i}`).querySelector('.sk-cd');
    if (!cdEl) return;
    const remain = skillReadyAt[i] - t;
    if (remain > 0) {
      cdEl.style.height = `${(remain / (sk.cd * 1000)) * 100}%`;
      cdEl.textContent = remain > 1000 ? Math.ceil(remain / 1000) : '';
    } else {
      cdEl.style.height = '0';
      cdEl.textContent = '';
    }
  });
}

function renderPotions() {
  $('hp-potion-btn').innerHTML = `<span class="sk-emoji">❤️</span><span class="sk-name">x${state.potions.hp}</span>`;
  $('mp-potion-btn').innerHTML = `<span class="sk-emoji">💙</span><span class="sk-name">x${state.potions.mp}</span>`;
}

/* ---------- 상점 ---------- */
function renderShop() {
  const list = $('shop-list');
  list.innerHTML = '';

  if (shopTab === 'potion') {
    POTIONS.forEach((p) => {
      const row = document.createElement('button');
      row.className = 'shop-row affordable';
      row.innerHTML = `
        <span class="sr-emoji">${p.emoji}</span>
        <span class="sr-body"><b>${p.name}</b><small>${p.desc} · 보유 x${state.potions[p.key]}</small></span>
        <span class="sr-price">🪙 ${fmt(p.price)}</span>`;
      row.addEventListener('click', () => {
        if (state.gold < p.price) { AudioFX.deny(); toast('골드가 부족해요!'); return; }
        state.gold -= p.price;
        state.potions[p.key]++;
        AudioFX.buy();
        renderPlayer(); renderPotions(); renderShop();
        save();
      });
      list.appendChild(row);
    });
    return;
  }

  if (shopTab === 'pet') { renderPetShop(list); return; }

  const items = shopTab === 'weapon' ? WEAPONS : ARMORS;
  const ownedIdx = shopTab === 'weapon' ? state.weapon : state.armor;

  items.forEach((it, i) => {
    const row = document.createElement('button');
    const stat = shopTab === 'weapon'
      ? `공격력 +${it.atk}`
      : `방어 +${it.def} · HP +${it.hp}`;
    const isOwned = i <= ownedIdx;
    const isNext = i === ownedIdx + 1;

    row.className = 'shop-row'
      + (isOwned ? ' owned' : '')
      + (i === ownedIdx ? ' equipped' : '')
      + (!isOwned && !isNext ? ' locked' : '')
      + (isNext && state.gold >= it.price ? ' affordable' : '');
    row.innerHTML = `
      <span class="sr-emoji">${it.emoji}</span>
      <span class="sr-body"><b>${it.name}</b><small>${stat}</small></span>
      <span class="sr-price">${i === ownedIdx ? '장착중' : isOwned ? '보유' : isNext ? `🪙 ${fmt(it.price)}` : '🔒'}</span>`;

    row.addEventListener('click', () => {
      if (isOwned || !isNext) return;
      if (state.gold < it.price) { AudioFX.deny(); toast('골드가 부족해요!'); return; }
      state.gold -= it.price;
      if (shopTab === 'weapon') state.weapon = i;
      else { state.armor = i; state.hp = Math.min(state.hp + it.hp, maxHp()); }
      AudioFX.buy();
      toast(`${it.emoji} ${it.name} 장착!`);
      renderPlayer(); renderShop();
      save();
    });
    list.appendChild(row);
  });
}

/* ---------- 펫 상점 (캡슐 뽑기) ---------- */
function petBonusText(p, lv) {
  const mult = 1 + 0.25 * (lv - 1);
  const parts = [];
  if (p.bonus.atkPct)  parts.push(`공격 +${Math.round(p.bonus.atkPct * mult)}%`);
  if (p.bonus.goldPct) parts.push(`골드 +${Math.round(p.bonus.goldPct * mult)}%`);
  if (p.bonus.expPct)  parts.push(`경험치 +${Math.round(p.bonus.expPct * mult)}%`);
  if (p.bonus.hpPct)   parts.push(`HP +${Math.round(p.bonus.hpPct * mult)}%`);
  parts.push(`자동공격 ${p.petAtk}%`);
  return parts.join(' · ');
}

function renderPetShop(list) {
  GACHA_MACHINES.forEach((m, mi) => {
    const locked = state.unlockedRegion < m.unlockRegion;
    const row = document.createElement('button');
    row.className = 'shop-row gacha-row'
      + (locked ? ' locked' : state.gold >= m.price ? ' affordable' : '');
    row.innerHTML = `
      <span class="sr-emoji">${m.emoji}</span>
      <span class="sr-body"><b>${m.name} 뽑기</b><small>${locked
        ? `🔒 ${REGIONS[m.unlockRegion].name} 해금 시 이용 가능`
        : `N ${m.rates.N}% · R ${m.rates.R}% · E ${m.rates.E}% · L ${m.rates.L}% · M ${m.rates.M}%`}</small></span>
      <span class="sr-price">🪙 ${fmt(m.price)}</span>`;
    row.addEventListener('click', () => pullGacha(mi));
    list.appendChild(row);
  });

  const head = document.createElement('div');
  head.className = 'pet-list-head';
  head.textContent = `보유 펫 ${Object.keys(state.pets).length} / ${PETS.length} — 탭하여 장착/해제`;
  list.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'pet-grid';
  PETS.forEach((p) => {
    const e = state.pets[p.key];
    const lv = e ? e.lv : 0;
    const expPct = !e ? 0
      : lv >= PET_MAX_LV ? 100
      : Math.min(100, (e.exp / petExpNeed(lv)) * 100);
    const chip = document.createElement('button');
    chip.className = 'pet-chip rarity-' + p.rarity
      + (lv ? '' : ' unowned')
      + (state.activePet === p.key ? ' equipped' : '');
    chip.innerHTML = lv
      ? `<span class="pc-emoji">${p.emoji}</span><span class="pc-name">${p.name}</span>
         <span class="pc-lv">Lv.${lv}${lv >= PET_MAX_LV ? ' MAX' : ''}</span>
         <span class="pc-expbar"><i style="width:${expPct}%"></i></span>`
      : `<span class="pc-emoji">❓</span><span class="pc-name">???</span>
         <span class="pc-lv">${RARITY[p.rarity].name}</span>`;
    if (lv) chip.title = petBonusText(p, lv);
    chip.addEventListener('click', () => {
      if (!lv) { AudioFX.deny(); return; }
      state.activePet = state.activePet === p.key ? null : p.key;
      AudioFX.buy();
      state.hp = Math.min(state.hp, maxHp()); // HP 보너스 해제 시 초과분 정리
      renderPetSprite();
      renderPlayer();
      renderShop();
      save();
    });
    grid.appendChild(chip);
  });
  list.appendChild(grid);
}

/* ---------- 캡슐 뽑기 ---------- */
function rollRarity(rates) {
  let roll = Math.random() * 100;
  for (const r of ['N', 'R', 'E', 'L', 'M']) {
    roll -= rates[r];
    if (roll < 0) return r;
  }
  return 'N';
}

function pullGacha(mi) {
  const m = GACHA_MACHINES[mi];
  if (state.unlockedRegion < m.unlockRegion) {
    AudioFX.deny();
    toast(`${REGIONS[m.unlockRegion].name} 지역을 해금하면 이용할 수 있어요`);
    return;
  }
  if (state.gold < m.price) { AudioFX.deny(); toast('골드가 부족해요!'); return; }

  state.gold -= m.price;
  const rarity = rollRarity(m.rates);
  const pool = PETS.filter((p) => p.rarity === rarity);
  const pet = pool[Math.floor(Math.random() * pool.length)];

  let resultDesc;
  const entry = state.pets[pet.key];
  if (!entry) {
    state.pets[pet.key] = { lv: 1, exp: 0 };
    resultDesc = '✨ NEW! ' + petBonusText(pet, 1);
  } else if (entry.lv < PET_MAX_LV) {
    entry.lv++;
    resultDesc = `⬆️ 레벨 업! Lv.${entry.lv - 1} → Lv.${entry.lv} · ${petBonusText(pet, entry.lv)}`;
  } else {
    const refund = Math.round(m.price * PET_DUP_REFUND);
    state.gold += refund;
    resultDesc = `이미 만렙이에요 — 🪙 ${fmt(refund)} 반환`;
  }
  save();
  renderPlayer();
  playGachaAnim(m, pet, resultDesc);
}

function playGachaAnim(machine, pet, desc) {
  const ov = $('gacha-overlay');
  const capsule = $('gacha-capsule');
  const result = $('gacha-result');
  ov.classList.remove('hidden');
  result.classList.add('hidden');
  capsule.classList.remove('hidden');
  capsule.textContent = machine.emoji;
  capsule.classList.remove('shaking');
  void capsule.offsetWidth;
  capsule.classList.add('shaking');
  AudioFX.gachaRoll();

  setTimeout(() => {
    capsule.classList.add('hidden');
    result.className = 'rarity-glow-' + pet.rarity; // hidden 해제 + 등급 글로우
    const rc = RARITY[pet.rarity];
    $('gacha-rarity').textContent = rc.name;
    $('gacha-rarity').style.background = rc.color;
    $('gacha-pet-emoji').textContent = pet.emoji;
    $('gacha-pet-name').textContent = pet.name;
    $('gacha-pet-desc').textContent = desc;
    AudioFX.gachaReveal(pet.rarity);
  }, 1100);
}

/* ---------- 몬스터 도감 ---------- */
function renderCodex() {
  const list = $('codex-list');
  list.innerHTML = '';
  let found = 0;
  const total = REGIONS.length * 5;

  REGIONS.forEach((rg, r) => {
    const all = [...rg.mobs, rg.boss];
    const regionFound = all.filter((m) => state.codex[m.name]).length;
    found += regionFound;

    const head = document.createElement('div');
    head.className = 'codex-region';
    head.textContent = `${rg.emoji} ${rg.name} (${regionFound}/5)`;
    list.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'codex-grid';
    all.forEach((m) => {
      const n = state.codex[m.name] || 0;
      const cell = document.createElement('div');
      cell.className = 'codex-cell' + (n ? '' : ' unknown') + (m.isBoss ? ' boss' : '');
      cell.innerHTML = n
        ? `<span class="cx-emoji">${m.emoji}</span><span class="cx-name">${m.name}</span><span class="cx-count">${fmt(n)}회</span>`
        : `<span class="cx-emoji">❓</span><span class="cx-name">???</span><span class="cx-count">-</span>`;
      grid.appendChild(cell);
    });
    list.appendChild(grid);
  });

  $('codex-count').textContent = `${found} / ${total}`;
}

/* ---------- 업적 ---------- */
function achState(a) {
  const v = a.value(state);
  if (state.achClaimed[a.id]) return 'claimed';
  if (v >= a.target) return 'ready';
  return 'progress';
}

function hasClaimableAch() {
  return ACHIEVEMENTS.some((a) => achState(a) === 'ready');
}

function renderAchievements() {
  const list = $('ach-list');
  list.innerHTML = '';
  let done = 0;

  ACHIEVEMENTS.forEach((a) => {
    const st = achState(a);
    if (st !== 'progress') done++;
    const v = Math.min(a.value(state), a.target);
    const row = document.createElement('div');
    row.className = 'ach-row ' + st;
    row.innerHTML = `
      <span class="ach-body">
        <b>${a.name}</b>
        <small>${a.desc} — ${fmt(v)}/${fmt(a.target)}</small>
        <span class="ach-bar"><i style="width:${(v / a.target) * 100}%"></i></span>
      </span>
      <span class="ach-side">${
        st === 'claimed' ? '✅'
        : st === 'ready' ? `<button class="ach-claim" data-ach="${a.id}">🪙 ${fmt(a.reward)} 받기</button>`
        : `🪙 ${fmt(a.reward)}`
      }</span>`;
    list.appendChild(row);
  });

  $('ach-count').textContent = `${done} / ${ACHIEVEMENTS.length}`;

  list.querySelectorAll('.ach-claim').forEach((btn) => {
    btn.addEventListener('click', () => {
      const a = ACHIEVEMENTS.find((x) => x.id === btn.dataset.ach);
      if (!a || achState(a) !== 'ready') return;
      state.achClaimed[a.id] = true;
      state.gold += a.reward;
      AudioFX.levelup();
      toast(`🏅 업적 [${a.name}] 달성! 🪙 ${fmt(a.reward)}`);
      renderPlayer();
      renderAchievements();
      save();
    });
  });
}

/* ---------- 자동 사냥 ---------- */
function renderAutoBtn() {
  const btn = $('auto-btn');
  if (state.lv < AUTO_UNLOCK_LV) {
    btn.textContent = `🔒 자동 Lv.${AUTO_UNLOCK_LV}`;
    btn.className = 'locked';
    return;
  }
  btn.textContent = state.autoHunt ? '⚔️ 자동 ON' : '⚔️ 자동 OFF';
  btn.className = state.autoHunt ? 'on' : '';
}

/* ---------- 오프라인 보상 ---------- */
function offlineReward() {
  if (!state.lastTs) return;
  const mins = (Date.now() - state.lastTs) / 60000;
  if (mins < 3) return; // 3분 미만은 무시
  const capped = Math.min(mins, 480); // 최대 8시간
  const rg = REGIONS[state.region];
  const avgGold = rg.mobs.reduce((a, m) => a + m.gold, 0) / rg.mobs.length;
  const reward = Math.round(avgGold * 2 * capped * (1 + petPct('goldPct') / 100));
  if (reward <= 0) return;
  state.gold += reward;
  state.stats.goldEarned += reward;
  save();
  setTimeout(() => toast(`💤 오프라인 보상 (${Math.round(capped)}분): 🪙 ${fmt(reward)}`), 900);
}

/* ---------- 렌더 올 ---------- */
function renderAll() {
  renderPlayer();
  renderMob();
  renderKillProgress();
  renderPotions();
  renderPetSprite();
  renderAutoBtn();
  $('ach-btn').classList.toggle('has-claim', hasClaimableAch());
}

/* ---------- 이벤트 바인딩 ---------- */
monsterBox.addEventListener('pointerdown', onTapMonster);

$('boss-btn').addEventListener('click', () => {
  AudioFX.init(); AudioFX.resume();
  spawnMob(true);
  toast(`👑 ${REGIONS[state.region].boss.name} 등장!`);
});

SKILLS.forEach((_, i) => $(`skill-${i}`).addEventListener('click', () => useSkill(i)));
$('hp-potion-btn').addEventListener('click', () => usePotion('hp'));
$('mp-potion-btn').addEventListener('click', () => usePotion('mp'));

$('shop-btn').addEventListener('click', () => {
  AudioFX.init(); AudioFX.resume();
  $('shop-modal').classList.remove('hidden');
  renderShop();
});
$('shop-close').addEventListener('click', () => $('shop-modal').classList.add('hidden'));
$('shop-modal').addEventListener('click', (e) => {
  if (e.target === $('shop-modal')) $('shop-modal').classList.add('hidden');
});
document.querySelectorAll('.shop-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.shop-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    shopTab = tab.dataset.tab;
    renderShop();
  });
});

/* ---------- 도감/업적/자동사냥 바인딩 ---------- */
$('codex-btn').addEventListener('click', () => {
  AudioFX.init(); AudioFX.resume();
  renderCodex();
  $('codex-modal').classList.remove('hidden');
});
$('codex-close').addEventListener('click', () => $('codex-modal').classList.add('hidden'));
$('codex-modal').addEventListener('click', (e) => {
  if (e.target === $('codex-modal')) $('codex-modal').classList.add('hidden');
});

$('ach-btn').addEventListener('click', () => {
  AudioFX.init(); AudioFX.resume();
  renderAchievements();
  $('ach-modal').classList.remove('hidden');
});
$('ach-close').addEventListener('click', () => $('ach-modal').classList.add('hidden'));
$('ach-modal').addEventListener('click', (e) => {
  if (e.target === $('ach-modal')) $('ach-modal').classList.add('hidden');
});

$('auto-btn').addEventListener('click', () => {
  AudioFX.init(); AudioFX.resume();
  if (state.lv < AUTO_UNLOCK_LV) {
    AudioFX.deny();
    toast(`자동 사냥은 Lv.${AUTO_UNLOCK_LV}에 해금됩니다`);
    return;
  }
  state.autoHunt = !state.autoHunt;
  AudioFX.buy();
  renderAutoBtn();
  save();
});

/* ---------- 개발자 치트 메뉴 (아바타 5연타로 열림) ---------- */
let avatarTaps = [];
$('player-avatar').addEventListener('pointerdown', () => {
  const t = performance.now();
  avatarTaps = avatarTaps.filter((x) => t - x < 2000);
  avatarTaps.push(t);
  if (avatarTaps.length >= 5) {
    avatarTaps = [];
    AudioFX.init(); AudioFX.resume(); AudioFX.buy();
    $('cheat-modal').classList.remove('hidden');
  }
});

const CHEATS = {
  gold10k()  { state.gold += 10000;    toast('🪙 +10,000 골드'); },
  gold100k() { state.gold += 100000;   toast('💰 +100,000 골드'); },
  gold10m()  { state.gold += 10000000; toast('🏦 +10,000,000 골드'); },
  lv1()  { cheatLevel(1); },
  lv10() { cheatLevel(10); },
  heal() {
    state.hp = maxHp(); state.mp = maxMp();
    state.potions.hp = Math.max(state.potions.hp, 5);
    toast('💖 풀 회복!');
  },
  potion() {
    state.potions.hp += 10; state.potions.mp += 10;
    toast('🧪 HP/MP 포션 +10');
  },
  pet() {
    const pet = PETS[Math.floor(Math.random() * PETS.length)];
    const entry = state.pets[pet.key];
    if (!entry) {
      state.pets[pet.key] = { lv: 1, exp: 0 };
      toast(`${pet.emoji} ${pet.name} 획득! (${RARITY[pet.rarity].name})`);
    } else if (entry.lv < PET_MAX_LV) {
      entry.lv++;
      toast(`${pet.emoji} ${pet.name} Lv.${entry.lv}로 상승!`);
    } else {
      toast(`${pet.emoji} ${pet.name}은(는) 이미 만렙!`);
    }
    renderPetSprite();
  },
  unlock() {
    state.unlockedRegion = REGIONS.length - 1;
    renderRegionBar();
    toast('🗺️ 모든 지역 해금!');
  },
  reset() {
    if (!confirm('정말 저장을 초기화할까요? 모든 진행이 사라집니다.')) return;
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  },
};

function cheatLevel(n) {
  state.lv += n;
  state.hp = maxHp();
  state.mp = maxMp();
  AudioFX.levelup();
  toast(`⬆️ 레벨 +${n} → Lv.${state.lv}`);
  renderSkills();
  spawnLevelFx();
}

document.querySelectorAll('.cheat-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    AudioFX.init(); AudioFX.resume();
    CHEATS[btn.dataset.cheat]();
    save();
    renderAll();
  });
});
$('cheat-close').addEventListener('click', () => $('cheat-modal').classList.add('hidden'));
$('cheat-modal').addEventListener('click', (e) => {
  if (e.target === $('cheat-modal')) $('cheat-modal').classList.add('hidden');
});

$('gacha-close').addEventListener('click', () => {
  $('gacha-overlay').classList.add('hidden');
  renderShop(); // 펫 목록/골드 상태 갱신
});

$('start-btn').addEventListener('click', () => {
  AudioFX.init(); AudioFX.resume();
  $('start-overlay').classList.add('hidden');
});
$('win-close').addEventListener('click', () => $('win-overlay').classList.add('hidden'));

/* ---------- 시작 ---------- */
load();
offlineReward();
applyRegionTheme();
renderRegionBar();
renderSkills();
renderAll();
spawnMob(false);
setInterval(tick, 100);
