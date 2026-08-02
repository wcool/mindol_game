/* ============================================================
   audio.js — Web Audio 기반 ASMR 사운드 합성 엔진 v2
   - 외부 오디오 파일 없이 40종의 소리를 실시간 생성
   - 컨볼루션 리버브(공간감) + 컴프레서(음압 정리)
   - 화이트/핑크 노이즈, 배음 합성, 클릭마다 미세 변주
   ============================================================ */

const AudioEngine = (() => {
  let ctx = null;
  let master = null;      // 볼륨 조절 지점 (드라이 + 리버브 합류)
  let convolver = null;   // 리버브
  let whiteBuf = null;
  let pinkBuf = null;
  let muted = false;
  let volume = 0.6;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // 체인: voice → (pan) → master → soften → comp → destination
    //        voice → wet → convolver → master
    master = ctx.createGain();
    master.gain.value = volume;

    const soften = ctx.createBiquadFilter();
    soften.type = 'highshelf';
    soften.frequency.value = 8500;
    soften.gain.value = -5;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;

    master.connect(soften);
    soften.connect(comp);
    comp.connect(ctx.destination);

    buildNoiseBuffers();
    buildReverb();
  }

  function buildNoiseBuffers() {
    const len = ctx.sampleRate * 2;

    whiteBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = whiteBuf.getChannelData(0);
    for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;

    // 핑크 노이즈 (Paul Kellet 근사) — 화이트보다 부드러워 ASMR에 적합
    pinkBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const p = pinkBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  function buildReverb() {
    // 2.4초 지수 감쇠 스테레오 임펄스 응답 → 은은한 홀 리버브
    const dur = 2.4;
    const len = Math.floor(ctx.sampleRate * dur);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.exp(-4.2 * t) * (1 - t * 0.3);
      }
    }
    convolver = ctx.createConvolver();
    convolver.buffer = ir;
    convolver.connect(master);
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function now() { return ctx.currentTime; }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master && !muted) master.gain.setTargetAtTime(volume, now(), 0.03);
  }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : volume, now(), 0.03);
    return muted;
  }

  function makePanner(pan) {
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan || 0));
      return p;
    }
    return ctx.createGain();
  }

  // 보이스 출력 배선: 드라이 → master, wet만큼 → 리버브
  function routeOut(node, pan, wet) {
    const panner = makePanner(pan);
    node.connect(panner);
    panner.connect(master);
    if (wet > 0 && convolver) {
      const send = ctx.createGain();
      send.gain.value = wet;
      panner.connect(send);
      send.connect(convolver);
    }
  }

  /* --- 프리미티브: 톤 --- */
  function tone({ freq = 440, endFreq = null, dur = 0.2, type = 'sine',
                  vol = 0.5, attack = 0.005, pan = 0, delay = 0, wet = 0,
                  detune = 0 }) {
    const t0 = now() + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    routeOut(gain, pan, wet);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  /* --- 프리미티브: 노이즈 --- */
  function noise({ dur = 0.15, filterType = 'bandpass', freq = 2000, endFreqFilter = null,
                   q = 1, vol = 0.4, attack = 0.003, pan = 0, delay = 0, wet = 0,
                   playbackRate = 1, color = 'white' }) {
    const t0 = now() + delay;
    const src = ctx.createBufferSource();
    src.buffer = color === 'pink' ? pinkBuf : whiteBuf;
    src.playbackRate.value = playbackRate;
    src.loop = true;
    src.loopStart = Math.random() * 1.2; // 매번 다른 구간 재생 → 변주

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, t0);
    if (endFreqFilter) filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFreqFilter), t0 + dur);
    filter.Q.value = q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter); filter.connect(gain);
    routeOut(gain, pan, wet);
    src.start(t0, src.loopStart); src.stop(t0 + dur + 0.05);
  }

  /* --- 프리미티브: 배음 종/차임 --- */
  function chime({ freq = 880, dur = 1.5, vol = 0.3, pan = 0, delay = 0, wet = 0.35,
                   attack = 0.002,
                   partials = [1, 2.76, 5.4], partialVols = [1, 0.35, 0.15] }) {
    partials.forEach((pr, i) => {
      tone({
        freq: freq * pr,
        dur: dur * (1 - i * 0.18),
        type: 'sine',
        vol: vol * (partialVols[i] || 0.1),
        attack, pan, delay, wet,
        detune: rand(-4, 4), // 미세한 디튠 → 자연스러운 울림
      });
    });
  }

  const P = (x) => (x - 0.5) * 1.4; // 클릭 x(0~1) → 스테레오 팬

  /* ============================================================
     아이템 사운드 40종
     ============================================================ */
  const sounds = {

    /* ---------- S1. 팝팝 ---------- */
    bubblewrap(x) {
      const pan = P(x);
      tone({ freq: rand(360, 540), endFreq: rand(85, 130), dur: rand(0.07, 0.11), vol: 0.7, pan });
      noise({ dur: 0.045, freq: rand(1700, 2800), q: 2.5, vol: 0.35, pan });
      if (Math.random() < 0.25) // 가끔 이중 팝
        tone({ freq: rand(300, 420), endFreq: 90, dur: 0.07, vol: 0.4, pan, delay: 0.05 });
    },

    popit(x) {
      const pan = P(x);
      tone({ freq: rand(220, 340), endFreq: rand(65, 100), dur: rand(0.11, 0.16), vol: 0.75, pan });
      tone({ freq: rand(480, 680), endFreq: 150, dur: 0.05, type: 'triangle', vol: 0.2, pan, delay: 0.012 });
      noise({ dur: 0.06, filterType: 'lowpass', freq: 500, vol: 0.2, pan, color: 'pink' });
    },

    /* ---------- S2. 물 ---------- */
    waterdrop(x) {
      const pan = P(x);
      const f = rand(380, 720);
      tone({ freq: f, endFreq: f * rand(2.1, 3.4), dur: rand(0.14, 0.22), vol: 0.6, pan, wet: 0.25 });
      noise({ dur: 0.05, freq: 3500, q: 3, vol: 0.1, pan, delay: 0.02 });
      if (Math.random() < 0.3) { // 가끔 작은 2차 방울
        const f2 = f * rand(1.2, 1.6);
        tone({ freq: f2, endFreq: f2 * 2.5, dur: 0.1, vol: 0.25, pan, delay: rand(0.12, 0.2), wet: 0.25 });
      }
    },

    stream(x) {
      const pan = P(x);
      noise({ dur: rand(0.5, 0.7), freq: rand(900, 1400), endFreqFilter: 600, q: 1.2,
              vol: 0.32, attack: 0.06, pan, color: 'pink', wet: 0.2 });
      for (let i = 0; i < 4; i++) {
        const f = rand(500, 1100);
        tone({ freq: f, endFreq: f * rand(1.8, 2.6), dur: 0.08, vol: 0.14,
               pan: pan + rand(-0.3, 0.3), delay: rand(0.05, 0.5), wet: 0.2 });
      }
    },

    /* ---------- S3. 타건 ---------- */
    keyboard(x) {
      const pan = P(x);
      noise({ dur: 0.028, filterType: 'highpass', freq: rand(2400, 3600), vol: 0.5, pan });
      tone({ freq: rand(1050, 1500), endFreq: 380, dur: 0.04, type: 'square', vol: 0.11, pan });
      noise({ dur: 0.05, freq: rand(480, 820), q: 2.2, vol: 0.32, pan, delay: 0.033, color: 'pink' });
    },

    typewriter: (() => {
      let count = 0;
      return (x) => {
        const pan = P(x);
        count++;
        noise({ dur: 0.02, filterType: 'highpass', freq: rand(3200, 4500), vol: 0.55, pan });
        tone({ freq: rand(800, 1000), endFreq: 250, dur: 0.05, type: 'square', vol: 0.16, pan });
        noise({ dur: 0.06, freq: rand(400, 600), q: 3, vol: 0.35, pan, delay: 0.03 });
        if (count % 9 === 0) { // 행 끝 '띵—' 벨
          chime({ freq: 1850, dur: 0.9, vol: 0.22, pan, delay: 0.1,
                  partials: [1, 2.7], partialVols: [1, 0.25] });
        }
      };
    })(),

    /* ---------- S4. 말랑 ---------- */
    slime(x) {
      const pan = P(x);
      noise({ dur: rand(0.22, 0.33), filterType: 'lowpass', freq: rand(550, 900), endFreqFilter: 130,
              q: 5, vol: 0.55, attack: 0.02, pan, playbackRate: rand(0.45, 0.75), color: 'pink' });
      for (let i = 0; i < 4; i++) {
        tone({ freq: rand(130, 420), endFreq: rand(55, 120), dur: rand(0.04, 0.08),
               vol: rand(0.1, 0.22), pan: pan + rand(-0.25, 0.25), delay: rand(0.02, 0.2) });
      }
    },

    jelly(x) {
      const pan = P(x);
      const f = rand(190, 300);
      tone({ freq: f, endFreq: f * 0.55, dur: 0.15, vol: 0.55, pan });
      tone({ freq: f * 0.82, endFreq: f * 1.15, dur: 0.18, vol: 0.32, pan, delay: 0.08 });
      tone({ freq: f * 0.92, endFreq: f * 0.68, dur: 0.16, vol: 0.17, pan, delay: 0.18 });
      tone({ freq: f * 0.85, endFreq: f * 0.95, dur: 0.14, vol: 0.08, pan, delay: 0.28 });
    },

    /* ---------- S5. 종이 ---------- */
    paper(x) {
      const pan = P(x);
      const dur = rand(0.24, 0.4);
      noise({ dur, freq: 3000, endFreqFilter: 1100, q: 0.8, vol: 0.4, attack: 0.01, pan });
      for (let i = 0; i < 7; i++) {
        noise({ dur: 0.018, filterType: 'highpass', freq: rand(3000, 6500),
                vol: rand(0.1, 0.2), pan: pan + rand(-0.12, 0.12), delay: (dur / 7) * i });
      }
    },

    pageflip(x) {
      const pan = P(x);
      noise({ dur: rand(0.13, 0.2), filterType: 'highpass', freq: 1100, endFreqFilter: 3200,
              q: 0.6, vol: 0.32, attack: 0.015, pan, color: 'pink' });
      noise({ dur: 0.07, filterType: 'lowpass', freq: 420, vol: 0.28, pan, delay: rand(0.1, 0.15), color: 'pink' });
    },

    /* ---------- S6. 차가움 ---------- */
    ice(x) {
      const pan = P(x);
      for (let i = 0; i < 5; i++) {
        noise({ dur: 0.035, filterType: 'highpass', freq: rand(3800, 7200), q: 2,
                vol: rand(0.18, 0.32), pan: pan + rand(-0.2, 0.2), delay: i * rand(0.018, 0.05) });
      }
      chime({ freq: rand(1700, 2700), dur: 0.55, vol: 0.15, pan, wet: 0.3,
              partials: [1, 1.53, 2.18], partialVols: [1, 0.4, 0.2] });
    },

    snow(x) {
      const pan = P(x);
      const steps = 9 + Math.floor(Math.random() * 4);
      for (let i = 0; i < steps; i++) {
        noise({ dur: rand(0.015, 0.03), freq: rand(1100, 2600), q: rand(1, 3),
                vol: rand(0.12, 0.26), pan: pan + rand(-0.1, 0.1),
                delay: i * rand(0.012, 0.028), color: 'pink' });
      }
      noise({ dur: 0.12, filterType: 'lowpass', freq: 260, vol: 0.35, pan, color: 'pink' });
    },

    /* ---------- S7. 기포 ---------- */
    soda(x) {
      const pan = P(x);
      noise({ dur: rand(0.4, 0.6), filterType: 'highpass', freq: 5200, q: 0.7,
              vol: 0.18, attack: 0.05, pan });
      for (let i = 0; i < 9; i++) {
        const f = rand(550, 1700);
        tone({ freq: f, endFreq: f * rand(2, 3), dur: rand(0.03, 0.06),
               vol: rand(0.06, 0.12), pan: pan + rand(-0.35, 0.35), delay: rand(0, 0.45) });
      }
    },

    soapbubble(x) {
      const pan = P(x);
      tone({ freq: rand(500, 700), endFreq: rand(180, 260), dur: 0.09, vol: 0.5, pan });
      chime({ freq: rand(1900, 2600), dur: 0.4, vol: 0.1, pan, delay: 0.03, wet: 0.35,
              partials: [1, 1.5], partialVols: [1, 0.3] });
      noise({ dur: 0.04, freq: 3000, q: 2, vol: 0.12, pan });
    },

    /* ---------- S8. 커팅 ---------- */
    soap(x) {
      const pan = P(x);
      const dur = rand(0.24, 0.36);
      noise({ dur, freq: 1150, endFreqFilter: 480, q: 1.5, vol: 0.45, attack: 0.03,
              pan, playbackRate: 0.7, color: 'pink' });
      noise({ dur: 0.08, filterType: 'lowpass', freq: 380, vol: 0.4, delay: dur - 0.05, pan });
    },

    chalk(x) {
      const pan = P(x);
      noise({ dur: rand(0.16, 0.24), freq: rand(1900, 2400), endFreqFilter: 900, q: 0.7,
              vol: 0.35, attack: 0.02, pan, color: 'pink' });
      tone({ freq: rand(260, 340), endFreq: 120, dur: 0.05, type: 'triangle',
             vol: 0.3, pan, delay: rand(0.14, 0.2) });
    },

    /* ---------- S9. 나무 ---------- */
    wood(x) {
      const pan = P(x);
      tone({ freq: rand(170, 260), endFreq: rand(75, 110), dur: 0.12, type: 'triangle', vol: 0.7, pan });
      noise({ dur: 0.03, freq: rand(880, 1450), q: 3, vol: 0.3, pan });
      tone({ freq: rand(600, 750), endFreq: 400, dur: 0.05, vol: 0.12, pan });
    },

    bamboo(x) {
      const pan = P(x);
      tone({ freq: rand(340, 430), endFreq: rand(170, 220), dur: 0.09, type: 'triangle', vol: 0.6, pan });
      tone({ freq: rand(620, 760), endFreq: 420, dur: 0.11, vol: 0.25, pan, delay: 0.01, wet: 0.15 });
      if (Math.random() < 0.4) // 딱— 딱 이중 타격
        tone({ freq: rand(380, 460), endFreq: 200, dur: 0.08, type: 'triangle',
               vol: 0.4, pan: -pan * 0.5, delay: rand(0.09, 0.14) });
    },

    /* ---------- S10. 알갱이 ---------- */
    sand(x) {
      const pan = P(x);
      noise({ dur: rand(0.35, 0.5), freq: 4300, endFreqFilter: 2300, q: 0.6,
              vol: 0.3, attack: 0.05, pan, playbackRate: 1.3, color: 'pink' });
      noise({ dur: 0.3, filterType: 'lowpass', freq: 300, vol: 0.13, attack: 0.05, pan, delay: 0.05 });
    },

    rice(x) {
      const pan = P(x);
      for (let i = 0; i < 14; i++) {
        noise({ dur: rand(0.008, 0.018), freq: rand(2800, 6000), q: rand(2, 5),
                vol: rand(0.06, 0.15), pan: pan + rand(-0.25, 0.25), delay: rand(0, 0.32) });
      }
      noise({ dur: 0.35, filterType: 'lowpass', freq: 500, vol: 0.1, attack: 0.04, pan, color: 'pink' });
    },

    /* ---------- S11. 유리 ---------- */
    glass(x) {
      const pan = P(x);
      chime({ freq: rand(1150, 1750), dur: rand(1, 1.4), vol: 0.3, pan, wet: 0.4,
              partials: [1, 2.32, 4.25], partialVols: [1, 0.3, 0.12] });
    },

    marble(x) {
      const pan = P(x);
      const hit = () => {
        tone({ freq: rand(1600, 2200), endFreq: rand(900, 1200), dur: 0.05, vol: 0.4, pan: pan + rand(-0.2, 0.2) });
        noise({ dur: 0.02, filterType: 'highpass', freq: 4500, vol: 0.25, pan });
      };
      hit();
      if (Math.random() < 0.6) setTimeout(hit, rand(60, 140)); // 또르르 이차 충돌
      if (Math.random() < 0.3) setTimeout(hit, rand(180, 260));
    },

    /* ---------- S12. 바람 ---------- */
    windchime(x) {
      const pan = P(x);
      const scale = [880, 987, 1108, 1318, 1479, 1661];
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        chime({ freq: pick(scale), dur: rand(1.4, 2.2), vol: 0.2,
                pan: pan + rand(-0.35, 0.35), delay: i * rand(0.05, 0.16), wet: 0.45 });
      }
    },

    woodchime(x) {
      const pan = P(x);
      const scale = [392, 440, 494, 587, 659];
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const f = pick(scale);
        tone({ freq: f, endFreq: f * 0.85, dur: rand(0.2, 0.3), type: 'triangle',
               vol: 0.4, pan: pan + rand(-0.3, 0.3), delay: i * rand(0.06, 0.14), wet: 0.2 });
      }
    },

    /* ---------- S13. 비 ---------- */
    rain(x) {
      noise({ dur: 0.55, freq: 2500, q: 0.5, vol: 0.14, attack: 0.1, pan: P(x), color: 'pink', wet: 0.15 });
      for (let i = 0; i < 12; i++) {
        noise({ dur: rand(0.012, 0.025), freq: rand(1900, 5200), q: 4,
                vol: rand(0.08, 0.22), pan: rand(-0.85, 0.85), delay: rand(0, 0.5) });
      }
    },

    umbrella(x) {
      const pan = P(x);
      for (let i = 0; i < 7; i++) { // 우산 천 위 통통거림
        tone({ freq: rand(320, 520), endFreq: rand(140, 200), dur: rand(0.03, 0.05),
               vol: rand(0.15, 0.3), pan: pan + rand(-0.4, 0.4), delay: rand(0, 0.35) });
      }
      noise({ dur: 0.4, freq: 3000, q: 0.6, vol: 0.08, attack: 0.08, pan, color: 'pink' });
    },

    /* ---------- S14. 탄성 ---------- */
    spring(x) {
      const pan = P(x);
      const f = rand(280, 400);
      tone({ freq: f, endFreq: f * 3, dur: 0.12, type: 'triangle', vol: 0.4, pan });
      tone({ freq: f * 3, endFreq: f * 1.5, dur: 0.15, type: 'triangle', vol: 0.3, pan, delay: 0.1 });
      tone({ freq: f * 1.5, endFreq: f * 2.2, dur: 0.15, type: 'triangle', vol: 0.18, pan, delay: 0.22 });
      tone({ freq: f * 2.2, endFreq: f * 1.8, dur: 0.2, type: 'triangle', vol: 0.1, pan, delay: 0.35 });
    },

    rubberband(x) {
      const pan = P(x);
      const f = rand(130, 230);
      noise({ dur: 0.015, filterType: 'highpass', freq: 2500, vol: 0.3, pan }); // 튕기는 스냅
      tone({ freq: f, endFreq: f * 0.92, dur: 0.35, type: 'triangle', vol: 0.45, pan, detune: -6 });
      tone({ freq: f * 1.01, endFreq: f * 0.93, dur: 0.3, type: 'triangle', vol: 0.3, pan, detune: 7 });
      tone({ freq: f * 2.02, endFreq: f * 1.9, dur: 0.15, vol: 0.12, pan });
    },

    /* ---------- S15. 명상 목재 ---------- */
    moktak(x) {
      const pan = P(x);
      tone({ freq: rand(135, 170), endFreq: 88, dur: 0.26, vol: 0.8, pan, wet: 0.2 });
      tone({ freq: rand(420, 500), endFreq: 300, dur: 0.08, type: 'triangle', vol: 0.25, pan });
      noise({ dur: 0.02, freq: 1000, q: 2, vol: 0.3, pan });
    },

    beads(x) {
      const pan = P(x);
      const n = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) { // 염주알이 차르륵 넘어가는 소리
        tone({ freq: rand(700, 1100), endFreq: rand(350, 500), dur: rand(0.02, 0.04),
               type: 'triangle', vol: rand(0.14, 0.26),
               pan: pan + (i / n - 0.5) * 0.5, delay: i * rand(0.03, 0.05) });
      }
    },

    /* ---------- S16. 금속 종 ---------- */
    bell(x) {
      const pan = P(x);
      chime({ freq: rand(580, 820), dur: rand(1.8, 2.4), vol: 0.35, pan, wet: 0.45,
              partials: [1, 2.0, 3.01, 4.7], partialVols: [1, 0.5, 0.25, 0.1] });
    },

    triangle(x) {
      const pan = P(x);
      chime({ freq: rand(2400, 2900), dur: rand(1.6, 2.2), vol: 0.22, pan, wet: 0.5,
              partials: [1, 1.83, 2.74, 4.1], partialVols: [1, 0.55, 0.35, 0.15] });
      noise({ dur: 0.015, filterType: 'highpass', freq: 6000, vol: 0.2, pan });
    },

    /* ---------- S17. 반짝임 ---------- */
    crystal(x) {
      const pan = P(x);
      const base = rand(950, 1400);
      [1, 1.25, 1.5, 2].forEach((r, i) => {
        chime({ freq: base * r, dur: rand(1.5, 2.3), vol: 0.13, pan: pan + rand(-0.25, 0.25),
                delay: i * 0.06, wet: 0.5, partials: [1, 3.1], partialVols: [1, 0.15] });
      });
    },

    musicbox: (() => {
      // 자작 펜타토닉 멜로디 — 클릭할 때마다 한 음씩 연주
      const melody = [523, 659, 784, 880, 784, 659, 587, 523,
                      659, 784, 1046, 880, 784, 659, 784, 523];
      let step = 0;
      return (x) => {
        const pan = P(x);
        const f = melody[step % melody.length];
        step++;
        chime({ freq: f, dur: 1.3, vol: 0.3, pan, wet: 0.4, attack: 0.001,
                partials: [1, 4.0, 6.2], partialVols: [1, 0.18, 0.06] });
        tone({ freq: f * 2, dur: 0.5, vol: 0.06, pan, delay: 0.01, wet: 0.4 });
      };
    })(),

    /* ---------- S18. 자연 ---------- */
    fire(x) {
      const pan = P(x);
      noise({ dur: rand(0.45, 0.65), filterType: 'lowpass', freq: 230, vol: 0.4,
              attack: 0.06, pan, color: 'pink' }); // 웅근한 불꽃 바닥음
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) { // 탁탁 튀는 불티
        noise({ dur: rand(0.008, 0.02), filterType: 'highpass', freq: rand(2200, 4800),
                vol: rand(0.15, 0.3), pan: pan + rand(-0.4, 0.4), delay: rand(0.02, 0.5) });
      }
    },

    wave(x) {
      const pan = P(x);
      noise({ dur: rand(1.1, 1.5), freq: 480, endFreqFilter: 1400, q: 0.5,
              vol: 0.35, attack: 0.35, pan, color: 'pink', wet: 0.25 }); // 밀려오는 파도
      noise({ dur: 0.8, filterType: 'highpass', freq: 3200, vol: 0.1,
              attack: 0.3, pan, delay: 0.55 }); // 부서지는 포말
    },

    /* ---------- S19. 우주 ---------- */
    aurora(x) {
      const pan = P(x);
      const scale = [220, 261, 329, 392, 440];
      const f = pick(scale);
      [0, 5, -7].forEach((d) => { // 디튠된 3겹 패드
        tone({ freq: f, dur: rand(1.8, 2.4), vol: 0.13, attack: 0.12,
               pan: pan + d * 0.02, detune: d, wet: 0.6 });
      });
      tone({ freq: f * 2, dur: 1.4, vol: 0.05, attack: 0.2, pan, wet: 0.6 });
    },

    starlight(x) {
      const pan = P(x);
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) { // 별이 반짝이는 초고음 클러스터
        chime({ freq: rand(1800, 3600), dur: rand(0.8, 1.5), vol: rand(0.06, 0.12),
                pan: rand(-0.8, 0.8), delay: i * rand(0.04, 0.1), wet: 0.6,
                partials: [1, 2.1], partialVols: [1, 0.2] });
      }
    },

    /* ---------- S20. 깊은 공명 ---------- */
    singingbowl(x) {
      const pan = P(x) * 0.6;
      const f = rand(175, 225);
      tone({ freq: f, dur: 3.8, vol: 0.4, attack: 0.05, pan, wet: 0.4 });
      tone({ freq: f * 1.004, dur: 3.8, vol: 0.35, attack: 0.05, pan: -pan, wet: 0.4 }); // 맥놀이
      tone({ freq: f * 2.71, dur: 3, vol: 0.14, attack: 0.05, pan, wet: 0.4 });
      tone({ freq: f * 5.4, dur: 1.9, vol: 0.05, attack: 0.05, pan, wet: 0.4 });
    },

    gong(x) {
      const pan = P(x) * 0.5;
      const f = rand(85, 110);
      noise({ dur: 0.25, filterType: 'lowpass', freq: 400, vol: 0.3, pan, color: 'pink' }); // 타격감
      [1, 1.48, 2.05, 2.98, 4.2].forEach((r, i) => {
        tone({ freq: f * r, dur: rand(3.5, 4.5) * (1 - i * 0.12), vol: 0.28 / (i * 0.7 + 1),
               attack: 0.03 + i * 0.05, pan: pan + rand(-0.15, 0.15),
               detune: rand(-5, 5), wet: 0.5 });
      });
    },
  };

  /* --- UI 효과음 --- */
  function uiBuy() {
    tone({ freq: 660, dur: 0.1, vol: 0.3 });
    tone({ freq: 880, dur: 0.12, vol: 0.3, delay: 0.08 });
    tone({ freq: 1320, dur: 0.25, vol: 0.25, delay: 0.16, wet: 0.3 });
  }
  function uiStageUp() {
    [523, 659, 784, 1046].forEach((f, i) =>
      chime({ freq: f, dur: 1.1, vol: 0.2, delay: i * 0.1, wet: 0.4,
              partials: [1, 2], partialVols: [1, 0.2] }));
  }
  function uiDeny() {
    tone({ freq: 220, endFreq: 180, dur: 0.12, type: 'triangle', vol: 0.25 });
  }

  return { init, resume, sounds, uiBuy, uiStageUp, uiDeny, setVolume, toggleMute };
})();
