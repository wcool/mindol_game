// Upstash Redis를 사용한 게임 좋아요 API
// GET  /api/likes?game=tetris  → { game: "tetris", count: 42 }
// GET  /api/likes              → { pikmin: 3, tetris: 42, ... }
// POST /api/likes?game=tetris  → { game: "tetris", count: 43 }

import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const VALID_GAMES = [
    'pikmin', 'PvsZ', 'towerdefence', 'dama',
    'pickmachine', 'tetris', 'streetcross', 'maze', 'zump_sun',
    'asmr', 'monster_rpg'
  ];

  try {
    if (req.method === 'GET') {
      const game = req.query.game;

      if (game) {
        // 특정 게임 좋아요 수
        if (!VALID_GAMES.includes(game)) {
          return res.status(400).json({ error: '유효하지 않은 게임 이름' });
        }
        const count = (await kv.get(`likes:${game}`)) || 0;
        return res.status(200).json({ game, count: Number(count) });
      } else {
        // 전체 게임 좋아요 수
        const keys = VALID_GAMES.map(g => `likes:${g}`);
        const values = await kv.mget(...keys);
        const result = {};
        VALID_GAMES.forEach((g, i) => {
          result[g] = Number(values[i]) || 0;
        });
        return res.status(200).json(result);
      }
    }

    if (req.method === 'POST') {
      const game = req.query.game;

      if (!game || !VALID_GAMES.includes(game)) {
        return res.status(400).json({ error: '유효하지 않은 게임 이름' });
      }

      const count = await kv.incr(`likes:${game}`);
      return res.status(200).json({ game, count: Number(count) });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error('KV 오류:', error);
    return res.status(500).json({ error: '서버 오류' });
  }
}
