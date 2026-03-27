/**
 * likes-widget.js
 * 메인 페이지와 각 게임 페이지에서 공통으로 사용하는 좋아요 위젯
 *
 * 사용법:
 *   <script src="/likes-widget.js"></script>
 *   LikesWidget.init('tetris');           // 게임 페이지에서 (단일 게임)
 *   LikesWidget.initAll();               // 메인 페이지에서 (전체)
 */

const LikesWidget = (() => {
  const API_BASE = '/api/likes';
  const LS_KEY = 'mindol_liked_games'; // localStorage key

  /* ── 좋아요한 게임 목록 (localStorage) ─────────────── */
  function getLiked() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch { return []; }
  }

  function setLiked(arr) {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  }

  function hasLiked(game) {
    return getLiked().includes(game);
  }

  function markLiked(game) {
    const arr = getLiked();
    if (!arr.includes(game)) {
      arr.push(game);
      setLiked(arr);
    }
  }

  /* ── API 호출 ──────────────────────────────────────── */
  async function fetchCount(game) {
    try {
      const r = await fetch(`${API_BASE}?game=${game}`);
      if (!r.ok) return null;
      const data = await r.json();
      return data.count;
    } catch { return null; }
  }

  async function fetchAll() {
    try {
      const r = await fetch(API_BASE);
      if (!r.ok) return {};
      return await r.json();
    } catch { return {}; }
  }

  async function postLike(game) {
    try {
      const r = await fetch(`${API_BASE}?game=${game}`, { method: 'POST' });
      if (!r.ok) return null;
      const data = await r.json();
      return data.count;
    } catch { return null; }
  }

  /* ── UI: 버튼 요소 만들기 ──────────────────────────── */
  function buildButton(game, count, alreadyLiked) {
    const btn = document.createElement('button');
    btn.className = 'like-btn' + (alreadyLiked ? ' liked' : '');
    btn.dataset.game = game;
    btn.id = `like-btn-${game}`;
    btn.setAttribute('aria-label', `${game} 좋아요`);
    btn.innerHTML = `
      <span class="like-heart">${alreadyLiked ? '❤️' : '🤍'}</span>
      <span class="like-count">${count !== null ? count.toLocaleString() : '--'}</span>
    `;

    btn.addEventListener('click', async () => {
      if (hasLiked(game)) return; // 이미 눌렀으면 무시

      // 낙관적 UI 업데이트
      btn.classList.add('liked', 'like-pop');
      btn.querySelector('.like-heart').textContent = '❤️';
      const countEl = btn.querySelector('.like-count');
      const prev = parseInt(countEl.textContent.replace(/,/g, '')) || 0;
      countEl.textContent = (prev + 1).toLocaleString();

      // 총 좋아요 수 함께 업데이트
      const totalCountEl = document.getElementById('total-likes-count');
      if (totalCountEl && totalCountEl.textContent !== '--') {
        const prevTotal = parseInt(totalCountEl.textContent.replace(/,/g, '')) || 0;
        totalCountEl.textContent = (prevTotal + 1).toLocaleString();
      }

      setTimeout(() => btn.classList.remove('like-pop'), 400);

      markLiked(game);

      // 서버 반영
      const newCount = await postLike(game);
      if (newCount !== null) {
        countEl.textContent = newCount.toLocaleString();
      }

      // 같은 게임의 다른 버튼도 동기화
      document.querySelectorAll(`.like-btn[data-game="${game}"]`).forEach(b => {
        if (b !== btn) {
          b.classList.add('liked');
          b.querySelector('.like-heart').textContent = '❤️';
          if (newCount !== null) {
            b.querySelector('.like-count').textContent = newCount.toLocaleString();
          }
        }
      });
    });

    return btn;
  }

  /* ── 외부 API ──────────────────────────────────────── */

  /** 단일 게임 페이지에서 사용. container에 버튼 삽입 */
  async function init(game, containerId = `like-container-${game}`) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const alreadyLiked = hasLiked(game);
    const count = await fetchCount(game);
    const btn = buildButton(game, count, alreadyLiked);
    container.appendChild(btn);
  }

  /** 메인 페이지에서 사용. data-game 속성 가진 모든 컨테이너에 버튼 삽입 */
  async function initAll() {
    const containers = document.querySelectorAll('[data-like-game]');
    if (!containers.length) return;

    const allCounts = await fetchAll();
    const liked = getLiked();

    // 총 좋아요 수 계산 및 표시
    const totalCountEl = document.getElementById('total-likes-count');
    if (totalCountEl) {
      const totalLikes = Object.values(allCounts).reduce((sum, count) => sum + (Number(count) || 0), 0);
      totalCountEl.textContent = totalLikes.toLocaleString();
    }

    containers.forEach(container => {
      const game = container.dataset.likeGame;
      const count = allCounts[game] ?? null;
      const alreadyLiked = liked.includes(game);
      const btn = buildButton(game, count, alreadyLiked);
      container.appendChild(btn);
    });
  }

  return { init, initAll };
})();
