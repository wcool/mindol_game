/* ============================================================
   audio.js — 몬스터 헌터 RPG 효과음 엔진
   Web Audio로 타격/스킬/레벨업 등 효과음을 실시간 합성
   ============================================================ */

const AudioFX = (() => {
  let ctx = null;
  let master = null;
  let noiseBuf = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    master = ctx.createGain();
    master.gain.value = 0.5;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    master.connect(comp);
    comp.connect(ctx.destination);

    const len = ctx.sampleRate * 1.5;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function now() { return ctx ? ctx.currentTime : 0; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function tone({ freq = 440, endFreq = null, dur = 0.15, type = 'sine',
                  vol = 0.4, attack = 0.004, delay = 0 }) {
    if (!ctx) return;
    const t0 = now() + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.1, filterType = 'bandpass', freq = 2000, endFreqFilter = null,
                   q = 1, vol = 0.35, attack = 0.003, delay = 0 }) {
    if (!ctx) return;
    const t0 = now() + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.loopStart = Math.random();
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t0);
    if (endFreqFilter) f.frequency.exponentialRampToValueAtTime(Math.max(20, endFreqFilter), t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0, src.loopStart); src.stop(t0 + dur + 0.05);
  }

  return {
    init, resume,

    /* 기본 타격 — 퍽! */
    hit() {
      noise({ dur: 0.06, freq: rand(900, 1400), q: 1.5, vol: 0.4 });
      tone({ freq: rand(160, 220), endFreq: 70, dur: 0.08, type: 'triangle', vol: 0.4 });
    },

    /* 크리티컬 — 쾅! */
    crit() {
      noise({ dur: 0.1, freq: rand(1500, 2200), q: 1, vol: 0.5 });
      tone({ freq: 300, endFreq: 60, dur: 0.16, type: 'sawtooth', vol: 0.3 });
      tone({ freq: 1200, endFreq: 2400, dur: 0.08, vol: 0.2, delay: 0.02 });
    },

    /* 플레이어 피격 — 억! */
    hurt() {
      tone({ freq: 220, endFreq: 110, dur: 0.15, type: 'sawtooth', vol: 0.25 });
      noise({ dur: 0.08, filterType: 'lowpass', freq: 600, vol: 0.3 });
    },

    /* 강타 */
    smash() {
      tone({ freq: 90, endFreq: 40, dur: 0.25, type: 'sine', vol: 0.6 });
      noise({ dur: 0.15, filterType: 'lowpass', freq: 900, endFreqFilter: 150, vol: 0.5 });
    },

    /* 화염구 — 화르륵 */
    fireball() {
      noise({ dur: 0.35, filterType: 'bandpass', freq: 600, endFreqFilter: 2500, q: 0.8, vol: 0.4, attack: 0.03 });
      tone({ freq: 150, endFreq: 500, dur: 0.3, type: 'sawtooth', vol: 0.15 });
      noise({ dur: 0.12, filterType: 'highpass', freq: 3000, vol: 0.3, delay: 0.25 });
    },

    /* 회복 — 랄랄라↑ */
    heal() {
      [523, 659, 784].forEach((f, i) =>
        tone({ freq: f, dur: 0.3, vol: 0.22, delay: i * 0.07 }));
    },

    /* 낙뢰 — 콰르릉 */
    thunder() {
      noise({ dur: 0.05, filterType: 'highpass', freq: 5000, vol: 0.5 });
      noise({ dur: 0.5, filterType: 'lowpass', freq: 1200, endFreqFilter: 100, vol: 0.5, delay: 0.04 });
      tone({ freq: 60, endFreq: 35, dur: 0.5, type: 'sawtooth', vol: 0.3, delay: 0.04 });
    },

    /* 몬스터 처치 — 팅! */
    kill() {
      tone({ freq: 660, dur: 0.1, vol: 0.25 });
      tone({ freq: 990, dur: 0.15, vol: 0.25, delay: 0.06 });
    },

    /* 레벨업 — 팡파레 */
    levelup() {
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        tone({ freq: f, dur: 0.35, vol: 0.25, delay: i * 0.09 }));
    },

    /* 보스 등장 — 그르릉 */
    bossRoar() {
      tone({ freq: 80, endFreq: 45, dur: 0.8, type: 'sawtooth', vol: 0.4 });
      noise({ dur: 0.7, filterType: 'lowpass', freq: 400, vol: 0.35, attack: 0.05 });
      tone({ freq: 120, endFreq: 70, dur: 0.6, type: 'square', vol: 0.12, delay: 0.15 });
    },

    /* 구매 */
    buy() {
      tone({ freq: 880, dur: 0.08, vol: 0.25 });
      tone({ freq: 1320, dur: 0.15, vol: 0.25, delay: 0.07 });
    },

    /* 사망 — 뚜우웅↓ */
    death() {
      [392, 330, 262, 196].forEach((f, i) =>
        tone({ freq: f, dur: 0.35, type: 'triangle', vol: 0.3, delay: i * 0.18 }));
    },

    /* 캡슐 굴러가는 소리 */
    gachaRoll() {
      for (let i = 0; i < 7; i++) {
        noise({ dur: 0.04, freq: rand(700, 1500), q: 2, vol: 0.22, delay: i * 0.14 });
        tone({ freq: rand(250, 400), endFreq: 150, dur: 0.05, type: 'triangle', vol: 0.15, delay: i * 0.14 });
      }
    },

    /* 캡슐 개봉 — 등급이 높을수록 화려한 팡파레 */
    gachaReveal(rarity) {
      noise({ dur: 0.1, filterType: 'highpass', freq: 3000, vol: 0.3 }); // 뚜껑 팡!
      const seqs = {
        N: [523, 659],
        R: [523, 659, 784],
        E: [523, 659, 784, 1046],
        L: [523, 659, 784, 1046, 1318],
        M: [523, 659, 784, 1046, 1318, 1568, 2093],
      };
      (seqs[rarity] || seqs.N).forEach((f, i) =>
        tone({ freq: f, dur: 0.35, vol: 0.25, delay: 0.08 + i * 0.09 }));
    },

    /* 거절 */
    deny() {
      tone({ freq: 200, endFreq: 160, dur: 0.12, type: 'triangle', vol: 0.25 });
    },

    /* 지역 클리어 승리 */
    victory() {
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) =>
        tone({ freq: f, dur: 0.4, vol: 0.22, delay: i * 0.12 }));
    },
  };
})();
