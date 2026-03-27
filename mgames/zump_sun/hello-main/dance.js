// Claude Code 로고 댄스 애니메이션
// 로고: 주황색 스타버스트/핀휠 스타일 (블록 문자 사용)

const R = '\x1b[0m';          // reset
const O  = '\x1b[38;5;208m';  // 주황색 (Claude 브랜드 컬러)
const O2 = '\x1b[38;5;202m';  // 진한 주황
const O3 = '\x1b[38;5;214m';  // 밝은 주황
const W  = '\x1b[97m';        // 흰색
const B  = '\x1b[1m';         // 볼드

// ── 클로드 로고 머리 (스타버스트, 8프레임) ─────────────────────────────
const LOGO = [
// [0] 기본
`${O}${B}        ▄   ▄        ${R}
${O}${B}       ▀███████▀       ${R}
${O2}${B}    ▄  █▀▀▀▀▀▀▀█  ▄    ${R}
${O}${B}   ▀████ ◈     ◈ ████▀   ${R}
${O}${B}   ▀████   ▄▀▄   ████▀   ${R}
${O2}${B}    ▀  █▄▄▄▄▄▄▄█  ▀    ${R}
${O}${B}       ▄███████▄       ${R}
${O}${B}        ▀   ▀        ${R}`,

// [1] 눈 깜박
`${O}${B}        ▄   ▄        ${R}
${O}${B}       ▀███████▀       ${R}
${O2}${B}    ▄  █▀▀▀▀▀▀▀█  ▄    ${R}
${O}${B}   ▀████ ─     ─ ████▀   ${R}
${O}${B}   ▀████   ▄▀▄   ████▀   ${R}
${O2}${B}    ▀  █▄▄▄▄▄▄▄█  ▀    ${R}
${O}${B}       ▄███████▄       ${R}
${O}${B}        ▀   ▀        ${R}`,

// [2] 웃는 얼굴
`${O}${B}        ▄   ▄        ${R}
${O}${B}       ▀███████▀       ${R}
${O2}${B}    ▄  █▀▀▀▀▀▀▀█  ▄    ${R}
${O}${B}   ▀████ ◉     ◉ ████▀   ${R}
${O}${B}   ▀████  ╰──╯   ████▀   ${R}
${O2}${B}    ▀  █▄▄▄▄▄▄▄█  ▀    ${R}
${O}${B}       ▄███████▄       ${R}
${O}${B}        ▀   ▀        ${R}`,

// [3] 흥분
`${O3}${B}      ★  ▄   ▄  ★      ${R}
${O}${B}       ▀███████▀       ${R}
${O2}${B}  ★▄  █▀▀▀▀▀▀▀█  ▄★  ${R}
${O}${B}   ▀████ ★     ★ ████▀   ${R}
${O}${B}   ▀████  \\▄▄▄/  ████▀   ${R}
${O2}${B}  ★▀  █▄▄▄▄▄▄▄█  ▀★  ${R}
${O}${B}       ▄███████▄       ${R}
${O3}${B}      ★  ▀   ▀  ★      ${R}`,
];

// ── 댄스 프레임 (머리인덱스, 몸통, 설명) ─────────────────────────────────
const frames = [

// 1. 기본 서기
{ logo: 0, body:
`${W}${B}          ║           ${R}
${W}${B}        ══╬══         ${R}
${W}${B}          ║           ${R}
${W}${B}         ╱ ╲          ${R}
${W}${B}        ╱   ╲         ${R}`, tag: `${O}${B}  ♪  준비됐나요?  ♫  ${R}` },

// 2. 오른팔 위
{ logo: 2, body:
`${W}${B}       \\  ║           ${R}
${W}${B}     ★══╬══           ${R}
${W}${B}          ║           ${R}
${W}${B}         ╱ ╲          ${R}
${W}${B}        ╱   ╲         ${R}`, tag: `${O}${B}  💃  흔들흔들~  💃  ${R}` },

// 3. 양팔 위
{ logo: 2, body:
`${W}${B}     \\  ║  /          ${R}
${W}${B}   ★══╬══★           ${R}
${W}${B}        ║             ${R}
${W}${B}       ╱ ╲            ${R}
${W}${B}      ╱   ╲           ${R}`, tag: `${O}${B}  🎵  예예예!!  🎵  ${R}` },

// 4. 왼팔 위
{ logo: 2, body:
`${W}${B}          ║  /         ${R}
${W}${B}          ╬══★         ${R}
${W}${B}          ║            ${R}
${W}${B}         ╱ ╲           ${R}
${W}${B}        ╱   ╲          ${R}`, tag: `${O}${B}  🕺  탭탭탭~  🕺  ${R}` },

// 5. 브레이크 댄스 (눈 깜박)
{ logo: 1, body:
`${W}${B}     \\      /         ${R}
${W}${B}      ╲    ╱           ${R}
${W}${B}    ★══╪══★           ${R}
${W}${B}      ╱    ╲           ${R}
${W}${B}     ╱      ╲          ${R}`, tag: `${O}${B}  🔥  브레이크!!  🔥  ${R}` },

// 6. 점프
{ logo: 3, body:
`${W}${B}        ╱║╲           ${R}
${W}${B}       ╱ ║ ╲           ${R}
${W}${B}      ╱  ║  ╲          ${R}
${W}${B}          ║            ${R}
${W}${B}         ╱╲            ${R}`, tag: `${O2}${B}  ⭐  점프!!  ⭐  ${R}` },

// 7. 스핀 준비
{ logo: 0, body:
`${W}${B}       ──║──           ${R}
${W}${B}     ══╬═══╬══         ${R}
${W}${B}          ║            ${R}
${W}${B}        ──┼──          ${R}
${W}${B}       ╱     ╲         ${R}`, tag: `${O}${B}  🌀  스피인~  🌀  ${R}` },

// 8. 피날레 포즈
{ logo: 3, body:
`${W}${B}      ╲  ║  ╱          ${R}
${W}${B}       ╲ ║ ╱            ${R}
${W}${B}     ★══╪══★           ${R}
${W}${B}        ╱ ╲             ${R}
${W}${B}       ╱   ╲            ${R}`, tag: `${O3}${B}  💥  FINALE!!  💥  ${R}` },
];

// ── 배경 컬러 사이클 ─────────────────────────────────────────────────────
const bgColors = [
  '\x1b[38;5;208m', '\x1b[38;5;214m', '\x1b[38;5;220m',
  '\x1b[38;5;226m', '\x1b[38;5;214m', '\x1b[38;5;202m',
];

function getBanner(tick) {
  const c = bgColors[tick % bgColors.length];
  return [
    `${c}${B}  ╔══════════════════════════════════════════╗  ${R}`,
    `${c}${B}  ║                                          ║  ${R}`,
    `${c}${B}  ║        ✦  CLAUDE CODE  DANCE  ✦         ║  ${R}`,
    `${c}${B}  ║                                          ║  ${R}`,
    `${c}${B}  ╚══════════════════════════════════════════╝  ${R}`,
  ];
}

function getStars(tick) {
  const pat = ['✦','★','✧','✦','✵','✶'];
  const a = pat[tick % pat.length];
  const b = pat[(tick+2) % pat.length];
  const c = pat[(tick+4) % pat.length];
  return `${O}  ${a}  ${b}  ${c}  ♪   ♫   ♪  ${c}  ${b}  ${a}  ${R}`;
}

// ── 메인 루프 (무한 반복 / Ctrl+C로 종료) ───────────────────────────────
let tick = 0;
let frameIdx = 0;

process.stdout.write('\x1b[?25l');

process.on('SIGINT', () => {
  process.stdout.write('\x1b[?25h');
  process.stdout.write('\x1b[2J\x1b[H');
  console.log(`\n${O3}${B}  🎵 댄스 종료! 안녕~ 👋  🎵${R}\n`);
  process.exit(0);
});

setInterval(() => {
  const f = frames[frameIdx % frames.length];
  const logoLines = LOGO[f.logo].split('\n');
  const bodyLines = f.body.split('\n');
  const banner = getBanner(tick);

  process.stdout.write('\x1b[2J\x1b[H');

  banner.forEach(l => process.stdout.write(l + '\n'));
  process.stdout.write('\n');
  logoLines.forEach(l => process.stdout.write('        ' + l + '\n'));
  process.stdout.write('\n');
  bodyLines.forEach(l => process.stdout.write('        ' + l + '\n'));
  process.stdout.write('\n');
  process.stdout.write('  ' + getStars(tick) + '\n');
  process.stdout.write('\n');
  process.stdout.write('  ' + f.tag + '\n');
  process.stdout.write(`\n  ${O}  Ctrl+C 로 종료${R}\n`);

  tick++;
  frameIdx++;
}, 180);
